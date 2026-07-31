"use client";

import { Id } from "../../../convex/_generated/dataModel";
import CardBrowser from "@/components/cards/CardBrowser";

export default function CardSearchPanel({ deckId }: { deckId: Id<"decks"> }) {
  return <CardBrowser deckId={deckId} title="Card search" description="Search by name or Scryfall syntax, hover for art, and open the modal for printings." />;
}
