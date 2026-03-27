import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  boolean,
  real,
  uniqueIndex,
  index,
  jsonb,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Users ─────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").unique().notNull(),
  username: text("username").unique().notNull(),
  passwordHash: text("password_hash"),
  googleId: text("google_id").unique(),
  avatarUrl: text("avatar_url"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Platform Connections ──────────────────────────────────────
export const platformConnections = pgTable(
  "platform_connections",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    platform: text("platform").notNull(),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    tokenExpiresAt: timestamp("token_expires_at", { withTimezone: true }),
    platformUid: text("platform_uid"),
    displayName: text("display_name"),
    lastSyncedAt: timestamp("last_synced_at", { withTimezone: true }),
    syncStatus: text("sync_status").default("pending").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userPlatformUnique: uniqueIndex("user_platform_unique").on(t.userId, t.platform),
  }),
);

// ── Games (global catalog) ────────────────────────────────────
export const games = pgTable(
  "games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    igdbId: integer("igdb_id").unique(),
    steamAppId: integer("steam_app_id").unique(),
    title: text("title").notNull(),
    coverUrl: text("cover_url"),
    backgroundUrl: text("background_url"),
    genres: text("genres").array().default([]).notNull(),
    platforms: text("platforms").array().default([]).notNull(),
    releaseYear: integer("release_year"),
    metacritic: integer("metacritic"),
    description: text("description"),
    screenshotUrls: text("screenshot_urls").array().default([]).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    titleSearchIdx: index("games_title_trgm_idx").on(t.title),
  }),
);

// ── User Games (library) ──────────────────────────────────────
export const userGames = pgTable(
  "user_games",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    gameId: uuid("game_id")
      .references(() => games.id)
      .notNull(),
    platform: text("platform").notNull(),
    platformGameId: text("platform_game_id").notNull(),
    status: text("status").default("library").notNull(),
    minutesPlayed: integer("minutes_played").default(0).notNull(),
    lastPlayedAt: timestamp("last_played_at", { withTimezone: true }),
    completionPct: real("completion_pct").default(0).notNull(),
    achievementsEarned: integer("achievements_earned").default(0).notNull(),
    achievementsTotal: integer("achievements_total").default(0).notNull(),
    userRating: integer("user_rating"),
    userNotes: text("user_notes"),
    stats: jsonb("stats").default({}).notNull(),
    addedAt: timestamp("added_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => ({
    userPlatformGameUnique: uniqueIndex("user_platform_game_unique").on(
      t.userId,
      t.platform,
      t.platformGameId,
    ),
    userIdIdx: index("user_games_user_id_idx").on(t.userId),
    lastPlayedIdx: index("user_games_last_played_idx").on(t.lastPlayedAt),
  }),
);

// ── Play Sessions ─────────────────────────────────────────────
export const playSessions = pgTable(
  "play_sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    userGameId: uuid("user_game_id")
      .references(() => userGames.id, { onDelete: "cascade" })
      .notNull(),
    startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    minutes: integer("minutes").notNull(),
    platform: text("platform").notNull(),
    device: text("device"),
  },
  (t) => ({
    userIdIdx: index("sessions_user_id_idx").on(t.userId),
    startedAtIdx: index("sessions_started_at_idx").on(t.startedAt),
  }),
);

// ── Achievements ──────────────────────────────────────────────
export const achievements = pgTable(
  "achievements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userGameId: uuid("user_game_id")
      .references(() => userGames.id, { onDelete: "cascade" })
      .notNull(),
    platformId: text("platform_id").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    iconUrl: text("icon_url"),
    earnedAt: timestamp("earned_at", { withTimezone: true }),
    rarityPct: real("rarity_pct"),
    points: integer("points"),
    metadata: jsonb("metadata").default({}).notNull(),
  },
  (t) => ({
    userGameIdIdx: index("achievements_user_game_id_idx").on(t.userGameId),
  }),
);

// ── Refresh Token Blacklist ────────────────────────────────────
export const tokenBlacklist = pgTable("token_blacklist", {
  id: uuid("id").primaryKey().defaultRandom(),
  tokenHash: text("token_hash").unique().notNull(),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ── Relations ─────────────────────────────────────────────────
export const usersRelations = relations(users, ({ many }) => ({
  platformConnections: many(platformConnections),
  userGames: many(userGames),
  playSessions: many(playSessions),
}));

export const userGamesRelations = relations(userGames, ({ one, many }) => ({
  user: one(users, { fields: [userGames.userId], references: [users.id] }),
  game: one(games, { fields: [userGames.gameId], references: [games.id] }),
  playSessions: many(playSessions),
  achievements: many(achievements),
}));

export const playSessionsRelations = relations(playSessions, ({ one }) => ({
  user: one(users, { fields: [playSessions.userId], references: [users.id] }),
  userGame: one(userGames, { fields: [playSessions.userGameId], references: [userGames.id] }),
}));

// ── Notifications ─────────────────────────────────────────────
export const notifications = pgTable(
  "notifications",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    type: text("type").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    payload: jsonb("payload"),
    readAt: timestamp("read_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => ({
    userIdIdx: index("notifications_user_id_idx").on(t.userId),
    createdAtIdx: index("notifications_created_at_idx").on(t.createdAt),
  }),
);
