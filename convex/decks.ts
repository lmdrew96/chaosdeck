import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";

const deckSection = v.union(
  v.literal("deck"),
  v.literal("sideboard"),
  v.literal("commander"),
  v.literal("companion"),
);

type DeckCtx = QueryCtx | MutationCtx;

const requireAuthenticatedUser = async (ctx: DeckCtx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("Not authenticated");
  }
  return identity;
};

const requireDeckAccess = async (ctx: DeckCtx, deckId: Id<"decks">) => {
  const identity = await requireAuthenticatedUser(ctx);
  const deck = await ctx.db.get(deckId);
  if (!deck) {
    throw new Error("Deck not found");
  }
  if (deck.ownerTokenIdentifier !== identity.tokenIdentifier) {
    throw new Error("Unauthorized");
  }
  return { identity, deck };
};

export const createDeck = mutation({
  args: { name: v.string(), format: v.string() },
  returns: v.id("decks"),
  handler: async (ctx, { name, format }) => {
    const identity = await requireAuthenticatedUser(ctx);
    return await ctx.db.insert("decks", {
      name,
      format,
      ownerTokenIdentifier: identity.tokenIdentifier,
    });
  },
});

export const listDecks = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireAuthenticatedUser(ctx);
    return await ctx.db
      .query("decks")
      .withIndex("by_owner", (q) => q.eq("ownerTokenIdentifier", identity.tokenIdentifier))
      .order("desc")
      .take(100);
  },
});

export const getDeck = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, { deckId }) => {
    const { deck } = await requireDeckAccess(ctx, deckId);
    return deck;
  },
});

export const renameDeck = mutation({
  args: { deckId: v.id("decks"), name: v.string() },
  returns: v.null(),
  handler: async (ctx, { deckId, name }) => {
    await requireDeckAccess(ctx, deckId);
    await ctx.db.patch(deckId, { name });
    return null;
  },
});

export const setFormat = mutation({
  args: { deckId: v.id("decks"), format: v.string() },
  returns: v.null(),
  handler: async (ctx, { deckId, format }) => {
    await requireDeckAccess(ctx, deckId);
    await ctx.db.patch(deckId, { format });
    return null;
  },
});

export const deleteDeck = mutation({
  args: { deckId: v.id("decks") },
  returns: v.null(),
  handler: async (ctx, { deckId }) => {
    await requireDeckAccess(ctx, deckId);
    const entries = await ctx.db
      .query("deckEntries")
      .withIndex("by_deck", (q) => q.eq("deckId", deckId))
      .take(500);
    for (const entry of entries) {
      await ctx.db.delete(entry._id);
    }
    await ctx.db.delete(deckId);
    return null;
  },
});

// Hydrates each entry with its card doc so the builder UI has cmc/colors/
// legalities/imageUri without a separate round trip per card.
export const listEntriesWithCards = query({
  args: { deckId: v.id("decks") },
  handler: async (ctx, { deckId }) => {
    await requireDeckAccess(ctx, deckId);
    const entries = await ctx.db
      .query("deckEntries")
      .withIndex("by_deck", (q) => q.eq("deckId", deckId))
      .take(500);
    const hydrated = [];
    for (const entry of entries) {
      const card = await ctx.db
        .query("cards")
        .withIndex("by_oracle_id", (q) => q.eq("oracleId", entry.cardOracleId))
        .unique();
      hydrated.push({ ...entry, card });
    }
    return hydrated;
  },
});

// Adds to an existing (section, card) row's quantity, or inserts a new row.
export const addCard = mutation({
  args: {
    deckId: v.id("decks"),
    section: deckSection,
    cardOracleId: v.string(),
    quantity: v.optional(v.number()),
  },
  returns: v.null(),
  handler: async (ctx, { deckId, section, cardOracleId, quantity }) => {
    await requireDeckAccess(ctx, deckId);
    const delta = quantity ?? 1;
    const existing = await ctx.db
      .query("deckEntries")
      .withIndex("by_deck_and_section_and_card", (q) =>
        q.eq("deckId", deckId).eq("section", section).eq("cardOracleId", cardOracleId),
      )
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { quantity: existing.quantity + delta });
    } else {
      await ctx.db.insert("deckEntries", { deckId, section, cardOracleId, quantity: delta });
    }
    return null;
  },
});

// Sets a (section, card) row's quantity exactly; deletes the row at 0.
export const setQuantity = mutation({
  args: {
    deckId: v.id("decks"),
    section: deckSection,
    cardOracleId: v.string(),
    quantity: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, { deckId, section, cardOracleId, quantity }) => {
    await requireDeckAccess(ctx, deckId);
    const existing = await ctx.db
      .query("deckEntries")
      .withIndex("by_deck_and_section_and_card", (q) =>
        q.eq("deckId", deckId).eq("section", section).eq("cardOracleId", cardOracleId),
      )
      .unique();
    if (quantity <= 0) {
      if (existing) await ctx.db.delete(existing._id);
      return null;
    }
    if (existing) {
      await ctx.db.patch(existing._id, { quantity });
    } else {
      await ctx.db.insert("deckEntries", { deckId, section, cardOracleId, quantity });
    }
    return null;
  },
});

export const removeCard = mutation({
  args: { deckId: v.id("decks"), section: deckSection, cardOracleId: v.string() },
  returns: v.null(),
  handler: async (ctx, { deckId, section, cardOracleId }) => {
    await requireDeckAccess(ctx, deckId);
    const existing = await ctx.db
      .query("deckEntries")
      .withIndex("by_deck_and_section_and_card", (q) =>
        q.eq("deckId", deckId).eq("section", section).eq("cardOracleId", cardOracleId),
      )
      .unique();
    if (existing) await ctx.db.delete(existing._id);
    return null;
  },
});

// Moves a card's entire row from one section to another (e.g. "deck" ->
// "sideboard"), merging into an existing row at the destination if present.
export const moveEntry = mutation({
  args: {
    deckId: v.id("decks"),
    cardOracleId: v.string(),
    fromSection: deckSection,
    toSection: deckSection,
  },
  returns: v.null(),
  handler: async (ctx, { deckId, cardOracleId, fromSection, toSection }) => {
    await requireDeckAccess(ctx, deckId);
    if (fromSection === toSection) return null;
    const source = await ctx.db
      .query("deckEntries")
      .withIndex("by_deck_and_section_and_card", (q) =>
        q.eq("deckId", deckId).eq("section", fromSection).eq("cardOracleId", cardOracleId),
      )
      .unique();
    if (!source) return null;
    const target = await ctx.db
      .query("deckEntries")
      .withIndex("by_deck_and_section_and_card", (q) =>
        q.eq("deckId", deckId).eq("section", toSection).eq("cardOracleId", cardOracleId),
      )
      .unique();
    if (target) {
      await ctx.db.patch(target._id, { quantity: target.quantity + source.quantity });
      await ctx.db.delete(source._id);
    } else {
      await ctx.db.patch(source._id, { section: toSection });
    }
    return null;
  },
});

const resolvedImportLine = v.object({
  section: deckSection,
  quantity: v.number(),
  oracleId: v.string(),
});

// Persists the `resolved` output of deckImport.importDeckList into deck
// entries — bulk version of addCard for the paste-import flow.
export const importResolvedLines = mutation({
  args: { deckId: v.id("decks"), lines: v.array(resolvedImportLine) },
  returns: v.null(),
  handler: async (ctx, { deckId, lines }) => {
    await requireDeckAccess(ctx, deckId);
    for (const line of lines) {
      const existing = await ctx.db
        .query("deckEntries")
        .withIndex("by_deck_and_section_and_card", (q) =>
          q.eq("deckId", deckId).eq("section", line.section).eq("cardOracleId", line.oracleId),
        )
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, { quantity: existing.quantity + line.quantity });
      } else {
        await ctx.db.insert("deckEntries", {
          deckId,
          section: line.section,
          cardOracleId: line.oracleId,
          quantity: line.quantity,
        });
      }
    }
    return null;
  },
});

// Reconstructs a plaintext deck list in the same shape deckListParser.ts
// accepts (section headers + "qty name" lines), so export/import round-trip.
export const exportDeck = query({
  args: { deckId: v.id("decks") },
  returns: v.string(),
  handler: async (ctx, { deckId }) => {
    await requireDeckAccess(ctx, deckId);
    const entries = await ctx.db
      .query("deckEntries")
      .withIndex("by_deck", (q) => q.eq("deckId", deckId))
      .take(500);

    const bySection: Record<string, { name: string; quantity: number }[]> = {
      commander: [],
      deck: [],
      sideboard: [],
      companion: [],
    };
    for (const entry of entries) {
      const card = await ctx.db
        .query("cards")
        .withIndex("by_oracle_id", (q) => q.eq("oracleId", entry.cardOracleId))
        .unique();
      if (!card) continue;
      bySection[entry.section].push({ name: card.name, quantity: entry.quantity });
    }
    for (const section of Object.values(bySection)) {
      section.sort((a, b) => a.name.localeCompare(b.name));
    }

    const lines: string[] = [];
    if (bySection.commander.length) {
      lines.push("Commander");
      for (const c of bySection.commander) lines.push(`${c.quantity} ${c.name}`);
      lines.push("");
    }
    for (const c of bySection.deck) lines.push(`${c.quantity} ${c.name}`);
    if (bySection.sideboard.length) {
      lines.push("");
      lines.push("Sideboard");
      for (const c of bySection.sideboard) lines.push(`${c.quantity} ${c.name}`);
    }
    if (bySection.companion.length) {
      lines.push("");
      lines.push("Companion");
      for (const c of bySection.companion) lines.push(`${c.quantity} ${c.name}`);
    }

    return lines.join("\n");
  },
});
