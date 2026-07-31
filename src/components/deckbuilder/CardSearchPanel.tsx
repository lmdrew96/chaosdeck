"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type Section = "deck" | "sideboard" | "commander" | "companion";

const SECTIONS: Section[] = ["deck", "sideboard", "commander", "companion"];

export default function CardSearchPanel({ deckId }: { deckId: Id<"decks"> }) {
  const [term, setTerm] = useState("");
  const results = useQuery(api.cards.searchByName, term.trim() ? { name: term.trim() } : "skip");
  const addCard = useMutation(api.decks.addCard);

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-orchid-hush/15 bg-surface-deep/90 p-4 shadow-[0_8px_22px_rgba(0,0,0,0.18)]">
      <h2 className="text-sm font-semibold uppercase tracking-[0.24em] text-orchid-hush">Card search</h2>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search by name…"
        className="rounded-[10px] border border-white/10 bg-coffee-bean/90 px-3 py-2 text-sm text-orchid-hush outline-none transition focus:border-orchid-hush/40 focus:ring-2 focus:ring-orchid-hush/20"
      />
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
        {term.trim() && results === undefined && (
          <p className="text-xs text-ash-grey/80">Searching…</p>
        )}
        {term.trim() && results?.length === 0 && (
          <p className="text-xs text-ash-grey/80">No cards found.</p>
        )}
        {results?.map((card) => (
          <CardSearchRow
            key={card._id}
            name={card.name}
            typeLine={card.typeLine}
            manaCost={card.manaCost}
            onAdd={(section) => void addCard({ deckId, section, cardOracleId: card.oracleId, quantity: 1 })}
          />
        ))}
      </div>
    </div>
  );
}

function CardSearchRow({
  name,
  typeLine,
  manaCost,
  onAdd,
}: {
  name: string;
  typeLine?: string;
  manaCost?: string;
  onAdd: (section: Section) => void;
}) {
  const [section, setSection] = useState<Section>("deck");

  return (
    <div className="flex items-center justify-between gap-2 rounded-[10px] border border-white/10 bg-coffee-bean/80 px-3 py-2 shadow-[0_2px_10px_rgba(0,0,0,0.14)]">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-orchid-hush">{name}</span>
        <span className="truncate text-xs text-ash-grey/80">
          {typeLine ?? ""} {manaCost ? `· ${manaCost}` : ""}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          className="rounded-[8px] border border-white/10 bg-deep-teal/90 px-1 py-1 text-xs text-orchid-hush/80 outline-none"
        >
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() => onAdd(section)}
          className="rounded-[8px] bg-orchid-hush px-2 py-1 text-xs font-semibold text-coffee-bean hover:bg-orchid-hush/90 hover:brightness-95"
        >
          Add
        </button>
      </div>
    </div>
  );
}
