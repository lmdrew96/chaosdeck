"use client";

import { useRef } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import CardImage from "@/components/cards/CardImage";

// Battlefield tap/untap and battlefield selection (to move zones or add
// counters) are both single-gesture actions competing for the same tile, so
// they're split by tap count: a single tap toggles tap/untap, a double
// tap/click selects. Splitting them this way means a single tap can't fire
// the instant it's released — it has to wait out DOUBLE_CLICK_MS first, to
// confirm a second tap isn't coming.
const DOUBLE_CLICK_MS = 300;

const TILE_IMAGE_CLASS = "h-full w-full rounded-[4px] object-cover";
const TILE_FALLBACK_CLASS = "flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-[4px] px-1 text-center text-[9px] leading-tight text-ash-grey/90";

type CardTileProps = {
  instance: Doc<"cardInstances">;
  selected: boolean;
  interactive: boolean;
  onSelect: () => void;
  onTap?: () => void;
  size?: "sm" | "md";
};

// Every other zone has no competing direct action, so a single tap selects
// immediately — there's nothing for it to disambiguate from.
export default function CardTile({ instance, selected, interactive, onSelect, onTap, size = "sm" }: CardTileProps) {
  const card = useQuery(api.cards.getByOracleId, instance.cardOracleId ? { oracleId: instance.cardOracleId } : "skip");
  const clickTimer = useRef<number | null>(null);
  const lastPointerUpAt = useRef(0);

  const isToken = !instance.cardOracleId;
  const name = isToken ? instance.tokenName ?? "Token" : card?.name;
  const dimensions = size === "md" ? "h-24 w-17 sm:h-28 sm:w-20" : "h-16 w-11 sm:h-20 sm:w-14";
  const isBattlefieldTap = instance.zone === "battlefield" && Boolean(onTap);

  const clearClickTimer = () => {
    if (clickTimer.current !== null) {
      window.clearTimeout(clickTimer.current);
      clickTimer.current = null;
    }
  };

  const handlePointerUp = () => {
    if (!interactive) return;

    if (!isBattlefieldTap) {
      onSelect();
      return;
    }

    const now = performance.now();
    if (now - lastPointerUpAt.current < DOUBLE_CLICK_MS) {
      clearClickTimer();
      lastPointerUpAt.current = 0;
      onSelect();
      return;
    }
    lastPointerUpAt.current = now;
    clickTimer.current = window.setTimeout(() => {
      clickTimer.current = null;
      onTap!();
    }, DOUBLE_CLICK_MS);
  };

  const counterEntries = Object.entries(instance.counters).filter(([, n]) => n !== 0);

  return (
    <button
      type="button"
      disabled={!interactive}
      onPointerUp={handlePointerUp}
      title={name ?? "Loading…"}
      className={`relative shrink-0 ${dimensions} transition-transform duration-150 ease-out ${instance.tapped ? "rotate-90" : ""} ${
        interactive ? "cursor-pointer" : "cursor-default"
      } ${selected ? "z-10 -translate-y-1 scale-105" : ""}`}
    >
      <div
        className={`h-full w-full overflow-hidden rounded-[4px] border transition-shadow duration-150 ${
          selected ? "border-orchid-hush shadow-[0_0_0_2px_var(--theme-orchid-hush),0_10px_20px_rgba(0,0,0,0.35)]" : "border-foreground/15 shadow-[0_6px_14px_rgba(0,0,0,0.25)]"
        }`}
      >
        {isToken ? (
          <div className={TILE_FALLBACK_CLASS}>
            <span className="font-semibold text-orchid-hush">{instance.tokenName ?? "Token"}</span>
            {instance.tokenPower || instance.tokenToughness ? (
              <span className="font-mono text-ash-grey/80">
                {instance.tokenPower ?? "?"}/{instance.tokenToughness ?? "?"}
              </span>
            ) : null}
          </div>
        ) : card === undefined ? (
          <div className={TILE_FALLBACK_CLASS}>…</div>
        ) : (
          <CardImage src={card?.imageUri} alt={name ?? "Card"} className={TILE_IMAGE_CLASS} fallbackClassName={TILE_FALLBACK_CLASS} />
        )}
      </div>
      {counterEntries.length > 0 ? (
        <div className="pointer-events-none absolute -bottom-1 left-1/2 flex -translate-x-1/2 flex-wrap justify-center gap-0.5">
          {counterEntries.map(([type, n]) => (
            <span key={type} className="tech-badge bg-background/90 px-1 py-0 font-mono text-[8px] font-semibold text-orchid-hush">
              {type === "+1/+1" || type === "-1/-1" ? "" : `${type} `}
              {n > 0 && type !== "+1/+1" && type !== "-1/-1" ? "+" : ""}
              {n}
            </span>
          ))}
        </div>
      ) : null}
    </button>
  );
}
