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
    return <p className="p-8 text-sm text-orchid-hush/80">Loading deck…</p>;
  }
  if (deck === null) {
    return <p className="p-8 text-sm text-orchid-hush/80">Deck not found.</p>;
  }

  return (
    <div className="flex min-h-screen flex-1 flex-col gap-6 bg-background px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-[14px] border border-orchid-hush/15 bg-surface-deep/90 px-4 py-4 shadow-[0_10px_32px_rgba(0,0,0,0.24)]">
        <div className="flex flex-col gap-1">
          <Link href="/" className="text-xs text-ash-grey/80 transition hover:text-orchid-hush">
            ← All decks
          </Link>
          <input
            value={deck.name}
            onChange={(e) => void renameDeck({ deckId: id, name: e.target.value })}
            className="bg-transparent text-2xl font-semibold text-orchid-hush outline-none"
          />
        </div>
        <select
          value={deck.format}
          onChange={(e) => void setFormat({ deckId: id, format: e.target.value })}
          className="rounded-[10px] border border-white/10 bg-deep-teal/90 px-3 py-2 text-sm text-orchid-hush/80 outline-none"
        >
          {FORMAT_OPTIONS.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
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
