/** Response envelope helper. Shape locked by `.claude/rules/api.md`. */
export function ok<T>(data: T): { data: T } {
  return { data };
}

export function okPage<T>(data: T, nextCursor: string | null, limit: number): { data: T; meta: { nextCursor: string | null; limit: number } } {
  return { data, meta: { nextCursor, limit } };
}
