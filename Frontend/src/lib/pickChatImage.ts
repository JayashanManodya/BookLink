import { Alert } from 'react-native';
import * as ImagePicker from 'expo-image-picker';

/** Opens library; returns asset or null if cancelled / denied. */
export async function pickChatImageFromLibrary(): Promise<{ uri: string; mimeType: string | null } | null> {
  const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!perm.granted) {
    Alert.alert('Permission needed', 'Allow photo library access to send an image.');
    return null;
  }
  const res = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    quality: 0.85,
  });
  if (res.canceled || !res.assets[0]) return null;
  const a = res.assets[0];
  return { uri: a.uri, mimeType: a.mimeType ?? 'image/jpeg' };
}
