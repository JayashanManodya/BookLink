import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import type { WishlistStackParamList } from '../navigation/wishlistStackTypes';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import type { Book } from '../types/book';
import type { WishlistItem } from '../types/wishlist';

type MatchRow = { wishlistItem: WishlistItem; books: Book[] };

type Props = NativeStackScreenProps<WishlistStackParamList, 'WishlistMatches'>;

export function WishlistMatchesScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [matches, setMatches] = useState<MatchRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ matches: MatchRow[] }>('/api/wishlist/matches');
      setMatches(res.data.matches ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const openBook = (bookId: string) => {
    navigation.getParent()?.navigate('Browse', {
      screen: 'BookDetail',
      params: { bookId },
    });
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Wishlist matches</Text>
      <Text style={styles.sub}>Open listings that may fit what you are looking for.</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {matches.length === 0 ? (
            <Text style={styles.empty}>No open wishlist items to match.</Text>
          ) : (
            matches.map((m) => (
              <View key={m.wishlistItem._id} style={[styles.block, cardShadow]}>
                <Pressable
                  onPress={() =>
                    navigation.navigate('WantedBookDetail', { wishlistItemId: m.wishlistItem._id })
                  }
                >
                  <Text style={styles.wishTitle}>{m.wishlistItem.title}</Text>
                  <Text style={styles.wishMeta}>
                    {[m.wishlistItem.subject, m.wishlistItem.language].filter(Boolean).join(' · ')}
                  </Text>
                  <Text style={styles.openWanted}>Open wanted post · message if you have it</Text>
                </Pressable>
                {m.books.length === 0 ? (
                  <Text style={styles.noBooks}>No matching listings right now.</Text>
                ) : (
                  m.books.map((b) => (
                    <Pressable key={b._id} style={styles.bookRow} onPress={() => openBook(b._id)}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.bookTitle}>{b.title}</Text>
                        <Text style={styles.bookAuthor}>{b.author}</Text>
                      </View>
                      <Text style={styles.view}>View</Text>
                    </Pressable>
                  ))
                )}
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
  topBar: { paddingHorizontal: 12, paddingBottom: 4 },
  backBtn: { flexDirection: 'row', alignItems: 'center', gap: 2, alignSelf: 'flex-start' },
  backText: { fontSize: 16, fontWeight: '600', color: lead },
  title: { fontSize: 22, fontWeight: '800', color: lead, paddingHorizontal: 20, marginTop: 4 },
  sub: { fontSize: 14, color: warmHaze, paddingHorizontal: 20, marginTop: 4 },
  list: { padding: 20, gap: 16, paddingBottom: 40 },
  block: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
    gap: 10,
  },
  wishTitle: { fontSize: 17, fontWeight: '800', color: lead },
  wishMeta: { fontSize: 14, color: textSecondary },
  openWanted: { marginTop: 8, fontSize: 12, fontWeight: '700', color: warmHaze },
  noBooks: { fontSize: 14, color: warmHaze },
  bookRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dreamland,
    gap: 12,
  },
  bookTitle: { fontSize: 15, fontWeight: '800', color: lead },
  bookAuthor: { fontSize: 13, color: textSecondary },
  view: { fontSize: 14, fontWeight: '800', color: crunch },
  empty: { fontSize: 15, color: textSecondary },
  error: { color: '#b3261e', marginHorizontal: 20 },
});
