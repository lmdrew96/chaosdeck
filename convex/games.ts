import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { shuffle, drawCards, moveCardZone } from "./cardInstances";

const PHASE_ORDER = ["untap", "upkeep", "draw", "main1", "combat", "main2", "end"] as const;

const EMPTY_MANA_POOL = { W: 0, U: 0, B: 0, R: 0, G: 0, C: 0 };

export const createGame = mutation({
  args: {
    startingLife: v.optional(v.number()),
    players: v.array(
      v.object({
        displayName: v.string(),
        // Flat list, one entry per copy (a 4-of is 4 entries) — where these
        // oracleIds come from (deckbuilder, import) is out of scope here.
        deckOracleIds: v.array(v.string()),
      }),
    ),
  },
  returns: v.id("games"),
  handler: async (ctx, { players, startingLife }) => {
    if (players.length < 2) {
      throw new Error("A game needs at least 2 players");
    }

    const gameId = await ctx.db.insert("games", {
      status: "active",
      phase: "untap",
      turnNumber: 1,
      activePlayerIndex: 0,
      playerCount: players.length,
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
