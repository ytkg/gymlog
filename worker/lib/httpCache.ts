export const CACHE_CONTROL_REVALIDATE = "no-cache, max-age=0, must-revalidate";

export const etagHeaderValue = (etag: string) => `"${etag}"`;

export const ifNoneMatchHasEtag = (ifNoneMatch: string | undefined, etag: string) => {
  if (!ifNoneMatch) return false;
  const normalized = ifNoneMatch
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean)
    .map((value) => value.replace(/^W\//i, "").replace(/^"/, "").replace(/"$/, ""));
  return normalized.includes(etag);
};

export const cacheHeaders = (cacheControl: string, etag: string | null): Record<string, string> => {
  const headers: Record<string, string> = { "Cache-Control": cacheControl };
  if (etag) headers.ETag = etagHeaderValue(etag);
  return headers;
};
