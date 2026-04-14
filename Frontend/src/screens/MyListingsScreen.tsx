import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { confirmDestructive } from '../lib/platformAlert';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import type { Book } from '../types/book';
import type { ProfileStackParamList } from '../navigation/profileStackTypes';

export function MyListingsScreen() {
  const navigation = useNavigation<NativeStackNavigationProp<ProfileStackParamList>>();
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ books: Book[] }>('/api/books/mine');
      setBooks(res.data.books ?? []);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Could not load your listings';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const confirmDeleteListing = (bookId: string) => {
    const runDelete = async () => {
      try {
        await api.delete(`/api/books/${bookId}`);
        setBooks((prev) => prev.filter((b) => b._id !== bookId));
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : 'Could not delete listing';
        setError(msg);
      }
    };

    confirmDestructive({
      title: 'Delete listing',
      message: 'Remove this book from BookLink?',
      confirmLabel: 'Delete',
      onConfirm: () => void runDelete(),
    });
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
        </Pressable>
        <Text style={styles.screenTitle}>My listings</Text>
        <Pressable onPress={() => void load()} style={styles.iconBtn} hitSlop={8}>
          <Ionicons name="refresh" size={22} color={lead} />
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          {books.length === 0 ? (
            <View style={[styles.card, cardShadow]}>
              <Text style={styles.body}>You have not posted any books yet. Use Browse → add to create one.</Text>
            </View>
          ) : (
            books.map((b) => (
              <View key={b._id} style={[styles.rowCard, cardShadow]}>
                {b.coverImageUrl ? (
                  <Image source={{ uri: b.coverImageUrl }} style={styles.bookThumb} resizeMode="cover" />
                ) : (
                  <View style={styles.avatar}>
                    <Text style={styles.avatarTxt}>{(b.title || 'B').charAt(0).toUpperCase()}</Text>
                  </View>
                )}
                <View style={styles.middleCol}>
                  <Text style={styles.cardTitle} numberOfLines={1}>
                    {b.title}
                  </Text>
                  <Text style={styles.cardSub} numberOfLines={1}>
                    {b.author}
                    {b.bookType ? ` · ${b.bookType}` : ''}
                  </Text>
                </View>
                <View style={styles.rightCol}>
                  <Text style={styles.timeTxt}>{b.listingStatus === 'available' ? 'Active' : 'Exchanged'}</Text>
                  <View style={styles.actionsRow}>
                    <Pressable style={[styles.actionBtn, styles.editBtn]} onPress={() => navigation.navigate('EditListing', { bookId: b._id })}>
                      <Text style={styles.editLink}>Edit</Text>
                    </Pressable>
                    <Pressable style={[styles.actionBtn, styles.deleteBtn]} onPress={() => confirmDeleteListing(b._id)}>
                      <Text style={styles.deleteLink}>Delete</Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: cascadingWhite },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { flex: 1, textAlign: 'center', fontSize: 22, fontWeight: '800', color: lead },
  iconBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    alignItems: 'center',
    justifyContent: 'center',
    ...cardShadow,
  },
  scroll: { paddingHorizontal: 20, paddingBottom: 32, gap: 12, marginTop: 8 },
  card: {
    borderRadius: 24,
    padding: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
  },
  body: { fontSize: 15, lineHeight: 22, color: textSecondary },
  error: { color: '#b3261e', marginHorizontal: 20, marginTop: 12 },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: cascadingWhite,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f1d9df',
    alignItems: 'center',
    justifyContent: 'center',
  },
  bookThumb: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#e8e8eb',
  },
  avatarTxt: { fontSize: 16, fontWeight: '800', color: lead },
  middleCol: { flex: 1 },
  cardTitle: { fontSize: 17, fontWeight: '700', color: '#2f2f2f' },
  cardSub: { marginTop: 2, fontSize: 14, color: '#787878' },
  rightCol: { alignItems: 'flex-end', gap: 8 },
  timeTxt: { fontSize: 12, color: '#5a5a5a', fontWeight: '600' },
  actionsRow: { flexDirection: 'row', gap: 6 },
  actionBtn: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  editBtn: { backgroundColor: '#ede7ff' },
  deleteBtn: { backgroundColor: '#fde8e8' },
  editLink: { fontSize: 12, fontWeight: '800', color: '#5b34e6' },
  deleteLink: { fontSize: 12, fontWeight: '800', color: '#b3261e' },
});
