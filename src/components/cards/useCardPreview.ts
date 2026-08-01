"use client";

import { useState } from "react";
import type { CardHoverPreviewData } from "@/components/cards/CardHoverPreview";

const PREVIEW_WIDTH = 288;
const GAP = 16;
const MARGIN = 16;

function computePreviewPosition(element: HTMLElement) {
  const rect = element.getBoundingClientRect();
  let left = rect.right + GAP;
  if (left + PREVIEW_WIDTH > window.innerWidth - MARGIN) {
    left = rect.left - PREVIEW_WIDTH - GAP;
  }
  if (left < MARGIN) {
    left = MARGIN;
  }
  const top = Math.max(MARGIN, Math.min(rect.top, window.innerHeight - MARGIN));
  return { top, left };
}

// Shared by CardBrowser's search results and DeckEntriesPanel's deck list —
// both hover a card row to show the same floating art+text preview,
// clamped to stay inside the viewport.
export function useCardPreview() {
  const [previewCard, setPreviewCard] = useState<CardHoverPreviewData | null>(null);
  const [previewPosition, setPreviewPosition] = useState<{ top: number; left: number } | null>(null);

  const showPreview = (card: CardHoverPreviewData, element: HTMLElement) => {
    setPreviewCard(card);
    setPreviewPosition(computePreviewPosition(element));
  };

  const clearPreview = () => {
    setPreviewCard(null);
    setPreviewPosition(null);
  };

  return { previewCard, previewPosition, showPreview, clearPreview };
}
