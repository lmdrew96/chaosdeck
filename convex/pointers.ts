import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { Doc } from "./_generated/dataModel";

// Detection, not interpretation: every check here reads state that already
// exists (phase, tapped, mana pool, oracle-text tags) — nothing infers *why*
// a condition is true, matching the tagger's own philosophy.
//
// ND-design constraints below are non-negotiable (from the nd-design skill
// review that shaped this patch's spec):
// - Neutral wording, never "you forgot X" — see POINTER_META's labels.
// - Never color-only — every pointer carries an icon key alongside text.
// - Dismissible/non-blocking is inherent here: pointers are derived live
//   from state, not persisted alerts, so there's nothing to force
//   acknowledgment of. Per-instance dismissal is a UI-layer concern
//   (ephemeral client state); category-level muting is real durable
//   per-player preference, hence mutedPointerTypes on the player doc.
// - Predictable placement is a UI-layer concern (Playtester UI patch).
//
// Known v1 gap: TRIGGER_AVAILABLE only covers phase-based tags (UPKEEP,
// DRAW_STEP, BEGIN_COMBAT, END_STEP). Event-based tags (ETB, DIES, ATTACKS,
// BLOCKS, BECOMES_BLOCKED, COMBAT_DAMAGE_PLAYER, LANDFALL, CAST_TRIGGER,
// DISCARD_TRIGGER, LEAVES_BATTLEFIELD) would need a "this just happened"
// event log this schema doesn't have. Deferred rather than half-built —
// these are also lower-value reminders in practice, since the player just
// performed the action that would have caused them (moved the card, cast
// the spell) and is already looking at it.

const POINTER_META: Record<string, { icon: string; label: string }> = {
  PLAY_LAND: { icon: "land", label: "Land not yet played" },
  MANA_UP: { icon: "mana-drop", label: "Mana still in pool" },
  TRIGGER_AVAILABLE: { icon: "trigger", label: "Trigger available" },
  ATTACKERS_AVAILABLE: { icon: "sword", label: "Creatures available to attack" },
  LIVE_OPTIONS: { icon: "instant", label: "Instant-speed options in hand" },
  EXILED_EXPIRING: { icon: "hourglass", label: "Exiled card expiring" },
};

const PHASE_TRIGGER_TAGS: Record<string, string> = {
  upkeep: "UPKEEP",
  draw: "DRAW_STEP",
  combat: "BEGIN_COMBAT",
  end: "END_STEP",
};

async function getCard(
  ctx: QueryCtx,
  cache: Map<string, Doc<"cards"> | null>,
  oracleId: string,
): Promise<Doc<"cards"> | null> {
  if (cache.has(oracleId)) return cache.get(oracleId) ?? null;
  const card = await ctx.db
    .query("cards")
    .withIndex("by_oracle_id", (q) => q.eq("oracleId", oracleId))
    .unique();
  cache.set(oracleId, card ?? null);
  return card ?? null;
}

function frontTypeLine(card: Doc<"cards">): string | undefined {
  return card.typeLine ?? card.cardFaces?.[0]?.typeLine;
}

function isInstantSpeed(card: Doc<"cards">): boolean {
  return (frontTypeLine(card)?.includes("Instant") ?? false) || card.keywords.includes("Flash");
}

const pointerValidator = v.object({
  type: v.string(),
  icon: v.string(),
  label: v.string(),
  detail: v.optional(v.string()),
});

export const getActivePointers = query({
  args: { gameId: v.id("games"), playerId: v.id("players") },
  returns: v.array(pointerValidator),
  handler: async (ctx, { gameId, playerId }) => {
    const game = await ctx.db.get(gameId);
    const player = await ctx.db.get(playerId);
    if (!game || !player) return [];

    const isActivePlayer = player.seatIndex === game.activePlayerIndex;
    const cardCache = new Map<string, Doc<"cards"> | null>();
    const pointers: Array<{ type: string; icon: string; label: string; detail?: string }> = [];
    const add = (type: string, detail?: string) => {
      if (player.mutedPointerTypes.includes(type)) return;
      pointers.push({ type, icon: POINTER_META[type].icon, label: POINTER_META[type].label, detail });
    };

    const hand = await ctx.db
      .query("cardInstances")
      .withIndex("by_owner_zone_position", (q) => q.eq("ownerId", playerId).eq("zone", "hand"))
      .take(300);
    const battlefield = await ctx.db
      .query("cardInstances")
      .withIndex("by_owner_zone_position", (q) => q.eq("ownerId", playerId).eq("zone", "battlefield"))
      .take(300);
    const exiled = await ctx.db
      .query("cardInstances")
      .withIndex("by_owner_zone_position", (q) => q.eq("ownerId", playerId).eq("zone", "exile"))
      .take(300);

    // 1. Play a land: your main phase, land drop unused, a land in hand.
    if (isActivePlayer && (game.phase === "main1" || game.phase === "main2") && player.landsPlayedThisTurn === 0) {
      for (const instance of hand) {
        if (!instance.cardOracleId) continue;
        const card = await getCard(ctx, cardCache, instance.cardOracleId);
        if (card && frontTypeLine(card)?.includes("Land")) {
          add("PLAY_LAND");
          break;
        }
      }
    }

    // 2. Mana still up: real rule already clears it every phase transition,
    // so any nonzero pool right now is live, useful information.
    if (Object.values(player.manaPool).some((n) => n > 0)) {
      add("MANA_UP");
    }

    // 3. Trigger available (phase-based tags only — see module comment).
    const relevantTag = isActivePlayer ? PHASE_TRIGGER_TAGS[game.phase] : undefined;
    if (relevantTag) {
      for (const instance of battlefield) {
        if (!instance.cardOracleId) continue;
        const card = await getCard(ctx, cardCache, instance.cardOracleId);
        if (!card) continue;
        const allTags = [...card.tags, ...(card.cardFaces?.flatMap((f) => f.tags) ?? [])];
        if (allTags.some((t) => t.tag === relevantTag)) {
          add("TRIGGER_AVAILABLE", card.name);
        }
      }
    }

    // 4. Attackers available: your combat phase, an untapped non-sick
    // creature exists. Doesn't track whether attacks were already declared
    // with some creatures — that state isn't modeled (documented gap).
    if (isActivePlayer && game.phase === "combat") {
      for (const instance of battlefield) {
        if (instance.tapped || instance.summoningSick || !instance.cardOracleId) continue;
        const card = await getCard(ctx, cardCache, instance.cardOracleId);
        if (card && frontTypeLine(card)?.includes("Creature")) {
          add("ATTACKERS_AVAILABLE");
          break;
        }
      }
    }

    // 5. Live instant-speed options: opponent's turn, an instant or a card
    // with Flash sitting in hand.
    if (!isActivePlayer) {
      for (const instance of hand) {
        if (!instance.cardOracleId) continue;
        const card = await getCard(ctx, cardCache, instance.cardOracleId);
        if (card && isInstantSpeed(card)) {
          add("LIVE_OPTIONS");
          break;
        }
      }
    }

    // 6. Exiled cards with an expiring play window (impulse-draw effects).
    for (const instance of exiled) {
      if (instance.playableUntilTurn !== undefined && instance.playableUntilTurn >= game.turnNumber) {
        const card = instance.cardOracleId ? await getCard(ctx, cardCache, instance.cardOracleId) : null;
        add(
          "EXILED_EXPIRING",
          card ? `${card.name} — expires end of turn ${instance.playableUntilTurn}` : undefined,
        );
      }
    }

    return pointers;
  },
});
