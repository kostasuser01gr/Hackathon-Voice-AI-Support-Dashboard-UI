import { promises as fs } from "node:fs";
import path from "node:path";

import { Pool } from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is required to run migrations.");
  }

  const pool = new Pool({ connectionString });
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id text PRIMARY KEY,
        applied_at timestamptz NOT NULL DEFAULT now()
      )
    `);

    const dir = path.resolve(process.cwd(), "migrations");
    const entries = (await fs.readdir(dir))
      .filter((entry) => entry.endsWith(".sql"))
      .sort((a, b) => a.localeCompare(b));

    for (const entry of entries) {
      const migrationId = entry;
      const exists = await client.query(
        `
          SELECT 1
          FROM schema_migrations
          WHERE id = $1
          LIMIT 1
        `,
        [migrationId],
      );
      if ((exists.rowCount ?? 0) > 0) {
        continue;
      }

      const sql = await fs.readFile(path.join(dir, entry), "utf8");
      await client.query(sql);
      await client.query(
        `
          INSERT INTO schema_migrations (id)
          VALUES ($1)
        `,
        [migrationId],
      );
      console.log(`applied ${migrationId}`);
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
