import { Platform } from 'react-native';
import { api } from './api';

/** Uploads a local image URI to the same endpoint used for book photos; returns public URL. */
export async function uploadChatImage(photoUri: string, photoMime: string | null): Promise<string> {
  const form = new FormData();
  const name = photoMime?.includes('png') ? 'chat.png' : 'chat.jpg';
  const type = photoMime ?? 'image/jpeg';
  if (Platform.OS === 'web') {
    const blobRes = await fetch(photoUri);
    const blob = await blobRes.blob();
    const mime = blob.type && blob.type.startsWith('image/') ? blob.type : type;
    if (typeof File !== 'undefined') {
      form.append('image', new File([blob], name, { type: mime }));
    } else {
      form.append('image', blob, name);
    }
  } else {
    form.append('image', { uri: photoUri, name, type } as unknown as Blob);
  }
  const up = await api.post<{ url: string }>('/api/upload/image', form);
  return up.data.url ?? '';
}
