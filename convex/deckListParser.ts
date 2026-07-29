// Flexible plaintext deck-list parser. Accepts generic "4 Cardname" lines,
// MTGO's plain count+name lines and "SB:" sideboard prefix, and Arena's
// export format ("4 Lightning Bolt (STA) 42", optionally with a "*F*" foil
// marker). No network calls here — see deckImport.ts for name resolution.

export type DeckSection = "deck" | "sideboard" | "commander" | "companion";

export type ParsedLine = {
  raw: string;
  section: DeckSection;
  quantity: number;
  name: string;
  setCode?: string;
  collectorNumber?: string;
};

const HEADER_PATTERN = /^(deck|sideboard|commander|companion)\s*:?\s*$/i;
const SIDEBOARD_PREFIX = /^SB:?\s+/i;
const QUANTITY_PREFIX = /^(\d+)\s*x?\s+(.+)$/i;
// Arena metadata suffix: "(SET) collectorNumber *F*", set code and
// collector number both optional-ish but always parenthesized-set-first.
const ARENA_SUFFIX = /^(.+?)\s+\(([A-Za-z0-9]{2,6})\)\s*([A-Za-z0-9-]*)\s*(?:\*F\*)?\s*$/;

export function parseDeckList(text: string): ParsedLine[] {
  const lines: ParsedLine[] = [];
  let section: DeckSection = "deck";

  for (const rawLine of text.split("\n")) {
    const trimmed = rawLine.trim();
    if (!trimmed || trimmed.startsWith("//") || trimmed.startsWith("#")) continue;

    const headerMatch = trimmed.match(HEADER_PATTERN);
    if (headerMatch) {
      section = headerMatch[1].toLowerCase() as DeckSection;
      continue;
    }
    // A bare "SB"/"SB:" line (no card after it) is a section marker, not a
    // sideboard prefix on a card line — handle before SIDEBOARD_PREFIX,
    // which requires trailing content.
    if (/^SB:?$/i.test(trimmed)) {
      section = "sideboard";
      continue;
    }

    let lineSection = section;
    let body = trimmed;
    const sbMatch = body.match(SIDEBOARD_PREFIX);
    if (sbMatch) {
      lineSection = "sideboard";
      body = body.slice(sbMatch[0].length);
    }

    const qtyMatch = body.match(QUANTITY_PREFIX);
    const quantity = qtyMatch ? parseInt(qtyMatch[1], 10) : 1;
    let name = qtyMatch ? qtyMatch[2] : body;

    let setCode: string | undefined;
    let collectorNumber: string | undefined;
    const arenaMatch = name.match(ARENA_SUFFIX);
    if (arenaMatch) {
      name = arenaMatch[1];
      setCode = arenaMatch[2].toLowerCase();
      collectorNumber = arenaMatch[3] || undefined;
    }

    lines.push({ raw: rawLine, section: lineSection, quantity, name: name.trim(), setCode, collectorNumber });
  }

  return lines;
}
