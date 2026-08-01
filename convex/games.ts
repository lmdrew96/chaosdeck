import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { shuffle, drawCards, moveCardZone } from "./cardInstances";
import { requireAuthenticatedUser, requireDeckAccess } from "./decks";
import { Id } from "./_generated/dataModel";

const PHASE_ORDER = ["untap", "upkeep", "draw", "main1", "combat", "main2", "end"] as const;

const ALL_ZONES = ["library", "hand", "battlefield", "graveyard", "exile", "stack", "command"] as const;

const EMPTY_MANA_POOL = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

const gamePlayerInput = v.object({
  displayName: v.string(),
  // Flat list, one entry per copy (a 4-of is 4 entries) — where these
  // oracleIds come from (deckbuilder, import) is out of scope here.
  deckOracleIds: v.array(v.string()),
  // Starts in the command zone instead of being shuffled into the
  // library — usually one card, two for partner/background commanders.
  commanderOracleIds: v.optional(v.array(v.string())),
});

// Shared by createGame and startPlaytestFromDecks — a plain helper so both
// entry points insert the game/players/library in one transaction.
async function insertGame(
  ctx: MutationCtx,
  players: { displayName: string; deckOracleIds: string[]; commanderOracleIds?: string[] }[],
  startingLife?: number,
): Promise<Id<"games">> {
  // 1 player supports solo goldfishing (the primary use case); 2+ is a
  // real multiplayer pod. Convex reactivity means every seat can be
  // opened from its own device without any extra session plumbing.
  if (players.length < 1) {
    throw new Error("A game needs at least 1 player");
  }

  const gameId = await ctx.db.insert("games", {
    status: "active",
    phase: "untap",
    turnNumber: 1,
    activePlayerIndex: 0,
    playerCount: players.length,
    startingLife,
  });

  const playerIds = [];
  for (let seatIndex = 0; seatIndex < players.length; seatIndex++) {
    const playerId = await ctx.db.insert("players", {
      gameId,
      seatIndex,
      displayName: players[seatIndex].displayName,
      life: startingLife ?? 20,
      manaPool: EMPTY_MANA_POOL,
      commanderDamage: {},
      hasLost: false,
      landsPlayedThisTurn: 0,
      mutedPointerTypes: [],
    });
    playerIds.push(playerId);
  }

  for (let seatIndex = 0; seatIndex < players.length; seatIndex++) {
    const playerId = playerIds[seatIndex];

    const commanders = players[seatIndex].commanderOracleIds ?? [];
    for (let i = 0; i < commanders.length; i++) {
      await ctx.db.insert("cardInstances", {
        gameId,
        ownerId: playerId,
        zone: "command",
        cardOracleId: commanders[i],
        position: i,
        tapped: false,
        summoningSick: false,
        counters: {},
        isCommander: true,
      });
    }

    const shuffled = shuffle(players[seatIndex].deckOracleIds);
    for (let i = 0; i < shuffled.length; i++) {
      await ctx.db.insert("cardInstances", {
        gameId,
        ownerId: playerId,
        zone: "library",
        cardOracleId: shuffled[i],
        position: i,
        tapped: false,
        summoningSick: false,
        counters: {},
      });
    }
    await drawCards(ctx, playerId, 7);
  }

  return gameId;
}

export const createGame = mutation({
  args: {
    startingLife: v.optional(v.number()),
    players: v.array(gamePlayerInput),
  },
  returns: v.id("games"),
  handler: async (ctx, { players, startingLife }) => {
    return await insertGame(ctx, players, startingLife);
  },
});

// Convenience entry point for the playtester's "New game" flow: resolves
// each seat's deck (its "deck" + "commander" sections, quantity-expanded)
// into the flat oracleId list insertGame needs, instead of making the
// client fetch and flatten deck entries itself. A seat with no deckId
// (a placeholder pod member) just gets an empty library.
export const startPlaytestFromDecks = mutation({
  args: {
    startingLife: v.optional(v.number()),
    players: v.array(
      v.object({
        displayName: v.string(),
        deckId: v.optional(v.id("decks")),
      }),
    ),
  },
  returns: v.id("games"),
  handler: async (ctx, { players, startingLife }) => {
    await requireAuthenticatedUser(ctx);

    const resolved = [];
    for (const player of players) {
      if (!player.deckId) {
        resolved.push({ displayName: player.displayName, deckOracleIds: [] });
        continue;
      }
      await requireDeckAccess(ctx, player.deckId);
      const entries = await ctx.db
        .query("deckEntries")
        .withIndex("by_deck", (q) => q.eq("deckId", player.deckId!))
        .take(500);
      const deckOracleIds: string[] = [];
      const commanderOracleIds: string[] = [];
      for (const entry of entries) {
        if (entry.section === "deck") {
          for (let i = 0; i < entry.quantity; i++) deckOracleIds.push(entry.cardOracleId);
        } else if (entry.section === "commander") {
          for (let i = 0; i < entry.quantity; i++) commanderOracleIds.push(entry.cardOracleId);
        }
      }
      resolved.push({ displayName: player.displayName, deckOracleIds, commanderOracleIds });
    }

    return await insertGame(ctx, resolved, startingLife);
  },
});

// Advances to the next phase, wrapping to the next player's untap step and
// incrementing the turn number after "end". Auto-untap, auto-draw, and the
// end-of-phase mana-pool clear all happen here rather than as separate
// client actions — they're unconditional rules, not player decisions.
export const advancePhase = mutation({
  args: { gameId: v.id("games") },
  returns: v.null(),
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    const currentIdx = PHASE_ORDER.indexOf(game.phase);
    const nextIdx = (currentIdx + 1) % PHASE_ORDER.length;
    const nextPhase = PHASE_ORDER[nextIdx];
    const turnAdvances = nextIdx === 0;
    const nextActivePlayerIndex = turnAdvances
      ? (game.activePlayerIndex + 1) % game.playerCount
      : game.activePlayerIndex;
    const nextTurnNumber = turnAdvances ? game.turnNumber + 1 : game.turnNumber;

    await ctx.db.patch(gameId, {
      phase: nextPhase,
      activePlayerIndex: nextActivePlayerIndex,
      turnNumber: nextTurnNumber,
    });

    // Mana empties at the end of every step/phase, for every player.
    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
    for (const player of players) {
      await ctx.db.patch(player._id, { manaPool: EMPTY_MANA_POOL });
    }

    const activePlayer = players.find((p) => p.seatIndex === nextActivePlayerIndex);
    if (!activePlayer) return null;

    if (nextPhase === "untap") {
      const battlefield = await ctx.db
        .query("cardInstances")
        .withIndex("by_owner_zone_position", (q) =>
          q.eq("ownerId", activePlayer._id).eq("zone", "battlefield"),
        )
        .take(300);
      for (const permanent of battlefield) {
        await ctx.db.patch(permanent._id, { tapped: false, summoningSick: false });
      }
      await ctx.db.patch(activePlayer._id, { landsPlayedThisTurn: 0 });
    }

    if (nextPhase === "draw") {
      // Real rule: the player going first skips their very first draw step.
      const isFirstDrawOfGame = nextTurnNumber === 1 && nextActivePlayerIndex === 0;
      if (!isFirstDrawOfGame) {
        await drawCards(ctx, activePlayer._id, 1);
      }
    }

    return null;
  },
});

// A misclick correction, not an undo: it only moves the phase/turn pointer
// backward. It doesn't re-tap permanents, un-draw cards, or restore mana
// that advancePhase already cleared — those are real one-way game events,
// not artifacts of which phase indicator is showing.
export const previousPhase = mutation({
  args: { gameId: v.id("games") },
  returns: v.null(),
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    if (game.turnNumber === 1 && game.phase === "untap") {
      return null;
    }

    const currentIdx = PHASE_ORDER.indexOf(game.phase);
    const prevIdx = (currentIdx - 1 + PHASE_ORDER.length) % PHASE_ORDER.length;
    const turnRetreats = currentIdx === 0;
    const prevActivePlayerIndex = turnRetreats
      ? (game.activePlayerIndex - 1 + game.playerCount) % game.playerCount
      : game.activePlayerIndex;
    const prevTurnNumber = turnRetreats ? game.turnNumber - 1 : game.turnNumber;

    await ctx.db.patch(gameId, {
      phase: PHASE_ORDER[prevIdx],
      activePlayerIndex: prevActivePlayerIndex,
      turnNumber: prevTurnNumber,
    });
    return null;
  },
});

// Resets the game in place — same gameId, so the URL and every device's
// seat choice stay valid — rather than creating a new game. Every card
// each player currently controls (across every zone) is collected, tokens
// are dropped (they cease to exist once they'd leave the battlefield),
// commanders go back to the command zone by their isCommander flag, and
// the rest is reshuffled into a fresh library with a new opening hand.
export const restartGame = mutation({
  args: { gameId: v.id("games") },
  returns: v.null(),
  handler: async (ctx, { gameId }) => {
    const game = await ctx.db.get(gameId);
    if (!game) throw new Error("Game not found");

    const players = await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();

    for (const player of players) {
      const commanderOracleIds: string[] = [];
      const deckOracleIds: string[] = [];

      for (const z of ALL_ZONES) {
        const instances = await ctx.db
          .query("cardInstances")
          .withIndex("by_owner_zone_position", (q) => q.eq("ownerId", player._id).eq("zone", z))
          .take(500);
        for (const instance of instances) {
          if (instance.cardOracleId) {
            (instance.isCommander ? commanderOracleIds : deckOracleIds).push(instance.cardOracleId);
          }
          await ctx.db.delete(instance._id);
        }
      }

      for (let i = 0; i < commanderOracleIds.length; i++) {
        await ctx.db.insert("cardInstances", {
          gameId,
          ownerId: player._id,
          zone: "command",
          cardOracleId: commanderOracleIds[i],
          position: i,
          tapped: false,
          summoningSick: false,
          counters: {},
          isCommander: true,
        });
      }

      const shuffled = shuffle(deckOracleIds);
      for (let i = 0; i < shuffled.length; i++) {
        await ctx.db.insert("cardInstances", {
          gameId,
          ownerId: player._id,
          zone: "library",
          cardOracleId: shuffled[i],
          position: i,
          tapped: false,
          summoningSick: false,
          counters: {},
        });
      }

      await ctx.db.patch(player._id, {
        life: game.startingLife ?? 20,
        manaPool: EMPTY_MANA_POOL,
        commanderDamage: {},
        hasLost: false,
        landsPlayedThisTurn: 0,
      });

      await drawCards(ctx, player._id, 7);
    }

    await ctx.db.patch(gameId, {
      status: "active",
      phase: "untap",
      turnNumber: 1,
      activePlayerIndex: 0,
    });

    return null;
  },
});

export const updateLife = mutation({
  args: { playerId: v.id("players"), delta: v.number() },
  returns: v.null(),
  handler: async (ctx, { playerId, delta }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");
    const life = player.life + delta;
    await ctx.db.patch(playerId, { life, hasLost: player.hasLost || life <= 0 });
    return null;
  },
});

const manaColor = v.union(
  v.literal("W"),
  v.literal("U"),
  v.literal("B"),
  v.literal("R"),
  v.literal("G"),
  v.literal("C"),
);

export const updateManaPool = mutation({
  args: { playerId: v.id("players"), color: manaColor, delta: v.number() },
  returns: v.null(),
  handler: async (ctx, { playerId, color, delta }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");
    const next = Math.max(0, player.manaPool[color] + delta);
    await ctx.db.patch(playerId, { manaPool: { ...player.manaPool, [color]: next } });
    return null;
  },
});

// Commander combat damage both reduces life (like any combat damage) and
// accumulates per source — 21+ from a single commander is a loss condition
// independent of life total.
export const dealCommanderDamage = mutation({
  args: {
    defendingPlayerId: v.id("players"),
    fromPlayerId: v.id("players"),
    delta: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { defendingPlayerId, fromPlayerId, delta }) => {
    const player = await ctx.db.get(defendingPlayerId);
    if (!player) throw new Error("Player not found");

    const priorDamage = player.commanderDamage[fromPlayerId] ?? 0;
    const nextDamage = Math.max(0, priorDamage + delta);
    const commanderDamage = { ...player.commanderDamage, [fromPlayerId]: nextDamage };
    const life = player.life - delta;
    const hasLost = player.hasLost || nextDamage >= 21 || life <= 0;

    await ctx.db.patch(defendingPlayerId, {
      commanderDamage,
      life,
      hasLost,
    });
    return null;
  },
});

// A dedicated action distinct from cardInstances.moveCard: playing a land
// specifically consumes this turn's land drop, which generic zone-moves
// (drawing, discarding, bouncing) must not.
export const playLand = mutation({
  args: { instanceId: v.id("cardInstances"), playerId: v.id("players") },
  returns: v.null(),
  handler: async (ctx, { instanceId, playerId }) => {
    const player = await ctx.db.get(playerId);
    if (!player) throw new Error("Player not found");
    await moveCardZone(ctx, instanceId, "battlefield");
    await ctx.db.patch(playerId, { landsPlayedThisTurn: player.landsPlayedThisTurn + 1 });
    return null;
  },
});

export const setMutedPointerTypes = mutation({
  args: { playerId: v.id("players"), mutedPointerTypes: v.array(v.string()) },
  returns: v.null(),
  handler: async (ctx, { playerId, mutedPointerTypes }) => {
    await ctx.db.patch(playerId, { mutedPointerTypes });
    return null;
  },
});

export const getGame = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db.get(gameId);
  },
});

export const listPlayers = query({
  args: { gameId: v.id("games") },
  handler: async (ctx, { gameId }) => {
    return await ctx.db
      .query("players")
      .withIndex("by_game", (q) => q.eq("gameId", gameId))
      .collect();
  },
});
