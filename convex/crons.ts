import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Every day at 09:00 UTC.
crons.cron(
  "refresh Scryfall card cache",
  "0 9 * * *",
  internal.scryfallIngest.ingestOracleCards,
);

export default crons;
