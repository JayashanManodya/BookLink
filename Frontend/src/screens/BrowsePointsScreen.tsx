import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
import { hasMapCoords, openGoogleMapsDirections, openGoogleMapsSearch } from '../lib/mapsLinks';
import { confirmDestructive } from '../lib/platformAlert';
import type { ProfileStackParamList } from '../navigation/profileStackTypes';
import {
  cascadingWhite,
  crunch,
  dreamland,
  lead,
  textSecondary,
  warmHaze,
} from '../theme/colors';
import { cardShadow } from '../theme/shadows';
import type { CollectionPoint } from '../types/point';

type Props = NativeStackScreenProps<ProfileStackParamList, 'BrowsePoints'>;

export function BrowsePointsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [cityFilter, setCityFilter] = useState('');
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ points: CollectionPoint[] }>('/api/points', {
        params: cityFilter.trim() ? { city: cityFilter.trim() } : undefined,
      });
      setPoints(res.data.points ?? []);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load');
    } finally {
      setLoading(false);
    }
  }, [cityFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = useCallback((id: string) => {
    confirmDestructive({
      title: 'Delete point',
      message: 'Remove this collection point?',
      confirmLabel: 'Delete',
      onConfirm: () =>
        void (async () => {
          try {
            await api.delete(`/api/points/${id}`);
            setPoints((list) => list.filter((x) => x._id !== id));
          } catch (e: unknown) {
            Alert.alert('Error', apiErrorMessage(e, 'Failed to delete'));
          }
        })(),
    });
  }, []);

  const byCity = useMemo(() => {
    const m = new Map<string, CollectionPoint[]>();
    for (const p of points) {
      const c = p.city || 'Other';
      if (!m.has(c)) m.set(c, []);
      m.get(c)!.push(p);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [points]);

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>My collection points</Text>
      <Text style={styles.subtitle}>
        Only you can see these. Use them as meet-up spots when a book exchange is accepted.
      </Text>
      <TextInput
        value={cityFilter}
        onChangeText={setCityFilter}
        placeholder="Filter by city"
        placeholderTextColor={warmHaze}
        style={styles.search}
        onSubmitEditing={() => void load()}
      />
      <Pressable style={styles.secondary} onPress={() => navigation.navigate('SubmitPoint')}>
        <Text style={styles.secondaryTxt}>Add a collection point</Text>
      </Pressable>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {byCity.length === 0 ? (
            <Text style={styles.empty}>
              {cityFilter.trim()
                ? 'None of your points match this filter.'
                : 'You have not added any collection points yet. Tap “Add a collection point” to create your first personal meet-up spot.'}
            </Text>
          ) : (
            byCity.map(([city, rows]) => (
              <View key={city} style={styles.section}>
                <Text style={styles.sectionTitle}>{city}</Text>
                {rows.map((p) => (
                  <View key={p._id} style={[styles.card, cardShadow]}>
                    {p.locationPhoto ? (
                      <Image source={{ uri: p.locationPhoto }} style={styles.thumb} resizeMode="cover" />
                    ) : null}
                    <View style={styles.cardHeader}>
                      <Text style={styles.name}>{p.name}</Text>
                      <View style={styles.iconRow}>
                        <Pressable
                          onPress={() => navigation.navigate('SubmitPoint', { pointId: p._id })}
                          hitSlop={8}
                          style={styles.iconBtn}
                          accessibilityLabel="Edit point"
                        >
                          <Ionicons name="create-outline" size={20} color={lead} />
                        </Pressable>
                        <Pressable
                          onPress={() => remove(p._id)}
                          hitSlop={8}
                          style={styles.iconBtn}
                          accessibilityLabel="Delete point"
                        >
                          <Ionicons name="trash-outline" size={20} color="#b3261e" />
                        </Pressable>
                      </View>
                    </View>
                    <Text style={styles.addr}>{p.address}</Text>
                    {p.operatingHours ? <Text style={styles.hours}>{p.operatingHours}</Text> : null}
                    <Pressable
                      style={styles.dirBtn}
                      onPress={() => {
                        void (async () => {
                          try {
                            if (hasMapCoords(p.latitude, p.longitude)) {
                              await openGoogleMapsDirections(p.latitude!, p.longitude!);
                            } else {
                              await openGoogleMapsSearch(`${p.name} ${p.address} ${p.city}`);
                            }
                          } catch {
                            await Linking.openURL('https://maps.google.com');
                          }
                        })();
                      }}
                    >
                      <Ionicons name="navigate-outline" size={18} color={lead} />
                      <Text style={styles.dirBtnTxt}>Directions in Google Maps</Text>
                    </Pressable>
                  </View>
                ))}
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
  subtitle: {
    fontSize: 13,
    color: textSecondary,
    paddingHorizontal: 20,
    marginTop: 4,
    lineHeight: 18,
  },
  search: {
    marginHorizontal: 20,
    marginTop: 12,
    backgroundColor: '#f3f3f5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: lead,
  },
  secondary: {
    marginHorizontal: 20,
    marginTop: 10,
    backgroundColor: crunch,
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
  },
  secondaryTxt: { fontSize: 15, fontWeight: '800', color: lead },
  list: { padding: 20, paddingBottom: 40, gap: 20 },
  section: { gap: 10 },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '800',
    color: warmHaze,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 20,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
    gap: 6,
  },
  thumb: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#eee' },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: {
    padding: 6,
    borderRadius: 10,
  },
  name: { fontSize: 17, fontWeight: '800', color: lead, flex: 1 },
  addr: { fontSize: 14, color: textSecondary },
  hours: { fontSize: 13, color: warmHaze },
  dirBtn: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: crunch,
    borderRadius: 14,
    paddingVertical: 12,
  },
  dirBtnTxt: { fontSize: 14, fontWeight: '800', color: lead },
  empty: { fontSize: 15, color: textSecondary },
  error: { color: '#b3261e', marginHorizontal: 20 },
});
