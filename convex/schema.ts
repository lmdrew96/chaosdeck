import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// One row per card face, used for both the top-level card and each entry in
// card_faces[] (transform/MDFC/split/adventure cards store name/mana_cost/
// type_line/oracle_text per-face instead of at the card's top level).
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

export default defineSchema({
  cards: defineTable({
    // Scryfall's oracle_id is stable across reprints/sets — our upsert key.
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
    // format -> "legal" | "not_legal" | "banned" | "restricted". Modeled as a
    // record (not a fixed object) because Scryfall adds/renames formats over
    // time (e.g. standardbrawl, competitivebrawl showed up after v1 planning).
    legalities: v.record(v.string(), v.string()),
    priceUsd: v.optional(v.string()),
    scryfallUri: v.string(),
    // Present only for transform/MDFC/split/adventure layouts.
    cardFaces: v.optional(v.array(cardFace)),
  })
    .index("by_oracle_id", ["oracleId"])
    .searchIndex("search_name", { searchField: "name" }),
});
