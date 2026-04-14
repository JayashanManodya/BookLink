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
}: Props) {
  const { prefix, body } = previewParts(myUserId, lastMessageSenderClerkUserId, peerNameForPrefix, preview);
  const dateLabel = formatChatListDate(dateIso);

  return (
    <Pressable style={styles.row} onPress={onPress} android_ripple={{ color: chineseSilver }}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPh]}>
          <Text style={styles.avatarLetter}>{fallbackLetter.slice(0, 1).toUpperCase()}</Text>
        </View>
      )}
      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text style={styles.title} numberOfLines={1}>
            {title}
          </Text>
          <Text style={styles.date}>{dateLabel}</Text>
        </View>
        <Text style={styles.preview} numberOfLines={2}>
          {prefix ? <Text style={styles.previewStrong}>{prefix}</Text> : null}
          {body}
          {contextHint ? (
            <Text style={styles.previewHint}>
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
  avatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: chineseSilver,
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
  date: {
    fontSize: 13,
    fontWeight: '500',
    color: warmHaze,
    marginTop: 1,
  },
  preview: {
    marginTop: 4,
    fontSize: 15,
    fontWeight: '400',
    color: textSecondary,
    lineHeight: 20,
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
});
