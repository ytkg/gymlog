import { describe, expect, it } from "vitest";
import { monthCounts } from "./monthCounts";
import type { Entry } from "./types";

describe("monthCounts", () => {
  it("returns empty array for no entries", () => {
    expect(monthCounts([])).toEqual([]);
  });

  it("counts entries per month and returns sorted months", () => {
    const entries: Entry[] = [
      { date: "2024-02-01", body: "" },
      { date: "2024-01-31", body: "" },
      { date: "2024-02-10", body: "" },
      { date: "2024-01-01", body: "" },
    ];

    expect(monthCounts(entries)).toEqual([
      { date: "2024-01-01", count: 2 },
      { date: "2024-02-01", count: 2 },
    ]);
  });
});
