"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import CardSearchPanel from "@/components/deckbuilder/CardSearchPanel";
import DeckEntriesPanel from "@/components/deckbuilder/DeckEntriesPanel";
import DeckStats from "@/components/deckbuilder/DeckStats";
import ImportExportPanel from "@/components/deckbuilder/ImportExportPanel";

const FORMAT_OPTIONS = ["commander", "modern", "pioneer", "standard", "legacy", "pauper"];

export default function DeckBuilderPage() {
  const { deckId } = useParams<{ deckId: string }>();
  const id = deckId as Id<"decks">;

  const deck = useQuery(api.decks.getDeck, { deckId: id });
  const setFormat = useMutation(api.decks.setFormat);
  const renameDeck = useMutation(api.decks.renameDeck);

  if (deck === undefined) {
    return (
      <div className="tech-page flex min-h-screen flex-1 items-center justify-center px-6 py-16">
        <div className="tech-panel px-6 py-5 text-sm text-ash-grey/80">Loading deck…</div>
      </div>
    );
  }
  if (deck === null) {
    return (
      <div className="tech-page flex min-h-screen flex-1 items-center justify-center px-6 py-16">
        <div className="tech-panel px-6 py-5 text-sm text-ash-grey/80">Deck not found.</div>
      </div>
    );
  }

  return (
    <div className="tech-page flex min-h-screen flex-1 flex-col gap-6 px-6 py-8">
      <div className="tech-panel flex flex-wrap items-center justify-between gap-3 px-4 py-4">
        <div className="flex flex-col gap-1">
          <Link href="/" className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush">
            ← All decks
          </Link>
          <input
            value={deck.name}
            onChange={(e) => void renameDeck({ deckId: id, name: e.target.value })}
            className="bg-transparent text-3xl font-semibold text-orchid-hush outline-none"
          />
        </div>
        <select
          value={deck.format}
          onChange={(e) => void setFormat({ deckId: id, format: e.target.value })}
          className="tech-control px-3 py-2 font-mono text-sm uppercase tracking-[0.12em] text-orchid-hush/80 outline-none"
        >
          {FORMAT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <div className="flex flex-col gap-4">
          <CardSearchPanel deckId={id} />
          <ImportExportPanel deckId={id} />
        </div>
        <div className="flex flex-col gap-4">
          <DeckEntriesPanel deckId={id} format={deck.format} />
          <DeckStats deckId={id} />
        </div>
      </div>
    </div>
  );
}
