import { Doc } from "../../../convex/_generated/dataModel";

// Goldfish-plus scope (see mtg-deckbuilder-playtester-spec.md): automate
// definite-answer state, leave semantic judgment to the players. Timing
// legality is a definite answer (phase + whose turn it is), so it's checked
// here — but the check only ever produces a confirmable warning, never a
// hard block, since real games have override effects (granted flash, extra
// land drops, etc.) this schema has no way to detect.

function frontTypeLine(card: Pick<Doc<"cards">, "typeLine" | "cardFaces">): string {
  return card.typeLine ?? card.cardFaces?.[0]?.typeLine ?? "";
}

function isSorcerySpeedOnly(card: Pick<Doc<"cards">, "typeLine" | "cardFaces" | "keywords">): boolean {
  const typeLine = frontTypeLine(card);
  if (typeLine.includes("Instant")) return false;
  if (card.keywords.includes("Flash")) return false;
  return true;
}

// Sorcery-speed timing: the active player's own main phase. Returns a
// warning message when the timing looks wrong, or null when it's fine.
export function checkSorcerySpeedTiming(
  card: Pick<Doc<"cards">, "typeLine" | "cardFaces" | "keywords">,
  gamePhase: Doc<"games">["phase"],
  isOwnerActivePlayer: boolean,
): string | null {
  if (!isSorcerySpeedOnly(card)) return null;
  if (isOwnerActivePlayer && (gamePhase === "main1" || gamePhase === "main2")) return null;
  return "Sorcery-speed cards are normally played during your own main phase. Play anyway?";
}

// Land drops follow the same "your main phase" timing, plus the one-per-turn
// limit (extra land effects are the "otherwise overridden" case).
export function checkLandTiming(
  gamePhase: Doc<"games">["phase"],
  isOwnerActivePlayer: boolean,
  landsPlayedThisTurn: number,
): string | null {
  if (!isOwnerActivePlayer || (gamePhase !== "main1" && gamePhase !== "main2")) {
    return "Lands are normally played during your own main phase. Play anyway?";
  }
  if (landsPlayedThisTurn > 0) {
    return "You've already played a land this turn. Play another anyway?";
  }
  return null;
}
