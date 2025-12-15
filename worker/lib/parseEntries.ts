import type { Entry } from "./types";

const HEADING_REGEX = /^\s*#+\s*(\d{4}-\d{2}-\d{2})\s*$/;

export const parseEntries = (text: string): Entry[] => {
  const entries: Entry[] = [];
  let currentDate: string | null = null;
  let buffer: string[] = [];

  for (const line of text.split("\n")) {
    const match = line.match(HEADING_REGEX);
    if (match) {
      if (currentDate) {
        entries.push({ date: currentDate, body: buffer.join("\n").trimEnd() });
      }
      currentDate = match[1];
      buffer = [];
      continue;
    }

    if (currentDate) buffer.push(line.replace(/\r$/, ""));
  }

  if (currentDate) {
    entries.push({ date: currentDate, body: buffer.join("\n").trimEnd() });
  }

  return entries;
};
