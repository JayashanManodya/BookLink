import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  BackHandler,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { CommonActions } from '@react-navigation/native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@clerk/clerk-expo';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ChatImageLightbox } from '../components/ChatImageLightbox';
import { ChatMessageRow } from '../components/ChatMessageRow';
import { api, apiErrorMessage } from '../lib/api';
import { pickChatImageFromLibrary } from '../lib/pickChatImage';
import { uploadChatImage } from '../lib/uploadChatImage';
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import {
  cascadingWhite,
  chatComposerBar,
  chatSendActive,
  chatWallpaper,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';

type Props = NativeStackScreenProps<WishlistStackParamList, 'WishlistThreadChat'>;

type ThreadMessage = {
  _id: string;
  threadId: string;
  senderClerkUserId: string;
  senderDisplayName: string;
  senderAvatarUrl?: string;
  text: string;
  imageUrl?: string;
  createdAt?: string;
};

export function WishlistThreadChatScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { userId } = useAuth();
  const { threadId, itemTitle, peerName, peerAvatarUrl, returnToChatsInbox } = route.params;
  const [messages, setMessages] = useState<ThreadMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [lightboxUri, setLightboxUri] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    try {
      const res = await api.get<{ messages: ThreadMessage[] }>(`/api/wishlist/threads/${threadId}/messages`);
      setMessages(res.data.messages ?? []);
      setError(null);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load chat'));
    } finally {
      setLoading(false);
    }
  }, [threadId]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const id = setInterval(() => void load(), 5000);
    return () => clearInterval(id);
  }, [load]);

  const send = async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setError(null);
    try {
      await api.post(`/api/wishlist/threads/${threadId}/messages`, { text: body });
      setText('');
      await load();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not send message'));
    } finally {
      setSending(false);
    }
  };

  const sendPhoto = async () => {
    if (sending) return;
    const picked = await pickChatImageFromLibrary();
    if (!picked) return;
    setSending(true);
    setError(null);
    try {
      const url = await uploadChatImage(picked.uri, picked.mimeType);
      if (!url) {
        setError('Could not upload image');
        return;
      }
      await api.post(`/api/wishlist/threads/${threadId}/messages`, {
        text: text.trim(),
        imageUrl: url,
      });
      setText('');
      await load();
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not send photo'));
    } finally {
      setSending(false);
    }
  };

  const subtitle = useMemo(() => `About: ${itemTitle}`, [itemTitle]);

  const leaveChat = useCallback(() => {
    if (returnToChatsInbox) {
      navigation.getParent()?.navigate('Requests', { screen: 'ChatsInbox' });
      return;
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'WishlistChats' }],
      })
    );
  }, [navigation, returnToChatsInbox]);

  useFocusEffect(
    useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => {
        leaveChat();
        return true;
      });
      return () => sub.remove();
    }, [leaveChat])
  );

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={leaveChat} hitSlop={12} style={styles.backBtn} accessibilityLabel="Go back">
          <Ionicons name="arrow-back" size={24} color={lead} />
        </Pressable>
        <Avatar name={peerName || 'Reader'} uri={peerAvatarUrl} size={34} />
        <View style={styles.headTxtWrap}>
          <Text style={styles.headTitle} numberOfLines={1}>
            {peerName || 'Chat'}
          </Text>
          <Text style={styles.headSub} numberOfLines={1}>
            {subtitle}
          </Text>
        </View>
        <View style={styles.topBarSpacer} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={[styles.flex, styles.chatPane]}
      >
        {loading ? (
          <View style={styles.chatPane}>
            <ActivityIndicator style={{ marginTop: 30 }} color={crunch} />
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.chatPane}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
            contentContainerStyle={styles.msgList}
            showsVerticalScrollIndicator={false}
          >
            {messages.map((m) => {
              const mine = !!userId && m.senderClerkUserId === userId;
              return (
                <ChatMessageRow
                  key={m._id}
                  mine={mine}
                  text={m.text}
                  imageUrl={m.imageUrl}
                  senderDisplayName={m.senderDisplayName || 'Reader'}
                  senderAvatarUrl={m.senderAvatarUrl}
                  createdAt={m.createdAt}
                  onPressImage={(uri) => setLightboxUri(uri)}
                />
              );
            })}
            {messages.length === 0 ? (
              <Text style={styles.empty}>No messages yet. Say hi and offer the book if you have it.</Text>
            ) : null}
          </ScrollView>
        )}
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <View style={[styles.composer, { paddingBottom: Math.max(10, insets.bottom) }]}>
          <Pressable
            style={[styles.attachBtn, sending && styles.sendBtnOff]}
            onPress={() => void sendPhoto()}
            disabled={sending}
            accessibilityLabel="Attach photo"
          >
            <Ionicons name="image-outline" size={22} color={lead} />
          </Pressable>
          <TextInput
            style={styles.input}
            value={text}
            onChangeText={setText}
            placeholder="Write a message..."
            placeholderTextColor={warmHaze}
            multiline
            maxLength={2000}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!text.trim() || sending) ? styles.sendBtnDisabled : styles.sendBtnActive,
              sending && styles.sendBtnOff,
            ]}
            onPress={() => void send()}
          >
            {sending ? (
              <ActivityIndicator color={text.trim() ? '#fff' : lead} size="small" />
            ) : (
              <Ionicons name="send" size={18} color={text.trim() ? '#fff' : lead} />
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>

      <ChatImageLightbox uri={lightboxUri} visible={!!lightboxUri} onClose={() => setLightboxUri(null)} />
    </View>
  );
}

function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  if (parts.length === 0) return 'R';
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('') || 'R';
}

function Avatar({ name, uri, size }: { name: string; uri?: string; size: number }) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: '#ddd' }}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={styles.avatarTxt}>{initialsFromName(name)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  chatPane: { flex: 1, backgroundColor: chatWallpaper },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
    gap: 10,
    backgroundColor: cascadingWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  backBtn: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: -6,
  },
  topBarSpacer: { width: 44 },
  headTxtWrap: { flex: 1, alignItems: 'center' },
  headTitle: { fontSize: 17, fontWeight: '800', color: lead },
  headSub: { marginTop: 2, fontSize: 12, color: textSecondary, maxWidth: '90%' },
  msgList: {
    flexGrow: 1,
    paddingHorizontal: 12,
    paddingTop: 12,
    paddingBottom: 16,
    backgroundColor: chatWallpaper,
  },
  avatarFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e9e9ef',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  avatarTxt: { fontSize: 12, fontWeight: '800', color: lead },
  empty: { marginTop: 24, color: warmHaze, textAlign: 'center', paddingHorizontal: 24 },
  error: { color: '#b3261e', paddingHorizontal: 16, marginBottom: 8 },
  composer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    paddingHorizontal: 10,
    paddingTop: 8,
    paddingBottom: 4,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dreamland,
    backgroundColor: chatComposerBar,
  },
  attachBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  input: {
    flex: 1,
    minHeight: 44,
    maxHeight: 120,
    backgroundColor: '#fff',
    borderRadius: 22,
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: lead,
    fontSize: 15,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  sendBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnActive: { backgroundColor: chatSendActive },
  sendBtnDisabled: { backgroundColor: '#fff', borderWidth: StyleSheet.hairlineWidth, borderColor: dreamland, opacity: 0.85 },
  sendBtnOff: { opacity: 0.5 },
});
