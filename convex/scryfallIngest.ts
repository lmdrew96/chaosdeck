"use node";

import { v } from "convex/values";
import zlib from "node:zlib";
import { Readable } from "node:stream";
import readline from "node:readline";
import { internalAction } from "./_generated/server";
import { internal } from "./_generated/api";
import { tagOracleText } from "./oracleTagger";

const BATCH_SIZE = 500;
const USER_AGENT = "ChaosDeck/0.1 (MTG deckbuilder/playtester; github.com/lmdrew96)";

// oracle_cards includes non-deck-includable entries alongside real spells:
// art reprints, tokens, and cards for entirely separate formats (Planechase,
// Vanguard, Archenemy). None of these belong in a constructed deckbuilder.
const NON_PLAYABLE_LAYOUTS = new Set([
  "art_series",
  "token",
  "double_faced_token",
  "emblem",
  "planar",
  "vanguard",
  "scheme",
]);

type ScryfallCardFace = {
  name: string;
  oracle_id?: string;
  mana_cost?: string;
  type_line?: string;
  oracle_text?: string;
  colors?: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  image_uris?: { normal?: string };
};

type ScryfallCard = {
  // Absent on "reversible_card" layout — each face carries its own
  // oracle_id instead (see toCardDoc's fallback).
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
  collector_number: string;
  image_uris?: { normal?: string };
  legalities: Record<string, string>;
  prices?: { usd?: string | null };
  produced_mana?: string[];
  scryfall_uri: string;
  keywords?: string[];
  card_faces?: ScryfallCardFace[];
};

// Multi-face cards (transform/MDFC/split/adventure) leave top-level
// mana_cost/type_line/oracle_text/colors/image_uris null — that data lives
// per-face instead. Fall back to the front face (card_faces[0]) for display.
function toCardDoc(raw: ScryfallCard) {
  const front = raw.card_faces?.[0];
  return {
    oracleId: raw.oracle_id ?? front?.oracle_id ?? "",
    name: raw.name,
    manaCost: raw.mana_cost ?? front?.mana_cost ?? undefined,
    cmc: raw.cmc,
    typeLine: raw.type_line ?? front?.type_line ?? undefined,
    oracleText: raw.oracle_text ?? front?.oracle_text ?? undefined,
    colors: raw.colors ?? front?.colors ?? [],
    colorIdentity: raw.color_identity ?? [],
    power: raw.power ?? front?.power ?? undefined,
    toughness: raw.toughness ?? front?.toughness ?? undefined,
    loyalty: raw.loyalty ?? front?.loyalty ?? undefined,
    rarity: raw.rarity,
    setCode: raw.set,
    collectorNumber: raw.collector_number,
    imageUri: raw.image_uris?.normal ?? front?.image_uris?.normal ?? undefined,
    legalities: raw.legalities ?? {},
    priceUsd: raw.prices?.usd ?? undefined,
    producedMana: raw.produced_mana ?? undefined,
    scryfallUri: raw.scryfall_uri,
    // Whole-card property even for multi-face cards — Scryfall doesn't
    // split this per-face.
    keywords: raw.keywords ?? [],
    // Tag the whole-card text; for multi-face cards this is null and each
    // face is tagged from its own oracle_text instead (see cardFaces below).
    tags: tagOracleText(raw.oracle_text, raw.name),
    cardFaces: raw.card_faces?.map((f) => ({
      name: f.name,
      manaCost: f.mana_cost ?? undefined,
      typeLine: f.type_line ?? undefined,
      oracleText: f.oracle_text ?? undefined,
      power: f.power ?? undefined,
      toughness: f.toughness ?? undefined,
      loyalty: f.loyalty ?? undefined,
      imageUri: f.image_uris?.normal ?? undefined,
      tags: tagOracleText(f.oracle_text, f.name),
    })),
  };
}

// Daily refresh covers both cadences Scryfall's docs call out: prices update
// server-side at most once/day, and gameplay text changes far less often
// than that — one daily job satisfies both without a second ingestion path.
export const ingestOracleCards = internalAction({
  args: {},
  returns: v.null(),
  handler: async (ctx) => {
    const listRes = await fetch("https://api.scryfall.com/bulk-data", {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (!listRes.ok) {
      throw new Error(`Scryfall bulk-data list failed: ${listRes.status}`);
    }
    const list = (await listRes.json()) as { data: { type: string; jsonl_download_uri: string }[] };
    const oracleCards = list.data.find((entry) => entry.type === "oracle_cards");
    if (!oracleCards) {
      throw new Error("oracle_cards entry missing from Scryfall bulk-data response");
    }

    const fileRes = await fetch(oracleCards.jsonl_download_uri, {
      headers: { "User-Agent": USER_AGENT },
    });
    if (!fileRes.ok || !fileRes.body) {
      throw new Error(`Scryfall bulk file fetch failed: ${fileRes.status}`);
    }

    // Stream + gunzip + read line-by-line rather than buffering the whole
    // decompressed file (~200MB for oracle_cards) in memory at once.
    const nodeStream = Readable.fromWeb(fileRes.body as Parameters<typeof Readable.fromWeb>[0]);
    const rl = readline.createInterface({ input: nodeStream.pipe(zlib.createGunzip()) });

    let batch: ReturnType<typeof toCardDoc>[] = [];
    let total = 0;
    for await (const line of rl) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const raw = JSON.parse(trimmed) as ScryfallCard;
      if (NON_PLAYABLE_LAYOUTS.has(raw.layout)) continue;
      const doc = toCardDoc(raw);
      if (!doc.oracleId) continue;
      batch.push(doc);
      if (batch.length >= BATCH_SIZE) {
        await ctx.runMutation(internal.cards.upsertBatch, { cards: batch });
        total += batch.length;
        batch = [];
      }
    }
    if (batch.length > 0) {
      await ctx.runMutation(internal.cards.upsertBatch, { cards: batch });
      total += batch.length;
    }

    console.log(`Scryfall ingest: upserted ${total} cards`);
    return null;
  },
});
