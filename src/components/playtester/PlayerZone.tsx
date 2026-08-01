"use client";

import { useState } from "react";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import CardTile from "@/components/playtester/CardTile";
import PlayerVitals from "@/components/playtester/PlayerVitals";
import PointerBar from "@/components/playtester/PointerBar";
import TokenCreatorModal from "@/components/playtester/TokenCreatorModal";

type Zone = Doc<"cardInstances">["zone"];
type Selection = { instanceId: Id<"cardInstances">; zone: Zone } | null;

export default function PlayerZone({
  gameId,
  player,
  opponents,
  isLocalSeat,
  isActivePlayer,
  battlefield,
  hand,
  library,
  graveyard,
  exile,
  command,
  selection,
  onSelectCard,
  onTapCard,
  onOpenZoneViewer,
}: {
  gameId: Id<"games">;
  player: Doc<"players">;
  opponents: Doc<"players">[];
  isLocalSeat: boolean;
  isActivePlayer: boolean;
  battlefield: Doc<"cardInstances">[];
  hand: Doc<"cardInstances">[];
  library: Doc<"cardInstances">[];
  graveyard: Doc<"cardInstances">[];
  exile: Doc<"cardInstances">[];
  command: Doc<"cardInstances">[];
  selection: Selection;
  onSelectCard: (instance: Doc<"cardInstances">) => void;
  onTapCard: (instance: Doc<"cardInstances">) => void;
  onOpenZoneViewer: (zone: "library" | "graveyard" | "exile" | "command") => void;
}) {
  const isSelected = (instance: Doc<"cardInstances">) => selection?.instanceId === instance._id;
  const [tokenModalOpen, setTokenModalOpen] = useState(false);

  return (
    <div className={`tech-panel flex flex-col gap-3 p-3 sm:p-4 ${isActivePlayer ? "ring-1 ring-orchid-hush/50" : ""}`}>
      <PlayerVitals player={player} opponents={opponents} interactive={isLocalSeat} />

      {isLocalSeat ? <PointerBar gameId={gameId} player={player} /> : null}

      <div className="flex flex-col gap-1">
        <div className="flex items-center justify-between">
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ash-grey/60">Battlefield</p>
          {isLocalSeat ? (
            <button
              type="button"
              onClick={() => setTokenModalOpen(true)}
              className="font-mono text-[10px] uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush"
            >
              + Token
            </button>
          ) : null}
        </div>
        <div className="tech-row flex min-h-20 flex-wrap gap-2 p-2">
          {battlefield.length === 0 ? <p className="px-1 py-1 text-xs text-ash-grey/60">Empty.</p> : null}
          {battlefield.map((instance) => (
            <CardTile
              key={instance._id}
              instance={instance}
              selected={isSelected(instance)}
              interactive={isLocalSeat}
              onSelect={() => onSelectCard(instance)}
              onTap={() => onTapCard(instance)}
            />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-ash-grey/60">Hand{isLocalSeat ? "" : ` · ${hand.length} cards`}</p>
        {isLocalSeat ? (
          <div className="tech-row flex min-h-20 flex-wrap gap-2 p-2">
            {hand.length === 0 ? <p className="px-1 py-1 text-xs text-ash-grey/60">Empty.</p> : null}
            {hand.map((instance) => (
              <CardTile key={instance._id} instance={instance} selected={isSelected(instance)} interactive onSelect={() => onSelectCard(instance)} />
            ))}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <ZonePile label="Library" count={library.length} onOpen={isLocalSeat ? () => onOpenZoneViewer("library") : undefined} />
        <ZonePile label="Graveyard" count={graveyard.length} onOpen={() => onOpenZoneViewer("graveyard")} />
        <ZonePile label="Exile" count={exile.length} onOpen={() => onOpenZoneViewer("exile")} />
        <ZonePile label="Command" count={command.length} onOpen={() => onOpenZoneViewer("command")} />
      </div>

      {tokenModalOpen ? <TokenCreatorModal gameId={gameId} ownerId={player._id} onClose={() => setTokenModalOpen(false)} /> : null}
    </div>
  );
}

function ZonePile({ label, count, onOpen }: { label: string; count: number; onOpen?: () => void }) {
  return (
    <button
      type="button"
      disabled={!onOpen}
      onClick={onOpen}
      className="tech-badge flex items-center gap-1.5 bg-background/70 px-2.5 py-1.5 text-[10px] font-semibold uppercase text-ash-grey transition disabled:opacity-50 enabled:hover:text-orchid-hush"
    >
      {label}
      <span className="font-mono text-orchid-hush">{count}</span>
    </button>
  );
}
