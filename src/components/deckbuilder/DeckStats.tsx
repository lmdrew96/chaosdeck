"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const CURVE_BUCKETS = ["0", "1", "2", "3", "4", "5", "6", "7+"];

const COLOR_LABEL: Record<string, string> = {
  W: "White",
  U: "Blue",
  B: "Black",
  R: "Red",
  G: "Green",
};
const COLOR_SWATCH: Record<string, string> = {
  W: "#fff6eb",
  U: "#0080ff",
  B: "#141414",
  R: "#ff0000",
  G: "#00ff91",
};

export default function DeckStats({ deckId }: { deckId: Id<"decks"> }) {
  const entries = useQuery(api.decks.listEntriesWithCards, { deckId });

  if (entries === undefined) {
    return <p className="text-sm text-ash-grey/80">Loading stats…</p>;
  }

  // Mana curve + color stats reflect what actually gets shuffled into the
  // library — the sideboard and companion (never in the deck itself) are
  // excluded.
  const mainboard = entries.filter((e) => e.section === "deck" || e.section === "commander");

  const curveCounts = new Array(CURVE_BUCKETS.length).fill(0);
  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  let nonlandCount = 0;

  for (const entry of mainboard) {
    const card = entry.card;
    if (!card) continue;
    const isLand = card.typeLine?.includes("Land") ?? false;
    if (!isLand) {
      nonlandCount += entry.quantity;
      const bucket = Math.min(Math.floor(card.cmc), 7);
      curveCounts[bucket] += entry.quantity;
      for (const color of card.colors) {
        if (color in colorCounts) colorCounts[color] += entry.quantity;
      }
    }
  }

  const maxCurve = Math.max(1, ...curveCounts);
  const maxColor = Math.max(1, ...Object.values(colorCounts));

  return (
   <div className="flex flex-col gap-5 rounded-[14px] border border-orchid-hush/15 bg-surface-deep/90 p-4 shadow-[0_8px_22px_rgba(0,0,0,0.18)]">
     <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-orchid-hush">Deck stats</h2>

      <div>
       <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
          Mana curve ({nonlandCount} nonland cards)
        </h3>
        <div className="flex items-end gap-2">
          {CURVE_BUCKETS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end">
                <div
                  className="w-full rounded-t bg-orchid-hush"
                  style={{ height: `${(curveCounts[i] / maxCurve) * 100}%` }}
                  title={`${curveCounts[i]} cards`}
                />
              </div>
              <span className="text-[10px] text-ash-grey/80">{label}</span>
              <span className="text-[10px] text-orchid-hush">{curveCounts[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
          Color breakdown
        </h3>
        <div className="flex flex-col gap-1">
          {Object.entries(colorCounts).map(([color, count]) => (
            <div key={color} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-full border border-orchid-hush/20"
                style={{ backgroundColor: COLOR_SWATCH[color] }}
              />
              <span className="w-12 shrink-0 text-xs text-ash-grey/80">{COLOR_LABEL[color]}</span>
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface/70">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(count / maxColor) * 100}%`,
                    backgroundColor: COLOR_SWATCH[color],
                  }}
                />
              </div>
              <span className="w-6 shrink-0 text-right text-xs text-orchid-hush">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
