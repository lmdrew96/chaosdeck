import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const cardFace = v.object({
  name: v.string(),
  manaCost: v.optional(v.string()),
  typeLine: v.optional(v.string()),
  oracleText: v.optional(v.string()),
  power: v.optional(v.string()),
  toughness: v.optional(v.string()),
  loyalty: v.optional(v.string()),
  imageUri: v.optional(v.string()),
});

const cardFields = {
  oracleId: v.string(),
  name: v.string(),
  manaCost: v.optional(v.string()),
  cmc: v.number(),
  typeLine: v.optional(v.string()),
  oracleText: v.optional(v.string()),
  colors: v.array(v.string()),
  colorIdentity: v.array(v.string()),
  power: v.optional(v.string()),
  toughness: v.optional(v.string()),
  loyalty: v.optional(v.string()),
  rarity: v.string(),
  setCode: v.string(),
  collectorNumber: v.string(),
  imageUri: v.optional(v.string()),
  legalities: v.record(v.string(), v.string()),
  priceUsd: v.optional(v.string()),
  scryfallUri: v.string(),
  cardFaces: v.optional(v.array(cardFace)),
};

// Upserts by oracleId so a daily refresh never leaves the table momentarily
// empty for readers — existing rows are patched in place, new ones inserted.
export const upsertBatch = internalMutation({
  args: { cards: v.array(v.object(cardFields)) },
  returns: v.null(),
  handler: async (ctx, { cards }) => {
    for (const card of cards) {
      const existing = await ctx.db
        .query("cards")
        .withIndex("by_oracle_id", (q) => q.eq("oracleId", card.oracleId))
        .unique();
      if (existing) {
        await ctx.db.patch(existing._id, card);
      } else {
        await ctx.db.insert("cards", card);
      }
    }
    return null;
  },
});

export const getByOracleId = query({
  args: { oracleId: v.string() },
  handler: async (ctx, { oracleId }) => {
    return await ctx.db
      .query("cards")
      .withIndex("by_oracle_id", (q) => q.eq("oracleId", oracleId))
      .unique();
  },
});

export const searchByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    return await ctx.db
      .query("cards")
      .withSearchIndex("search_name", (q) => q.search("name", name))
      .take(20);
  },
});
