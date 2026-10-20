/**
 * Cursor pagination helper. Cursors are opaque base64url strings; underneath
 * they hold `{ id, createdAt }` so we can walk a stable (createdAt desc, id desc)
 * ordering without row offsets.
 */
export interface CursorPayload {
  id: string;
  createdAt: string; // ISO
}

export function encodeCursor(p: CursorPayload): string {
  return Buffer.from(JSON.stringify(p), 'utf8').toString('base64url');
}

export function decodeCursor(raw: string | undefined): CursorPayload | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as unknown;
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as CursorPayload).id === 'string' &&
      typeof (parsed as CursorPayload).createdAt === 'string'
    ) {
      return parsed as CursorPayload;
    }
  } catch {
    /* fall through */
  }
  return null;
}

export function nextCursor<T extends { id: string; createdAt: Date }>(rows: T[], limit: number): string | null {
  if (rows.length < limit) return null;
  const last = rows[rows.length - 1];
  return last ? encodeCursor({ id: last.id, createdAt: last.createdAt.toISOString() }) : null;
}
