"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useAction } from "convex/react";
import { api } from "../../../convex/_generated/api";
import CardImage from "@/components/cards/CardImage";
import type { CardHoverPreviewData } from "@/components/cards/CardHoverPreview";

type Ruling = { publishedAt: string; comment: string };

// A lighter-weight counterpart to CardBrowser's CardModal — same image +
// oracle text a hover preview shows, as a tap target for touch devices
// where hover never fires. Rulings are opt-in via `oracleId`: callers that
// only have hover-preview data (no oracleId) get the original no-lookup
// behavior unchanged.
export default function CardDetailModal({ card, oracleId, onClose }: { card: CardHoverPreviewData; oracleId?: string; onClose: () => void }) {
  const getCardPrintings = useAction(api.cards.getCardPrintings);
  const [rulings, setRulings] = useState<Ruling[] | null>(null);
  // Lazy-initialized from the mount-time prop (mirrors CardBrowser's
  // CardModal): this component remounts fresh each time a card's details
  // open, so there's no later prop change to react to.
  const [rulingsLoading, setRulingsLoading] = useState(() => Boolean(oracleId));

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  useEffect(() => {
    if (!oracleId) return;
    let cancelled = false;
    void getCardPrintings({ oracleId })
      .then((details) => {
        if (!cancelled) setRulings(details.rulings);
      })
      .catch(() => {
        if (!cancelled) setRulings(null);
      })
      .finally(() => {
        if (!cancelled) setRulingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [oracleId, getCardPrintings]);

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

        {oracleId ? (
          <div className="mt-4 flex flex-col gap-2">
            <h4 className="font-mono text-xs font-semibold uppercase tracking-[0.24em] text-ash-grey/80">Rulings</h4>
            <div className="tech-row flex flex-col gap-2 px-3 py-3 text-sm text-ash-grey/80">
              {rulingsLoading ? (
                <p>Loading rulings…</p>
              ) : rulings?.length ? (
                rulings.map((ruling) => (
                  <div key={`${ruling.publishedAt}-${ruling.comment}`} className="space-y-1">
                    <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-orchid-hush/70">{ruling.publishedAt}</p>
                    <p className="whitespace-pre-wrap">{ruling.comment}</p>
                  </div>
                ))
              ) : (
                <p>No rulings found.</p>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}
