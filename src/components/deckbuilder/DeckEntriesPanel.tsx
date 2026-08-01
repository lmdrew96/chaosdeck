/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import CardHoverPreview from "@/components/cards/CardHoverPreview";
import { useCardPreview } from "@/components/cards/useCardPreview";
import ManaCost from "./manaCost";
import { getTypeGroupBadges } from "@/lib/cardTypeGroups";

type Section = "deck" | "sideboard" | "commander" | "companion";

const SECTION_ORDER: Section[] = ["commander", "deck", "sideboard", "companion"];
const SECTION_LABEL: Record<Section, string> = {
  commander: "Commander",
  deck: "Deck",
  sideboard: "Sideboard",
  companion: "Companion",
};

type HydratedEntry = Doc<"deckEntries"> & { card: Doc<"cards"> | null };
type SortMode = "alphabetical" | "mana";

type GroupedEntries = Record<string, HydratedEntry[]>;

function sectionCardCount(entries: HydratedEntry[]) {
  return entries.reduce((sum, entry) => sum + entry.quantity, 0);
}

function getCardTypeGroup(typeLine?: string) {
  const normalized = typeLine?.toLowerCase() ?? "";
  if (normalized.includes("land")) return "Lands";
  if (normalized.includes("creature")) return "Creatures";
  if (normalized.includes("planeswalker")) return "Planeswalkers";
  if (normalized.includes("instant")) return "Instants";
  if (normalized.includes("sorcery")) return "Sorceries";
  if (normalized.includes("artifact")) return "Artifacts";
  if (normalized.includes("enchantment")) return "Enchantments";
  if (normalized.includes("battle")) return "Battles";
  if (normalized.includes("token")) return "Tokens";
  return "Other";
}

function sortEntries(entries: HydratedEntry[], mode: SortMode) {
  return [...entries].sort((a, b) => {
    if (mode === "mana") {
      const manaA = a.card?.cmc ?? Number.POSITIVE_INFINITY;
      const manaB = b.card?.cmc ?? Number.POSITIVE_INFINITY;
      if (manaA !== manaB) {
        return manaA - manaB;
      }
    }

    const nameA = a.card?.name ?? "";
    const nameB = b.card?.name ?? "";
    return nameA.localeCompare(nameB);
  });
}

function legalityBadge(card: Doc<"cards"> | null, format: string) {
  if (!card) return null;
  const status = card.legalities[format];
  if (!status) return { label: "unknown", className: "bg-[#5c5c5c] text-white" };
  if (status === "legal") return { label: "legal", className: "bg-muted-teal text-coffee-bean" };
  if (status === "restricted") return { label: "restricted", className: "bg-orchid-hush text-on-accent" };
  return { label: status.replace("_", " "), className: "bg-[#cc2e6d] text-white" };
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
  const [sortMode, setSortMode] = useState<SortMode>("alphabetical");
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});
  const { previewCard, previewPosition, showPreview, clearPreview } = useCardPreview();

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

  const totalPriceUsd = entries.reduce((sum, entry) => {
    const price = entry.card?.priceUsd ? Number(entry.card.priceUsd) : 0;
    return sum + price * entry.quantity;
  }, 0);

  const totalCount = (section: Section) => sectionCardCount(bySection[section]);
  const toggleGroup = (section: Section, groupName: string) => {
    const key = `${section}:${groupName}`;
    setCollapsedGroups((current) => ({ ...current, [key]: !current[key] }));
  };

  const allGroupKeys = SECTION_ORDER.flatMap((section) =>
    Array.from(new Set(bySection[section].map((e) => getCardTypeGroup(e.card?.typeLine)))).map(
      (groupName) => `${section}:${groupName}`,
    ),
  );
  const allCollapsed = allGroupKeys.length > 0 && allGroupKeys.every((key) => collapsedGroups[key]);
  const toggleAllGroups = () => {
    const next: Record<string, boolean> = {};
    for (const key of allGroupKeys) next[key] = !allCollapsed;
    setCollapsedGroups(next);
  };

  const showEntryPreview = (entry: HydratedEntry, element: HTMLElement) => {
    if (!entry.card) return;
    showPreview(
      {
        name: entry.card.name,
        imageUri: entry.printImageUri ?? entry.card.imageUri,
        cardFaces: entry.card.cardFaces,
        oracleText: entry.card.oracleText,
        subtitle: entry.printSetCode ? `${entry.printSetCode} #${entry.printCollectorNumber}` : undefined,
      },
      element,
    );
  };

  const groupedEntries = (section: Section): Array<[string, HydratedEntry[]]> => {
    const sorted = sortEntries(bySection[section], sortMode);
    const groups: GroupedEntries = {};
    for (const entry of sorted) {
      const groupName = getCardTypeGroup(entry.card?.typeLine);
      if (!groups[groupName]) groups[groupName] = [];
      groups[groupName].push(entry);
    }

    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  };

  return (
    <div className="tech-panel flex flex-col gap-4 p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-baseline gap-2">
          <h2 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">Deck list</h2>
          {totalPriceUsd > 0 ? (
            <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-ash-grey/80">
              Est. ${totalPriceUsd.toFixed(2)}
            </span>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={toggleAllGroups}
            disabled={allGroupKeys.length === 0}
            className="font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-grey/80 transition hover:text-orchid-hush disabled:cursor-not-allowed disabled:opacity-50"
          >
            {allCollapsed ? "Expand all" : "Collapse all"}
          </button>
          <label className="flex items-center gap-2 font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
            <span>Sort</span>
            <select
              value={sortMode}
              onChange={(e) => setSortMode(e.target.value as SortMode)}
              className="tech-control px-2 py-1 text-[11px] text-orchid-hush outline-none"
            >
              <option value="alphabetical">Alphabetical</option>
              <option value="mana">Mana value</option>
            </select>
          </label>
        </div>
      </div>
      {SECTION_ORDER.map((section) =>
        bySection[section].length === 0 ? null : (
          <div key={section} className="flex flex-col gap-2">
            <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">
              {SECTION_LABEL[section]} ({totalCount(section)})
            </h3>
            {groupedEntries(section).map(([groupName, groupEntries]) => {
              const key = `${section}:${groupName}`;
              const isCollapsed = collapsedGroups[key] ?? false;
              return (
                <div key={key} className="flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => toggleGroup(section, groupName)}
                    className="flex items-center justify-between rounded-[3px] border border-orchid-hush/20 bg-surface/80 px-3 py-1.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.24em] text-ash-grey/80"
                  >
                    <span>{groupName} ({sectionCardCount(groupEntries)})</span>
                    <span>{isCollapsed ? "▸" : "▾"}</span>
                  </button>
                  {!isCollapsed &&
                    groupEntries.map((entry) => {
                      const badge = legalityBadge(entry.card, format);
                      const isCommanderSection = section === "commander";
                      const isCommanderSingletonViolation =
                        format === "commander" &&
                        section !== "commander" &&
                        entry.quantity > 1 &&
                        !entry.card?.typeLine?.includes("Basic");
                      return (
                        <div
                          key={entry._id}
                          className="tech-row flex flex-col gap-2 px-3 py-2 pl-5 xl:flex-row xl:items-center"
                          onMouseEnter={(event) => showEntryPreview(entry, event.currentTarget)}
                          onMouseLeave={clearPreview}
                        >
                          <div className="flex min-w-0 flex-1 items-start gap-3">
                            {(entry.printImageUri ?? entry.card?.imageUri) ? (
                              <img
                                src={entry.printImageUri ?? entry.card?.imageUri}
                                alt={entry.card?.name ?? "Card image"}
                                className="h-20 w-14 shrink-0 rounded-[3px] border border-orchid-hush/20 object-cover shadow-[0_10px_24px_rgba(0,0,0,0.18)]"
                              />
                            ) : null}
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
                                {getTypeGroupBadges(entry.card?.typeLine).map((group) => (
                                  <span key={group} className="tech-badge border border-orchid-hush/30 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-orchid-hush/80">
                                    {group}
                                  </span>
                                ))}
                                {entry.card?.manaCost ? (
                                  <span className="tech-badge flex items-center gap-1 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-ash-grey/80">
                                    <ManaCost cost={entry.card.manaCost} />
                                  </span>
                                ) : null}
                                {entry.printSetCode ? (
                                  <span className="tech-badge px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-ash-grey/80">
                                    {entry.printSetCode} #{entry.printCollectorNumber}
                                  </span>
                                ) : null}
                                {isCommanderSection ? (
                                  <span className="tech-badge bg-muted-teal px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-coffee-bean">
                                    singleton
                                  </span>
                                ) : null}
                                {isCommanderSingletonViolation && (
                                  <span className="tech-badge bg-[#cc2e6d] px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-white">
                                    singleton
                                  </span>
                                )}
                                {entry.printScryfallUri ? (
                                  <a
                                    href={entry.printScryfallUri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => e.stopPropagation()}
                                    className="font-mono text-[10px] font-semibold uppercase tracking-[0.16em] text-orchid-hush/70 transition hover:text-orchid-hush"
                                  >
                                    Scryfall ↗
                                  </a>
                                ) : null}
                              </div>
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
                              disabled={isCommanderSection && entry.quantity >= 1}
                              title={isCommanderSection && entry.quantity >= 1 ? "Commander section allows only one copy" : undefined}
                              className="tech-stepper h-7 w-7 text-sm text-orchid-hush/80 disabled:cursor-not-allowed disabled:opacity-50"
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
              );
            })}
          </div>
        ),
      )}
      {entries.length === 0 && (
        <p className="text-sm text-ash-grey/80">No cards yet — search or import to add some.</p>
      )}
      <CardHoverPreview card={previewCard} position={previewPosition} />
    </div>
  );
}
