// Static, type-line-derived groupings that MTG cards can care about (e.g.
// "whenever a Party creature enters" or "historic spells cost {1} less").
// Detection only, matching convex/oracleTagger.ts's philosophy — these say a
// card qualifies for the group, not that any specific ability is triggering.

export type TypeGroupBadge = "Historic" | "Party" | "Outlaw";

const PARTY_CREATURE_TYPES = ["Cleric", "Rogue", "Warrior", "Wizard"];
const OUTLAW_CREATURE_TYPES = ["Assassin", "Mercenary", "Pirate", "Rogue", "Warlock"];

export function getTypeGroupBadges(typeLine: string | undefined): TypeGroupBadge[] {
  if (!typeLine) return [];
  const badges: TypeGroupBadge[] = [];

  if (typeLine.includes("Legendary") || typeLine.includes("Artifact") || typeLine.includes("Saga")) {
    badges.push("Historic");
  }
  if (PARTY_CREATURE_TYPES.some((t) => typeLine.includes(t))) {
    badges.push("Party");
  }
  if (OUTLAW_CREATURE_TYPES.some((t) => typeLine.includes(t))) {
    badges.push("Outlaw");
  }

  return badges;
}

// "Modified" is a battlefield-only characteristic (real rule: a permanent
// with a counter on it, or that's enchanted/equipped/an equipment/a
// fortified permanent). This app doesn't model aura/equipment attachment
// (see schema.ts's cardInstances comment — no attachedTo field), so this
// only checks the counter half of the real rule — a documented gap, not a
// silent one.
export function hasModifiedCounter(counters: Record<string, number>): boolean {
  return Object.values(counters).some((n) => n !== 0);
}
