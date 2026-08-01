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
const COLORS = ["W", "U", "B", "R", "G"];

// Colored pips a mana cost demands, e.g. "{1}{W}{W}" -> { W: 2 }. Hybrid
// symbols ("{W/U}", "{2/W}") count toward every color side, since either
// can satisfy the cost. Generic/phyrexian/colorless parts are skipped.
function extractPips(manaCost?: string): Partial<Record<string, number>> {
  const pips: Partial<Record<string, number>> = {};
  if (!manaCost) return pips;
  for (const raw of manaCost.match(/\{[^}]+\}/g) ?? []) {
    for (const part of raw.slice(1, -1).toUpperCase().split("/")) {
      if (COLORS.includes(part)) pips[part] = (pips[part] ?? 0) + 1;
    }
  }
  return pips;
}

// P(at least one success in `draws` cards drawn without replacement) via the
// sequential product form of the hypergeometric distribution — avoids
// factorial overflow for deck-sized N.
function probAtLeastOne(deckSize: number, successes: number, draws: number) {
  if (successes <= 0 || deckSize <= 0) return 0;
  const failures = deckSize - successes;
  const k = Math.min(draws, deckSize);
  if (k > failures) return 1;
  let probNone = 1;
  for (let i = 0; i < k; i++) {
    probNone *= (failures - i) / (deckSize - i);
  }
  return 1 - probNone;
}

const DRAW_STEPS = [
  { label: "Opening hand", cards: 7 },
  { label: "+1 draw", cards: 8 },
  { label: "+2 draws", cards: 9 },
  { label: "+3 draws", cards: 10 },
];

const QUANTITY_WORDS = new Set([
  "a", "an", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "x",
]);

// Best-effort extraction of "create ... token(s)" phrasing from oracle text.
// This is pattern matching, not a rules parser — unusual templating (e.g.
// "create a token that's a copy of...") won't produce a useful descriptor,
// but the common "create a 1/1 white Soldier creature token" phrasing does.
function extractTokenDescriptors(text?: string): string[] {
  if (!text) return [];
  const descriptors: string[] = [];
  for (const match of text.matchAll(/creates?\s+([^.]*?)\s+tokens?\b/gi)) {
    const words = match[1].trim().split(/\s+/);
    while (words.length && QUANTITY_WORDS.has(words[0].toLowerCase().replace(/,$/, ""))) {
      words.shift();
    }
    const descriptor = words.join(" ").replace(/,$/, "").trim();
    if (descriptor) descriptors.push(descriptor);
  }
  return descriptors;
}

export default function DeckStats({ deckId }: { deckId: Id<"decks"> }) {
  const entries = useQuery(api.decks.listEntriesWithCards, { deckId });

  if (entries === undefined) {
    return <div className="tech-panel p-4 text-sm text-ash-grey/80">Loading stats…</div>;
  }

  // Mana curve + color stats reflect what actually gets shuffled into the
  // library — the sideboard and companion (never in the deck itself) are
  // excluded.
  const mainboard = entries.filter((e) => e.section === "deck" || e.section === "commander");

  const curveCounts = new Array(CURVE_BUCKETS.length).fill(0);
  const colorCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  let nonlandCount = 0;
  let totalManaValue = 0;
  let manaValueCount = 0;

  for (const entry of mainboard) {
    const card = entry.card;
    if (!card) continue;
    const isLand = card.typeLine?.includes("Land") ?? false;
    if (!isLand) {
      nonlandCount += entry.quantity;
      const bucket = Math.min(Math.floor(card.cmc), 7);
      curveCounts[bucket] += entry.quantity;
      totalManaValue += (card.cmc ?? 0) * entry.quantity;
      manaValueCount += entry.quantity;
      for (const color of card.colors) {
        if (color in colorCounts) colorCounts[color] += entry.quantity;
      }
    }
  }

  const maxCurve = Math.max(1, ...curveCounts);
  const maxColor = Math.max(1, ...Object.values(colorCounts));
  const averageManaValue = manaValueCount > 0 ? totalManaValue / manaValueCount : 0;

  // Mana sources (what the deck can produce) vs. pip demand (what its
  // spells actually cost) — sources come from every mainboard card with a
  // producedMana ability (lands, rocks, dorks), demand only from nonland
  // spells' mana costs.
  const sourceCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  const pipCounts: Record<string, number> = { W: 0, U: 0, B: 0, R: 0, G: 0 };
  for (const entry of mainboard) {
    const card = entry.card;
    if (!card) continue;
    for (const color of card.producedMana ?? []) {
      if (color in sourceCounts) sourceCounts[color] += entry.quantity;
    }
    if (!(card.typeLine?.includes("Land") ?? false)) {
      const pips = extractPips(card.manaCost);
      for (const [color, count] of Object.entries(pips)) {
        pipCounts[color] += (count ?? 0) * entry.quantity;
      }
    }
  }
  const maxSource = Math.max(1, ...Object.values(sourceCounts));
  const maxPip = Math.max(1, ...Object.values(pipCounts));

  // Draw probability uses only the "deck" section — the actual shuffled
  // library. Commander sits in the command zone and never gets drawn into,
  // so it's excluded here even though the curve/color stats above fold it
  // into "mainboard" for simplicity.
  const libraryEntries = entries.filter((e) => e.section === "deck");
  const librarySize = libraryEntries.reduce((sum, e) => sum + e.quantity, 0);
  const libraryLandCount = libraryEntries.reduce(
    (sum, e) => sum + (e.card?.typeLine?.includes("Land") ? e.quantity : 0),
    0,
  );

  // Tokens the deck's cards can create, so the player knows what to have on
  // hand before a game — covers deck/commander/companion (cards that can
  // actually enter play), not the sideboard.
  const tokenSources: Record<string, { descriptor: string; cards: Set<string> }> = {};
  for (const entry of entries) {
    if (entry.section === "sideboard" || !entry.card) continue;
    const texts = entry.card.cardFaces?.length
      ? entry.card.cardFaces.map((f) => f.oracleText)
      : [entry.card.oracleText];
    for (const text of texts) {
      for (const descriptor of extractTokenDescriptors(text)) {
        const key = descriptor.toLowerCase();
        if (!tokenSources[key]) tokenSources[key] = { descriptor, cards: new Set() };
        tokenSources[key].cards.add(entry.card.name);
      }
    }
  }
  const tokenEntries = Object.values(tokenSources).sort((a, b) => a.descriptor.localeCompare(b.descriptor));

  return (
    <div className="tech-panel flex flex-col gap-5 p-4">
      <h2 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">Deck stats</h2>

      <div>
        <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
          Mana curve ({nonlandCount} nonland cards)
        </h3>
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-ash-grey/80">
          <span className="font-mono uppercase tracking-[0.24em] text-ash-grey/60">Average mana value</span>
          <span className="text-sm font-semibold text-orchid-hush">
            {averageManaValue.toFixed(1)}
          </span>
        </div>
        <div className="flex items-end gap-2">
          {CURVE_BUCKETS.map((label, i) => (
            <div key={label} className="flex flex-1 flex-col items-center gap-1">
              <div className="tech-meter flex h-24 w-full items-end overflow-hidden rounded-[3px]">
                <div
                  className="w-full bg-orchid-hush shadow-[0_0_14px_rgba(241,202,238,0.38)]"
                  style={{ height: `${(curveCounts[i] / maxCurve) * 100}%` }}
                  title={`${curveCounts[i]} cards`}
                />
              </div>
              <span className="font-mono text-[10px] text-ash-grey/80">{label}</span>
              <span className="font-mono text-[10px] text-orchid-hush">{curveCounts[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
          Color breakdown
        </h3>
        <div className="flex flex-col gap-1">
          {Object.entries(colorCounts).map(([color, count]) => (
            <div key={color} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-[3px] border border-orchid-hush/20 shadow-[0_0_10px_rgba(241,202,238,0.14)]"
                style={{ backgroundColor: COLOR_SWATCH[color] }}
              />
              <span className="w-12 shrink-0 text-xs text-ash-grey/80">{COLOR_LABEL[color]}</span>
              <div className="tech-meter h-2 flex-1 overflow-hidden rounded-[3px]">
                <div
                  className="h-full rounded-[2px]"
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

      <div>
        <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
          Mana sources vs. pip demand
        </h3>
        <div className="flex flex-col gap-2">
          {COLORS.map((color) => (
            <div key={color} className="flex items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-[3px] border border-orchid-hush/20 shadow-[0_0_10px_rgba(241,202,238,0.14)]"
                style={{ backgroundColor: COLOR_SWATCH[color] }}
              />
              <span className="w-12 shrink-0 text-xs text-ash-grey/80">{COLOR_LABEL[color]}</span>
              <div className="flex flex-1 flex-col gap-1">
                <div className="flex items-center gap-1">
                  <span className="w-14 shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-ash-grey/60">Sources</span>
                  <div className="tech-meter h-1.5 flex-1 overflow-hidden rounded-[2px]">
                    <div
                      className="h-full rounded-[2px]"
                      style={{ width: `${(sourceCounts[color] / maxSource) * 100}%`, backgroundColor: COLOR_SWATCH[color] }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right text-[10px] text-orchid-hush">{sourceCounts[color]}</span>
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-14 shrink-0 font-mono text-[9px] uppercase tracking-[0.14em] text-ash-grey/60">Pips</span>
                  <div className="tech-meter h-1.5 flex-1 overflow-hidden rounded-[2px]">
                    <div
                      className="h-full rounded-[2px] opacity-60"
                      style={{ width: `${(pipCounts[color] / maxPip) * 100}%`, backgroundColor: COLOR_SWATCH[color] }}
                    />
                  </div>
                  <span className="w-5 shrink-0 text-right text-[10px] text-orchid-hush">{pipCounts[color]}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
          Land draw probability
        </h3>
        {librarySize === 0 ? (
          <p className="text-xs text-ash-grey/80">Add cards to the deck section to see draw odds.</p>
        ) : (
          <div className="flex flex-col gap-1">
            {DRAW_STEPS.map((step) => {
              const probability = probAtLeastOne(librarySize, libraryLandCount, step.cards);
              return (
                <div key={step.label} className="flex items-center gap-2">
                  <span className="w-24 shrink-0 text-xs text-ash-grey/80">{step.label}</span>
                  <div className="tech-meter h-2 flex-1 overflow-hidden rounded-[3px]">
                    <div className="h-full rounded-[2px] bg-muted-teal" style={{ width: `${probability * 100}%` }} />
                  </div>
                  <span className="w-10 shrink-0 text-right text-xs text-orchid-hush">{(probability * 100).toFixed(0)}%</span>
                </div>
              );
            })}
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ash-grey/60">
              Chance of at least one land, based on {libraryLandCount} lands in {librarySize} library cards.
            </p>
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
          Tokens needed
        </h3>
        {tokenEntries.length === 0 ? (
          <p className="text-xs text-ash-grey/80">No token-creating cards detected.</p>
        ) : (
          <>
            <div className="flex flex-col gap-1">
              {tokenEntries.map(({ descriptor, cards }) => (
                <div key={descriptor} className="flex flex-wrap items-baseline gap-x-2 text-xs">
                  <span className="text-orchid-hush">{descriptor}</span>
                  <span className="text-ash-grey/60">— {Array.from(cards).join(", ")}</span>
                </div>
              ))}
            </div>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-ash-grey/60">
              Matched from oracle text — unusual templating may be missed or imprecise.
            </p>
          </>
        )}
      </div>
    </div>
  );
}
