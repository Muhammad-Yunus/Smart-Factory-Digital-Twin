import { defineConfig } from 'drizzle-kit';
import 'dotenv/config';

const host = process.env.DB_HOST ?? 'localhost';
const port = Number(process.env.DB_PORT ?? 5432);
const database = process.env.DB_NAME ?? 'postgres';
const user = process.env.DB_USER ?? 'postgres';
const password = process.env.DB_PASSWORD ?? '';

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    host,
    port,
    database,
    user,
    password,
    ssl: host.includes('supabase.com') ? 'require' : undefined,
  },
});
