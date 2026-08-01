"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";
import CardImage from "@/components/cards/CardImage";
import type { CardHoverPreviewData } from "@/components/cards/CardHoverPreview";

// A lighter-weight counterpart to CardBrowser's CardModal — no printings or
// rulings lookup, just the same image + oracle text a hover preview shows,
// as a tap target for touch devices where hover never fires.
export default function CardDetailModal({ card, onClose }: { card: CardHoverPreviewData; onClose: () => void }) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const hasFaces = Boolean(card.cardFaces?.length);

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[#120d0a]/80 px-4 py-8" onClick={onClose}>
      <div className="tech-panel my-auto w-full max-w-md p-5" onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex items-start justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-orchid-hush">{card.name}</h3>
            {card.subtitle ? <p className="text-xs text-ash-grey/80">{card.subtitle}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="font-mono text-xs uppercase tracking-[0.16em] text-ash-grey/80 transition hover:text-orchid-hush"
          >
            Close
          </button>
        </div>

        <div className={`grid gap-3 ${hasFaces && card.cardFaces!.length > 1 ? "sm:grid-cols-2" : ""}`}>
          {hasFaces
            ? card.cardFaces!.map((face) => <CardImage key={face.name} src={face.imageUri} alt={face.name} />)
            : <CardImage src={card.imageUri} alt={card.name} />}
        </div>

        <div className="mt-4 space-y-3 text-sm text-orchid-hush/90">
          {hasFaces ? (
            card.cardFaces!.map((face) => (
              <div key={face.name} className="space-y-1">
                <p className="font-medium text-orchid-hush">{face.name}</p>
                <p className="whitespace-pre-wrap text-ash-grey/90">{face.oracleText ?? "No oracle text."}</p>
              </div>
            ))
          ) : (
            <p className="whitespace-pre-wrap">{card.oracleText ?? "No oracle text available."}</p>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}
