/* eslint-disable @next/next/no-img-element */
"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useEffect, useRef, useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import ManaCost from "@/components/deckbuilder/manaCost";

type Section = "deck" | "sideboard" | "commander" | "companion";

const SECTIONS: Section[] = ["deck", "sideboard", "commander", "companion"];

type PublicCardFace = {
  name: string;
  manaCost?: string;
  typeLine?: string;
  oracleText?: string;
  power?: string;
  toughness?: string;
  loyalty?: string;
  imageUri?: string;
};

type PublicCard = {
  oracleId: string;
  name: string;
  manaCost?: string;
  cmc: number;
  typeLine?: string;
  oracleText?: string;
  colors: string[];
  colorIdentity: string[];
  power?: string;
  toughness?: string;
  loyalty?: string;
  rarity: string;
  setCode: string;
  setName: string;
  collectorNumber: string;
  releasedAt?: string;
  imageUri?: string;
  legalities: Record<string, string>;
  priceUsd?: string;
  scryfallUri: string;
  keywords: string[];
  cardFaces?: PublicCardFace[];
};

type CardPrintings = {
  oracleId: string;
  name: string;
  printings: PublicCard[];
  rulings: Array<{ publishedAt: string; comment: string }>;
};

type CardBrowserProps = {
  deckId?: Id<"decks">;
  title?: string;
  description?: string;
  className?: string;
};

export default function CardBrowser({
  deckId,
  title = "Card search",
  description,
  className,
}: CardBrowserProps) {
  const searchCards = useAction(api.cards.searchCards);
  const getCardPrintings = useAction(api.cards.getCardPrintings);
  const addCard = useMutation(api.decks.addCard);
  const deckEntries = useQuery(api.decks.listEntriesWithCards, deckId ? { deckId } : "skip");

  const [term, setTerm] = useState("");
  const [results, setResults] = useState<PublicCard[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hoveredOracleId, setHoveredOracleId] = useState<string | null>(null);
  const [selectedCard, setSelectedCard] = useState<PublicCard | null>(null);
  const [cardPrintings, setCardPrintings] = useState<CardPrintings | null>(null);
  const [printingsLoading, setPrintingsLoading] = useState(false);
  const [selectedPrintingIndex, setSelectedPrintingIndex] = useState(0);
  const [modalSection, setModalSection] = useState<Section>("deck");
  const [addFeedbackKey, setAddFeedbackKey] = useState<string | null>(null);
  const [addError, setAddError] = useState<string | null>(null);
  const requestId = useRef(0);
  const addFeedbackTimeout = useRef<number | null>(null);

  const commanderCopiesFor = (oracleId: string) =>
    deckEntries?.reduce((count, entry) => count + (entry.section === "commander" && entry.cardOracleId === oracleId ? entry.quantity : 0), 0) ?? 0;

  const showAddFeedback = (key: string) => {
    if (addFeedbackTimeout.current !== null) {
      window.clearTimeout(addFeedbackTimeout.current);
    }
    setAddFeedbackKey(key);
    addFeedbackTimeout.current = window.setTimeout(() => {
      setAddFeedbackKey((current) => (current === key ? null : current));
      addFeedbackTimeout.current = null;
    }, 900);
  };

  useEffect(() => {
    return () => {
      if (addFeedbackTimeout.current !== null) {
        window.clearTimeout(addFeedbackTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const query = term.trim();
    if (!query) {
      requestId.current += 1;
      return;
    }

    const currentRequest = ++requestId.current;

    const timeout = window.setTimeout(async () => {
      try {
        setSearching(true);
        setSearchError(null);
        const cards = await searchCards({ query });
        if (requestId.current === currentRequest) {
          setResults(cards);
          setHoveredOracleId(cards[0]?.oracleId ?? null);
        }
      } catch (error) {
        if (requestId.current === currentRequest) {
          setResults([]);
          setSearchError(error instanceof Error ? error.message : "Search failed");
        }
      } finally {
        if (requestId.current === currentRequest) {
          setSearching(false);
        }
      }
    }, 250);

    return () => window.clearTimeout(timeout);
  }, [searchCards, term]);

  useEffect(() => {
    if (!selectedCard) return;

    let cancelled = false;

    void getCardPrintings({ oracleId: selectedCard.oracleId })
      .then((cardDetails) => {
        if (!cancelled) {
          setCardPrintings(cardDetails);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setPrintingsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [getCardPrintings, selectedCard]);

  const hasQuery = term.trim().length > 0;
  const visibleResults = hasQuery ? results : [];
  const visibleSearchError = hasQuery ? searchError : null;
  const visibleSearching = hasQuery && searching;
  const hoveredCard = visibleResults.find((card) => card.oracleId === hoveredOracleId) ?? visibleResults[0] ?? null;
  const activeCard = selectedCard ?? hoveredCard;
  const selectedPrinting =
    selectedCard && cardPrintings?.oracleId === selectedCard.oracleId
      ? cardPrintings.printings[selectedPrintingIndex] ?? selectedCard
      : selectedCard ?? hoveredCard;

  const handleAddCard = async (card: PublicCard, section: Section) => {
    if (!deckId) return;
    try {
      await addCard({
        deckId,
        section,
        cardOracleId: card.oracleId,
        quantity: 1,
        printSetCode: card.setCode,
        printCollectorNumber: card.collectorNumber,
        printImageUri: card.imageUri,
        printScryfallUri: card.scryfallUri,
      });
      setAddError(null);
      showAddFeedback(`${card.oracleId}:${section}`);
    } catch (error) {
      setAddError(error instanceof Error ? error.message : "Add failed");
    }
  };

  const handleAddSelected = async () => {
    if (!deckId || !selectedPrinting) return;
    await handleAddCard(selectedPrinting, modalSection);
  };

  return (
    <div className={className ?? "tech-panel flex flex-col gap-4 p-4"}>
      <div className="flex flex-col gap-1">
        <h2 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">{title}</h2>
        {description ? <p className="text-xs text-ash-grey/80">{description}</p> : null}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(280px,0.85fr)]">
        <div className="flex flex-col gap-3">
          <input
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search cards or Scryfall syntax…"
            className="tech-control px-3 py-2 text-sm text-orchid-hush outline-none transition"
          />
          {addError ? <p className="text-xs text-[#cc2e6d]">{addError}</p> : null}

          <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto pr-1">
            {!hasQuery && <p className="text-xs text-ash-grey/80">Search by name or use Scryfall syntax like <span className="font-mono">o=draw c=u</span>.</p>}
            {visibleSearching && <p className="text-xs text-ash-grey/80">Searching…</p>}
            {visibleSearchError && <p className="text-xs text-[#cc2e6d]">{visibleSearchError}</p>}
            {hasQuery && !visibleSearching && !visibleSearchError && visibleResults.length === 0 && (
              <p className="text-xs text-ash-grey/80">No cards found.</p>
            )}
            {visibleResults.map((card) => (
              <CardResultRow
                key={card.oracleId}
                card={card}
                allowAdd={Boolean(deckId)}
                onHover={() => setHoveredOracleId(card.oracleId)}
                onLeave={() => setHoveredOracleId((current) => (current === card.oracleId ? null : current))}
                onOpen={() => {
                  setPrintingsLoading(true);
                  setSelectedPrintingIndex(0);
                  setModalSection("deck");
                  setCardPrintings(null);
                  setSelectedCard(card);
                }}
                onAdd={(section) => void handleAddCard(card, section)}
                commanderCopies={commanderCopiesFor(card.oracleId)}
                addFeedbackKey={addFeedbackKey}
              />
            ))}
          </div>
        </div>

        <div className="tech-panel flex min-h-[22rem] flex-col gap-3 p-4">
          <h3 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">Preview</h3>
          {activeCard ? (
            <CardPreview card={activeCard} />
          ) : (
            <p className="text-sm text-ash-grey/80">Hover a result to preview its art, then click the name for printings and rulings.</p>
          )}
        </div>
      </div>

      {selectedCard && (
        <CardModal
          card={selectedCard}
          printings={cardPrintings}
          loading={printingsLoading}
          selectedPrintingIndex={selectedPrintingIndex}
          onClose={() => setSelectedCard(null)}
          onSelectPrinting={setSelectedPrintingIndex}
          section={modalSection}
          onSectionChange={setModalSection}
          onAdd={deckId && selectedPrinting ? () => void handleAddSelected() : undefined}
          allowAdd={Boolean(deckId)}
          commanderCopies={selectedPrinting ? commanderCopiesFor(selectedPrinting.oracleId) : 0}
          addFeedbackKey={addFeedbackKey}
        />
      )}
    </div>
  );
}

function CardResultRow({
  card,
  allowAdd,
  onHover,
  onLeave,
  onOpen,
  onAdd,
  commanderCopies,
  addFeedbackKey,
}: {
  card: PublicCard;
  allowAdd: boolean;
  onHover: () => void;
  onLeave: () => void;
  onOpen: () => void;
  onAdd: (section: Section) => void;
  commanderCopies: number;
  addFeedbackKey: string | null;
}) {
  const [section, setSection] = useState<Section>("deck");
  const isAdded = addFeedbackKey === `${card.oracleId}:${section}`;
  const commanderBlocked = section === "commander" && commanderCopies > 0;
  const commanderRecentlyAdded = section === "commander" && isAdded;

  return (
    <div className="tech-row flex flex-col gap-2 px-3 py-2 pl-4 sm:flex-row sm:items-center sm:justify-between" onMouseEnter={onHover} onMouseLeave={onLeave}>
      <div className="flex min-w-0 flex-1 flex-col">
        <button
          type="button"
          onClick={onOpen}
          className="truncate text-left text-sm font-medium text-orchid-hush transition hover:brightness-110"
        >
          {card.name}
        </button>
        <div className="flex flex-wrap items-center gap-1 text-xs text-ash-grey/80">
          <span className="truncate">{card.typeLine ?? ""}</span>
          {card.manaCost ? (
            <>
              <span>·</span>
              <ManaCost cost={card.manaCost} className="shrink-0" />
            </>
          ) : null}
          <span>·</span>
          <span className="font-mono uppercase tracking-[0.16em]">{card.setCode}</span>
          <span>#{card.collectorNumber}</span>
        </div>
      </div>

      {allowAdd ? (
        <div className="flex shrink-0 flex-col gap-1">
          <div className="flex items-center gap-1">
            <select
              value={section}
              onChange={(e) => setSection(e.target.value as Section)}
              className="tech-control px-2 py-1 font-mono text-xs text-orchid-hush/80 outline-none"
            >
              {SECTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => onAdd(section)}
              disabled={commanderBlocked || commanderRecentlyAdded}
              title={commanderBlocked ? "Commander section allows only one copy" : undefined}
              className="tech-button tech-button-compact bg-orchid-hush px-2 py-1 text-xs font-semibold text-coffee-bean disabled:cursor-not-allowed disabled:opacity-50"
            >
              {commanderRecentlyAdded ? "✓ Added" : commanderBlocked ? "1 max" : "Add"}
            </button>
          </div>
          {commanderBlocked ? <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ash-grey/80">Commander is singleton.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function CardPreview({ card }: { card: PublicCard }) {
  return (
    <div className="flex flex-col gap-3">
      {card.cardFaces?.length ? (
        <div className={`grid gap-3 ${card.cardFaces.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {card.cardFaces.map((face) => (
            <CardImage key={face.name} src={face.imageUri} alt={face.name} />
          ))}
        </div>
      ) : (
        <CardImage src={card.imageUri} alt={card.name} />
      )}
      <div className="space-y-2 text-xs text-ash-grey/80">
        <p className="font-mono uppercase tracking-[0.18em] text-orchid-hush/80">
          {card.setName} · {card.rarity}
        </p>
        <p className="whitespace-pre-wrap text-sm text-orchid-hush/90">{card.oracleText ?? "No oracle text available."}</p>
      </div>
    </div>
  );
}

function CardModal({
  card,
  printings,
  loading,
  selectedPrintingIndex,
  onClose,
  onSelectPrinting,
  section,
  onSectionChange,
  onAdd,
  allowAdd,
  commanderCopies,
  addFeedbackKey,
}: {
  card: PublicCard;
  printings: CardPrintings | null;
  loading: boolean;
  selectedPrintingIndex: number;
  onClose: () => void;
  onSelectPrinting: (index: number) => void;
  section: Section;
  onSectionChange: (section: Section) => void;
  onAdd?: () => void;
  allowAdd: boolean;
  commanderCopies: number;
  addFeedbackKey: string | null;
}) {
  const selectedPrinting = printings?.printings[selectedPrintingIndex] ?? card;
  const isAdded = addFeedbackKey === `${selectedPrinting.oracleId}:${section}`;
  const commanderBlocked = section === "commander" && commanderCopies > 0;
  const commanderRecentlyAdded = section === "commander" && isAdded;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#120d0a]/80 px-4 py-8" onClick={onClose}>
      <div className="tech-panel my-auto w-full max-w-6xl p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-2xl font-semibold text-orchid-hush">{card.name}</h3>
            <p className="text-xs text-ash-grey/80">
              {selectedPrinting.setName} · {selectedPrinting.setCode} #{selectedPrinting.collectorNumber}
            </p>
          </div>
          <button type="button" onClick={onClose} className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush">
            Close
          </button>
        </div>

        <div className="grid gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
          <div className="flex flex-col gap-3">
            {loading ? (
              <p className="text-sm text-ash-grey/80">Loading printings…</p>
            ) : printings ? (
              <>
                <div className={`grid gap-3 ${selectedPrinting.cardFaces?.length && selectedPrinting.cardFaces.length > 1 ? "sm:grid-cols-2" : ""}`}>
                  {selectedPrinting.cardFaces?.length ? (
                    selectedPrinting.cardFaces.map((face) => <CardImage key={face.name} src={face.imageUri} alt={face.name} />)
                  ) : (
                    <CardImage src={selectedPrinting.imageUri} alt={selectedPrinting.name} />
                  )}
                </div>

                <div className="flex flex-col gap-2">
                  <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">Print versions</h4>
                  <select
                    value={selectedPrintingIndex}
                    onChange={(e) => onSelectPrinting(Number(e.target.value))}
                    className="tech-control px-3 py-2 text-sm text-orchid-hush outline-none"
                  >
                    {printings.printings.map((printing, index) => (
                      <option key={`${printing.setCode}-${printing.collectorNumber}`} value={index}>
                        {printing.setName} — {printing.setCode} #{printing.collectorNumber}
                      </option>
                    ))}
                  </select>
                </div>

                {allowAdd ? (
                  <div className="flex flex-col gap-2">
                    <label className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">Add to</label>
                    <select
                      value={section}
                      onChange={(e) => onSectionChange(e.target.value as Section)}
                      className="tech-control w-fit px-3 py-2 font-mono text-xs uppercase tracking-[0.12em] text-orchid-hush/80 outline-none"
                    >
                      {SECTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                    {commanderBlocked ? (
                      <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-ash-grey/80">Commander is singleton.</p>
                    ) : null}
                    <button
                      type="button"
                      onClick={onAdd}
                      disabled={commanderBlocked || commanderRecentlyAdded}
                      title={commanderBlocked ? "Commander section allows only one copy" : undefined}
                      className="tech-button w-fit bg-orchid-hush px-4 py-2 text-xs font-semibold text-coffee-bean disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {commanderRecentlyAdded ? "✓ Added" : commanderBlocked ? "1 max" : "Add selected print"}
                    </button>
                  </div>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-ash-grey/80">Could not load printings.</p>
            )}
          </div>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">Oracle text</h4>
              <div className="tech-row space-y-3 px-3 py-3 text-sm text-orchid-hush/90">
                {selectedPrinting.cardFaces?.length ? (
                  selectedPrinting.cardFaces.map((face) => (
                    <div key={face.name} className="space-y-1">
                      <p className="font-medium text-orchid-hush">{face.name}</p>
                      <p className="whitespace-pre-wrap text-ash-grey/90">{face.oracleText ?? "No oracle text."}</p>
                    </div>
                  ))
                ) : (
                  <p className="whitespace-pre-wrap">{selectedPrinting.oracleText ?? "No oracle text available."}</p>
                )}
              </div>
            </div>

            <div className="flex flex-col gap-2">
              <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">Rulings</h4>
              <div className="tech-row flex flex-col gap-2 px-3 py-3 text-sm text-ash-grey/80">
                {printings?.rulings.length ? (
                  printings.rulings.map((ruling) => (
                    <div key={`${ruling.publishedAt}-${ruling.comment}`} className="space-y-1">
                      <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-orchid-hush/70">{ruling.publishedAt}</p>
                      <p className="whitespace-pre-wrap">{ruling.comment}</p>
                    </div>
                  ))
                ) : (
                  <p>No rulings found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function CardImage({ src, alt }: { src?: string; alt: string }) {
  if (!src) {
    return <div className="tech-row flex min-h-64 items-center justify-center px-4 py-6 text-sm text-ash-grey/80">No image available.</div>;
  }

  return <img src={src} alt={alt} className="w-full rounded-[4px] border border-orchid-hush/20 shadow-[0_18px_40px_rgba(0,0,0,0.24)]" />;
}
