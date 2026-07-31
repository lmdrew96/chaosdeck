"use client";

import localFont from "next/font/local";
import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

const strangestShowman = localFont({
  src: "../../Assets/fonts/StrangestShowman.ttf",
  variable: "--font-strangest-showman",
  display: "swap",
});

const FORMAT_OPTIONS = ["commander", "modern", "pioneer", "standard", "legacy", "pauper"];

export default function Home() {
  const decks = useQuery(api.decks.listDecks, {});
  const createDeck = useMutation(api.decks.createDeck);
  const deleteDeck = useMutation(api.decks.deleteDeck);

  const [name, setName] = useState("");
  const [format, setFormat] = useState(FORMAT_OPTIONS[0]);
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setCreating(true);
    try {
      await createDeck({ name: name.trim(), format });
      setName("");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className={`tech-page flex min-h-screen flex-1 flex-col items-center px-6 py-16 ${strangestShowman.variable}`}>
      <main className="flex w-full max-w-3xl flex-col gap-8">
        <div className="space-y-3 border-l border-orchid-hush/30 pl-4">
          <p className="font-mono text-xs font-semibold uppercase tracking-[0.3em] text-ash-grey/70">MTG deckbuilder</p>
          <h1 className="text-5xl font-semibold tracking-tight text-orchid-hush sm:text-6xl" style={{ fontFamily: "var(--font-strangest-showman)" }}>
            ChaosDeck
          </h1>
          <p className="text-sm text-ash-grey/80">Build, test, and refine the next decklist.</p>
        </div>

        <form
          onSubmit={handleCreate}
          className="tech-panel flex flex-col gap-3 p-5 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-orchid-hush/80">Deck name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New deck"
              className="tech-control px-3 py-2 text-sm text-orchid-hush outline-none transition"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-orchid-hush/80">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="tech-control px-3 py-2 text-sm text-orchid-hush/80 outline-none transition"
            >
              {FORMAT_OPTIONS.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
          <button
            type="submit"
            disabled={creating || !name.trim()}
            className="tech-button bg-orchid-hush px-4 py-2 text-xs font-semibold text-coffee-bean transition disabled:opacity-50"
          >
            Create deck
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {decks === undefined && <p className="text-sm text-ash-grey/80">Loading decks…</p>}
          {decks?.length === 0 && (
            <p className="text-sm text-ash-grey/80">No decks yet — create one above to get started.</p>
          )}
          {decks?.map((deck) => (
            <div
              key={deck._id}
              className="tech-row flex items-center justify-between gap-4 px-4 py-3 pl-5 transition hover:border-orchid-hush/35"
            >
              <Link href={`/decks/${deck._id}`} className="flex flex-col">
                <span className="font-medium text-orchid-hush">{deck.name}</span>
                <span className="font-mono text-xs uppercase tracking-[0.24em] text-ash-grey/80">{deck.format}</span>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${deck.name}"?`)) void deleteDeck({ deckId: deck._id });
                }}
                className="font-mono text-xs uppercase tracking-[0.16em] text-orchid-hush/80 transition hover:text-orchid-hush"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
