"use client";

import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type OpponentSeat = {
  key: number;
  displayName: string;
  deckId: Id<"decks"> | "";
};

export default function NewGameModal({ deckId, deckName, onClose }: { deckId: Id<"decks">; deckName: string; onClose: () => void }) {
  const router = useRouter();
  const decks = useQuery(api.decks.listDecks);
  const startPlaytestFromDecks = useMutation(api.games.startPlaytestFromDecks);

  const [startingLife, setStartingLife] = useState(20);
  const [opponents, setOpponents] = useState<OpponentSeat[]>([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nextKey = useRef(0);

  const addOpponent = () => {
    nextKey.current += 1;
    setOpponents((current) => [...current, { key: nextKey.current, displayName: `Opponent ${current.length + 1}`, deckId: "" }]);
  };

  const removeOpponent = (key: number) => setOpponents((current) => current.filter((o) => o.key !== key));

  const handleStart = async () => {
    setStarting(true);
    setError(null);
    try {
      const gameId = await startPlaytestFromDecks({
        startingLife,
        players: [
          { displayName: deckName, deckId },
          ...opponents.map((o) => ({ displayName: o.displayName.trim() || "Opponent", deckId: o.deckId || undefined })),
        ],
      });
      router.push(`/play/${gameId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not start game");
      setStarting(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#120d0a]/80 px-4 py-8" onClick={onClose}>
      <div className="tech-panel w-full max-w-lg p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">New playtest</h3>
          <button type="button" onClick={onClose} className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush">
            Close
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <label className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80">Starting life</label>
            <input
              type="number"
              value={startingLife}
              onChange={(e) => setStartingLife(Number(e.target.value) || 20)}
              className="tech-control w-20 px-2 py-1 text-sm text-orchid-hush outline-none"
            />
          </div>

          <div className="tech-row px-3 py-2 text-sm text-orchid-hush">Seat 1 — {deckName} (this deck)</div>

          {opponents.map((opponent) => (
            <div key={opponent.key} className="tech-row flex flex-col gap-2 px-3 py-2">
              <div className="flex items-center gap-2">
                <input
                  value={opponent.displayName}
                  onChange={(e) => setOpponents((current) => current.map((o) => (o.key === opponent.key ? { ...o, displayName: e.target.value } : o)))}
                  className="tech-control flex-1 px-2 py-1 text-sm text-orchid-hush outline-none"
                />
                <button type="button" onClick={() => removeOpponent(opponent.key)} className="font-mono text-xs uppercase tracking-[0.14em] text-ash-grey/80 transition hover:text-orchid-hush">
                  Remove
                </button>
              </div>
              <select
                value={opponent.deckId}
                onChange={(e) => setOpponents((current) => current.map((o) => (o.key === opponent.key ? { ...o, deckId: e.target.value as Id<"decks"> | "" } : o)))}
                className="tech-control px-2 py-1 text-xs text-orchid-hush/80 outline-none"
              >
                <option value="">No deck (blank seat)</option>
                {decks?.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.name}
                  </option>
                ))}
              </select>
            </div>
          ))}

          <button type="button" onClick={addOpponent} className="tech-button w-fit border border-orchid-hush/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-orchid-hush">
            + Add opponent
          </button>

          {error ? <p className="text-xs text-[#cc2e6d]">{error}</p> : null}

          <button
            type="button"
            disabled={starting}
            onClick={() => void handleStart()}
            className="tech-button w-full bg-orchid-hush px-4 py-2 text-xs font-semibold text-coffee-bean disabled:opacity-50"
          >
            {starting ? "Starting…" : opponents.length === 0 ? "Start solo goldfish" : "Start game"}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
