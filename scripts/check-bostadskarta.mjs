import assert from "node:assert/strict";
import { blocksOverlap, clampBlockPosition, findFreeBlockPosition, generateRoomNumbers, matchResidents, placeRooms, roomsToBlocks, validateLayoutBlocks } from "../lib/building-floor-logic.ts";

const numbers = generateRoomNumbers([
  { prefix: "GH", start: 1, end: 2, padTo: 3 },
  { prefix: "B", start: 7, end: 8, padTo: 0 },
]);
assert.deepEqual(numbers, ["GH001", "GH002", "B7", "B8"]);
assert.deepEqual(generateRoomNumbers([{ prefix: "GH", start: 1001, end: 1017, padTo: 0 }]), Array.from({ length: 17 }, (_, index) => `GH${1001 + index}`));
assert.deepEqual(placeRooms(numbers, "alternating_left").map((room) => room.side), ["left", "right", "left", "right"]);
assert.deepEqual(placeRooms(numbers, "alternating_right").map((room) => room.side), ["right", "left", "right", "left"]);
assert.deepEqual(placeRooms(numbers, "left_first").map((room) => room.side), ["left", "left", "right", "right"]);
assert.deepEqual(placeRooms(numbers, "right_first").map((room) => room.side), ["right", "right", "left", "left"]);
assert.throws(() => generateRoomNumbers([{ prefix: "", start: 1, end: 501, padTo: 0 }]), /500/);
assert.throws(() => generateRoomNumbers([{ prefix: "A", start: 1, end: 1, padTo: 0 }, { prefix: "A", start: 1, end: 1, padTo: 0 }]), /dubbletter/);

const tenants = [{ lagenhetsnummer: "1402", fastighet: "Gamla huset", namn: "Ada" }];
const others = [{ lagenhetsnummer: "1402", fastighet: "Gamla huset", namn: "Bo", typ: "inneboende" }];
assert.deepEqual(matchResidents("GH1402", "Gamla huset", ["GH"], tenants, others), { primary: "Ada", others: [{ name: "Bo", type: "inneboende" }], matchedBy: "prefix" });
assert.equal(matchResidents("1402", "Gamla huset", ["GH"], tenants, others).matchedBy, "exact");
assert.equal(matchResidents("9999", "Gamla huset", ["GH"], tenants, others).matchedBy, "none");
const blocks = roomsToBlocks(placeRooms(["GH1001", "GH1002"], "alternating_left"));
assert.deepEqual(blocks.map(({ x, lagenhetsnummer }) => ({ x, lagenhetsnummer })), [{ x: 0, lagenhetsnummer: "GH1001" }, { x: 8, lagenhetsnummer: "GH1002" }]);
assert.equal(validateLayoutBlocks([{ id: "kitchen", type: "common", x: 4, y: 2, width: 4, height: 3, label: "Kök" }])[0].label, "Kök");
assert.throws(() => validateLayoutBlocks([{ id: "bad", type: "common", x: 11, y: 0, width: 2, height: 1, label: "" }]), /ogiltigt block/);
assert.deepEqual(clampBlockPosition(11, -4, 3, 2), { x: 9, y: 0 });
assert.equal(blocksOverlap({ id: "a", type: "empty", x: 0, y: 0, width: 2, height: 2, label: "" }, { id: "b", type: "empty", x: 1, y: 1, width: 2, height: 2, label: "" }), true);
assert.throws(() => validateLayoutBlocks([{ id: "a", type: "empty", x: 0, y: 0, width: 2, height: 2, label: "" }, { id: "b", type: "empty", x: 1, y: 1, width: 2, height: 2, label: "" }]), /överlappa/);
assert.deepEqual(findFreeBlockPosition({ id: "a", type: "empty", x: 0, y: 0, width: 2, height: 2, label: "" }, [{ id: "a", type: "empty", x: 0, y: 0, width: 2, height: 2, label: "" }]), { x: 2, y: 0 });

console.log("Bostadskartans generering och boendematchning är korrekt.");
