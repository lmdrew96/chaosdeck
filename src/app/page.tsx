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
    <div className={`flex min-h-screen flex-1 flex-col items-center bg-background px-6 py-16 ${strangestShowman.variable}`}>
      <main className="flex w-full max-w-2xl flex-col gap-8">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-ash-grey/70">MTG deckbuilder</p>
          <h1 className="text-3xl font-semibold tracking-tight text-orchid-hush" style={{ fontFamily: "var(--font-strangest-showman)" }}>
            ChaosDeck
          </h1>
          <p className="text-sm text-ash-grey/80">Build, test, and refine the next decklist.</p>
        </div>

        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 rounded-[14px] border border-orchid-hush/20 bg-surface-deep/90 p-5 shadow-[0_10px_30px_rgba(0,0,0,0.28)] sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-orchid-hush/80">Deck name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New deck"
              className="rounded-[10px] border border-white/10 bg-coffee-bean/90 px-3 py-2 text-sm text-orchid-hush outline-none transition focus:border-orchid-hush/40 focus:ring-2 focus:ring-orchid-hush/20"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium uppercase tracking-[0.2em] text-orchid-hush/80">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="rounded-[10px] border border-white/10 bg-coffee-bean/90 px-3 py-2 text-sm text-orchid-hush/80 outline-none transition focus:border-orchid-hush/40 focus:ring-2 focus:ring-orchid-hush/20"
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
            className="rounded-[10px] bg-orchid-hush px-4 py-2 text-sm font-semibold text-coffee-bean transition hover:brightness-95 hover:shadow-[0_0_0_1px_rgba(241,202,238,0.4)] disabled:opacity-50"
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
              className="flex items-center justify-between rounded-[12px] border border-orchid-hush/15 bg-deep-teal/90 px-4 py-3 shadow-[0_6px_18px_rgba(0,0,0,0.16)]"
            >
              <Link href={`/decks/${deck._id}`} className="flex flex-col">
                <span className="font-medium text-orchid-hush">{deck.name}</span>
                <span className="text-xs uppercase tracking-[0.24em] text-ash-grey/80">{deck.format}</span>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${deck.name}"?`)) void deleteDeck({ deckId: deck._id });
                }}
                className="text-xs text-orchid-hush/80 hover:text-orchid-hush"
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
