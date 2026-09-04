import { strict as assert } from "node:assert";
import { decideDeadlineState } from "./course-collab.js";

const now = new Date("2030-01-01T12:00:00.000Z");
assert.equal(decideDeadlineState("2030-01-02T11:59:00.000Z", now), "due-soon");
assert.equal(decideDeadlineState("2030-01-04T12:00:00.000Z", now), "on-track");
console.log("deadline decision test passed");
