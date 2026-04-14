import { useCallback, useEffect, useState } from 'react';
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
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { api } from '../lib/api';
import { alertOk } from '../lib/platformAlert';
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

type Props = NativeStackScreenProps<ProfileStackParamList, 'ReportDetail'>;

export function ReportDetailScreen({ navigation, route }: Props) {
  const insets = useSafeAreaInsets();
  const { reportId } = route.params;
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get<{ report: Report }>(`/api/reports/${reportId}`);
      setReport(res.data.report);
    } catch {
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [reportId]);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async () => {
    try {
      await api.patch(`/api/reports/${reportId}/status`, { status: 'Cancelled' });
      alertOk('Updated', 'Report cancelled.', () => void load());
    } catch (e: unknown) {
      alertOk('Error', e instanceof Error ? e.message : 'Could not update');
    }
  };

  return (
    <View style={styles.flex}>
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 8) }]}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={12} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color={lead} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>
      </View>
      {loading ? (
        <ActivityIndicator style={{ marginTop: 24 }} color={crunch} />
      ) : !report ? (
        <Text style={styles.error}>Report not found.</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.status}>Status: {report.status}</Text>
          <Text style={styles.reason}>{report.reason}</Text>
          <Text style={styles.body}>{report.description}</Text>
          {report.reportedUserDisplayName ? (
            <Text style={styles.meta}>User: {report.reportedUserDisplayName}</Text>
          ) : null}
          {report.reportedBookTitle ? (
            <Text style={styles.meta}>Book: {report.reportedBookTitle}</Text>
          ) : null}
          {report.evidencePhoto ? (
            <Image source={{ uri: report.evidencePhoto }} style={styles.photo} resizeMode="contain" />
          ) : null}
          {report.status === 'Open' ? (
            <Pressable style={[styles.cancelBtn, cardShadow]} onPress={() => void cancel()}>
              <Text style={styles.cancelTxt}>Cancel report</Text>
            </Pressable>
          ) : null}
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
  scroll: { padding: 20, gap: 12, paddingBottom: 40 },
  status: { fontSize: 14, fontWeight: '800', color: warmHaze },
  reason: { fontSize: 20, fontWeight: '800', color: lead },
  body: { fontSize: 15, lineHeight: 22, color: textSecondary },
  meta: { fontSize: 14, color: lead, fontWeight: '600' },
  photo: { width: '100%', height: 220, borderRadius: 16, backgroundColor: '#eee' },
  cancelBtn: {
    marginTop: 16,
    backgroundColor: lead,
    borderRadius: 20,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelTxt: { color: cascadingWhite, fontWeight: '800', fontSize: 16 },
  error: { color: '#b3261e', margin: 20 },
});
