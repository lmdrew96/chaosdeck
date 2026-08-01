"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc, Id } from "../../../convex/_generated/dataModel";
import PlayerZone from "@/components/playtester/PlayerZone";
import ZoneActionBar from "@/components/playtester/ZoneActionBar";
import ZoneViewerModal from "@/components/playtester/ZoneViewerModal";

type Zone = Doc<"cardInstances">["zone"];
type Selection = { instanceId: Id<"cardInstances">; zone: Zone } | null;
type PileZone = "library" | "graveyard" | "exile" | "command";

const PHASE_LABELS: Record<string, string> = {
  untap: "Untap",
  upkeep: "Upkeep",
  draw: "Draw",
  main1: "Main 1",
  combat: "Combat",
  main2: "Main 2",
  end: "End",
};

function seatStorageKey(gameId: Id<"games">) {
  return `chaosdeck-seat:${gameId}`;
}

// localStorage writes in the same tab don't fire the "storage" event (that
// only fires in *other* tabs), so a same-tab seat change dispatches this to
// make useSyncExternalStore re-read the new value.
const SEAT_CHANGE_EVENT = "chaosdeck-seat-change";

function subscribeSeat(callback: () => void) {
  window.addEventListener("storage", callback);
  window.addEventListener(SEAT_CHANGE_EVENT, callback);
  return () => {
    window.removeEventListener("storage", callback);
    window.removeEventListener(SEAT_CHANGE_EVENT, callback);
  };
}

function getServerSeatSnapshot() {
  return null;
}

function groupByOwner(instances: Doc<"cardInstances">[] | undefined) {
  const map = new Map<Id<"players">, Doc<"cardInstances">[]>();
  for (const instance of instances ?? []) {
    const existing = map.get(instance.ownerId);
    if (existing) existing.push(instance);
    else map.set(instance.ownerId, [instance]);
  }
  return map;
}

export default function PlaytestBoard({ gameId }: { gameId: Id<"games"> }) {
  const game = useQuery(api.games.getGame, { gameId });
  const players = useQuery(api.games.listPlayers, { gameId });
  const advancePhase = useMutation(api.games.advancePhase);
  const previousPhase = useMutation(api.games.previousPhase);
  const restartGame = useMutation(api.games.restartGame);
  const setTapped = useMutation(api.cardInstances.setTapped);

  const battlefield = useQuery(api.cardInstances.listByGameAndZone, { gameId, zone: "battlefield" });
  const hand = useQuery(api.cardInstances.listByGameAndZone, { gameId, zone: "hand" });
  const library = useQuery(api.cardInstances.listByGameAndZone, { gameId, zone: "library" });
  const graveyard = useQuery(api.cardInstances.listByGameAndZone, { gameId, zone: "graveyard" });
  const exile = useQuery(api.cardInstances.listByGameAndZone, { gameId, zone: "exile" });
  const command = useQuery(api.cardInstances.listByGameAndZone, { gameId, zone: "command" });

  const [selection, setSelection] = useState<Selection>(null);
  const [viewerZone, setViewerZone] = useState<{ ownerId: Id<"players">; zone: PileZone } | null>(null);

  const storedSeat = useSyncExternalStore(subscribeSeat, () => window.localStorage.getItem(seatStorageKey(gameId)), getServerSeatSnapshot);
  // A solo game has an unambiguous seat, so it's never worth asking —
  // no need to persist this to localStorage either.
  const soloSeat = players && players.length === 1 ? players[0]._id : null;
  const mySeatChoice = storedSeat ?? soloSeat;

  const chooseSeat = (value: string) => {
    window.localStorage.setItem(seatStorageKey(gameId), value);
    window.dispatchEvent(new Event(SEAT_CHANGE_EVENT));
  };

  const byOwner = useMemo(
    () => ({
      battlefield: groupByOwner(battlefield),
      hand: groupByOwner(hand),
      library: groupByOwner(library),
      graveyard: groupByOwner(graveyard),
      exile: groupByOwner(exile),
      command: groupByOwner(command),
    }),
    [battlefield, hand, library, graveyard, exile, command],
  );

  const findInstance = (instanceId: Id<"cardInstances">): Doc<"cardInstances"> | undefined => {
    for (const list of [battlefield, hand, library, graveyard, exile, command]) {
      const found = list?.find((instance) => instance._id === instanceId);
      if (found) return found;
    }
    return undefined;
  };

  if (game === undefined || players === undefined) {
    return (
      <div className="tech-page flex min-h-screen flex-1 items-center justify-center px-6 py-16">
        <div className="tech-panel px-6 py-5 text-sm text-ash-grey/80">Loading game…</div>
      </div>
    );
  }

  if (game === null) {
    return (
      <div className="tech-page flex min-h-screen flex-1 items-center justify-center px-6 py-16">
        <div className="tech-panel flex flex-col gap-3 px-6 py-5 text-sm text-ash-grey/80">
          <p>Game not found.</p>
          <Link href="/" className="tech-button w-fit bg-orchid-hush px-4 py-2 text-xs font-semibold text-coffee-bean">
            Back home
          </Link>
        </div>
      </div>
    );
  }

  if (mySeatChoice === null && players.length > 1) {
    return (
      <div className="tech-page flex min-h-screen flex-1 items-center justify-center px-6 py-16">
        <div className="tech-panel flex flex-col gap-3 px-6 py-5">
          <h2 className="tech-panel-title font-mono text-sm font-semibold uppercase tracking-[0.24em]">Which seat is this?</h2>
          <div className="flex flex-col gap-2">
            {players.map((player) => (
              <button
                key={player._id}
                type="button"
                onClick={() => chooseSeat(player._id)}
                className="tech-button w-fit bg-orchid-hush px-4 py-2 text-xs font-semibold text-coffee-bean"
              >
                Play as {player.displayName}
              </button>
            ))}
            <button
              type="button"
              onClick={() => chooseSeat("spectate")}
              className="tech-button w-fit border border-orchid-hush/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-orchid-hush"
            >
              Spectate
            </button>
          </div>
        </div>
      </div>
    );
  }

  const mySeatPlayerId = mySeatChoice && mySeatChoice !== "spectate" ? (mySeatChoice as Id<"players">) : null;
  const selectedInstance = selection ? findInstance(selection.instanceId) : undefined;
  const activePlayer = players.find((p) => p.seatIndex === game.activePlayerIndex);
  const selectedOwner = selectedInstance ? players.find((p) => p._id === selectedInstance.ownerId) : undefined;

  const selectCard = (instance: Doc<"cardInstances">) => {
    setSelection((current) => (current?.instanceId === instance._id ? null : { instanceId: instance._id, zone: instance.zone }));
  };

  const tapCard = (instance: Doc<"cardInstances">) => {
    void setTapped({ instanceId: instance._id, tapped: !instance.tapped });
  };

  return (
    <div className="tech-page flex min-h-screen flex-1 flex-col gap-4 px-4 py-6 pb-28 sm:px-6">
      <div className="tech-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link href="/" className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush">
            ← Home
          </Link>
          <button
            type="button"
            onClick={() => {
              if (window.confirm("Restart this game? Every player reshuffles back to a fresh opening hand.")) void restartGame({ gameId });
            }}
            className="tech-button tech-button-compact border border-orchid-hush/40 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.14em] text-orchid-hush"
          >
            Restart game
          </button>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80">Turn {game.turnNumber}</span>
          <span className="tech-badge bg-background/70 px-2.5 py-1 font-mono text-xs font-semibold uppercase text-orchid-hush">{PHASE_LABELS[game.phase]}</span>
          <span className="text-xs text-ash-grey/80">{activePlayer?.displayName ?? "—"}&apos;s turn</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={game.turnNumber === 1 && game.phase === "untap"}
            onClick={() => void previousPhase({ gameId })}
            className="tech-button border border-orchid-hush/40 px-3 py-2 text-xs font-semibold uppercase tracking-[0.14em] text-orchid-hush disabled:opacity-40"
          >
            ← Prev
          </button>
          <button type="button" onClick={() => void advancePhase({ gameId })} className="tech-button bg-orchid-hush px-4 py-2 text-xs font-semibold text-coffee-bean">
            Next phase →
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {players.map((player) => (
          <PlayerZone
            key={player._id}
            gameId={gameId}
            player={player}
            opponents={players.filter((p) => p._id !== player._id)}
            isLocalSeat={mySeatPlayerId === player._id}
            isActivePlayer={player.seatIndex === game.activePlayerIndex}
            battlefield={byOwner.battlefield.get(player._id) ?? []}
            hand={byOwner.hand.get(player._id) ?? []}
            library={byOwner.library.get(player._id) ?? []}
            graveyard={byOwner.graveyard.get(player._id) ?? []}
            exile={byOwner.exile.get(player._id) ?? []}
            command={byOwner.command.get(player._id) ?? []}
            selection={selection}
            onSelectCard={selectCard}
            onTapCard={tapCard}
            onOpenZoneViewer={(zone) => setViewerZone({ ownerId: player._id, zone })}
          />
        ))}
      </div>

      {viewerZone ? (
        <ZoneViewerModal
          ownerId={viewerZone.ownerId}
          zone={viewerZone.zone}
          cards={byOwner[viewerZone.zone].get(viewerZone.ownerId) ?? []}
          interactive={mySeatPlayerId === viewerZone.ownerId}
          onSelectCard={selectCard}
          onClose={() => setViewerZone(null)}
        />
      ) : null}

      {selectedInstance ? (
        <ZoneActionBar
          instance={selectedInstance}
          gamePhase={game.phase}
          isOwnerActivePlayer={selectedOwner?.seatIndex === game.activePlayerIndex}
          landsPlayedThisTurn={selectedOwner?.landsPlayedThisTurn ?? 0}
          onClose={() => setSelection(null)}
        />
      ) : null}
    </div>
  );
}
