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
    <div className="flex flex-col gap-3 rounded-xl bg-ultra-violet p-4">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-saffron">Card search</h2>
      <input
        value={term}
        onChange={(e) => setTerm(e.target.value)}
        placeholder="Search by name…"
        className="rounded-md bg-dark-purple px-3 py-2 text-sm text-[#f7f5fa] outline-none ring-1 ring-white/10 focus:ring-saffron"
      />
      <div className="flex max-h-[60vh] flex-col gap-2 overflow-y-auto">
        {term.trim() && results === undefined && (
          <p className="text-xs text-[#dbd5e2]">Searching…</p>
        )}
        {term.trim() && results?.length === 0 && (
          <p className="text-xs text-[#dbd5e2]">No cards found.</p>
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
    <div className="flex items-center justify-between gap-2 rounded-md bg-dark-purple px-3 py-2">
      <div className="flex min-w-0 flex-col">
        <span className="truncate text-sm font-medium text-[#f7f5fa]">{name}</span>
        <span className="truncate text-xs text-[#dbd5e2]">
          {typeLine ?? ""} {manaCost ? `· ${manaCost}` : ""}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <select
          value={section}
          onChange={(e) => setSection(e.target.value as Section)}
          className="rounded bg-ultra-violet px-1 py-1 text-xs text-[#f7f5fa] outline-none"
        >
          {SECTIONS.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button
          onClick={() => onAdd(section)}
          className="rounded bg-saffron px-2 py-1 text-xs font-semibold text-dark-purple hover:brightness-95"
        >
          Add
        </button>
      </div>
    </div>
  );
}
