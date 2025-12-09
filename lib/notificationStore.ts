// In-memory store for notification tokens (in production, use a database)
// Map<fid, {token: string, url: string, enabled: boolean}>
export const notificationTokens = new Map<number, {token: string, url: string, enabled: boolean}>()