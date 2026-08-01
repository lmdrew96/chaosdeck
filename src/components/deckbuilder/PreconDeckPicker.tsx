"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAction, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { PRECON_DECKS } from "@/data/preconDecks";

export default function PreconDeckPicker() {
  const router = useRouter();
  const createDeck = useMutation(api.decks.createDeck);
  const importDeckList = useAction(api.deckImport.importDeckList);
  const importResolvedLines = useMutation(api.decks.importResolvedLines);

  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleUse = async (deckKey: string) => {
    const precon = PRECON_DECKS.find((d) => d.key === deckKey);
    if (!precon) return;
    setActiveKey(deckKey);
    setError(null);
    try {
      const deckId = await createDeck({ name: precon.name, format: "commander" });
      const { resolved } = await importDeckList({ text: precon.decklist });
      await importResolvedLines({
        deckId,
        lines: resolved.map((r) => ({ section: r.section, quantity: r.quantity, oracleId: r.oracleId })),
      });
      router.push(`/decks/${deckId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start this precon");
      setActiveKey(null);
    }
  };

  return (
    <div className="tech-panel flex flex-col gap-3 p-5">
      <h2 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">Start from a precon</h2>
      <p className="text-xs text-ash-grey/80">A curated, ready-to-play 100-card Commander deck — no pasting required.</p>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PRECON_DECKS.map((precon) => (
          <div key={precon.key} className="tech-row flex flex-col gap-1 px-3 py-2.5">
            <span className="font-medium text-orchid-hush">{precon.name}</span>
            <span className="text-xs text-ash-grey/80">{precon.commander}</span>
            <span className="text-xs text-ash-grey/60">{precon.description}</span>
            <button
              type="button"
              disabled={activeKey !== null}
              onClick={() => void handleUse(precon.key)}
              className="tech-button tech-button-compact mt-1.5 w-fit bg-orchid-hush px-3 py-1.5 text-xs font-semibold text-on-accent disabled:opacity-50"
            >
              {activeKey === precon.key ? "Setting up…" : "Use this deck"}
            </button>
          </div>
        ))}
      </div>

      {error ? <p className="text-xs text-error">{error}</p> : null}
    </div>
  );
}
