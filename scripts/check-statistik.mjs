import assert from "node:assert/strict";
import { getBestandsoversikt } from "../lib/statistik.ts";

const summary = getBestandsoversikt(
  [
    { fastighet: "Arkivet" },
    { fastighet: "Arkivet" },
    { fastighet: "Sankt Thomas" },
  ],
  [{ id: "1" }, { id: "2" }],
  [
    { typ: "inneboende" },
    { typ: "andrahandsgast" },
  ]
);

assert.equal(summary.bostader, 3);
assert.equal(summary.hyresgasterTotalt, 3);
assert.equal(summary.inneboende, 1);
assert.equal(summary.andrahandsgaster, 1);
assert.deepEqual(summary.bostaderPerFastighet, [
  { label: "Arkivet", count: 2 },
  { label: "Sankt Thomas", count: 1 },
]);

console.log("Statistikaggregationen är korrekt.");
