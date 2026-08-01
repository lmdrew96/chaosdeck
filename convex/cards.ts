import { v } from "convex/values";
import { action, internalMutation, query } from "./_generated/server";

const taggedClause = v.object({
  tag: v.string(),
  optional: v.boolean(),
});

const cardFace = v.object({
  name: v.string(),
  manaCost: v.optional(v.string()),
  typeLine: v.optional(v.string()),
  oracleText: v.optional(v.string()),
  power: v.optional(v.string()),
  toughness: v.optional(v.string()),
  loyalty: v.optional(v.string()),
  imageUri: v.optional(v.string()),
  tags: v.array(taggedClause),
});

const publicCardFace = cardFace.omit("tags");

const publicCard = v.object({
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
  setName: v.string(),
  collectorNumber: v.string(),
  releasedAt: v.optional(v.string()),
  imageUri: v.optional(v.string()),
  legalities: v.record(v.string(), v.string()),
  priceUsd: v.optional(v.string()),
  scryfallUri: v.string(),
  keywords: v.array(v.string()),
  cardFaces: v.optional(v.array(publicCardFace)),
});

const ruling = v.object({
  publishedAt: v.string(),
  comment: v.string(),
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
  producedMana: v.optional(v.array(v.string())),
  scryfallUri: v.string(),
  keywords: v.array(v.string()),
  tags: v.array(taggedClause),
  cardFaces: v.optional(v.array(cardFace)),
};

type ScryfallCardFace = {
  name: string;
  oracle_id?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  image_uris?: { normal?: string };
};

type ScryfallCard = {
  // Absent on "reversible_card" layout — each face carries its own
  // oracle_id instead (see toPublicCard's fallback).
  oracle_id?: string;
  name: string;
  layout: string;
  mana_cost?: string;
  cmc: number;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  color_identity: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  rarity: string;
  set: string;
  set_name: string;
  collector_number: string;
  released_at?: string;
  image_uris?: { normal?: string };
  legalities: Record<string, string>;
  prices?: { usd?: string | null };
  scryfall_uri: string;
  keywords?: string[];
  card_faces?: ScryfallCardFace[];
  rulings_uri?: string;
};

function toPublicCard(raw: ScryfallCard) {
  const front = raw.card_faces?.[0];
  const cmc = raw.cmc ?? 0;
  return {
    oracleId: raw.oracle_id ?? front?.oracle_id ?? "",
    name: raw.name,
    manaCost: raw.mana_cost ?? front?.mana_cost ?? undefined,
    cmc,
    typeLine: raw.type_line ?? front?.type_line ?? undefined,
    oracleText: raw.oracle_text ?? front?.oracle_text ?? undefined,
    colors: raw.colors ?? [],
    colorIdentity: raw.color_identity ?? [],
    power: raw.power ?? front?.power ?? undefined,
    toughness: raw.toughness ?? front?.toughness ?? undefined,
    loyalty: raw.loyalty ?? front?.loyalty ?? undefined,
    rarity: raw.rarity,
    setCode: raw.set,
    setName: raw.set_name,
    collectorNumber: raw.collector_number,
    releasedAt: raw.released_at ?? undefined,
    imageUri: raw.image_uris?.normal ?? front?.image_uris?.normal ?? undefined,
    legalities: raw.legalities ?? {},
    priceUsd: raw.prices?.usd ?? undefined,
    scryfallUri: raw.scryfall_uri,
    keywords: raw.keywords ?? [],
    cardFaces: raw.card_faces?.map((face) => ({
      name: face.name,
      manaCost: face.mana_cost ?? undefined,
      typeLine: face.type_line ?? undefined,
      oracleText: face.oracle_text ?? undefined,
      power: face.power ?? undefined,
      toughness: face.toughness ?? undefined,
      loyalty: face.loyalty ?? undefined,
      imageUri: face.image_uris?.normal ?? undefined,
    })),
  };
}

async function fetchScryfallSearch(queryOrUrl: string, unique: "cards" | "prints", cursor = false) {
  const url = cursor
    ? queryOrUrl
    : `https://api.scryfall.com/cards/search?q=${encodeURIComponent(queryOrUrl)}&unique=${unique}&order=released&dir=desc`;
  const res = await fetch(url, {
    headers: { "User-Agent": "ChaosDeck/0.1 (MTG deckbuilder/playtester; github.com/lmdrew96)", Accept: "application/json" },
  });
  if (res.status === 404) {
    return { data: [], nextPage: null };
  }
  if (!res.ok) {
    throw new Error(`Scryfall search failed: ${res.status}`);
  }
  const data = (await res.json()) as { data?: ScryfallCard[]; has_more?: boolean; next_page?: string };
  return {
    data: data.data ?? [],
    nextPage: data.has_more ? data.next_page ?? null : null,
  };
}

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

// Case-insensitive exact-name lookup for deck import: an exact match should
// always land in the search index's top results for its own name, so this
// reuses search_name rather than needing a separate index.
export const findExactByName = query({
  args: { name: v.string() },
  handler: async (ctx, { name }) => {
    const candidates = await ctx.db
      .query("cards")
      .withSearchIndex("search_name", (q) => q.search("name", name))
      .take(20);
    const target = name.trim().toLowerCase();
    return candidates.find((c) => c.name.toLowerCase() === target) ?? null;
  },
});

export const searchCards = action({
  args: { query: v.string(), cursor: v.optional(v.string()) },
  returns: v.object({
    cards: v.array(publicCard),
    nextPage: v.union(v.string(), v.null()),
  }),
  handler: async (_, { query, cursor }) => {
    const page = cursor ? await fetchScryfallSearch(cursor, "cards", true) : await fetchScryfallSearch(query, "cards");
    return {
      cards: page.data.map(toPublicCard).filter((card) => card.oracleId),
      nextPage: page.nextPage,
    };
  },
});

export const getCardPrintings = action({
  args: { oracleId: v.string() },
  returns: v.object({
    oracleId: v.string(),
    name: v.string(),
    printings: v.array(publicCard),
    rulings: v.array(ruling),
  }),
  handler: async (_, { oracleId }) => {
    const printings = await fetchScryfallSearch(`oracleid:${oracleId}`, "prints");
    if (printings.data.length === 0) {
      throw new Error("Scryfall printings not found");
    }

    let rulings: Array<{ publishedAt: string; comment: string }> = [];
    const first = printings.data[0];
    if (first.rulings_uri) {
      const rulingsRes = await fetch(first.rulings_uri, {
        headers: { "User-Agent": "ChaosDeck/0.1 (MTG deckbuilder/playtester; github.com/lmdrew96)", Accept: "application/json" },
      });
      if (!rulingsRes.ok) {
        throw new Error(`Scryfall rulings fetch failed: ${rulingsRes.status}`);
      }
      const rulingsData = (await rulingsRes.json()) as { data?: Array<{ published_at: string; comment: string }> };
      rulings = (rulingsData.data ?? []).map((rulingItem) => ({
        publishedAt: rulingItem.published_at,
        comment: rulingItem.comment,
      }));
    }

    return {
      oracleId,
      name: first.name,
      // Reversible-layout printings (e.g. novelty reversible basic lands)
      // can resolve to a different face's oracle_id than the one searched
      // for — drop any that didn't resolve at all rather than fail the
      // whole call.
      printings: printings.data.map(toPublicCard).filter((card) => card.oracleId),
      rulings,
    };
  },
});
