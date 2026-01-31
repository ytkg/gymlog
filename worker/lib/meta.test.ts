import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildMeta } from "./meta";
import type { Entry, MonthCount } from "./types";

describe("buildMeta", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2024-03-04T05:06:07.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("builds meta with counts and deterministic generated_at", () => {
    const entries: Entry[] = [
      { date: "2024-02-01", body: "" },
      { date: "2024-01-31", body: "" },
    ];
    const months: MonthCount[] = [
      { date: "2024-01-01", count: 1 },
      { date: "2024-02-01", count: 1 },
    ];

    expect(buildMeta(entries, months)).toEqual({
      total_entries: 2,
      total_months: 2,
      generated_at: "2024-03-04T05:06:07.000Z",
    });
  });
});
