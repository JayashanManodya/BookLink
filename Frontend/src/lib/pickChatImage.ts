import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

export type PickChatImageOptions = {
  /** Match book-cover picker: crop to 3:4 */
  aspectBookCover?: boolean;
};

/** Opens library; returns asset or null if cancelled / denied. */
export async function pickChatImageFromLibrary(
  opts?: PickChatImageOptions
): Promise<{ uri: string; mimeType: string | null } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to send an image.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: Boolean(opts?.aspectBookCover),
    aspect: opts?.aspectBookCover ? [3, 4] : undefined,
    quality: 0.85,
  });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' };
}
