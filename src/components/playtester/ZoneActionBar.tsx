"use client";

import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import ManaCost from "@/components/deckbuilder/manaCost";
import CardDetailModal from "@/components/cards/CardDetailModal";
import { checkLandTiming, checkSorcerySpeedTiming } from "@/components/playtester/timingRules";

const ZONE_LABELS: Record<string, string> = {
  library: "Library",
  hand: "Hand",
  battlefield: "Battlefield",
  graveyard: "Graveyard",
  exile: "Exile",
  stack: "Stack",
  command: "Command",
};

// "stack" is a valid schema zone but this MVP doesn't model spell-casting
// or stack resolution, so it's left out of the UI's move targets.
const DESTINATION_ORDER = ["battlefield", "hand", "graveyard", "exile", "library", "command"] as const;

export default function ZoneActionBar({
  instance,
  gamePhase,
  isOwnerActivePlayer,
  landsPlayedThisTurn,
  onClose,
}: {
  instance: Doc<"cardInstances">;
  gamePhase: Doc<"games">["phase"];
  isOwnerActivePlayer: boolean;
  landsPlayedThisTurn: number;
  onClose: () => void;
}) {
  const card = useQuery(api.cards.getByOracleId, instance.cardOracleId ? { oracleId: instance.cardOracleId } : "skip");
  const moveCard = useMutation(api.cardInstances.moveCard);
  const setTapped = useMutation(api.cardInstances.setTapped);
  const updateCounters = useMutation(api.cardInstances.updateCounters);
  const playLand = useMutation(api.games.playLand);
  const [customCounterType, setCustomCounterType] = useState("");
  const [detailsOpen, setDetailsOpen] = useState(false);

  const name = instance.cardOracleId ? card?.name : instance.tokenName ?? "Token";
  const typeLine = instance.cardOracleId ? card?.typeLine ?? card?.cardFaces?.[0]?.typeLine : instance.tokenTypeLine;
  const isLand = card ? (typeLine ?? "").includes("Land") : false;
  const manaCost = card?.manaCost ?? card?.cardFaces?.[0]?.manaCost;
  const oracleText = card?.oracleText ?? card?.cardFaces?.[0]?.oracleText;

  const moveTo = (toZone: (typeof DESTINATION_ORDER)[number]) => {
    if (instance.zone === "hand" && toZone === "battlefield" && isLand) {
      const warning = checkLandTiming(gamePhase, isOwnerActivePlayer, landsPlayedThisTurn);
      if (warning && !window.confirm(warning)) return;
      void playLand({ instanceId: instance._id, playerId: instance.ownerId });
    } else {
      // Casting a card is only unambiguous for hand -> battlefield (a
      // permanent spell) — hand -> graveyard also covers plain discards, so
      // sorcery-speed timing isn't checked there to avoid warning on a move
      // that isn't actually a cast.
      if (instance.zone === "hand" && toZone === "battlefield" && card && !isLand) {
        const warning = checkSorcerySpeedTiming(card, gamePhase, isOwnerActivePlayer);
        if (warning && !window.confirm(warning)) return;
      }
      void moveCard({ instanceId: instance._id, toZone });
    }
    onClose();
  };

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-orchid-hush/25 bg-[#120d0a]/95 px-3 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold text-orchid-hush">{name ?? "Loading…"}</span>
            {manaCost ? <ManaCost cost={manaCost} className="shrink-0" /> : null}
          </div>
          <div className="flex shrink-0 items-center gap-3">
            {card ? (
              <button type="button" onClick={() => setDetailsOpen(true)} className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush">
                Details
              </button>
            ) : null}
            <button type="button" onClick={onClose} className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush">
              Cancel
            </button>
          </div>
        </div>

        {typeLine ? <p className="text-xs text-ash-grey/80">{typeLine}</p> : null}

        {oracleText ? (
          <p className="max-h-20 overflow-y-auto whitespace-pre-wrap text-xs text-ash-grey/90">{oracleText}</p>
        ) : null}

        <div className="flex flex-wrap gap-1.5">
          {DESTINATION_ORDER.filter((z) => z !== instance.zone).map((z) => (
            <button key={z} type="button" onClick={() => moveTo(z)} className="tech-button tech-button-compact bg-orchid-hush px-3 py-1.5 text-xs font-semibold text-on-accent">
              → {ZONE_LABELS[z]}
              {z === "battlefield" && isLand ? " (land)" : ""}
            </button>
          ))}
        </div>

        {instance.zone === "battlefield" ? (
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                void setTapped({ instanceId: instance._id, tapped: !instance.tapped });
                onClose();
              }}
              className="tech-button tech-button-compact border border-orchid-hush/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-orchid-hush"
            >
              {instance.tapped ? "Untap" : "Tap"}
            </button>

            <CounterStepper label="+1/+1" value={instance.counters["+1/+1"] ?? 0} onChange={(delta) => void updateCounters({ instanceId: instance._id, counterType: "+1/+1", delta })} />
            <CounterStepper label="-1/-1" value={instance.counters["-1/-1"] ?? 0} onChange={(delta) => void updateCounters({ instanceId: instance._id, counterType: "-1/-1", delta })} />

            <div className="flex items-center gap-1">
              <input
                value={customCounterType}
                onChange={(e) => setCustomCounterType(e.target.value)}
                placeholder="Counter type…"
                className="tech-control w-28 px-2 py-1 text-xs text-orchid-hush outline-none"
              />
              <button
                type="button"
                disabled={!customCounterType.trim()}
                onClick={() => void updateCounters({ instanceId: instance._id, counterType: customCounterType.trim(), delta: 1 })}
                className="tech-button tech-button-compact bg-background/70 px-2 py-1 text-xs font-semibold text-ash-grey disabled:opacity-40"
              >
                +
              </button>
              <button
                type="button"
                disabled={!customCounterType.trim()}
                onClick={() => void updateCounters({ instanceId: instance._id, counterType: customCounterType.trim(), delta: -1 })}
                className="tech-button tech-button-compact bg-background/70 px-2 py-1 text-xs font-semibold text-ash-grey disabled:opacity-40"
              >
                −
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {detailsOpen && card ? (
        <CardDetailModal
          card={{ name: card.name, imageUri: card.imageUri, cardFaces: card.cardFaces, oracleText: card.oracleText, subtitle: card.typeLine }}
          oracleId={card.oracleId}
          onClose={() => setDetailsOpen(false)}
        />
      ) : null}
    </div>
  );
}

function CounterStepper({ label, value, onChange }: { label: string; value: number; onChange: (delta: number) => void }) {
  return (
    <div className="flex items-center gap-1.5">
      <button type="button" onClick={() => onChange(-1)} className="tech-button tech-button-compact bg-background/70 px-2 py-1 text-xs font-semibold text-ash-grey">
        −
      </button>
      <span className="font-mono text-xs text-orchid-hush">
        {label} {value}
      </span>
      <button type="button" onClick={() => onChange(1)} className="tech-button tech-button-compact bg-background/70 px-2 py-1 text-xs font-semibold text-ash-grey">
        +
      </button>
    </div>
  );
}
