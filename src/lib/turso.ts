import { createClient } from '@libsql/client';

const url = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;

if (!url || !authToken) {
  throw new Error(
    'Missing Turso environment variables! Check TURSO_DATABASE_URL and TURSO_AUTH_TOKEN in .env.local'
  );
}

export const turso = createClient({
  url,
  authToken,
});