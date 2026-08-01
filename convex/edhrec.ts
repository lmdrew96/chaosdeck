import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";

const USER_AGENT = "ChaosDeck/0.1 (MTG deckbuilder/playtester; github.com/lmdrew96)";

const recommendedCard = v.object({
  name: v.string(),
  synergy: v.number(),
  numDecks: v.number(),
  potentialDecks: v.number(),
  oracleId: v.union(v.string(), v.null()),
});

const recommendationCategory = v.object({
  tag: v.string(),
  header: v.string(),
  cards: v.array(recommendedCard),
});

// EDHREC's own slug for a card name: lowercase, strip commas/apostrophes,
// collapse everything else (spaces, punctuation) to single hyphens.
function slugifyCardName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[',]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

type EdhrecCardview = { name: string; synergy: number; num_decks: number; potential_decks: number };
type EdhrecCardlist = { tag: string; header: string; cardviews: EdhrecCardview[] };
type EdhrecCommanderPage = { container?: { json_dict?: { cardlists?: EdhrecCardlist[] } } };

type ResolvedCard = {
  name: string;
  synergy: number;
  numDecks: number;
  potentialDecks: number;
  oracleId: string | null;
};
type ResolvedCategory = { tag: string; header: string; cards: ResolvedCard[] };

// "Top cards" (most-played with this commander) and "high synergy" (cards
// that overperform specifically with it) are the two lists a deckbuilder
// actually wants — the rest (per-type breakdowns, lands, similar commanders)
// are either redundant with these or out of scope for a recommendation list.
const WANTED_TAGS = new Set(["topcards", "highsynergycards"]);

// EDHREC has no official public API — this hits the same undocumented
// json.edhrec.com endpoints its own site uses to render commander pages.
// It's unauthenticated and widely relied on by community MTG tools, but the
// response shape isn't a documented contract and could change without
// notice.
export const getCommanderRecommendations = action({
  args: { commanderName: v.string() },
  returns: v.union(v.array(recommendationCategory), v.null()),
  handler: async (ctx, { commanderName }): Promise<ResolvedCategory[] | null> => {
    const slug = slugifyCardName(commanderName);
    const res = await fetch(`https://json.edhrec.com/pages/commanders/${slug}.json`, {
      headers: { "User-Agent": USER_AGENT, Accept: "application/json" },
    });
    if (res.status === 404) return null;
    if (!res.ok) {
      throw new Error(`EDHREC fetch failed: ${res.status}`);
    }
    const data = (await res.json()) as EdhrecCommanderPage;
    const cardlists = (data.container?.json_dict?.cardlists ?? []).filter((cl) => WANTED_TAGS.has(cl.tag));

    const categories: ResolvedCategory[] = [];
    for (const cardlist of cardlists) {
      const cards: ResolvedCard[] = [];
      for (const cardview of cardlist.cardviews) {
        // Resolve against our local Scryfall cache so the UI can add a
        // recommendation to the deck without a second round trip.
        const local = await ctx.runQuery(api.cards.findExactByName, { name: cardview.name });
        cards.push({
          name: cardview.name,
          synergy: cardview.synergy,
          numDecks: cardview.num_decks,
          potentialDecks: cardview.potential_decks,
          oracleId: local?.oracleId ?? null,
        });
      }
      categories.push({ tag: cardlist.tag, header: cardlist.header, cards });
    }
    return categories;
  },
});
