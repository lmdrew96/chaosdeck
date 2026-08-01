import { v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

const zone = v.union(
  v.literal("library"),
  v.literal("hand"),
  v.literal("battlefield"),
  v.literal("graveyard"),
  v.literal("exile"),
  v.literal("stack"),
  v.literal("command"),
);

type Zone = Doc<"cardInstances">["zone"];

export function shuffle<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// Shared by createGame's opening hand and advancePhase's auto-draw — a
// plain helper called directly (not via ctx.runMutation) so it participates
// in the caller's own transaction instead of a separate subtransaction.
// Returns the number of cards actually drawn; fewer than requested (an
// empty library) is a loss per the real "draw from an empty library" rule.
export async function drawCards(
  ctx: MutationCtx,
  playerId: Id<"players">,
  count: number,
): Promise<number> {
  let drawn = 0;
  for (let i = 0; i < count; i++) {
    const top = await ctx.db
      .query("cardInstances")
      .withIndex("by_owner_zone_position", (q) => q.eq("ownerId", playerId).eq("zone", "library"))
      .order("asc")
      .first();
    if (!top) break;
    await ctx.db.patch(top._id, { zone: "hand" });
    drawn++;
  }
  if (drawn < count) {
    await ctx.db.patch(playerId, { hasLost: true });
  }
  return drawn;
}

// Shared by the moveCard mutation and games.ts's playLand — a plain helper
// so playLand's zone change and land-drop count stay in one transaction.
export async function moveCardZone(
  ctx: MutationCtx,
  instanceId: Id<"cardInstances">,
  toZone: Zone,
  playableUntilTurn?: number,
): Promise<void> {
  const instance = await ctx.db.get(instanceId);
  if (!instance) throw new Error("Card instance not found");

  const patch: Record<string, unknown> = { zone: toZone };
  if (instance.zone === "battlefield" && toZone !== "battlefield") {
    // Leaving the battlefield: it becomes a new object and loses tap state,
    // summoning sickness, and counters — a real, unambiguous rule.
    patch.tapped = false;
    patch.summoningSick = false;
    patch.counters = {};
  }
  if (toZone === "battlefield" && instance.zone !== "battlefield") {
    patch.tapped = false;
    patch.summoningSick = true;
  }
  if (toZone === "exile" && playableUntilTurn !== undefined) {
    patch.playableUntilTurn = playableUntilTurn;
  }

  await ctx.db.patch(instanceId, patch);
}

// Manual draw for effects the auto-draw-on-draw-step logic doesn't cover
// (card-draw spells, mulligans) — advancePhase's own draw step calls
// drawCards directly rather than through this wrapper.
export const draw = mutation({
  args: { playerId: v.id("players"), count: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, { playerId, count }) => {
    await drawCards(ctx, playerId, count ?? 1);
    return null;
  },
});

// Re-randomizes a player's library order in place — needed for shuffle
// effects and post-search cleanup mid-game (createGame does its own
// shuffle-then-insert at game start and doesn't need this).
export const shuffleLibrary = mutation({
  args: { playerId: v.id("players") },
  returns: v.null(),
  handler: async (ctx, { playerId }) => {
    const library = await ctx.db
      .query("cardInstances")
      .withIndex("by_owner_zone_position", (q) => q.eq("ownerId", playerId).eq("zone", "library"))
      .take(300);
    const order = shuffle(library.map((instance) => instance._id));
    for (let i = 0; i < order.length; i++) {
      await ctx.db.patch(order[i], { position: i });
    }
    return null;
  },
});

export const moveCard = mutation({
  args: {
    instanceId: v.id("cardInstances"),
    toZone: zone,
    // Set when exiling via an impulse-draw-style effect (tagged
    // IMPULSE_EXILE on its source) — the pointer engine surfaces a reminder
    // until this turn number passes.
    playableUntilTurn: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { instanceId, toZone, playableUntilTurn }) => {
    await moveCardZone(ctx, instanceId, toZone, playableUntilTurn);
    return null;
  },
});

export const setTapped = mutation({
  args: { instanceId: v.id("cardInstances"), tapped: v.boolean() },
  returns: v.null(),
  handler: async (ctx, { instanceId, tapped }) => {
    await ctx.db.patch(instanceId, { tapped });
    return null;
  },
});

export const updateCounters = mutation({
  args: { instanceId: v.id("cardInstances"), counterType: v.string(), delta: v.number() },
  returns: v.null(),
  handler: async (ctx, { instanceId, counterType, delta }) => {
    const instance = await ctx.db.get(instanceId);
    if (!instance) throw new Error("Card instance not found");

    const counters: Record<string, number> = { ...instance.counters };
    counters[counterType] = (counters[counterType] ?? 0) + delta;
    if (counters[counterType] <= 0) delete counters[counterType];

    // +1/+1 and -1/-1 counters annihilate each other automatically.
    const plus = counters["+1/+1"] ?? 0;
    const minus = counters["-1/-1"] ?? 0;
    if (plus > 0 && minus > 0) {
      const cancelled = Math.min(plus, minus);
      counters["+1/+1"] = plus - cancelled;
      counters["-1/-1"] = minus - cancelled;
      if (counters["+1/+1"] === 0) delete counters["+1/+1"];
      if (counters["-1/-1"] === 0) delete counters["-1/-1"];
    }

    await ctx.db.patch(instanceId, { counters });
    return null;
  },
});

export const listByGameAndZone = query({
  args: { gameId: v.id("games"), zone },
  handler: async (ctx, { gameId, zone: z }) => {
    return await ctx.db
      .query("cardInstances")
      .withIndex("by_game_and_zone", (q) => q.eq("gameId", gameId).eq("zone", z))
      .take(300);
  },
});

export const listByOwnerAndZone = query({
  args: { ownerId: v.id("players"), zone },
  handler: async (ctx, { ownerId, zone: z }) => {
    return await ctx.db
      .query("cardInstances")
      .withIndex("by_owner_zone_position", (q) => q.eq("ownerId", ownerId).eq("zone", z))
      .order("asc")
      .take(300);
  },
});
