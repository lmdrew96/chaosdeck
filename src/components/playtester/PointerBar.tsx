"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";

// Mirrors convex/pointers.ts's POINTER_META — kept in sync manually since
// the mute drawer needs to offer every type, including ones that haven't
// fired yet this game.
const POINTER_TYPES: { type: string; icon: string; label: string }[] = [
  { type: "PLAY_LAND", icon: "⛰", label: "Land not yet played" },
  { type: "MANA_UP", icon: "💧", label: "Mana still in pool" },
  { type: "TRIGGER_AVAILABLE", icon: "⚡", label: "Trigger available" },
  { type: "ATTACKERS_AVAILABLE", icon: "⚔", label: "Creatures available to attack" },
  { type: "LIVE_OPTIONS", icon: "✦", label: "Instant-speed options in hand" },
  { type: "EXILED_EXPIRING", icon: "⏳", label: "Exiled card expiring" },
];

export default function PointerBar({ gameId, player }: { gameId: Id<"games">; player: Doc<"players"> }) {
  const pointers = useQuery(api.pointers.getActivePointers, { gameId, playerId: player._id });
  const setMutedPointerTypes = useMutation(api.games.setMutedPointerTypes);
  const [drawerOpen, setDrawerOpen] = useState(false);

  const toggleMute = (type: string) => {
    const next = player.mutedPointerTypes.includes(type)
      ? player.mutedPointerTypes.filter((t) => t !== type)
      : [...player.mutedPointerTypes, type];
    void setMutedPointerTypes({ playerId: player._id, mutedPointerTypes: next });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {(pointers ?? []).map((pointer) => (
        <span
          key={pointer.type}
          title={pointer.detail}
          className="tech-badge flex items-center gap-1 bg-background/70 px-2 py-1 text-[10px] font-semibold uppercase text-orchid-hush"
        >
          <span aria-hidden>{pointer.icon === "land" ? "⛰" : pointer.icon === "mana-drop" ? "💧" : pointer.icon === "trigger" ? "⚡" : pointer.icon === "sword" ? "⚔" : pointer.icon === "instant" ? "✦" : pointer.icon === "hourglass" ? "⏳" : "•"}</span>
          {pointer.label}
        </span>
      ))}
      <button
        type="button"
        onClick={() => setDrawerOpen((open) => !open)}
        className="font-mono text-[10px] uppercase tracking-[0.14em] text-ash-grey/60 transition hover:text-orchid-hush"
      >
        {drawerOpen ? "Close" : "Pointers ⚙"}
      </button>
      {drawerOpen ? (
        <div className="tech-row flex w-full flex-col gap-1 px-3 py-2 text-xs">
          {POINTER_TYPES.map(({ type, icon, label }) => (
            <label key={type} className="flex items-center gap-2 text-ash-grey/90">
              <input type="checkbox" checked={!player.mutedPointerTypes.includes(type)} onChange={() => toggleMute(type)} />
              <span aria-hidden>{icon}</span>
              {label}
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}
