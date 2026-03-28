import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db } from "../../db/client.js";
import { requireAdmin } from "../../middleware/requireAdmin.js";

// Allowlist of tables and columns to hide
const ALLOWED_TABLES = ["users", "posts", "post_comments", "post_likes", "articles", "user_games", "social_publications", "audit_logs", "platform_connections"];

const HIDDEN_COLUMNS: Record<string, string[]> = {
  users: ["password_hash", "google_id"],
  social_accounts: ["credentials"],
};

export async function adminDatabaseRoutes(server: FastifyInstance) {
  // ── GET /tables ───────────────────────────────────────────────────
  server.get("/tables", {
    preHandler: [requireAdmin],
    handler: async (_req, reply) => {
      const rows = await db.execute(sql`
        SELECT
          t.table_name,
          (SELECT reltuples::bigint FROM pg_class WHERE relname = t.table_name) as estimated_count
        FROM information_schema.tables t
        WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
        ORDER BY t.table_name
      `);

      const tables = (rows.rows as Array<{ table_name: string; estimated_count: string }>)
        .filter((r) => ALLOWED_TABLES.includes(r.table_name))
        .map((r) => ({ name: r.table_name, estimatedCount: parseInt(r.estimated_count ?? "0") }));

      return reply.send(tables);
    },
  });

  // ── GET /tables/:table/rows?page=1&limit=20&search= ───────────────
  server.get("/tables/:table/rows", {
    preHandler: [requireAdmin],
    handler: async (req, reply) => {
      const { table } = req.params as { table: string };
      const query = req.query as { page?: string; limit?: string; search?: string };

      if (!ALLOWED_TABLES.includes(table)) {
        return reply.status(403).send({ error: "Table not allowed" });
      }

      const page = Math.max(1, parseInt(query.page ?? "1"));
      const limit = Math.min(50, parseInt(query.limit ?? "20"));
      const offset = (page - 1) * limit;

      // Get column names for this table
      const colRows = await db.execute(sql`
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = ${table}
        ORDER BY ordinal_position
      `);

      const hidden = HIDDEN_COLUMNS[table] ?? [];
      const columns = (colRows.rows as Array<{ column_name: string }>)
        .map((r) => r.column_name)
        .filter((c) => !hidden.includes(c));

      // Count total
      const countResult = await db.execute(sql`SELECT count(*) as total FROM ${sql.identifier(table)}`);
      const total = parseInt((countResult.rows[0] as Record<string, string>)["total"] ?? "0");

      // Fetch rows
      const selectCols = columns.map((c) => sql.identifier(c));
      let dataResult;

      if (query.search && columns.length > 0) {
        // Simple text search on all text columns
        const textColsResult = await db.execute(sql`
          SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = ${table}
          AND data_type IN ('text', 'varchar', 'character varying', 'uuid')
          ORDER BY ordinal_position LIMIT 5
        `);
        const textCols = (textColsResult.rows as Array<{ column_name: string }>)
          .map((r) => r.column_name)
          .filter((c) => !hidden.includes(c));

        if (textCols.length > 0) {
          const searchConditions = textCols.map((c) => sql`cast(${sql.identifier(c)} as text) ILIKE ${"%" + query.search + "%"}`);
          const whereClause = searchConditions.reduce((acc, curr) => sql`${acc} OR ${curr}`);
          dataResult = await db.execute(sql`
            SELECT ${sql.join(selectCols, sql`, `)} FROM ${sql.identifier(table)}
            WHERE ${whereClause}
            ORDER BY 1 DESC LIMIT ${limit} OFFSET ${offset}
          `);
        } else {
          dataResult = await db.execute(sql`SELECT ${sql.join(selectCols, sql`, `)} FROM ${sql.identifier(table)} ORDER BY 1 DESC LIMIT ${limit} OFFSET ${offset}`);
        }
      } else {
        dataResult = await db.execute(sql`SELECT ${sql.join(selectCols, sql`, `)} FROM ${sql.identifier(table)} ORDER BY 1 DESC LIMIT ${limit} OFFSET ${offset}`);
      }

      return reply.send({
        columns,
        rows: dataResult.rows,
        total,
        page,
        totalPages: Math.ceil(total / limit),
      });
    },
  });

  // ── GET /stats ────────────────────────────────────────────────────
  server.get("/stats", {
    preHandler: [requireAdmin],
    handler: async (_req, reply) => {
      const pgStatResult = await db.execute(sql`
        SELECT
          (SELECT count(*) FROM pg_stat_activity WHERE state = 'active') as active_connections,
          pg_size_pretty(pg_database_size(current_database())) as db_size
      `);

      const stats = pgStatResult.rows[0] as { active_connections: string; db_size: string };

      return reply.send({
        activeConnections: parseInt(stats.active_connections ?? "0"),
        dbSize: stats.db_size,
        allowedTables: ALLOWED_TABLES,
      });
    },
  });
}
