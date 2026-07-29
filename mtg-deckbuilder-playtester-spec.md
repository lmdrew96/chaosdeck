# MTG Deckbuilder + Playtester — Project Spec

**Status:** Concept / pre-build
**Origin:** Conversation w/ Trae about Cockatrice pain points
**Data source:** [Scryfall API](https://scryfall.com/docs/api)

---

## 1. Scope Decision

Two subsystems, deliberately different in ambition:

| Subsystem | Scope |
|---|---|
| **Deckbuilder** | Full-featured. Search, build, validate, analyze. Straightforward CRUD over Scryfall data. |
| **Playtester** | "Goldfish-plus" tier — see below. Explicitly **not** a rules-enforcing engine. |

### Playtester tiers considered

1. **Goldfish** — manual zone management, no automation. (Rejected: too little value-add over paper.)
2. **Goldfish-plus** *(chosen)* — automate bookkeeping (mana, damage math, phases, triggers-as-reminders). Leave rules judgment (targeting, resolution, stack legality) to the players.
3. **Full rules engine** — simulate the actual stack/targeting/static-ability layers. (Rejected: this is what Forge/XMage took years of contributor-hours to build. Out of scope for a solo project.)

**Core principle for tier 2:** automate arithmetic and state tracking (definite right answers), leave semantic judgment (what a card means) to the player.

---

## 2. Why Build This (vs. use Cockatrice)

Three pain points identified, with Trae's flagged as the headline:

1. **UI feels dated/clunky** (Qt-era look, fiddly drag-and-drop)
2. **Deck import format is finicky** (strict `.cod` XML or exact-match plaintext, fails silently)
3. **No good mobile/cross-platform support** (desktop-only Qt app)
4. **⭐ THE major pain point (Trae):** *having to remember to do EVERYTHING, with no pointers for what you might be forgetting.*

Point 4 reframes the whole project. This isn't just "Cockatrice but nicer" — it's an **executive-function support layer** for Magic gameplay. That's directly in the design language already established by ControlledChaos.

---

## 3. Fixes for Pain Points 1–3

### Cross-platform (fixes #3 structurally)
- Ship as a **PWA** — one codebase, works on phone/tablet/desktop, installable, offline-capable once cards are cached.
- Design implication: **tap-first interactions**, not drag-first. Tap card → tap destination zone. Drag is a secondary desktop nicety, not the primary interaction model (this also addresses #1's drag-and-drop complaints).

### UI modernization (fixes #1)
- Flexible/scrollable battlefield zones — no cramped fixed grids (breaks on token-heavy boards).
- Zones persistently visible or one tap away, never buried in menus.
- Minimal but purposeful animations on state changes (card moves zones, taps) — Cockatrice's instant-snap makes state changes hard to track.
- Big, tappable +/- steppers for life/counters — not tiny type-into fields.
- Reuse ADHDesigns design system (already built for scannability + low cognitive load).

### Deck import robustness (fixes #2 — the highest-leverage fix, first-five-minutes UX)
- Accept messy plaintext (Arena export, MTGO export, generic `4 Lightning Bolt` lines) via one flexible parser instead of format-locked parsing.
- Use Scryfall's **fuzzy name search** (`/cards/named?fuzzy=`) to resolve typos/partial matches instead of requiring exact names.
- Unresolved lines surface inline with suggestions ("Did you mean...?") — import doesn't fail wholesale on one bad line.
- Stretch goal: accept a pasted Moxfield/Archidekt URL and parse their export directly, since that's where most people's decks already live.

---

## 4. Scryfall Integration Notes

From the [API docs](https://scryfall.com/docs/api):

- **Rate limit:** 50–100ms between requests (~10 req/sec). Fine for debounced search-as-you-type; don't hammer it in a loop.
- **Bulk data downloads:** a full compressed DB dump, updated daily. **Recommended approach:** download once, cache locally, query your own DB rather than hitting the live API per-card. Scryfall explicitly asks for ≥24hr caching. This also makes search instant instead of network-bound.
- **Price updates:** once per day server-side — no point polling more often for pricing.
- **Gameplay data** (names, oracle text, mana costs): updates much less frequently — weekly or post-set-release refresh is plenty if you don't need same-day spoilers.
- **Attribution rules:** can't imply Scryfall endorsement, can't paywall access to the underlying card data, can't strip artist/copyright credit off card images, can't use the data to make a non-Magic game. All easy to comply with by default; worth reviewing if the project ever adds accounts or monetization.
- **Multi-face cards:** transform/MDFC/split/adventure cards store `oracle_text` per-entry in `card_faces[]` rather than at the top level — the parser needs to handle both shapes.

---

## 5. The Pointer System (core differentiator)

**Design lens:** ND-centered design, principle #2 — *externalize executive function*. The system should scaffold working memory, not assume the player has reliable internal tracking for "everything that might be relevant right now."

### The trick that keeps this out of full-rules-engine territory

**Detection, not interpretation.** You don't need to understand what a card *does* to remind someone it might matter — Scryfall's `oracle_text` already contains trigger language in highly formulaic patterns ("When X enters the battlefield," "Whenever X attacks," "At the beginning of your upkeep," etc.). Pattern-match those phrases at data-ingest time, tag the card, and when game state hits that condition, surface a reminder. The system flags that a condition fired — it never resolves what happens next.

### Pointer categories

| Pointer | Trigger condition | Why it's forgettable |
|---|---|---|
| Play a land? | Main phase active, no land played yet, land(s) in hand | Most common miss in the game |
| X mana still up | Phase ending, mana pool non-empty | Mana empties at phase end (real rule) |
| You have a trigger | Permanent with a tagged oracle-text clause just met its condition | The exact pain point Trae named |
| Creatures could attack | Combat phase, untapped non-summoning-sick creatures exist, no attackers declared | Passing combat by accident |
| Live options (opponent's turn) | Instant-speed cards in hand during opponent's turn | Reminds you a window exists, doesn't tell you to use it |
| Cards in exile | Impulse-draw/adventure-style exile zone has a castable card with a time window | These expire silently and get forgotten |

### ND-design constraints on how pointers behave

- **No shame mechanics.** Neutral chips ("Trigger available"), never "You forgot X!"
- **Dismissible, never blocking.** Tap to dismiss. Never gates gameplay or forces acknowledgment.
- **Configurable verbosity.** New players may want everything flagged; veterans want only high-value pointers (e.g., unspent mana). Store as a per-user setting — reduce decisions by defaulting sensibly, but allow dialing down.
- **Predictable placement.** One consistent panel location, every game. No popup chaos, no flying toast notifications.
- **Never color-only.** Icon + text per pointer type, not just a colored dot.

---

## 6. Oracle Text Tagging — Approach & Findings

**Method:** normalize oracle text (strip parenthetical reminder text, replace the card's own name with a `~` placeholder), split into per-ability clauses on newlines, then run an ordered set of anchored regex patterns against each clause. Trigger clauses in Magic overwhelmingly start with "When," "Whenever," or "At the beginning of" — anchoring patterns at clause-start is what naturally filters out static ability wording that happens to contain trigger-adjacent words (e.g. "enters the battlefield tapped" has no "When" prefix, so it's correctly ignored).

### Tag categories

`ETB_SELF`, `ETB_OTHER`, `LANDFALL`, `DIES_SELF`, `DIES_OTHER`, `LEAVES_BATTLEFIELD`, `ATTACKS`, `BLOCKS`, `BECOMES_BLOCKED`, `COMBAT_DAMAGE_PLAYER`, `UPKEEP`, `END_STEP`, `DRAW_STEP`, `BEGIN_COMBAT`, `CAST_TRIGGER`, `DISCARD_TRIGGER`, `TAPPED_ABILITY` (standing option, not a trigger), `IMPULSE_EXILE` (expiring exile-and-play window)

Each tagged clause also carries an `optional` flag (clause contains "may") for lower-urgency display.

### Validated against 11 real cards during a build pass

Confirmed correct tagging for: Solitude, Reflector Mage, Krenko Mob Boss, Fiery Temper, Elvish Mystic, Grim Lavamancer, Reckless Impulse, Bloodline Keeper, Stormfist Crusader, Goblin Guide, Grave Titan.

**Bugs found and fixed during that pass:**
1. Tap-cost detection only checked the start of a clause — missed costs like `{R}, {T}, Exile two cards...:` where `{T}` isn't first. Fixed to scan the full cost segment before the colon.
2. No "dies" category existed for anything but the card itself — Grave Titan's "Whenever a Zombie you control dies" went untagged. Added `DIES_OTHER`, mirroring the existing self/other split on `ETB`.
3. Impulse-exile detection assumed a fixed clause word order ("you may play... until end of turn"). Reckless Impulse phrases it in reverse ("Until the end of your next turn, you may play..."). Fixed to check both conditions independently rather than as one ordered pattern.

### Known gaps (intentionally out of scope for v1, or genuinely deferred)

- `DRAW_TRIGGER` isn't a category yet (e.g. Stormfist Crusader's "Whenever you draw a card"). Cheap to add later if the pointer engine needs it.
- Delayed triggers created *during* a game (e.g. "until end of turn, whenever ~ attacks...") don't exist in static oracle text — that's a runtime concern for the reminder engine, not the tagging layer.
- `ETB_OTHER` doesn't currently distinguish "your permanent entered" vs. "opponent's permanent entered." Fine for v1 ("something relevant happened"); revisit if it produces noisy false positives.
- Keyword abilities that imply a trigger without spelling it out in oracle text (e.g. Afterlife implying a death trigger) aren't caught — but Scryfall's oracle text usually does spell these out, so impact should be low. Worth a spot-check on keyword-heavy sets once built.
- Tagging captures *capability*, not *obligation*. A tagged clause means "this exists on the card" — the reminder engine still needs live game state to know whether the condition actually fired this turn.

---

## 7. Open Questions for Next Session

- Data layer choice for the local card cache (Convex, per ScribeCat precedent, or something else?)
- Reminder-engine state machine: what exactly counts as "condition met, not yet acknowledged" per pointer type, and how/when pointers clear
- Game-state schema for zones, mana pool, and turn/phase tracking
- Whether Moxfield/Archidekt URL import is v1 or a fast-follow
