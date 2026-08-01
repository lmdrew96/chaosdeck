/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as cardInstances from "../cardInstances.js";
import type * as cards from "../cards.js";
import type * as crons from "../crons.js";
import type * as deckImport from "../deckImport.js";
import type * as deckListParser from "../deckListParser.js";
import type * as decks from "../decks.js";
import type * as edhrec from "../edhrec.js";
import type * as games from "../games.js";
import type * as oracleTagger from "../oracleTagger.js";
import type * as pointers from "../pointers.js";
import type * as scryfallIngest from "../scryfallIngest.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  cardInstances: typeof cardInstances;
  cards: typeof cards;
  crons: typeof crons;
  deckImport: typeof deckImport;
  deckListParser: typeof deckListParser;
  decks: typeof decks;
  edhrec: typeof edhrec;
  games: typeof games;
  oracleTagger: typeof oracleTagger;
  pointers: typeof pointers;
  scryfallIngest: typeof scryfallIngest;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
