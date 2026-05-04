const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

/** Expo accepts up to ~100 messages per request; stay conservative. */
const CHUNK = 90;

/**
 * Send push notifications via Expo Push Service (FCM/APNs under the hood).
 * @param {string[]} tokens Expo push tokens
 * @param {{ title: string; body: string; data?: Record<string, string> }} payload
 */
export async function sendExpoPushToTokens(tokens, { title, body, data }) {
  const uniq = [...new Set((tokens || []).filter(Boolean))];
  if (!uniq.length) return;

  for (let i = 0; i < uniq.length; i += CHUNK) {
    const slice = uniq.slice(i, i + CHUNK);
    const messages = slice.map((to) => ({
      to,
      title,
      body,
      sound: 'default',
      priority: 'high',
      data: data ?? {},
      android: {
        channelId: 'messages',
        sound: true,
        vibrate: true,
      },
    }));

    const res = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      console.error('[push] Expo HTTP error', res.status, text.slice(0, 500));
      continue;
    }

    let json;
    try {
      json = await res.json();
    } catch {
      continue;
    }

    const rows = Array.isArray(json?.data) ? json.data : [];
    for (let j = 0; j < rows.length; j++) {
      const row = rows[j];
      if (row?.status === 'error' && typeof row?.message === 'string') {
        console.warn('[push] ticket error', row.message);
      }
    }
  }
}
