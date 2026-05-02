import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import {
  messengerBubbleIncoming,
  messengerBubbleIncomingBorder,
  messengerBubbleOutgoing,
} from '../theme/chatMessengerTheme';
import { dreamland, lead, textSecondary, warmHaze } from '../theme/colors';
import { platformElevation } from '../theme/shadows';

const shadowMine = platformElevation({ offsetY: 1, opacity: 0.08, radius: 2, elevation: 1 });
const shadowTheirs = platformElevation({ offsetY: 1, opacity: 0.07, radius: 3, elevation: 2 });

export type ChatMessageRowProps = {
  mine: boolean;
  text: string;
  imageUrl?: string;
  senderDisplayName: string;
  senderAvatarUrl?: string;
  createdAt?: string;
  onPressImage?: (uri: string) => void;
};

function formatMsgTime(iso?: string) {
  if (!iso) return '';
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return '';
  }
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'R';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'R';
}

function RowAvatar({ name, uri, size }: { name: string; uri?: string; size: number }) {
  const r = size / 2;
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: r, backgroundColor: dreamland }}
      />
    );
  }
  return (
    <View style={[styles.avatarPh, { width: size, height: size, borderRadius: r }]}>
      <Text style={[styles.avatarLetter, { fontSize: size * 0.38 }]}>{initialsFromName(name)}</Text>
    </View>
  );
}

/** Course messenger row: mint outgoing bubble, white incoming (matches inbox theme). */
export function ChatMessageRow({
  mine,
  text,
  imageUrl,
  senderDisplayName,
  senderAvatarUrl,
  createdAt,
  onPressImage,
}: ChatMessageRowProps) {
  const time = formatMsgTime(createdAt);
  const hasText = Boolean(text?.trim());
  const hasImage = Boolean(imageUrl);

  if (!hasText && !hasImage) {
    return null;
  }

  const bubbleStyles = [
    styles.bubble,
    mine ? styles.bubbleMine : styles.bubbleTheirs,
    mine ? styles.radiusMine : styles.radiusTheirs,
    mine ? styles.shadowMine : styles.shadowTheirs,
  ];

  return (
    <View style={[styles.row, mine ? styles.rowMine : styles.rowTheirs]}>
      {!mine ? <RowAvatar name={senderDisplayName || 'Reader'} uri={senderAvatarUrl} size={32} /> : null}
      <View style={[styles.bubbleCol, mine && styles.bubbleColMine]}>
        <View style={bubbleStyles}>
          {!mine ? (
            <Text style={styles.sender} numberOfLines={1}>
              {senderDisplayName || 'Reader'}
            </Text>
          ) : null}
          {hasText ? (
            <Text style={[styles.body, mine ? styles.bodyMine : styles.bodyTheirs]}>{text}</Text>
          ) : null}
          {hasImage ? (
            <Pressable
              onPress={() => imageUrl && onPressImage?.(imageUrl)}
              accessibilityRole="image"
              accessibilityLabel="View full photo"
            >
              <Image
                source={{ uri: imageUrl }}
                style={[styles.msgImage, hasText && styles.msgImagePad]}
                resizeMode="cover"
              />
            </Pressable>
          ) : null}
          {time ? (
            <View style={[styles.timeRow, mine ? styles.timeRowMine : styles.timeRowTheirs]}>
              <Text style={[styles.time, mine ? styles.timeMine : styles.timeTheirs]}>{time}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 4,
  },
  rowMine: { justifyContent: 'flex-end' },
  rowTheirs: { justifyContent: 'flex-start' },
  bubbleCol: { maxWidth: '80%', flexShrink: 0 },
  bubbleColMine: { alignItems: 'flex-end' },
  bubble: {
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 6,
    minWidth: 56,
  },
  radiusMine: {
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 4,
  },
  radiusTheirs: {
    borderTopLeftRadius: 4,
    borderTopRightRadius: 18,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  bubbleMine: { backgroundColor: messengerBubbleOutgoing },
  bubbleTheirs: {
    backgroundColor: messengerBubbleIncoming,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: messengerBubbleIncomingBorder,
  },
  shadowMine,
  shadowTheirs,
  avatarPh: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: messengerBubbleIncoming,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  avatarLetter: { fontWeight: '800', color: lead },
  sender: {
    fontSize: 12,
    fontWeight: '700',
    color: warmHaze,
    marginBottom: 4,
    maxWidth: 220,
  },
  body: { fontSize: 15, lineHeight: 21 },
  bodyMine: { color: lead },
  bodyTheirs: { color: textSecondary },
  msgImage: {
    width: 220,
    maxWidth: '100%',
    height: 188,
    borderRadius: 12,
    backgroundColor: dreamland,
  },
  msgImagePad: { marginTop: 6 },
  timeRow: {
    flexDirection: 'row',
    marginTop: 4,
    alignItems: 'center',
  },
  timeRowMine: { justifyContent: 'flex-end' },
  timeRowTheirs: { justifyContent: 'flex-end' },
  time: { fontSize: 11, fontWeight: '500' },
  timeMine: { color: 'rgba(28,27,26,0.45)' },
  timeTheirs: { color: warmHaze },
});
