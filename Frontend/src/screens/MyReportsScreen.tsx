import { useCallback, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
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
import type { ExchangeReport } from '../types/report';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyReports'>;

export function MyReportsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<ExchangeReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ reports: ExchangeReport[] }>('/api/reports');
      setReports(res.data.reports ?? []);
    } catch (e: unknown) {
      setError(apiErrorMessage(e, 'Could not load'));
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load])
  );

  const remove = (r: ExchangeReport) => {
    confirmDestructive({
      title: 'Delete report',
      message: 'Remove this report permanently?',
      confirmLabel: 'Delete',
      onConfirm: () =>
        void (async () => {
          try {
            await api.delete(`/api/reports/${r._id}`);
            setReports((prev) => prev.filter((x) => x._id !== r._id));
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
      <Text style={styles.title}>Reports I filed</Text>
      <Text style={styles.subtitle}>
        Editable only before you confirm receipt (if you report, you cannot confirm). After confirming, read-only.
      </Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {reports.length === 0 ? (
            <Text style={styles.empty}>You have not filed any reports yet.</Text>
          ) : (
            reports.map((r) => {
              const editable = r.canEdit !== false;
              return (
                <View key={r._id} style={[styles.card, cardShadow]}>
                  <View style={styles.row}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.bookTitle}>{r.bookTitle || 'Exchange'}</Text>
                      <Text style={styles.status}>Status: {r.status}</Text>
                      {!editable ? (
                        <Text style={styles.lockedHint}>Locked after you confirmed receipt</Text>
                      ) : null}
                    </View>
                    {editable ? (
                      <Pressable onPress={() => remove(r)} hitSlop={8}>
                        <Ionicons name="trash-outline" size={20} color="#b3261e" />
                      </Pressable>
                    ) : null}
                  </View>
                  {r.details ? <Text style={styles.details}>{r.details}</Text> : null}
                  {r.evidencePhoto ? (
                    <Image source={{ uri: r.evidencePhoto }} style={styles.evidence} resizeMode="cover" />
                  ) : null}
                  <Pressable
                    style={styles.editBtn}
                    onPress={() =>
                      navigation.navigate('ReportExchange', {
                        exchangeRequestId: r.exchangeRequestId,
                        bookTitle: r.bookTitle || 'Book',
                        reportId: r._id,
                      })
                    }
                  >
                    <Text style={styles.editTxt}>{editable ? 'Edit report' : 'View report'}</Text>
                    <Ionicons name="chevron-forward" size={18} color={lead} />
                  </Pressable>
                </View>
              );
            })
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
  title: { fontSize: 22, fontWeight: '800', color: lead, paddingHorizontal: 20, marginTop: 8 },
  subtitle: { fontSize: 14, color: warmHaze, paddingHorizontal: 20, marginTop: 6, marginBottom: 8, lineHeight: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  empty: { fontSize: 15, color: textSecondary, marginTop: 12 },
  error: { color: '#b3261e', paddingHorizontal: 20, marginTop: 12 },
  card: {
    borderRadius: 20,
    padding: 16,
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    gap: 10,
  },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  bookTitle: { fontSize: 17, fontWeight: '800', color: lead },
  status: { fontSize: 12, fontWeight: '700', color: warmHaze, marginTop: 2, textTransform: 'capitalize' },
  lockedHint: { fontSize: 12, fontWeight: '600', color: '#854f0b', marginTop: 4 },
  details: { fontSize: 14, color: textSecondary, lineHeight: 20 },
  evidence: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#eee' },
  editBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f3f3f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  editTxt: { fontSize: 14, fontWeight: '800', color: lead },
});
