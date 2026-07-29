// Pattern-matches oracle text into trigger/ability categories for the
// pointer/reminder engine. Detection, not interpretation: a tag means "this
// capability exists on the card" — it never resolves what the ability does,
// and the reminder engine still needs live game state to know whether a
// tagged condition actually fired this turn.
//
// No "use node" here and no Convex functions registered — this is a plain,
// isomorphic helper imported by both the ingest action (Node runtime) and
// anything else that needs it later (default runtime).

const SELF_TOKEN = "~";

export type OracleTag =
  | "ETB_SELF"
  | "ETB_OTHER"
  | "LANDFALL"
  | "DIES_SELF"
  | "DIES_OTHER"
  | "LEAVES_BATTLEFIELD"
  | "ATTACKS"
  | "BLOCKS"
  | "BECOMES_BLOCKED"
  | "COMBAT_DAMAGE_PLAYER"
  | "UPKEEP"
  | "END_STEP"
  | "DRAW_STEP"
  | "BEGIN_COMBAT"
  | "CAST_TRIGGER"
  | "DISCARD_TRIGGER"
  | "TAPPED_ABILITY"
  | "IMPULSE_EXILE";

export type TaggedClause = { tag: OracleTag; optional: boolean };

// Modern templating (2023+) mostly says "this creature"/"this permanent"
// instead of repeating the card's own name, but older/un-updated text still
// uses the literal name — collapse both spellings of "self" to one token so
// every downstream pattern only has to check for "~".
function normalizeClause(clause: string, cardName: string): string {
  let text = clause.replace(/\([^)]*\)/g, ""); // strip reminder text
  if (cardName) {
    const escapedName = cardName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    text = text.replace(new RegExp(escapedName, "gi"), SELF_TOKEN);
  }
  text = text.replace(
    /\bthis (creature|permanent|artifact|enchantment|land|planeswalker|battle|spell)\b/gi,
    SELF_TOKEN,
  );
  return text.replace(/\s+/g, " ").trim();
}

// Ability words (Landfall, Constellation, Metalcraft, ...) place the trigger
// word after an em-dash rather than at the very start of the clause.
function stripAbilityWord(text: string): string {
  return text.replace(/^[A-Za-z][\w\s]{0,30}—\s*/, "");
}

// Trigger clauses are almost always "Condition, effect." — restricting
// self/other and verb checks to the pre-comma condition keeps them from
// false-matching on unrelated wording in the effect half of the sentence.
function triggerCondition(anchored: string): string {
  const commaIdx = anchored.indexOf(",");
  return commaIdx === -1 ? anchored : anchored.slice(0, commaIdx);
}

// Bug fix (see ChaosPatch history): the tap symbol isn't always the first
// thing in a cost — e.g. "{R}, {T}, Exile two cards from your graveyard:" —
// so scan the whole cost segment before the colon, not just its start.
function isTappedAbility(clause: string): boolean {
  const colonIdx = clause.indexOf(":");
  if (colonIdx === -1) return false;
  return clause.slice(0, colonIdx).includes("{T}");
}

// Bug fix: card text doesn't always phrase permission-then-expiration in
// that order (Reckless Impulse reverses it), so check both independently
// rather than as a single ordered pattern.
function isImpulseExile(clause: string): boolean {
  const hasExileAndPlay = /\bexile\b/i.test(clause) && /\bmay play\b/i.test(clause);
  const hasTimeWindow =
    /\buntil (the )?end of (your next turn|your turn|the turn)\b/i.test(clause) ||
    /\bthis turn\b/i.test(clause);
  return hasExileAndPlay && hasTimeWindow;
}

export function tagOracleText(oracleText: string | undefined, cardName: string): TaggedClause[] {
  if (!oracleText) return [];
  const tags: TaggedClause[] = [];

  for (const rawClause of oracleText.split("\n")) {
    const normalized = normalizeClause(rawClause, cardName);
    if (!normalized) continue;

    const optional = /\bmay\b/i.test(normalized);
    const push = (tag: OracleTag) => tags.push({ tag, optional });

    // These aren't triggers, so they're checked on every clause regardless
    // of whether it's anchored by a trigger word.
    if (isTappedAbility(normalized)) push("TAPPED_ABILITY");
    if (isImpulseExile(normalized)) push("IMPULSE_EXILE");

    const anchored = stripAbilityWord(normalized);
    const condition = triggerCondition(anchored);
    const isLandfallWord = /^landfall\b/i.test(normalized);

    if (isLandfallWord || /^whenever a land( you control)? enters\b/i.test(condition)) {
      push("LANDFALL");
    }

    if (!/^(when|whenever|at the beginning of)\b/i.test(anchored)) continue;

    const hasSelf = condition.includes(SELF_TOKEN);
    const hasOther = /\banother\b/i.test(condition);

    if (/\benters\b/i.test(condition)) {
      if (hasSelf) push("ETB_SELF");
      if (hasOther) push("ETB_OTHER");
    }
    if (/\bdies\b/i.test(condition)) {
      if (hasSelf) push("DIES_SELF");
      if (hasOther) push("DIES_OTHER");
    }
    if (hasSelf && /\bleaves the battlefield\b/i.test(condition)) push("LEAVES_BATTLEFIELD");
    if (hasSelf && /\bbecomes blocked\b/i.test(condition)) push("BECOMES_BLOCKED");
    if (hasSelf && /\bblocks\b/i.test(condition)) push("BLOCKS");
    if (hasSelf && /\battacks\b/i.test(condition)) push("ATTACKS");
    if (/\bdeals combat damage to a player\b/i.test(condition)) push("COMBAT_DAMAGE_PLAYER");
    if (/^whenever you cast\b/i.test(condition)) push("CAST_TRIGGER");
    if (/^whenever (you|a player|an opponent|each player)\b.*\bdiscards?\b/i.test(condition)) {
      push("DISCARD_TRIGGER");
    }
    if (/^at the beginning of\b.*\bupkeep\b/i.test(condition)) push("UPKEEP");
    if (/^at the beginning of\b.*\bend step\b/i.test(condition)) push("END_STEP");
    if (/^at the beginning of\b.*\bdraw step\b/i.test(condition)) push("DRAW_STEP");
    if (/^at the beginning of combat\b/i.test(condition)) push("BEGIN_COMBAT");
  }

  return tags;
}
