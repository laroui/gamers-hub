import type { PlatformId } from "@gamers-hub/types";

export interface PlatformMeta {
  id: PlatformId;
  name: string;
  emoji: string;
  color: string;
}

export const PLATFORMS: PlatformMeta[] = [
  { id: "steam",     name: "Steam",       emoji: "🎮", color: "#1a9fff" },
  { id: "psn",       name: "PlayStation", emoji: "🕹️", color: "#0070d1" },
  { id: "xbox",      name: "Xbox",        emoji: "🟢", color: "#52b043" },
  { id: "epic",      name: "Epic",        emoji: "♠",  color: "#c8c8c8" },
  { id: "gog",       name: "GOG",         emoji: "👾", color: "#cc0000" },
  { id: "nintendo",  name: "Nintendo",    emoji: "🔴", color: "#e60012" },
  { id: "ea",        name: "EA App",      emoji: "⚡", color: "#f36128" },
  { id: "ubisoft",   name: "Ubisoft",     emoji: "💠", color: "#0064d2" },
  { id: "battlenet", name: "Battle.net",  emoji: "🦋", color: "#00b4ff" },
  { id: "gamepass",  name: "Game Pass",   emoji: "☰",  color: "#52b043" },
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
    }
  );
}
