// One-time, idempotent data-quality cleanup:
//   1. rentalobjects with no valid renoveringsbehov (missing/null/anything
//      outside 1-4) get set to 1 ("OK").
//   2. Any "fastighet" value that looks like "Arkivet A/B/C/D" (the letter
//      belongs in lägenhetsnummer, not fastighet — see FASTIGHET_PREFIXES in
//      lib/rentalobjects.ts) gets normalized to that nation's actual
//      "Arkivet ..." fastighet name, across every collection that stores a
//      fastighet field.
//
// Run with env vars loaded, e.g.:
//   node --env-file=.env.local scripts/fix-data-quality.mjs
import { MongoClient } from "mongodb";

if (!process.env.MONGODB_URI || !process.env.MONGODB_DB) {
  console.error("Missing MONGODB_URI or MONGODB_DB environment variable.");
  process.exit(1);
}

const ARKIVET_LETTER_RE = /^arkivet\s*[abcd]\b/i;
const COLLECTIONS_WITH_FASTIGHET = ["apartments", "tenants", "rentalobjects", "uppsagningar"];

const client = await new MongoClient(process.env.MONGODB_URI).connect();
const db = client.db(process.env.MONGODB_DB);

try {
  // 1. Missing renoveringsbehov -> OK (1)
  const renovRes = await db.collection("rentalobjects").updateMany(
    { renoveringsbehov: { $not: { $in: [1, 2, 3, 4] } } },
    { $set: { renoveringsbehov: 1 } }
  );
  console.log(`rentalobjects: set renoveringsbehov = OK (1) on ${renovRes.modifiedCount} object(s)`);

  // 2. Normalize "Arkivet A/B/C/D" fastighet values, per nation.
  const nationsIds = await db.collection("fastigheter").distinct("nationsID");

  for (const nationsId of nationsIds) {
    const fastigheter = await db.collection("fastigheter").find({ nationsID: nationsId }).toArray();
    const arkivetCandidates = fastigheter.filter((f) => f.namn.toLowerCase().startsWith("arkivet"));

    if (arkivetCandidates.length === 0) {
      console.log(`nationsID ${nationsId}: no fastighet starting with "Arkivet" found — skipped`);
      continue;
    }
    if (arkivetCandidates.length > 1) {
      console.log(
        `nationsID ${nationsId}: multiple "Arkivet" fastigheter found (${arkivetCandidates
          .map((f) => f.namn)
          .join(", ")}) — skipped, resolve manually`
      );
      continue;
    }

    const arkivetNamn = arkivetCandidates[0].namn;

    for (const collectionName of COLLECTIONS_WITH_FASTIGHET) {
      const res = await db
        .collection(collectionName)
        .updateMany(
          { nationsID: nationsId, fastighet: ARKIVET_LETTER_RE },
          { $set: { fastighet: arkivetNamn } }
        );
      if (res.modifiedCount > 0) {
        console.log(
          `${collectionName} (nationsID ${nationsId}): normalized ${res.modifiedCount} row(s) to fastighet "${arkivetNamn}"`
        );
      }
    }
  }
} finally {
  await client.close();
}
