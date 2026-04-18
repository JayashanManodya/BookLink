import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { cardShadow } from '../theme/shadows';
import { cascadingWhite, dreamland, lead, textSecondary, warmHaze } from '../theme/colors';

export type FormImageAttachmentProps = {
  /** Local file URI or remote URL shown after attach */
  previewUri: string | null | undefined;
  onPick: () => void | Promise<void>;
  onRemove: () => void;
  emptyHint: string;
};

/** Book-style cover attachment: dashed add tile, full-width 3:4 preview, Change / Remove. */
export function FormImageAttachment({ previewUri, onPick, onRemove, emptyHint }: FormImageAttachmentProps) {
  if (!previewUri?.trim()) {
    return (
      <Pressable style={[styles.upload, cardShadow]} onPress={() => void onPick()}>
        <Ionicons name="image-outline" size={36} color={warmHaze} />
        <Text style={styles.uploadHint}>{emptyHint}</Text>
      </Pressable>
    );
  }
  return (
    <View style={[styles.previewWrap, cardShadow]}>
      <Image source={{ uri: previewUri }} style={styles.previewImg} resizeMode="cover" />
      <View style={styles.previewActions}>
        <Pressable style={styles.previewBtn} onPress={() => void onPick()}>
          <Ionicons name="swap-horizontal" size={16} color={lead} />
          <Text style={styles.previewBtnTxt}>Change</Text>
        </Pressable>
        <Pressable style={[styles.previewBtn, styles.previewBtnDanger]} onPress={onRemove}>
          <Ionicons name="trash-outline" size={16} color={lead} />
          <Text style={styles.previewBtnTxt}>Remove</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  upload: {
    borderRadius: 20,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: dreamland,
    paddingVertical: 28,
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#f8f8fa',
  },
  uploadHint: { fontSize: 14, color: textSecondary, fontWeight: '600' },
  previewWrap: {
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8f8fa',
    borderWidth: 1,
    borderColor: dreamland,
  },
  previewImg: { width: '100%', aspectRatio: 3 / 4, backgroundColor: '#eceef2' },
  previewActions: {
    flexDirection: 'row',
    gap: 8,
    padding: 10,
    justifyContent: 'center',
  },
  previewBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
  },
  previewBtnDanger: { backgroundColor: '#fdecec', borderColor: '#f5c2c7' },
  previewBtnTxt: { fontSize: 13, fontWeight: '700', color: lead },
});
