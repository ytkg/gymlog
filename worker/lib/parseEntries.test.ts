import { describe, expect, it } from "vitest";
import { parseEntries } from "./parseEntries";

describe("parseEntries", () => {
  it("returns empty array for empty input", () => {
    expect(parseEntries("")).toEqual([]);
  });

  it("parses multiple dated sections and trims trailing newlines", () => {
    const input = [
      "intro line (ignored)",
      "# 2024-01-02",
      "foo",
      "bar",
      "",
      "## 2024-01-03",
      "baz",
      "",
    ].join("\n");

    expect(parseEntries(input)).toEqual([
      { date: "2024-01-02", body: "foo\nbar" },
      { date: "2024-01-03", body: "baz" },
    ]);
  });

  it("handles CRLF input without leaking \\r into body", () => {
    const input = ["# 2024-02-01", "a", "b"].join("\r\n");
    expect(parseEntries(input)).toEqual([{ date: "2024-02-01", body: "a\nb" }]);
  });
});
