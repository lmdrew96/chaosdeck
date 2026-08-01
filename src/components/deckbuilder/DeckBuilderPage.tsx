"use client";

import { useState } from "react";
import Link from "next/link";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import CardSearchPanel from "@/components/deckbuilder/CardSearchPanel";
import DeckEntriesPanel from "@/components/deckbuilder/DeckEntriesPanel";
import DeckStats from "@/components/deckbuilder/DeckStats";
import EDHRecommendations from "@/components/deckbuilder/EDHRecommendations";
import ImportExportPanel from "@/components/deckbuilder/ImportExportPanel";
import NewGameModal from "@/components/playtester/NewGameModal";

const FORMAT_OPTIONS = ["commander", "modern", "pioneer", "standard", "legacy", "pauper"];

export default function DeckBuilderPage({ deckId }: { deckId: Id<"decks"> }) {
  const { isAuthenticated, isLoading: isConvexAuthLoading } = useConvexAuth();

  const deck = useQuery(api.decks.getDeck, isAuthenticated ? { deckId } : "skip");
  const setFormat = useMutation(api.decks.setFormat);
  const renameDeck = useMutation(api.decks.renameDeck);
  const [playtestOpen, setPlaytestOpen] = useState(false);

  if (isConvexAuthLoading || (!isAuthenticated && deck === undefined)) {
    return (
      <div className="tech-page flex min-h-screen flex-1 items-center justify-center px-6 py-16">
        <div className="tech-panel px-6 py-5 text-sm text-ash-grey/80">Loading session…</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="tech-page flex min-h-screen flex-1 items-center justify-center px-6 py-16">
        <div className="tech-panel flex flex-col gap-3 px-6 py-5 text-sm text-ash-grey/80">
          <p>Sign in to open this deck.</p>
          <Link href="/sign-in" className="tech-button w-fit bg-orchid-hush px-4 py-2 text-xs font-semibold text-coffee-bean">
            Sign in
          </Link>
        </div>
      </div>
    );
  }

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
            onChange={(e) => void renameDeck({ deckId, name: e.target.value })}
            className="bg-transparent text-3xl font-semibold text-orchid-hush outline-none"
          />
        </div>
        <div className="flex items-center gap-2">
          <select
            value={deck.format}
            onChange={(e) => void setFormat({ deckId, format: e.target.value })}
            className="tech-control px-3 py-2 font-mono text-sm uppercase tracking-[0.12em] text-orchid-hush/80 outline-none"
          >
            {FORMAT_OPTIONS.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
          <button type="button" onClick={() => setPlaytestOpen(true)} className="tech-button bg-orchid-hush px-4 py-2 text-xs font-semibold text-coffee-bean">
            Playtest
          </button>
        </div>
      </div>

      {playtestOpen ? <NewGameModal deckId={deckId} deckName={deck.name} onClose={() => setPlaytestOpen(false)} /> : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
        <div className="flex flex-col gap-4">
          <CardSearchPanel deckId={deckId} />
          <DeckStats deckId={deckId} />
          <ImportExportPanel deckId={deckId} />
          <EDHRecommendations deckId={deckId} />
        </div>
        <div className="flex flex-col gap-4">
          <DeckEntriesPanel deckId={deckId} format={deck.format} />
        </div>
      </div>
    </div>
  );
}
