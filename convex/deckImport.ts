import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import { parseDeckList, DeckSection } from "./deckListParser";

const USER_AGENT = "ChaosDeck/0.1 (MTG deckbuilder/playtester; github.com/lmdrew96)";

const section = v.union(
  v.literal("deck"),
  v.literal("sideboard"),
  v.literal("commander"),
  v.literal("companion"),
);

const resolvedLine = v.object({
  raw: v.string(),
  section,
  quantity: v.number(),
  requestedName: v.string(),
  matchType: v.union(v.literal("exact_local"), v.literal("fuzzy")),
  oracleId: v.string(),
  resolvedName: v.string(),
});

const unresolvedLine = v.object({
  raw: v.string(),
  section,
  quantity: v.number(),
  requestedName: v.string(),
  // "not_found": Scryfall has no match. "ambiguous": name is too generic
  // (Scryfall matched >1 card). "not_cached": Scryfall resolved it, but the
  // card isn't in our local cache yet (non-playable layout, or too new for
  // the last refresh) — every other query in this app reads from the local
  // cache, so a card missing from it can't actually be used downstream.
  reason: v.union(v.literal("not_found"), v.literal("ambiguous"), v.literal("not_cached")),
  suggestions: v.array(v.string()),
});

type FuzzyResult =
  | { ok: true; oracleId: string; name: string }
  | { ok: false; reason: "not_found" | "ambiguous" };

async function fetchScryfallFuzzy(name: string): Promise<FuzzyResult> {
  const res = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(name)}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (res.ok) {
    const card = (await res.json()) as { oracle_id: string; name: string };
    return { ok: true, oracleId: card.oracle_id, name: card.name };
  }
  const error = (await res.json().catch(() => null)) as { type?: string } | null;
  return { ok: false, reason: error?.type === "ambiguous" ? "ambiguous" : "not_found" };
}

async function fetchScryfallSuggestions(name: string): Promise<string[]> {
  const res = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(name)}`, {
    headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
  });
  if (!res.ok) return [];
  const data = (await res.json()) as { data?: string[] };
  return data.data ?? [];
}

// Resolves a pasted deck list against the local card cache first (no
// network), falling back to Scryfall's live fuzzy-name endpoint only for
// lines that don't match locally — most lines in a real deck list are
// spelled correctly, so this keeps live API calls to the handful that
// actually need them, in line with the local-cache-first architecture.
export const importDeckList = action({
  args: { text: v.string() },
  returns: v.object({ resolved: v.array(resolvedLine), unresolved: v.array(unresolvedLine) }),
  handler: async (ctx, { text }) => {
    const parsedLines = parseDeckList(text);
    const resolved: Array<{
      raw: string;
      section: DeckSection;
      quantity: number;
      requestedName: string;
      matchType: "exact_local" | "fuzzy";
      oracleId: string;
      resolvedName: string;
    }> = [];
    const unresolved: Array<{
      raw: string;
      section: DeckSection;
      quantity: number;
      requestedName: string;
      reason: "not_found" | "ambiguous" | "not_cached";
      suggestions: string[];
    }> = [];

    for (const line of parsedLines) {
      const localMatch = await ctx.runQuery(api.cards.findExactByName, { name: line.name });
      if (localMatch) {
        resolved.push({
          raw: line.raw,
          section: line.section,
          quantity: line.quantity,
          requestedName: line.name,
          matchType: "exact_local",
          oracleId: localMatch.oracleId,
          resolvedName: localMatch.name,
        });
        continue;
      }

      // Only unresolved-so-far lines reach Scryfall, and one at a time with
      // a small gap — comfortably under their ~10 req/sec rate limit even
      // for a deck list with many typos.
      await new Promise((resolve) => setTimeout(resolve, 100));
      const fuzzy = await fetchScryfallFuzzy(line.name);

      if (fuzzy.ok) {
        const cached = await ctx.runQuery(api.cards.getByOracleId, { oracleId: fuzzy.oracleId });
        if (cached) {
          resolved.push({
            raw: line.raw,
            section: line.section,
            quantity: line.quantity,
            requestedName: line.name,
            matchType: "fuzzy",
            oracleId: fuzzy.oracleId,
            resolvedName: fuzzy.name,
          });
        } else {
          unresolved.push({
            raw: line.raw,
            section: line.section,
            quantity: line.quantity,
            requestedName: line.name,
            reason: "not_cached",
            suggestions: [fuzzy.name],
          });
        }
        continue;
      }

      const suggestions = await fetchScryfallSuggestions(line.name);
      unresolved.push({
        raw: line.raw,
        section: line.section,
        quantity: line.quantity,
        requestedName: line.name,
        reason: fuzzy.reason,
        suggestions,
      });
    }

    return { resolved, unresolved };
  },
});
