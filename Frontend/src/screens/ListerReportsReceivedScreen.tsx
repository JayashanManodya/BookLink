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
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../lib/api';
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
import type { ListerReceivedReport } from '../types/report';

type Props = NativeStackScreenProps<ProfileStackParamList, 'ListerReportsReceived'>;

export function ListerReportsReceivedScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<ListerReceivedReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.get<{ reports: ListerReceivedReport[] }>('/api/reports/received');
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

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>Reports on my swaps</Text>
      <Text style={styles.subtitle}>Issues readers reported before confirming. Tap to open details.</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : error ? (
        <Text style={styles.error}>{error}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {reports.length === 0 ? (
            <Text style={styles.empty}>No reports yet.</Text>
          ) : (
            reports.map((r) => (
              <Pressable
                key={r._id}
                style={[styles.card, cardShadow]}
                onPress={() =>
                  navigation.navigate('ReportExchange', {
                    exchangeRequestId: r.exchangeRequestId,
                    bookTitle: r.bookTitle || 'Book',
                    reportId: r._id,
                    listerView: true,
                    readerName: r.reporterDisplayName || 'Reader',
                  })
                }
              >
                <Text style={styles.bookTitle}>{r.bookTitle || 'Book'}</Text>
                <Text style={styles.meta}>
                  From {r.reporterDisplayName || 'Reader'}
                  {r.createdAt ? ` · ${new Date(r.createdAt).toLocaleDateString()}` : ''}
                </Text>
                {r.details ? (
                  <Text style={styles.details} numberOfLines={3}>
                    {r.details}
                  </Text>
                ) : null}
                {r.evidencePhoto ? (
                  <Image source={{ uri: r.evidencePhoto }} style={styles.evidence} resizeMode="cover" />
                ) : null}
                <View style={styles.openRow}>
                  <Text style={styles.openTxt}>Open</Text>
                  <Ionicons name="chevron-forward" size={18} color={lead} />
                </View>
              </Pressable>
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
  subtitle: { fontSize: 14, color: warmHaze, paddingHorizontal: 20, marginTop: 6, marginBottom: 8, lineHeight: 20 },
  list: { paddingHorizontal: 20, paddingBottom: 40, gap: 12 },
  empty: { fontSize: 15, color: textSecondary, marginTop: 12 },
  error: { color: '#b3261e', paddingHorizontal: 20, marginTop: 12 },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
    gap: 8,
  },
  bookTitle: { fontSize: 17, fontWeight: '800', color: lead },
  meta: { fontSize: 13, fontWeight: '600', color: warmHaze },
  details: { fontSize: 14, color: textSecondary, lineHeight: 20 },
  evidence: { width: '100%', height: 120, borderRadius: 12, backgroundColor: '#eee' },
  openRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 4, marginTop: 4 },
  openTxt: { fontSize: 14, fontWeight: '800', color: lead },
});
