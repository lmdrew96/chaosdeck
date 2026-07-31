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
    <div className="tech-panel flex flex-col gap-3 p-4">
      <h2 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">Card search</h2>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search by name…"
        className="tech-control px-3 py-2 text-sm text-orchid-hush outline-none transition"
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
    <div className="tech-row flex flex-col justify-between gap-2 px-3 py-2 pl-4 sm:flex-row sm:items-center">
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
          className="tech-control px-2 py-1 font-mono text-xs text-orchid-hush/80 outline-none"
        >
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() => onAdd(section)}
          className="tech-button tech-button-compact bg-orchid-hush px-2 py-1 text-xs font-semibold text-coffee-bean"
        >
          Add
        </button>
      </div>
    </div>
  );
}
