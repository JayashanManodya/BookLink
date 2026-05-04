import type { Dispatch, SetStateAction } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { BOOK_TYPES } from '../constants/bookTypes';
import {
  cascadingWhite,
  chineseSilver,
  dreamland,
} from '../theme/colors';
import {
  themeCard,
  themeInk,
  themeMuted,
  themePageBg,
  themePrimary,
} from '../theme/courseTheme';
import { font } from '../theme/typography';

export const BROWSE_CONDITIONS = ['new', 'good', 'poor'] as const;

type Condition = (typeof BROWSE_CONDITIONS)[number];

type Props = {
  visible: boolean;
  onClose: () => void;
  /** Book-type segment (Popular category) */
  bookTypeChip: string | null;
  setBookTypeChip: Dispatch<SetStateAction<string | null>>;
  advCondition: Condition | null;
  setAdvCondition: Dispatch<SetStateAction<Condition | null>>;
  advLanguage: string;
  setAdvLanguage: (v: string) => void;
  advYearMin: string;
  setAdvYearMin: (v: string) => void;
  advYearMax: string;
  setAdvYearMax: (v: string) => void;
  onResetAdvanced: () => void;
};

export function BrowseBooksFilterModal({
  visible,
  onClose,
  bookTypeChip,
  setBookTypeChip,
  advCondition,
  setAdvCondition,
  advLanguage,
  setAdvLanguage,
  advYearMin,
  setAdvYearMin,
  advYearMax,
  setAdvYearMax,
  onResetAdvanced,
}: Props) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.modalRoot}>
        <Pressable style={styles.modalBackdrop} onPress={onClose} />
        <View style={[styles.modalSheet, { paddingBottom: Math.max(insets.bottom, 20) }]}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { fontFamily: font.extraBold }]}>Advanced filters</Text>
            <Pressable onPress={onClose} hitSlop={12}>
              <Ionicons name="close" size={26} color={themeInk} />
            </Pressable>
          </View>
          <Text style={[styles.modalHint, { fontFamily: font.regular }]}>
            Combine with the search bar. Book type mirrors the category chips under Popular books.
          </Text>

          <ScrollView
            style={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Text style={[styles.advLabel, { fontFamily: font.semi }]}>Book type</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              style={styles.advBookTypeScroll}
              contentContainerStyle={styles.advBookTypeScrollContent}
            >
              <Pressable
                onPress={() => setBookTypeChip(null)}
                style={[styles.advChip, !bookTypeChip && styles.advChipOn]}
              >
                <Text
                  style={[styles.advChipTxt, !bookTypeChip && styles.advChipTxtOn, { fontFamily: font.medium }]}
                >
                  Any
                </Text>
              </Pressable>
              {BOOK_TYPES.map((tab) => (
                <Pressable
                  key={tab}
                  onPress={() => setBookTypeChip((prev) => (prev === tab ? null : tab))}
                  style={[styles.advChip, bookTypeChip === tab && styles.advChipOn]}
                >
                  <Text
                    style={[
                      styles.advChipTxt,
                      bookTypeChip === tab && styles.advChipTxtOn,
                      { fontFamily: font.medium },
                    ]}
                  >
                    {tab}
                  </Text>
                </Pressable>
              ))}
            </ScrollView>

            <Text style={[styles.advLabel, { fontFamily: font.semi }]}>Condition</Text>
            <View style={styles.chipWrap}>
              <Pressable
                onPress={() => setAdvCondition(null)}
                style={[styles.advChip, !advCondition && styles.advChipOn]}
              >
                <Text
                  style={[styles.advChipTxt, !advCondition && styles.advChipTxtOn, { fontFamily: font.medium }]}
                >
                  Any
                </Text>
              </Pressable>
              {BROWSE_CONDITIONS.map((c) => (
                <Pressable
                  key={c}
                  onPress={() => setAdvCondition((prev) => (prev === c ? null : c))}
                  style={[styles.advChip, advCondition === c && styles.advChipOn]}
                >
                  <Text
                    style={[
                      styles.advChipTxt,
                      advCondition === c && styles.advChipTxtOn,
                      { fontFamily: font.medium },
                    ]}
                  >
                    {c}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Text style={[styles.advLabel, { fontFamily: font.semi }]}>Language</Text>
            <TextInput
              style={[styles.advInput, { fontFamily: font.regular }]}
              placeholder="e.g. English, Sinhala"
              placeholderTextColor={themeMuted}
              value={advLanguage}
              onChangeText={setAdvLanguage}
            />

            <Text style={[styles.advLabel, { fontFamily: font.semi }]}>Publication year</Text>
            <View style={styles.yearRow}>
              <TextInput
                style={[styles.advInput, styles.yearInput, { fontFamily: font.regular }]}
                placeholder="From"
                placeholderTextColor={themeMuted}
                value={advYearMin}
                onChangeText={setAdvYearMin}
                keyboardType="number-pad"
              />
              <Text style={[styles.yearDash, { fontFamily: font.medium }]}>–</Text>
              <TextInput
                style={[styles.advInput, styles.yearInput, { fontFamily: font.regular }]}
                placeholder="To"
                placeholderTextColor={themeMuted}
                value={advYearMax}
                onChangeText={setAdvYearMax}
                keyboardType="number-pad"
              />
            </View>
          </ScrollView>

          <View style={styles.modalActions}>
            <Pressable style={[styles.modalBtn, styles.modalBtnGhost]} onPress={onResetAdvanced}>
              <Text style={[styles.modalBtnGhostTxt, { fontFamily: font.bold }]}>Reset panel</Text>
            </Pressable>
            <Pressable style={[styles.modalBtn, styles.modalBtnPrimary]} onPress={onClose}>
              <Text style={[styles.modalBtnPrimaryTxt, { fontFamily: font.bold }]}>Apply</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(16,16,17,0.45)',
  },
  modalSheet: {
    backgroundColor: cascadingWhite,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    paddingHorizontal: 20,
    paddingTop: 8,
    maxHeight: '88%',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: chineseSilver,
  },
  modalHandle: {
    alignSelf: 'center',
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: chineseSilver,
    marginBottom: 14,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  modalTitle: { fontSize: 20, color: themeInk },
  modalHint: { fontSize: 14, color: themeMuted, lineHeight: 20, marginBottom: 16 },
  modalScroll: { maxHeight: 360 },
  advBookTypeScroll: {
    marginHorizontal: -20,
    marginBottom: 12,
  },
  advBookTypeScrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingVertical: 4,
  },
  advLabel: {
    fontSize: 13,
    color: themeMuted,
    marginBottom: 8,
    marginTop: 4,
  },
  chipWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  advChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: dreamland,
    backgroundColor: themeCard,
  },
  advChipOn: {
    backgroundColor: 'rgba(113,110,255,0.12)',
    borderColor: themePrimary,
  },
  advChipTxt: { fontSize: 14, color: themeMuted, textTransform: 'capitalize' },
  advChipTxtOn: { color: themePrimary },
  advInput: {
    backgroundColor: themePageBg,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: chineseSilver,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: themeInk,
    marginBottom: 14,
  },
  yearRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  yearInput: { flex: 1, marginBottom: 0 },
  yearDash: { fontSize: 18, color: themeMuted },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: chineseSilver,
  },
  modalBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 18,
    alignItems: 'center',
  },
  modalBtnGhost: {
    backgroundColor: cascadingWhite,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: chineseSilver,
  },
  modalBtnGhostTxt: { fontSize: 16, color: themeMuted },
  modalBtnPrimary: {
    backgroundColor: themePrimary,
    shadowColor: themePrimary,
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  modalBtnPrimaryTxt: {
    fontSize: 16,
    color: cascadingWhite,
  },
});
