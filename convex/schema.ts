import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// A clause of oracle text pattern-matched into a trigger/ability category —
// see oracleTagger.ts. Detection, not interpretation: this says the
// capability exists on the card, not that it has fired.
const taggedClause = v.object({
  tag: v.string(),
  optional: v.boolean(),
});

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
  tags: v.array(taggedClause),
});

const phase = v.union(
  v.literal("untap"),
  v.literal("upkeep"),
  v.literal("draw"),
  v.literal("main1"),
  v.literal("combat"),
  v.literal("main2"),
  v.literal("end"),
);

const zone = v.union(
  v.literal("library"),
  v.literal("hand"),
  v.literal("battlefield"),
  v.literal("graveyard"),
  v.literal("exile"),
  v.literal("stack"),
  v.literal("command"),
);

const manaPool = v.object({
  W: v.number(),
  U: v.number(),
  B: v.number(),
  R: v.number(),
  G: v.number(),
  C: v.number(),
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
    tags: v.array(taggedClause),
    // Present only for transform/MDFC/split/adventure layouts.
    cardFaces: v.optional(v.array(cardFace)),
  })
    .index("by_oracle_id", ["oracleId"])
    .searchIndex("search_name", { searchField: "name" }),

  games: defineTable({
    status: v.union(v.literal("active"), v.literal("finished")),
    phase,
    turnNumber: v.number(),
    activePlayerIndex: v.number(),
    playerCount: v.number(),
  }),

  players: defineTable({
    gameId: v.id("games"),
    seatIndex: v.number(),
    displayName: v.string(),
    life: v.number(),
    manaPool,
    // opponent player -> combat damage dealt by that opponent's commander(s).
    // 21+ from a single source is a loss condition regardless of life total.
    commanderDamage: v.record(v.id("players"), v.number()),
    hasLost: v.boolean(),
  }).index("by_game", ["gameId"]),

  // One row per physical card instance in a game (a "4 Lightning Bolt" deck
  // entry becomes 4 separate rows) — zones are unbounded/high-churn, so this
  // is its own table rather than an array field on the player document.
  cardInstances: defineTable({
    gameId: v.id("games"),
    ownerId: v.id("players"),
    zone,
    // Null cardOracleId + tokenName present means this row is a token, not a
    // real card — tokens aren't in the Scryfall cache.
    cardOracleId: v.optional(v.string()),
    tokenName: v.optional(v.string()),
    tokenTypeLine: v.optional(v.string()),
    tokenPower: v.optional(v.string()),
    tokenToughness: v.optional(v.string()),
    // Library order — lower sorts first ("top of library"). Mutable (not
    // creation-time-derived) so a mid-game shuffle can re-randomize order
    // without deleting and reinserting every card.
    position: v.number(),
    tapped: v.boolean(),
    // Cleared automatically whenever a permanent leaves the battlefield —
    // per the real rule, it becomes a new object and loses prior counters.
    summoningSick: v.boolean(),
    counters: v.record(v.string(), v.number()),
  })
    .index("by_game_and_zone", ["gameId", "zone"])
    .index("by_owner_zone_position", ["ownerId", "zone", "position"]),
});
