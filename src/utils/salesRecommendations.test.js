import assert from "node:assert/strict";
import test from "node:test";
import { getSalesPeriod, sortRecommendedItems } from "./salesRecommendations.js";

const item = (name, sales_group = null) => ({ name, sales_group });

test("sales period uses configurable morning and evening boundaries", () => {
  const schedule = {
    breakfast_start_minute: 360,
    breakfast_end_minute: 630,
    evening_start_minute: 960,
  };

  assert.equal(getSalesPeriod(new Date(2026, 0, 1, 6, 0), schedule), "breakfast");
  assert.equal(getSalesPeriod(new Date(2026, 0, 1, 10, 30), schedule), "afternoon");
  assert.equal(getSalesPeriod(new Date(2026, 0, 1, 16, 0), schedule), "evening");
  assert.equal(getSalesPeriod(new Date(2026, 0, 1, 5, 59), schedule), "evening");
  assert.equal(getSalesPeriod(new Date(2026, 0, 1, 7, 0), {
    breakfast_start_minute: 420,
    breakfast_end_minute: 660,
    evening_start_minute: 1020,
  }), "breakfast");
});

test("morning and evening prioritize their assigned group without hiding other products", () => {
  const items = [
    item("Bread", "breakfast"),
    item("Rice", "evening"),
    item("Milk", "breakfast"),
    item("Soap", "everyday"),
  ];

  assert.deepEqual(
    sortRecommendedItems(items, "breakfast").map(({ name }) => name),
    ["Bread", "Milk", "Rice", "Soap"],
  );
  assert.deepEqual(
    sortRecommendedItems(items, "evening").map(({ name }) => name),
    ["Rice", "Bread", "Milk", "Soap"],
  );
  assert.equal(sortRecommendedItems(items, "evening").length, items.length);
});

test("afternoon recommendations interleave groups for a balanced list", () => {
  const items = [
    item("Tea", "breakfast"),
    item("Bread", "breakfast"),
    item("Rice", "evening"),
    item("Oil", "evening"),
    item("Soap", "everyday"),
    item("Salt"),
  ];

  assert.deepEqual(
    sortRecommendedItems(items, "afternoon").map(({ name }) => name),
    ["Tea", "Soap", "Rice", "Salt", "Bread", "Oil"],
  );
});
