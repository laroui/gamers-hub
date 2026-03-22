import { and, eq, sql } from "drizzle-orm";
import type { PlatformConnection, PlatformId, SyncStatus } from "@gamers-hub/types";
import { db } from "../client.js";
import { platformConnections, userGames } from "../schema.js";

// ── Raw DB row type ───────────────────────────────────────────

type RawConnectionRow = typeof platformConnections.$inferSelect;

// ── Row → domain type mapper ──────────────────────────────────

async function toConnection(row: RawConnectionRow): Promise<PlatformConnection> {
  // Count library entries for this platform connection
  const [countRow] = await db
    .select({ count: sql<number>`COUNT(*)::int` })
    .from(userGames)
    .where(and(eq(userGames.userId, row.userId), eq(userGames.platform, row.platform)));

  return {
    id: row.id,
    userId: row.userId,
    platform: row.platform as PlatformId,
    platformUid: row.platformUid ?? "",
    displayName: row.displayName ?? "",
    lastSynced: row.lastSyncedAt ? row.lastSyncedAt.toISOString() : null,
    syncStatus: (row.syncStatus as SyncStatus) ?? "pending",
    gamesCount: countRow?.count ?? 0,
  };
}

// ── getUserConnections ────────────────────────────────────────

export async function getUserConnections(userId: string): Promise<PlatformConnection[]> {
  const rows = await db
    .select()
    .from(platformConnections)
    .where(eq(platformConnections.userId, userId));

  return Promise.all(rows.map(toConnection));
}

// ── getConnection ─────────────────────────────────────────────
// Returns the raw DB row (including sensitive tokens) for internal use.

export async function getConnection(
  userId: string,
  platform: string,
): Promise<RawConnectionRow | null> {
  const [row] = await db
    .select()
    .from(platformConnections)
    .where(
      and(eq(platformConnections.userId, userId), eq(platformConnections.platform, platform)),
    )
    .limit(1);

  return row ?? null;
}

// ── upsertConnection ──────────────────────────────────────────

export async function upsertConnection(data: {
  userId: string;
  platform: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  tokenExpiresAt?: Date | null;
  platformUid?: string | null;
  displayName?: string | null;
  lastSyncedAt?: Date | null;
  syncStatus?: string;
}): Promise<void> {
  await db
    .insert(platformConnections)
    .values({
      userId: data.userId,
      platform: data.platform,
      accessToken: data.accessToken ?? null,
      refreshToken: data.refreshToken ?? null,
      tokenExpiresAt: data.tokenExpiresAt ?? null,
      platformUid: data.platformUid ?? null,
      displayName: data.displayName ?? null,
      lastSyncedAt: data.lastSyncedAt ?? null,
      syncStatus: data.syncStatus ?? "pending",
    })
    .onConflictDoUpdate({
      target: [platformConnections.userId, platformConnections.platform],
      set: {
        accessToken: data.accessToken ?? null,
        refreshToken: data.refreshToken ?? null,
        tokenExpiresAt: data.tokenExpiresAt ?? null,
        platformUid: data.platformUid ?? null,
        displayName: data.displayName ?? null,
        lastSyncedAt: data.lastSyncedAt ?? null,
        syncStatus: data.syncStatus ?? "pending",
      },
    });
}

// ── updateSyncStatus ──────────────────────────────────────────

export async function updateSyncStatus(
  userId: string,
  platform: string,
  status: string,
  lastSyncedAt?: Date,
): Promise<void> {
  await db
    .update(platformConnections)
    .set({
      syncStatus: status,
      ...(lastSyncedAt ? { lastSyncedAt } : {}),
    })
    .where(
      and(
        eq(platformConnections.userId, userId),
        eq(platformConnections.platform, platform),
      ),
    );
}

// ── deleteConnection ──────────────────────────────────────────

export async function deleteConnection(userId: string, platform: string): Promise<boolean> {
  const result = await db
    .delete(platformConnections)
    .where(
      and(
        eq(platformConnections.userId, userId),
        eq(platformConnections.platform, platform),
      ),
    )
    .returning({ id: platformConnections.id });

  return result.length > 0;
}
