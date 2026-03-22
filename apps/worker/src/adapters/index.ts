import type { PlatformId } from "@gamers-hub/types";
import type { PlatformAdapter } from "@gamers-hub/platform-sdk";
import { env } from "../config/env.js";
import { SteamAdapter } from "./steam.js";
import { XboxAdapter } from "./xbox.js";
import { EpicAdapter } from "./epic.js";
import { PSNAdapter } from "./psn.js";
import { GOGAdapter } from "./gog.js";
import { NintendoAdapter } from "./nintendo.js";
import { EAAdapter } from "./ea.js";
import { UbisoftAdapter } from "./ubisoft.js";
import { BattlenetAdapter } from "./battlenet.js";

export function getAdapter(
  platform: PlatformId,
  accessToken: string,
  platformUid?: string,
): PlatformAdapter {
  switch (platform) {
    case "steam":
      if (!accessToken) throw new Error("Steam requires an API key (stored as accessToken)");
      if (!platformUid) throw new Error("Steam requires a Steam ID (stored as platformUid)");
      return new SteamAdapter(accessToken, platformUid);

    case "xbox":
      if (!env.XBOX_CLIENT_ID || !env.XBOX_CLIENT_SECRET)
        throw new Error("Xbox credentials not configured");
      return new XboxAdapter(env.XBOX_CLIENT_ID, env.XBOX_CLIENT_SECRET);

    case "epic":
      if (!env.EPIC_CLIENT_ID || !env.EPIC_CLIENT_SECRET)
        throw new Error("Epic credentials not configured");
      return new EpicAdapter(env.EPIC_CLIENT_ID, env.EPIC_CLIENT_SECRET);

    case "psn":
      if (!env.PSN_CLIENT_ID || !env.PSN_CLIENT_SECRET)
        throw new Error("PSN credentials not configured");
      return new PSNAdapter(env.PSN_CLIENT_ID, env.PSN_CLIENT_SECRET);

    case "gog":
      if (!env.GOG_CLIENT_ID || !env.GOG_CLIENT_SECRET)
        throw new Error("GOG credentials not configured");
      return new GOGAdapter(env.GOG_CLIENT_ID, env.GOG_CLIENT_SECRET);

    case "nintendo":
      return new NintendoAdapter();

    case "ea":
      return new EAAdapter();

    case "ubisoft":
      return new UbisoftAdapter();

    case "battlenet":
      return new BattlenetAdapter();

    default:
      throw new Error(`No adapter implemented for platform: ${platform}`);
  }
}
