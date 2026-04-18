import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
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

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyPoints'>;

export function MyPointsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ points: CollectionPoint[] }>('/api/points/mine');
      setPoints(res.data.points ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load]),
  );

  const remove = (id: string) => {
    confirmDestructive({
      title: 'Delete point',
      message: 'Remove this suggestion?',
      confirmLabel: 'Delete',
      onConfirm: () =>
        void (async () => {
          try {
            await api.delete(`/api/points/${id}`);
            setPoints((p) => p.filter((x) => x._id !== id));
          } catch (e: unknown) {
            Alert.alert('Error', apiErrorMessage(e, 'Failed'));
          }
        })(),
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
      <Text style={styles.title}>My collection points</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {points.length === 0 ? (
            <Text style={styles.empty}>You have not suggested any points yet.</Text>
          ) : (
            points.map((p) => (
              <View key={p._id} style={[styles.card, cardShadow]}>
                <View style={styles.row}>
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
                <Text style={styles.meta}>
                  {p.city} · {p.address}
                </Text>
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
  list: { padding: 20, gap: 12, paddingBottom: 40 },
  empty: { fontSize: 15, color: textSecondary },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
    gap: 6,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 8 },
  iconRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  iconBtn: { padding: 6, borderRadius: 10 },
  name: { fontSize: 17, fontWeight: '800', color: lead, flex: 1 },
  meta: { fontSize: 14, color: warmHaze },
});
