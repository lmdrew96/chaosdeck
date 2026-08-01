"use client";

import { createPortal } from "react-dom";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import CardTile from "@/components/playtester/CardTile";

const ZONE_LABELS: Record<string, string> = {
  library: "Library",
  graveyard: "Graveyard",
  exile: "Exile",
  command: "Command zone",
};

export default function ZoneViewerModal({
  ownerId,
  zone,
  cards,
  interactive,
  onSelectCard,
  onClose,
}: {
  ownerId: Id<"players">;
  zone: "library" | "graveyard" | "exile" | "command";
  cards: Doc<"cardInstances">[];
  interactive: boolean;
  onSelectCard: (instance: Doc<"cardInstances">) => void;
  onClose: () => void;
}) {
  const draw = useMutation(api.cardInstances.draw);
  const shuffleLibrary = useMutation(api.cardInstances.shuffleLibrary);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[#120d0a]/80 px-4 py-4 sm:items-center" onClick={onClose}>
      <div className="tech-panel flex max-h-[80vh] w-full max-w-2xl flex-col gap-3 p-4" onClick={(event) => event.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h3 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">
            {ZONE_LABELS[zone]} · {cards.length}
          </h3>
          <button type="button" onClick={onClose} className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush">
            Close
          </button>
        </div>

        {zone === "library" && interactive ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void draw({ playerId: ownerId, count: 1 })}
              className="tech-button tech-button-compact bg-orchid-hush px-3 py-1.5 text-xs font-semibold text-on-accent"
            >
              Draw 1
            </button>
            <button
              type="button"
              onClick={() => void shuffleLibrary({ playerId: ownerId })}
              className="tech-button tech-button-compact border border-orchid-hush/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-orchid-hush"
            >
              Shuffle
            </button>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 overflow-y-auto pr-1">
          {cards.length === 0 ? <p className="text-xs text-ash-grey/80">Empty.</p> : null}
          {cards.map((instance) => (
            <CardTile
              key={instance._id}
              instance={instance}
              selected={false}
              interactive={interactive}
              onSelect={() => {
                onSelectCard(instance);
                onClose();
              }}
              size="md"
            />
          ))}
        </div>
      </div>
    </div>,
    document.body,
  );
}
