"use client";

import { createPortal } from "react-dom";
import CardImage from "@/components/cards/CardImage";

export type CardHoverFace = {
  name: string;
  imageUri?: string;
  oracleText?: string;
};

export type CardHoverPreviewData = {
  name: string;
  imageUri?: string;
  cardFaces?: CardHoverFace[];
  oracleText?: string;
  subtitle?: string;
};

type CardHoverPreviewProps = {
  card: CardHoverPreviewData | null;
  position: { top: number; left: number } | null;
};

export default function CardHoverPreview({ card, position }: CardHoverPreviewProps) {
  if (!card || !position) return null;

  const hasFaces = Boolean(card.cardFaces?.length);

  // Portaled to body: this floats relative to the viewport, but ancestors
  // like .tech-panel set a non-none clip-path, which establishes a new
  // containing block for position:fixed descendants and would otherwise
  // pin this to the (often much taller) panel box instead of the screen.
  return createPortal(
    <div
      className="pointer-events-none fixed z-40 hidden w-[18rem] max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto sm:block"
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
    >
      <div className="overflow-hidden rounded-xl border border-foreground/15 bg-background/95 shadow-[0_24px_60px_rgba(0,0,0,0.32)] backdrop-blur-sm">
        <div className="flex flex-col gap-3 p-3">
          {hasFaces ? (
            <div className={`grid gap-2 ${card.cardFaces!.length > 1 ? "grid-cols-2" : ""}`}>
              {card.cardFaces!.map((face) => (
                <CardImage key={face.name} src={face.imageUri} alt={face.name} />
              ))}
            </div>
          ) : (
            <CardImage src={card.imageUri} alt={card.name} />
          )}

          <div className="space-y-1 text-xs text-ash-grey/80">
            <p className="font-semibold uppercase tracking-[0.18em] text-orchid-hush">{card.name}</p>
            {card.subtitle ? <p className="font-mono uppercase tracking-[0.16em] text-ash-grey/80">{card.subtitle}</p> : null}
            <p className="whitespace-pre-wrap text-sm leading-5 text-orchid-hush/90">{card.oracleText ?? "No oracle text available."}</p>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
