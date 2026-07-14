// One-time, idempotent backfill for the nationsID multi-tenancy migration.
// Sets nationsID: "LND" on every pre-existing document (across every
// collection) that doesn't have one yet, and seeds the new "fastigheter"
// collection with LND's current buildings if it's empty.
//
// Run with env vars loaded, e.g.:
//   node --env-file=.env.local scripts/backfill-nations-id.mjs
import { MongoClient } from "mongodb";

const NATIONS_ID = "LND";
const COLLECTIONS = [
  "apartments",
  "tenants",
  "uppsagningar",
  "rentalobjects",
  "floor-plans",
  "mail-templates",
];
const DEFAULT_FASTIGHETER = [
  "Arkivet (223 59, Lund)",
  "Gamla huset (223 51, Lund)",
  "Nya huset (223 51, Lund)",
  "Finn huset (223 51, Lund)",
];

if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
  console.error("Missing MONGODB_URI or MONGODB_DB environment variable.");
  process.exit(1);
}

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB);

try {
  for (const name of COLLECTIONS) {
    const res = await db
      .collection(name)
      .updateMany({ nationsID: { $exists: false } }, { $set: { nationsID: NATIONS_ID } });
    console.log(`${name}: backfilled ${res.modifiedCount}`);
  }

  const fastigheterCol = db.collection("fastigheter");
  const existing = await fastigheterCol.countDocuments({ nationsID: NATIONS_ID });
  if (existing === 0) {
    await fastigheterCol.insertMany(
      DEFAULT_FASTIGHETER.map((namn) => ({ nationsID: NATIONS_ID, namn }))
    );
    console.log(`fastigheter: seeded ${DEFAULT_FASTIGHETER.length} buildings for ${NATIONS_ID}`);
  } else {
    console.log(`fastigheter: already has ${existing} entries for ${NATIONS_ID}, skipped seeding`);
  }
} finally {
  await client.close();
}
