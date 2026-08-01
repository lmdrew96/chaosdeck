"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";

const MANA_COLORS = ["W", "U", "B", "R", "G", "C"] as const;

const MANA_SWATCH: Record<(typeof MANA_COLORS)[number], string> = {
  W: "bg-[#fff6eb] text-[#4f3b1f] border-[#d7c39c]",
  U: "bg-[#0080ff] text-[#174a7b] border-[#8eb7e8]",
  B: "bg-[#141414] text-[#f7f2ea] border-[#1f1f1f]",
  R: "bg-[#ff0000] text-[#7b1e1e] border-[#d68d8d]",
  G: "bg-[#00ff91] text-[#2a5f2f] border-[#97c68b]",
  C: "bg-[#f3ebff] text-[#5a2d9d] border-[#c8a9f0]",
};

function StepperButton({ label, onClick, className }: { label: string; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`tech-stepper flex h-9 min-w-9 items-center justify-center px-2 text-sm font-bold text-coffee-bean transition active:scale-95 ${className ?? ""}`}
    >
      {label}
    </button>
  );
}

export default function PlayerVitals({
  player,
  opponents,
  interactive,
}: {
  player: Doc<"players">;
  opponents: Doc<"players">[];
  interactive: boolean;
}) {
  const updateLife = useMutation(api.games.updateLife);
  const updateManaPool = useMutation(api.games.updateManaPool);
  const dealCommanderDamage = useMutation(api.games.dealCommanderDamage);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        {interactive ? <StepperButton label="−5" onClick={() => void updateLife({ playerId: player._id, delta: -5 })} /> : null}
        {interactive ? <StepperButton label="−1" onClick={() => void updateLife({ playerId: player._id, delta: -1 })} /> : null}
        <span className={`min-w-12 text-center text-3xl font-bold tabular-nums ${player.hasLost ? "text-ash-grey/50 line-through" : "text-orchid-hush"}`}>{player.life}</span>
        {interactive ? <StepperButton label="+1" onClick={() => void updateLife({ playerId: player._id, delta: 1 })} /> : null}
        {interactive ? <StepperButton label="+5" onClick={() => void updateLife({ playerId: player._id, delta: 5 })} /> : null}
        <span className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80">{player.displayName}</span>
        {player.hasLost ? <span className="tech-badge bg-background/70 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase text-[#cc2e6d]">Lost</span> : null}
      </div>

      {interactive ? (
        <div className="flex items-center gap-1">
          {MANA_COLORS.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => void updateManaPool({ playerId: player._id, color, delta: 1 })}
              className={`relative flex h-7 w-7 items-center justify-center rounded-full border text-[10px] font-bold transition active:scale-90 ${MANA_SWATCH[color]}`}
            >
              {color}
              {player.manaPool[color] > 0 ? (
                <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full border border-foreground/20 bg-background text-[9px] font-semibold text-orchid-hush">
                  {player.manaPool[color]}
                </span>
              ) : null}
            </button>
          ))}
          {MANA_COLORS.some((c) => player.manaPool[c] > 0) ? (
            <button
              type="button"
              onClick={() => MANA_COLORS.forEach((c) => void updateManaPool({ playerId: player._id, color: c, delta: -player.manaPool[c] }))}
              className="font-mono text-[10px] uppercase tracking-[0.14em] text-ash-grey/80 transition hover:text-orchid-hush"
            >
              Clear
            </button>
          ) : null}
        </div>
      ) : null}

      {interactive && opponents.length > 0 ? (
        <details className="text-xs">
          <summary className="cursor-pointer font-mono text-[10px] uppercase tracking-[0.16em] text-ash-grey/80">Commander damage</summary>
          <div className="mt-1 flex flex-col gap-1">
            {opponents.map((opponent) => (
              <div key={opponent._id} className="flex items-center gap-2">
                <span className="min-w-0 flex-1 truncate text-ash-grey/90">{opponent.displayName}</span>
                <StepperButton
                  label="−"
                  className="h-6 min-w-6 px-1.5 text-xs"
                  onClick={() => void dealCommanderDamage({ defendingPlayerId: player._id, fromPlayerId: opponent._id, delta: -1 })}
                />
                <span className="min-w-5 text-center font-mono tabular-nums text-orchid-hush">{player.commanderDamage[opponent._id] ?? 0}</span>
                <StepperButton
                  label="+"
                  className="h-6 min-w-6 px-1.5 text-xs"
                  onClick={() => void dealCommanderDamage({ defendingPlayerId: player._id, fromPlayerId: opponent._id, delta: 1 })}
                />
              </div>
            ))}
          </div>
        </details>
      ) : null}
    </div>
  );
}
