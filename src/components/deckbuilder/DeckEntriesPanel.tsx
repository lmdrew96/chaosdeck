"use client";

import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";

type Section = "deck" | "sideboard" | "commander" | "companion";

const SECTION_ORDER: Section[] = ["commander", "deck", "sideboard", "companion"];
const SECTION_LABEL: Record<Section, string> = {
  commander: "Commander",
  deck: "Deck",
  sideboard: "Sideboard",
  companion: "Companion",
};

type HydratedEntry = Doc<"deckEntries"> & { card: Doc<"cards"> | null };

function legalityBadge(card: Doc<"cards"> | null, format: string) {
  if (!card) return null;
  const status = card.legalities[format];
  if (!status) return { label: "unknown", className: "bg-surface text-ash-grey/80" };
  if (status === "legal") return { label: "legal", className: "bg-muted-teal text-orchid-hush" };
  if (status === "restricted") return { label: "restricted", className: "bg-orchid-hush text-coffee-bean" };
  return { label: status.replace("_", " "), className: "bg-[#cc2e6d] text-orchid-hush/80" };
}

export default function DeckEntriesPanel({
  deckId,
  format,
}: {
  deckId: Id<"decks">;
  format: string;
}) {
  const entries = useQuery(api.decks.listEntriesWithCards, { deckId });
  const setQuantity = useMutation(api.decks.setQuantity);
  const removeCard = useMutation(api.decks.removeCard);
  const moveEntry = useMutation(api.decks.moveEntry);

  if (entries === undefined) {
    return (
      <div className="tech-panel p-4 text-sm text-ash-grey/80">
        Loading deck…
      </div>
    );
  }

  const bySection: Record<Section, HydratedEntry[]> = {
    commander: [],
    deck: [],
    sideboard: [],
    companion: [],
  };
  for (const entry of entries) bySection[entry.section].push(entry);

  const totalCount = (section: Section) =>
    bySection[section].reduce((sum, e) => sum + e.quantity, 0);

  return (
    <div className="tech-panel flex flex-col gap-4 p-4">
      <h2 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">Deck list</h2>
      {SECTION_ORDER.map((section) =>
        bySection[section].length === 0 ? null : (
          <div key={section} className="flex flex-col gap-1">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
              {SECTION_LABEL[section]} ({totalCount(section)})
            </h3>
            {bySection[section]
              .slice()
              .sort((a, b) => (a.card?.name ?? "").localeCompare(b.card?.name ?? ""))
              .map((entry) => {
                const badge = legalityBadge(entry.card, format);
                const isCommanderSingletonViolation =
                  format === "commander" &&
                  section !== "commander" &&
                  entry.quantity > 1 &&
                  !entry.card?.typeLine?.includes("Basic");
                return (
                  <div
                    key={entry._id}
                    className="tech-row flex flex-col gap-2 px-3 py-2 pl-4 xl:flex-row xl:items-center"
                  >
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="truncate text-sm font-medium text-orchid-hush">
                        {entry.card?.name ?? "(unknown card)"}
                      </span>
                      <div className="flex flex-wrap items-center gap-1">
                        {badge && (
                          <span className={`tech-badge px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase ${badge.className}`}>
                            {badge.label}
                          </span>
                        )}
                        {isCommanderSingletonViolation && (
                          <span className="tech-badge bg-[#cc2e6d] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-orchid-hush/80">
                            singleton
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-1">
                      <button
                        onClick={() =>
                          void setQuantity({
                            deckId,
                            section,
                            cardOracleId: entry.cardOracleId,
                            quantity: entry.quantity - 1,
                          })
                        }
                        className="tech-stepper h-7 w-7 text-sm text-orchid-hush/80"
                      >
                        −
                      </button>
                      <span className="w-5 text-center text-sm text-orchid-hush">{entry.quantity}</span>
                      <button
                        onClick={() =>
                          void setQuantity({
                            deckId,
                            section,
                            cardOracleId: entry.cardOracleId,
                            quantity: entry.quantity + 1,
                          })
                        }
                        className="tech-stepper h-7 w-7 text-sm text-orchid-hush/80"
                      >
                        +
                      </button>
                      <select
                        value={section}
                        onChange={(e) =>
                          void moveEntry({
                            deckId,
                            cardOracleId: entry.cardOracleId,
                            fromSection: section,
                            toSection: e.target.value as Section,
                          })
                        }
                        className="tech-control px-2 py-1 font-mono text-xs text-orchid-hush outline-none"
                      >
                        {SECTION_ORDER.map((s) => (
                          <option key={s} value={s}>
                            {SECTION_LABEL[s]}
                          </option>
                        ))}
                      </select>
                      <button
                        onClick={() => void removeCard({ deckId, section, cardOracleId: entry.cardOracleId })}
                        className="text-xs text-ash-grey/80 transition hover:text-orchid-hush"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        ),
      )}
      {entries.length === 0 && (
        <p className="text-sm text-ash-grey/80">No cards yet — search or import to add some.</p>
      )}
    </div>
  );
}
