import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { cascadingWhite, chineseSilver, lead, textSecondary, warmHaze } from '../theme/colors';

function firstNameFromDisplay(name: string) {
  const t = name.trim();
  if (!t) return 'Reader';
  return t.split(/\s+/)[0] ?? t;
}

function previewParts(
  myUserId: string | null | undefined,
  lastSenderId: string | null | undefined,
  peerName: string,
  preview: string
): { prefix: string; body: string } {
  if (!lastSenderId) return { prefix: '', body: preview };
  const mine = Boolean(myUserId && lastSenderId === myUserId);
  const who = mine ? 'You' : firstNameFromDisplay(peerName);
  return { prefix: `${who}: `, body: preview };
}

/** WhatsApp-style inbox row: avatar | name + date | preview line */
export function formatChatListDate(iso: string) {
  try {
    const d = new Date(iso);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMsg = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const diffDays = Math.floor((startOfToday.getTime() - startOfMsg.getTime()) / (24 * 60 * 60 * 1000));
    if (diffDays === 0) {
      return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
    }
    if (diffDays === 1) return 'Yesterday';
    if (d.getFullYear() === now.getFullYear()) {
      return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
    }
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/** Lightweight course-style inbox timestamps (e.g. "8 hours ago") */
export function formatChatListRelative(iso: string): string {
  try {
    const d = new Date(iso);
    let diffMs = Date.now() - d.getTime();
    if (diffMs < 0) diffMs = 0;
    const min = Math.floor(diffMs / 60000);
    const hr = Math.floor(min / 60);
    if (min < 1) return 'Just now';
    if (min < 60) return `${min} min ago`;
    if (hr < 24) return `${hr} hour${hr === 1 ? '' : 's'} ago`;
    return formatChatListDate(iso);
  } catch {
    return '';
  }
}

type Props = {
  title: string;
  preview: string;
  lastMessageSenderClerkUserId?: string | null;
  peerNameForPrefix: string;
  myUserId: string | null | undefined;
  dateIso: string;
  imageUrl?: string | null;
  fallbackLetter: string;
  onPress: () => void;
  /** Short context after preview, e.g. book title (muted) */
  contextHint?: string;
  /** Course-style messenger inbox (flat white rows, relative time) */
  variant?: 'default' | 'inbox';
};

export function ChatListRow({
  title,
  preview,
  lastMessageSenderClerkUserId,
  peerNameForPrefix,
  myUserId,
  dateIso,
  imageUrl,
  fallbackLetter,
  onPress,
  contextHint,
  variant = 'default',
}: Props) {
  const { prefix, body } = previewParts(myUserId, lastMessageSenderClerkUserId, peerNameForPrefix, preview);
  const dateLabel = variant === 'inbox' ? formatChatListRelative(dateIso) : formatChatListDate(dateIso);

  return (
    <Pressable
      style={[styles.row, variant === 'inbox' && styles.rowInbox]}
      onPress={onPress}
      android_ripple={{ color: chineseSilver }}
    >
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={[styles.avatar, variant === 'inbox' && styles.avatarInbox]} />
      ) : (
        <View style={[styles.avatar, styles.avatarPh, variant === 'inbox' && styles.avatarInbox]}>
          <Text style={styles.avatarLetter}>{fallbackLetter.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, variant === 'inbox' && styles.titleInbox]} numberOfLines={1}>
            {title}
          </Text>
          <Text style={[styles.date, variant === 'inbox' && styles.dateInbox]}>{dateLabel}</Text>
        </View>
        <Text style={[styles.preview, variant === 'inbox' && styles.previewInbox]} numberOfLines={variant === 'inbox' ? 1 : 2}>
          {prefix ? (
            <Text style={[styles.previewStrong, variant === 'inbox' && styles.previewStrongInbox]}>{prefix}</Text>
          ) : null}
          {body}
          {contextHint ? (
            <Text style={[styles.previewHint, variant === 'inbox' && styles.previewHintInbox]}>
              {' '}
              · {contextHint}
            </Text>
          ) : null}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: cascadingWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: chineseSilver,
  },
  rowInbox: {
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 0,
    backgroundColor: '#FFFFFF',
    borderBottomColor: '#ECECEC',
  },
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: chineseSilver,
  },
  avatarInbox: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  avatarPh: { alignItems: 'center', justifyContent: 'center' },
  avatarLetter: { fontSize: 20, fontWeight: '700', color: lead },
  body: { flex: 1, minWidth: 0 },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: lead,
    letterSpacing: -0.2,
  },
  titleInbox: {
    fontSize: 16,
    fontWeight: '700',
  },
  date: {
    fontSize: 13,
    fontWeight: '500',
    color: warmHaze,
    marginTop: 1,
  },
  dateInbox: {
    fontSize: 12,
    color: '#A0A0A0',
    marginTop: 0,
    fontVariant: ['tabular-nums'],
  },
  preview: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '400',
    color: textSecondary,
    lineHeight: 20,
  },
  previewInbox: {
    marginTop: 3,
    fontSize: 14,
    lineHeight: 19,
    color: '#8E8E8E',
  },
  previewStrong: {
    fontSize: 15,
    fontWeight: '700',
    color: textSecondary,
  },
  previewHint: {
    fontSize: 15,
    fontWeight: '400',
    color: warmHaze,
  },
  previewStrongInbox: {
    fontSize: 14,
    color: '#8E8E8E',
  },
  previewHintInbox: {
    fontSize: 14,
    color: '#B0B0B0',
  },
});
