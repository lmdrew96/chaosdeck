"use client";

import { useEffect, useState } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type RecommendedCard = {
  name: string;
  synergy: number;
  numDecks: number;
  potentialDecks: number;
  oracleId: string | null;
};
type RecommendationCategory = { tag: string; header: string; cards: RecommendedCard[] };

export default function EDHRecommendations({ deckId }: { deckId: Id<"decks"> }) {
  const deck = useQuery(api.decks.getDeck, { deckId });
  const entries = useQuery(api.decks.listEntriesWithCards, { deckId });
  const getCommanderRecommendations = useAction(api.edhrec.getCommanderRecommendations);
  const addCard = useMutation(api.decks.addCard);
  const [addedOracleIds, setAddedOracleIds] = useState<Set<string>>(new Set());

  const commanders = (entries ?? []).filter((e) => e.section === "commander" && e.card);
  const commanderKey = commanders.map((e) => e.card!.name).join("|");

  const [categories, setCategories] = useState<RecommendationCategory[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (deck?.format !== "commander" || !commanderKey) {
        if (!cancelled) setCategories(null);
        return;
      }
      if (cancelled) return;
      setLoading(true);
      setError(null);
      try {
        const perCommander = await Promise.all(
          commanderKey.split("|").map((name) => getCommanderRecommendations({ commanderName: name })),
        );
        if (cancelled) return;
        const merged = new Map<string, RecommendationCategory>();
        for (const forCommander of perCommander) {
          if (!forCommander) continue;
          for (const category of forCommander) {
            const existing = merged.get(category.tag);
            if (!existing) {
              merged.set(category.tag, { ...category, cards: [...category.cards] });
              continue;
            }
            const seen = new Set(existing.cards.map((c) => c.name));
            for (const card of category.cards) {
              if (!seen.has(card.name)) existing.cards.push(card);
            }
          }
        }
        setCategories(Array.from(merged.values()));
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Failed to load EDHREC recommendations");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [deck?.format, commanderKey, getCommanderRecommendations]);

  if (deck?.format !== "commander" || commanders.length === 0) return null;

  const inDeckOracleIds = new Set((entries ?? []).filter((e) => e.section !== "sideboard").map((e) => e.cardOracleId));

  const handleAdd = async (card: RecommendedCard) => {
    if (!card.oracleId) return;
    await addCard({ deckId, section: "deck", cardOracleId: card.oracleId });
    setAddedOracleIds((current) => new Set(current).add(card.oracleId!));
  };

  return (
    <div className="tech-panel flex flex-col gap-4 p-4">
      <h2 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">EDHREC recommendations</h2>

      {loading && <p className="text-xs text-ash-grey/80">Loading recommendations…</p>}
      {error && <p className="text-xs text-[#cc2e6d]">{error}</p>}
      {!loading && !error && categories?.every((c) => c.cards.length === 0) && (
        <p className="text-xs text-ash-grey/80">No recommendations found for this commander.</p>
      )}

      {categories?.map((category) =>
        category.cards.length === 0 ? null : (
          <div key={category.tag} className="flex flex-col gap-2">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">{category.header}</h3>
            <div className="flex flex-col gap-1">
              {category.cards.map((card) => {
                const alreadyIn = Boolean(card.oracleId && (inDeckOracleIds.has(card.oracleId) || addedOracleIds.has(card.oracleId)));
                const inclusionPct = card.potentialDecks > 0 ? Math.round((card.numDecks / card.potentialDecks) * 100) : 0;
                return (
                  <div key={card.name} className="tech-row flex items-center justify-between gap-2 px-3 py-1.5">
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-xs font-medium text-orchid-hush">{card.name}</span>
                      <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-ash-grey/60">{inclusionPct}% of decks</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleAdd(card)}
                      disabled={!card.oracleId || alreadyIn}
                      title={!card.oracleId ? "Not in local card cache" : undefined}
                      className="tech-button tech-button-compact bg-orchid-hush px-2 py-1 text-xs font-semibold text-coffee-bean disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {alreadyIn ? "✓ In deck" : "Add"}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        ),
      )}

      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-ash-grey/60">
        Sourced from EDHREC&apos;s unofficial data feed — may occasionally be unavailable.
      </p>
    </div>
  );
}
