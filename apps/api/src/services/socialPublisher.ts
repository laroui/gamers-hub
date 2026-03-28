// ── Social Publisher Service ─────────────────────────────────────────
// Handles publishing content to external social platforms.

interface PublishResult {
  platform: string;
  success: boolean;
  externalId?: string | undefined;
  error?: string | undefined;
}

interface AccountCredentials {
  platform: string;
  active: boolean;
  credentials: unknown;
}

async function publishToTwitter(content: string, credentials: Record<string, string>): Promise<PublishResult> {
  try {
    const res = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials["bearerToken"]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ text: content.slice(0, 280) }),
    });
    const data = (await res.json()) as { data?: { id: string }; detail?: string };
    if (!res.ok) return { platform: "twitter", success: false, error: data.detail ?? "Unknown error" };
    return { platform: "twitter", success: true, externalId: data.data?.id };
  } catch (e: unknown) {
    return { platform: "twitter", success: false, error: String(e) };
  }
}

async function publishToDiscord(content: string, credentials: Record<string, string>): Promise<PublishResult> {
  try {
    const res = await fetch(credentials["webhookUrl"]!, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        content,
        username: "Gamers Hub",
      }),
    });
    if (!res.ok) return { platform: "discord", success: false, error: `HTTP ${res.status}` };
    return { platform: "discord", success: true };
  } catch (e: unknown) {
    return { platform: "discord", success: false, error: String(e) };
  }
}

async function publishToTelegram(content: string, credentials: Record<string, string>): Promise<PublishResult> {
  try {
    const url = `https://api.telegram.org/bot${credentials["botToken"]}/sendMessage`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: credentials["chatId"], text: content, parse_mode: "Markdown" }),
    });
    const data = (await res.json()) as { ok: boolean; result?: { message_id: number }; description?: string };
    if (!data.ok) return { platform: "telegram", success: false, error: data.description };
    return { platform: "telegram", success: true, externalId: String(data.result?.message_id) };
  } catch (e: unknown) {
    return { platform: "telegram", success: false, error: String(e) };
  }
}

async function publishToMastodon(content: string, credentials: Record<string, string>): Promise<PublishResult> {
  try {
    const res = await fetch(`${credentials["instanceUrl"]}/api/v1/statuses`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${credentials["accessToken"]}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ status: content.slice(0, 500) }),
    });
    const data = (await res.json()) as { id?: string; error?: string };
    if (!res.ok) return { platform: "mastodon", success: false, error: data.error };
    return { platform: "mastodon", success: true, externalId: data.id };
  } catch (e: unknown) {
    return { platform: "mastodon", success: false, error: String(e) };
  }
}

export async function publishToAll(
  content: string,
  platforms: string[],
  accountsConfig: AccountCredentials[],
): Promise<PublishResult[]> {
  const results = await Promise.allSettled(
    platforms.map(async (platform) => {
      const account = accountsConfig.find((a) => a.platform === platform && a.active);
      if (!account) return { platform, success: false, error: "Account not configured" };

      const creds = account.credentials as Record<string, string>;

      switch (platform) {
        case "twitter":  return publishToTwitter(content, creds);
        case "discord":  return publishToDiscord(content, creds);
        case "telegram": return publishToTelegram(content, creds);
        case "mastodon": return publishToMastodon(content, creds);
        default: return { platform, success: false, error: "Unknown platform" };
      }
    }),
  );

  return results.map((r) =>
    r.status === "fulfilled" ? r.value : { platform: "unknown", success: false, error: "Rejected" },
  );
}
