import { describe, it, expect, vi, beforeEach } from "vitest";
import type { Job } from "bullmq";
import type { SyncJobPayload } from "@gamers-hub/types";

// ── Mock all DB queries ───────────────────────────────────────
vi.mock("../../db/queries.js", () => ({
  getConnection: vi.fn(),
  upsertConnection: vi.fn(),
  updateSyncStatus: vi.fn(),
  findGameBySteamId: vi.fn(),
  findGameByIgdbId: vi.fn(),
  upsertGame: vi.fn(),
  upsertUserGame: vi.fn(),
  bulkInsertSessions: vi.fn(),
}));

// ── Mock adapter registry ─────────────────────────────────────
vi.mock("../../adapters/index.js", () => ({
  getAdapter: vi.fn(),
}));

import {
  getConnection,
  updateSyncStatus,
  upsertGame,
  upsertUserGame,
  bulkInsertSessions,
  upsertConnection,
} from "../../db/queries.js";
import { getAdapter } from "../../adapters/index.js";
import { syncPlatform } from "../../services/sync.js";

const mockUpdateSyncStatus = vi.mocked(updateSyncStatus);
const mockGetConnection = vi.mocked(getConnection);
const mockUpsertGame = vi.mocked(upsertGame);
const mockUpsertUserGame = vi.mocked(upsertUserGame);
const mockBulkInsertSessions = vi.mocked(bulkInsertSessions);
const mockGetAdapter = vi.mocked(getAdapter);

function makeJob(payload: SyncJobPayload): Job<SyncJobPayload> {
  return {
    data: payload,
    updateProgress: vi.fn(),
    id: "test-job-id",
  } as unknown as Job<SyncJobPayload>;
}

const mockAdapter = {
  platform: "steam" as const,
  getAuthUrl: vi.fn(),
  exchangeCode: vi.fn(),
  refreshAccessToken: vi.fn(),
  getOwnedGames: vi.fn(),
  getRecentGames: vi.fn(),
  getAchievements: vi.fn(),
};

const baseConn = {
  id: "conn-id",
  userId: "user-1",
  platform: "steam",
  accessToken: "api-key-123",
  refreshToken: null,
  tokenExpiresAt: null,
  platformUid: "76561198000000001",
  displayName: "TestUser",
  lastSyncedAt: null,
  syncStatus: "success",
  createdAt: new Date(),
};

beforeEach(() => {
  vi.clearAllMocks();
  mockGetAdapter.mockReturnValue(mockAdapter as never);
  mockGetConnection.mockResolvedValue(baseConn as never);
  mockUpsertGame.mockResolvedValue({ id: "game-uuid" });
  mockUpsertUserGame.mockResolvedValue("user-game-uuid");
  mockBulkInsertSessions.mockResolvedValue(0);
  mockUpdateSyncStatus.mockResolvedValue(undefined);
  mockAdapter.getOwnedGames.mockResolvedValue([]);
  mockAdapter.getRecentGames.mockResolvedValue([]);
});

describe("syncPlatform", () => {
  it("calls updateSyncStatus('syncing') at start", async () => {
    const job = makeJob({ userId: "user-1", platform: "steam", triggeredBy: "manual" });
    await syncPlatform(job);
    expect(mockUpdateSyncStatus).toHaveBeenCalledWith("user-1", "steam", "syncing");
  });

  it("calls updateSyncStatus('success') on completion", async () => {
    const job = makeJob({ userId: "user-1", platform: "steam", triggeredBy: "manual" });
    await syncPlatform(job);
    const calls = mockUpdateSyncStatus.mock.calls;
    const successCall = calls.find((c) => c[2] === "success");
    expect(successCall).toBeTruthy();
  });

  it("calls updateSyncStatus('error') when adapter throws", async () => {
    mockAdapter.getOwnedGames.mockRejectedValue(new Error("API down"));
    const job = makeJob({ userId: "user-1", platform: "steam", triggeredBy: "manual" });
    await expect(syncPlatform(job)).rejects.toThrow("API down");
    const calls = mockUpdateSyncStatus.mock.calls;
    const errorCall = calls.find((c) => c[2] === "error");
    expect(errorCall).toBeTruthy();
  });

  it("calls upsertUserGame for each owned game", async () => {
    mockAdapter.getOwnedGames.mockResolvedValue([
      { platformGameId: "570", title: "Dota 2", steamAppId: 570, minutesPlayed: 100 },
      { platformGameId: "730", title: "CS2", steamAppId: 730, minutesPlayed: 200 },
    ]);
    const job = makeJob({ userId: "user-1", platform: "steam", triggeredBy: "manual" });
    await syncPlatform(job);
    expect(mockUpsertUserGame).toHaveBeenCalledTimes(2);
  });

  it("uses GREATEST upsert — calls upsertUserGame even if game already exists", async () => {
    // findGameBySteamId would be called — upsertGame is skipped, but upsertUserGame is always called
    mockAdapter.getOwnedGames.mockResolvedValue([
      { platformGameId: "570", title: "Dota 2", steamAppId: 570, minutesPlayed: 500 },
    ]);
    // Simulate game already in catalog
    const { findGameBySteamId } = await import("../../db/queries.js");
    vi.mocked(findGameBySteamId).mockResolvedValue({ id: "existing-game-id" });

    const job = makeJob({ userId: "user-1", platform: "steam", triggeredBy: "manual" });
    await syncPlatform(job);
    expect(mockUpsertUserGame).toHaveBeenCalledTimes(1);
    expect(mockUpsertGame).not.toHaveBeenCalled(); // game was found, not created
  });

  it("reports progress every 10 games", async () => {
    const games = Array.from({ length: 25 }, (_, i) => ({
      platformGameId: String(i),
      title: `Game ${i}`,
      minutesPlayed: 10,
    }));
    mockAdapter.getOwnedGames.mockResolvedValue(games);
    const job = makeJob({ userId: "user-1", platform: "steam", triggeredBy: "manual" });
    await syncPlatform(job);

    const progressCalls = (job.updateProgress as ReturnType<typeof vi.fn>).mock.calls;
    // Should have reported at: 10, 20, 25 (last)
    const libraryCalls = progressCalls.filter(
      (c: unknown[]) => (c[0] as { stage: string }).stage === "fetching_library" &&
        (c[0] as { processed: number }).processed > 0,
    );
    expect(libraryCalls.length).toBeGreaterThanOrEqual(3);
  });

  it("refreshes token when tokenExpiresAt is within 5 minutes", async () => {
    const soon = new Date(Date.now() + 2 * 60 * 1000); // 2 min from now
    mockGetConnection.mockResolvedValue({
      ...baseConn,
      tokenExpiresAt: soon,
      refreshToken: "refresh-tok",
    } as never);
    mockAdapter.refreshAccessToken.mockResolvedValue({
      accessToken: "new-access",
      expiresAt: new Date(Date.now() + 3600 * 1000),
    });
    const mockUpsertConnection = vi.mocked(upsertConnection);
    mockUpsertConnection.mockResolvedValue(undefined);

    const job = makeJob({ userId: "user-1", platform: "steam", triggeredBy: "manual" });
    await syncPlatform(job);
    expect(mockAdapter.refreshAccessToken).toHaveBeenCalledWith("refresh-tok");
  });

  it("does NOT refresh token when token is not expiring soon", async () => {
    const farFuture = new Date(Date.now() + 60 * 60 * 1000); // 1h from now
    mockGetConnection.mockResolvedValue({
      ...baseConn,
      tokenExpiresAt: farFuture,
    } as never);

    const job = makeJob({ userId: "user-1", platform: "steam", triggeredBy: "manual" });
    await syncPlatform(job);
    expect(mockAdapter.refreshAccessToken).not.toHaveBeenCalled();
  });
});
