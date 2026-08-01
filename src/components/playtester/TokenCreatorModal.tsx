"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

const STATIC_TOKENS = [
  { key: "treasure", name: "Treasure", typeLine: "Artifact — Treasure" },
  { key: "food", name: "Food", typeLine: "Artifact — Food" },
  { key: "clue", name: "Clue", typeLine: "Artifact — Clue" },
  { key: "blood", name: "Blood", typeLine: "Artifact — Blood" },
  { key: "gold", name: "Gold", typeLine: "Artifact — Gold" },
  { key: "map", name: "Map", typeLine: "Artifact — Map" },
  { key: "powerstone", name: "Powerstone", typeLine: "Artifact — Powerstone" },
] as const;

type Mode = "static" | "creature";

export default function TokenCreatorModal({ gameId, ownerId, onClose }: { gameId: Id<"games">; ownerId: Id<"players">; onClose: () => void }) {
  const createTokens = useMutation(api.cardInstances.createTokens);

  const [mode, setMode] = useState<Mode>("static");
  const [quantity, setQuantity] = useState(1);
  const [staticKey, setStaticKey] = useState<(typeof STATIC_TOKENS)[number]["key"]>("treasure");
  const [creatureName, setCreatureName] = useState("");
  const [creaturePower, setCreaturePower] = useState("1");
  const [creatureToughness, setCreatureToughness] = useState("1");
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedStatic = STATIC_TOKENS.find((t) => t.key === staticKey)!;
  const creatureNameTrimmed = creatureName.trim();
  const canCreate = mode === "static" || creatureNameTrimmed.length > 0;

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      if (mode === "static") {
        await createTokens({ gameId, ownerId, quantity, tokenName: selectedStatic.name, tokenTypeLine: selectedStatic.typeLine });
      } else {
        await createTokens({
          gameId,
          ownerId,
          quantity,
          tokenName: creatureNameTrimmed,
          tokenTypeLine: "Token Creature",
          tokenPower: creaturePower.trim() || undefined,
          tokenToughness: creatureToughness.trim() || undefined,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create token");
      setCreating(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#120d0a]/80 px-4 py-8" onClick={onClose}>
      <div className="tech-panel w-full max-w-md p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">Create token</h3>
          <button type="button" onClick={onClose} className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush">
            Close
          </button>
        </div>

        <div className="flex flex-col gap-4">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setMode("static")}
              className={`tech-button tech-button-compact flex-1 px-3 py-1.5 text-xs font-semibold ${mode === "static" ? "bg-orchid-hush text-on-accent" : "border border-orchid-hush/40 text-orchid-hush"}`}
            >
              Static
            </button>
            <button
              type="button"
              onClick={() => setMode("creature")}
              className={`tech-button tech-button-compact flex-1 px-3 py-1.5 text-xs font-semibold ${mode === "creature" ? "bg-orchid-hush text-on-accent" : "border border-orchid-hush/40 text-orchid-hush"}`}
            >
              Creature
            </button>
          </div>

          {mode === "static" ? (
            <div className="flex flex-col gap-1.5">
              <label className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80">Token type</label>
              <select
                value={staticKey}
                onChange={(e) => setStaticKey(e.target.value as (typeof STATIC_TOKENS)[number]["key"])}
                className="tech-control px-3 py-2 text-sm text-orchid-hush outline-none"
              >
                {STATIC_TOKENS.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <label className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80">Name</label>
                <input
                  value={creatureName}
                  onChange={(e) => setCreatureName(e.target.value)}
                  placeholder="e.g. Soldier"
                  className="tech-control px-3 py-2 text-sm text-orchid-hush outline-none"
                />
              </div>
              <div className="flex gap-3">
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80">Power</label>
                  <input value={creaturePower} onChange={(e) => setCreaturePower(e.target.value)} className="tech-control px-3 py-2 text-sm text-orchid-hush outline-none" />
                </div>
                <div className="flex flex-1 flex-col gap-1.5">
                  <label className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80">Toughness</label>
                  <input value={creatureToughness} onChange={(e) => setCreatureToughness(e.target.value)} className="tech-control px-3 py-2 text-sm text-orchid-hush outline-none" />
                </div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3">
            <label className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80">Count</label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="tech-button tech-button-compact bg-background/70 px-2 py-1 text-xs font-semibold text-ash-grey"
              >
                −
              </button>
              <span className="w-8 text-center font-mono text-sm text-orchid-hush">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(20, q + 1))}
                className="tech-button tech-button-compact bg-background/70 px-2 py-1 text-xs font-semibold text-ash-grey"
              >
                +
              </button>
            </div>
          </div>

          {error ? <p className="text-xs text-error">{error}</p> : null}

          <button
            type="button"
            disabled={creating || !canCreate}
            onClick={() => void handleCreate()}
            className="tech-button w-full bg-orchid-hush px-4 py-2 text-xs font-semibold text-on-accent disabled:opacity-50"
          >
            {creating ? "Creating…" : `Create ${quantity} token${quantity === 1 ? "" : "s"}`}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
