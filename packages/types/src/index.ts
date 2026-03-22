// ============================================================
//  GAMERS HUB — Shared Types
//  Used by: apps/api, apps/worker, apps/web
// ============================================================

// ── Platform IDs ─────────────────────────────────────────────
export type PlatformId =
  | "steam"
  | "psn"
  | "xbox"
  | "epic"
  | "gog"
  | "nintendo"
  | "ea"
  | "ubisoft"
  | "battlenet"
  | "gamepass";

export type GameStatus = "library" | "playing" | "completed" | "wishlist" | "dropped";

export type SyncStatus = "idle" | "pending" | "syncing" | "success" | "error";

// ── User ──────────────────────────────────────────────────────
export interface User {
  id: string;
  email: string;
  username: string;
  avatarUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

// ── Platform Connection ───────────────────────────────────────
export interface PlatformConnection {
  id: string;
  userId: string;
  platform: PlatformId;
  platformUid: string;
  displayName: string;
  lastSynced: string | null;
  syncStatus: SyncStatus;
  gamesCount: number;
}

// ── Game (global catalog) ─────────────────────────────────────
export interface Game {
  id: string;
  igdbId: number | null;
  title: string;
  coverUrl: string | null;
  backgroundUrl: string | null;
  genres: string[];
  platforms: string[];
  releaseYear: number | null;
  metacritic: number | null;
  description: string | null;
  screenshotUrls: string[];
}

// ── User Game (library entry) ─────────────────────────────────
export interface UserGame {
  id: string;
  userId: string;
  game: Game;
  platform: PlatformId;
  platformGameId: string;
  status: GameStatus;
  minutesPlayed: number;
  hoursPlayed: number; // computed: minutesPlayed / 60
  lastPlayedAt: string | null;
  completionPct: number;
  achievementsEarned: number;
  achievementsTotal: number;
  userRating: number | null;
  userNotes: string | null;
  addedAt: string;
  stats?: Record<string, any>;
}

// ── Play Session ──────────────────────────────────────────────
export interface PlaySession {
  id: string;
  userGameId: string;
  gameTitle: string;
  gameCoverUrl: string | null;
  platform: PlatformId;
  startedAt: string;
  endedAt: string | null;
  minutes: number;
  device: string | null;
}

// ── Achievement ───────────────────────────────────────────────
export interface Achievement {
  id: string;
  userGameId: string;
  platformId: string;
  title: string;
  description: string | null;
  iconUrl: string | null;
  earnedAt: string | null;
  rarityPct: number | null;
  points: number | null;
  isEarned: boolean;
  metadata?: Record<string, any>;
}

// ── Library Stats ─────────────────────────────────────────────
export interface LibraryStats {
  totalGames: number;
  totalMinutes: number;
  totalHours: number;
  completedGames: number;
  currentlyPlaying: number;
  completionRate: number;
  platformBreakdown: Record<PlatformId, number>;
  genreBreakdown: Record<string, number>;
  deltaThisWeek: {
    newGames: number;
    minutesPlayed: number;
  };
}

// ── Play Heatmap ──────────────────────────────────────────────
export type PlayHeatmap = Record<string, number>; // "YYYY-MM-DD" → minutes

// ── Streaks ───────────────────────────────────────────────────
export interface PlayStreaks {
  current: number;
  longest: number;
  totalDays: number;
}

// ── Timeseries ────────────────────────────────────────────────
export interface WeeklyPlaytime {
  week: string; // "2026-W12"
  minutes: number;
  games: number;
}

// ── Annual Wrapped ────────────────────────────────────────────
export interface GamingWrapped {
  year: number;
  totalHours: number;
  totalGames: number;
  newGames: number;
  completedGames: number;
  topGame: { title: string; coverUrl: string | null; hours: number } | null;
  topGenre: string | null;
  topPlatform: PlatformId | null;
  longestSession: { gameTitle: string; hours: number; date: string } | null;
  favoriteDay: string | null; // e.g. "Saturday"
  lateNightGamer: boolean; // >20% sessions after midnight
}

// ── API Response wrappers ─────────────────────────────────────
export interface PaginatedResponse<T> {
  data: T[];
  nextCursor: string | null;
  total: number;
}

export interface ApiError {
  statusCode: number;
  error: string;
  message: string;
}

// ── Sync Job ──────────────────────────────────────────────────
export interface SyncJobPayload {
  userId: string;
  platform: PlatformId;
  triggeredBy: "manual" | "scheduled" | "connect";
  forceDeep?: boolean;
}

export interface SyncJobProgress {
  stage: "fetching_library" | "fetching_playtime" | "fetching_achievements" | "saving" | "done";
  processed: number;
  total: number;
  message: string;
}

// ── Platform Adapter contracts ────────────────────────────────
export interface RawGame {
  platformGameId: string;
  title: string;
  minutesPlayed?: number;
  lastPlayedAt?: string;
  achievementsEarned?: number;
  achievementsTotal?: number;
  igdbId?: number;
  steamAppId?: number;
}

export interface TokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scope?: string;
}

// ── Query params ──────────────────────────────────────────────
export interface LibraryQueryParams {
  platform?: PlatformId;
  genre?: string;
  status?: GameStatus;
  search?: string;
  sort?: "recent" | "alpha" | "hours" | "progress" | "rating";
  limit?: number;
  cursor?: string;
}

// ── Notifications ─────────────────────────────────────────────
export type NotificationType =
  | "sync_complete"
  | "sync_error"
  | "achievement_unlocked"
  | "platform_connected";

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  payload: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  isRead: boolean;
}
