import { useMemo, useState } from 'react';
import {
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLLECTION_POINT_CITIES } from '../constants/collectionPointCities';
import { cascadingWhite, crunch, dreamland, lead, textSecondary, warmHaze } from '../theme/colors';

type Props = {
  value: string;
  onChange: (city: string) => void;
};

export function CityDictionarySelect({ value, onChange }: Props) {
  const insets = useSafeAreaInsets();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [...COLLECTION_POINT_CITIES];
    return COLLECTION_POINT_CITIES.filter((c) => c.toLowerCase().includes(q));
  }, [query]);

  const pick = (city: string) => {
    onChange(city);
    setOpen(false);
    setQuery('');
  };

  const close = () => {
    setOpen(false);
    setQuery('');
  };

  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>City</Text>
      <Pressable
        onPress={() => setOpen(true)}
        style={({ pressed }) => [styles.trigger, pressed && styles.triggerPressed]}
        accessibilityRole="button"
        accessibilityLabel="Select city"
      >
        <Text style={[styles.triggerText, !value && styles.triggerPlaceholder]}>
          {value || 'Tap to choose a city'}
        </Text>
        <Ionicons name="chevron-down" size={20} color={warmHaze} />
      </Pressable>

      <Modal visible={open} animationType="slide" transparent onRequestClose={close}>
        <View style={styles.modalBackdrop}>
          <Pressable style={StyleSheet.absoluteFill} onPress={close} accessibilityLabel="Close city list" />
          <View style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
            <View style={styles.sheetHandle} />
            <View style={styles.sheetHeader}>
              <Text style={styles.sheetTitle}>Select city</Text>
              <Pressable onPress={close} hitSlop={12} accessibilityLabel="Done">
                <Text style={styles.sheetDone}>Done</Text>
              </Pressable>
            </View>
            <View style={styles.searchWrap}>
              <Ionicons name="search-outline" size={18} color={warmHaze} style={styles.searchIcon} />
              <TextInput
                value={query}
                onChangeText={setQuery}
                placeholder="Search cities…"
                placeholderTextColor={warmHaze}
                style={styles.searchInput}
                autoCorrect={false}
                autoCapitalize="words"
              />
              {query.length > 0 ? (
                <Pressable onPress={() => setQuery('')} hitSlop={8}>
                  <Ionicons name="close-circle" size={20} color={warmHaze} />
                </Pressable>
              ) : null}
            </View>
            <FlatList
              data={filtered}
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <Text style={styles.empty}>No cities match “{query.trim()}”. Try another spelling.</Text>
              }
              renderItem={({ item }) => (
                <Pressable
                  style={({ pressed }) => [styles.row, item === value && styles.rowOn, pressed && styles.rowPressed]}
                  onPress={() => pick(item)}
                >
                  <Text style={[styles.rowText, item === value && styles.rowTextOn]}>{item}</Text>
                  {item === value ? <Ionicons name="checkmark-circle" size={22} color={crunch} /> : null}
                </Pressable>
              )}
              style={styles.list}
              contentContainerStyle={styles.listContent}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 6 },
  label: { fontSize: 13, fontWeight: '700', color: warmHaze },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f3f3f5',
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  triggerPressed: { opacity: 0.92 },
  triggerText: { flex: 1, fontSize: 16, color: lead, fontWeight: '600' },
  triggerPlaceholder: { color: warmHaze, fontWeight: '500' },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: cascadingWhite,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '78%',
    paddingTop: 8,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: dreamland,
    marginBottom: 8,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingBottom: 10,
  },
  sheetTitle: { fontSize: 18, fontWeight: '800', color: lead },
  sheetDone: { fontSize: 16, fontWeight: '800', color: crunch },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginBottom: 8,
    paddingHorizontal: 12,
    borderRadius: 14,
    backgroundColor: '#f3f3f5',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
  },
  searchIcon: { marginRight: 8 },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 16, color: lead },
  list: { flexGrow: 0 },
  listContent: { paddingBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: dreamland,
  },
  rowOn: { backgroundColor: '#f9f6f0' },
  rowPressed: { opacity: 0.9 },
  rowText: { fontSize: 16, color: lead, fontWeight: '600', flex: 1, paddingRight: 12 },
  rowTextOn: { fontWeight: '800' },
  empty: { padding: 24, textAlign: 'center', fontSize: 15, color: textSecondary, lineHeight: 22 },
});
