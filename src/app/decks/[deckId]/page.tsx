import { Id } from "../../../../convex/_generated/dataModel";
import DeckBuilderPage from "@/components/deckbuilder/DeckBuilderPage";

export default async function DeckRoutePage({
  params,
}: {
  params: Promise<{
    deckId: string;
  }>;
}) {
  const { deckId } = await params;

  return <DeckBuilderPage deckId={deckId as Id<"decks">} />;
}
