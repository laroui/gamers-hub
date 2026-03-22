import type { PlatformId } from "@gamers-hub/types";

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  emoji: string;
  color: string;
  description: string;
  authType: "oauth" | "apikey" | "sessiontoken" | "stub";
}

export const PLATFORMS: PlatformMeta[] = [
  {
    id: "steam",
    name: "Steam",
    emoji: "🎮",
    color: "#1a9fff",
    description: "Library + playtime + achievements",
    authType: "apikey",
  },
  {
    id: "psn",
    name: "PlayStation",
    emoji: "🕹️",
    color: "#0070d1",
    description: "Library + trophies",
    authType: "oauth",
  },
  {
    id: "xbox",
    name: "Xbox",
    emoji: "🟢",
    color: "#52b043",
    description: "Library + playtime + achievements",
    authType: "oauth",
  },
  {
    id: "epic",
    name: "Epic Games",
    emoji: "♠",
    color: "#c8c8c8",
    description: "Library only",
    authType: "oauth",
  },
  {
    id: "gog",
    name: "GOG",
    emoji: "👾",
    color: "#cc0000",
    description: "Library + playtime + achievements",
    authType: "oauth",
  },
  {
    id: "nintendo",
    name: "Nintendo",
    emoji: "🔴",
    color: "#e60012",
    description: "Library + playtime",
    authType: "sessiontoken",
  },
  {
    id: "ea",
    name: "EA App",
    emoji: "⚡",
    color: "#f36128",
    description: "Library (limited API access)",
    authType: "stub",
  },
  {
    id: "ubisoft",
    name: "Ubisoft Connect",
    emoji: "💠",
    color: "#0064d2",
    description: "Library (limited API access)",
    authType: "stub",
  },
  {
    id: "battlenet",
    name: "Battle.net",
    emoji: "🦋",
    color: "#00b4ff",
    description: "Library only (select titles)",
    authType: "stub",
  },
  {
    id: "gamepass",
    name: "Game Pass",
    emoji: "☰",
    color: "#52b043",
    description: "Included with Xbox connection",
    authType: "stub",
  },
];

export const PLATFORM_MAP = Object.fromEntries(
  PLATFORMS.map((p) => [p.id, p]),
) as Record<PlatformId, PlatformMeta>;

export function getPlatform(id: string): PlatformMeta {
  return (
    PLATFORM_MAP[id as PlatformId] ?? {
      id: id as PlatformId,
      name: id,
      emoji: "🎮",
      color: "#888",
      description: "",
      authType: "stub" as const,
    }
  );
}
