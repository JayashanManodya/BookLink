/** Accept only http(s) URLs for chat attachments (Cloudinary, etc.). */
export function normalizeChatImageUrl(raw) {
  if (typeof raw !== 'string') return '';
  const u = raw.trim();
  if (!u || u.length > 2048) return '';
  try {
    const parsed = new URL(u);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return '';
    return u;
  } catch {
    return '';
  }
}
