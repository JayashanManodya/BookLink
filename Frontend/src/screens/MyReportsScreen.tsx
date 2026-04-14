import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
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
import type { Report } from '../types/report';

type Props = NativeStackScreenProps<ProfileStackParamList, 'MyReports'>;

function statusColor(s: Report['status']) {
  if (s === 'Open') return { bg: '#e3f2fd', color: '#1565c0' };
  if (s === 'UnderReview') return { bg: '#faeeda', color: '#854f0b' };
  if (s === 'Resolved') return { bg: '#eaf3de', color: '#27500a' };
  if (s === 'Dismissed') return { bg: '#fcebeb', color: '#b3261e' };
  if (s === 'Cancelled') return { bg: '#f3f3f5', color: warmHaze };
  return { bg: '#f3f3f5', color: lead };
}

export function MyReportsScreen({ navigation }: Props) {
  const insets = useSafeAreaInsets();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ reports: Report[] }>('/api/reports/mine');
      setReports(res.data.reports ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      <Text style={styles.title}>My reports</Text>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : (
        <ScrollView contentContainerStyle={styles.list} showsVerticalScrollIndicator={false}>
          {reports.length === 0 ? (
            <Text style={styles.empty}>You have not filed any reports.</Text>
          ) : (
            reports.map((r) => {
              const st = statusColor(r.status);
              return (
                <Pressable
                  key={r._id}
                  style={[styles.card, cardShadow]}
                  onPress={() => navigation.navigate('ReportDetail', { reportId: r._id })}
                >
                  <View style={[styles.badge, { backgroundColor: st.bg }]}>
                    <Text style={[styles.badgeTxt, { color: st.color }]}>{r.status}</Text>
                  </View>
                  <Text style={styles.reason}>{r.reason}</Text>
                  <Text style={styles.sub} numberOfLines={2}>
                    {r.reportedUserDisplayName || r.reportedBookTitle || '—'}
                  </Text>
                </Pressable>
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
  title: { fontSize: 22, fontWeight: '800', color: lead, paddingHorizontal: 20, marginTop: 4 },
  list: { padding: 20, gap: 12, paddingBottom: 40 },
  empty: { fontSize: 15, color: textSecondary },
  card: {
    borderRadius: 20,
    padding: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: cascadingWhite,
    gap: 8,
  },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  badgeTxt: { fontSize: 12, fontWeight: '800' },
  reason: { fontSize: 16, fontWeight: '800', color: lead },
  sub: { fontSize: 14, color: warmHaze },
});
