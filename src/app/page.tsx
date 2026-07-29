"use client";

import { useState } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";

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
    <div className="flex flex-1 flex-col items-center bg-dark-purple px-6 py-16">
      <main className="flex w-full max-w-2xl flex-col gap-10">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-saffron">ChaosDeck</h1>
          <p className="mt-1 text-sm text-[#dbd5e2]">MTG deckbuilder + goldfish-plus playtester</p>
        </div>

        <form
          onSubmit={handleCreate}
          className="flex flex-col gap-3 rounded-xl bg-ultra-violet p-5 sm:flex-row sm:items-end"
        >
          <div className="flex flex-1 flex-col gap-1">
            <label className="text-xs font-medium text-[#dbd5e2]">Deck name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="New deck"
              className="rounded-md bg-dark-purple px-3 py-2 text-sm text-[#f7f5fa] outline-none ring-1 ring-white/10 focus:ring-saffron"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#dbd5e2]">Format</label>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="rounded-md bg-dark-purple px-3 py-2 text-sm text-[#f7f5fa] outline-none ring-1 ring-white/10 focus:ring-saffron"
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
            className="rounded-md bg-saffron px-4 py-2 text-sm font-semibold text-dark-purple transition hover:brightness-95 disabled:opacity-50"
          >
            Create deck
          </button>
        </form>

        <div className="flex flex-col gap-2">
          {decks === undefined && <p className="text-sm text-[#dbd5e2]">Loading decks…</p>}
          {decks?.length === 0 && (
            <p className="text-sm text-[#dbd5e2]">No decks yet — create one above to get started.</p>
          )}
          {decks?.map((deck) => (
            <div
              key={deck._id}
              className="flex items-center justify-between rounded-lg bg-ultra-violet px-4 py-3"
            >
              <Link href={`/decks/${deck._id}`} className="flex flex-col">
                <span className="font-medium text-[#f7f5fa]">{deck.name}</span>
                <span className="text-xs uppercase tracking-wide text-saffron">
                  {deck.format}
                </span>
              </Link>
              <button
                onClick={() => {
                  if (confirm(`Delete "${deck.name}"?`)) void deleteDeck({ deckId: deck._id });
                }}
                className="text-xs text-[#dbd5e2] hover:text-saffron"
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
