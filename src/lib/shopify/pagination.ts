// ============================================================
//  Cursor pagination helpers (GraphQL variable builder).
//  Forward  → { first, after }.  Backward → { last, before }.
//  Exactly one of first/last is non-null, as Shopify requires.
// ============================================================
export interface CursorArgs {
  pageSize?: number;
  after?: string | null;
  before?: string | null;
}

export function cursorVars({ pageSize = 12, after, before }: CursorArgs) {
  if (before) {
    return { first: null, last: pageSize, after: null, before };
  }
  return { first: pageSize, last: null, after: after ?? null, before: null };
}
