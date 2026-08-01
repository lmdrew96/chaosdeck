import { Id } from "../../../../convex/_generated/dataModel";
import PlaytestBoard from "@/components/playtester/PlaytestBoard";

export default async function PlayRoutePage({
  params,
}: {
  params: Promise<{
    gameId: string;
  }>;
}) {
  const { gameId } = await params;

  return <PlaytestBoard gameId={gameId as Id<"games">} />;
}
