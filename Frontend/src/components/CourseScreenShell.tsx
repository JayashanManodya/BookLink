import type { ReactNode } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { cascadingWhite } from '../theme/colors';
import { themePageBg, themePrimary } from '../theme/courseTheme';
import { font } from '../theme/typography';

const HERO_BOTTOM_RADIUS = 28;

type Props = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  scroll?: boolean;
  headerRight?: ReactNode;
  onBackPress?: () => void;
  scrollContentStyle?: StyleProp<ViewStyle>;
};

export function CourseScreenShell({
  title,
  subtitle,
  children,
  scroll = true,
  headerRight,
  onBackPress,
  scrollContentStyle,
}: Props) {
  const insets = useSafeAreaInsets();
  const topPad = Math.max(insets.top, 12);

  return (
    <View style={styles.root}>
      <View style={[styles.hero, { paddingTop: topPad, paddingHorizontal: 20, paddingBottom: 22 }]}>
        <View style={styles.heroTop}>
          {onBackPress ? (
            <Pressable
              onPress={onBackPress}
              hitSlop={12}
              style={styles.backBtn}
              accessibilityRole="button"
              accessibilityLabel="Back"
            >
              <Ionicons name="chevron-back" size={26} color={cascadingWhite} />
            </Pressable>
          ) : (
            <View style={styles.leadGutter} />
          )}
          <View style={styles.heroTitles}>
            <Text style={[styles.heroTitle, { fontFamily: font.extraBold }]} numberOfLines={2}>
              {title}
            </Text>
            {subtitle ? (
              <Text style={[styles.heroSubtitle, { fontFamily: font.regular }]} numberOfLines={3}>
                {subtitle}
              </Text>
            ) : null}
          </View>
          <View style={[styles.trailCol, !headerRight && styles.trailGutter]}>{headerRight}</View>
        </View>
      </View>
      {scroll ? (
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, scrollContentStyle]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={styles.body}>{children}</View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: themePageBg },
  hero: {
    backgroundColor: themePrimary,
    borderBottomLeftRadius: HERO_BOTTOM_RADIUS,
    borderBottomRightRadius: HERO_BOTTOM_RADIUS,
    overflow: 'hidden',
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  backBtn: {
    marginTop: 2,
    marginLeft: -4,
    padding: 4,
  },
  leadGutter: { width: 8 },
  trailCol: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    maxWidth: '42%',
  },
  trailGutter: { width: 8 },
  heroTitles: { flex: 1, minWidth: 0 },
  heroTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: cascadingWhite,
    letterSpacing: -0.4,
  },
  heroSubtitle: {
    marginTop: 6,
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.88)',
  },
  scroll: { flex: 1 },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 36,
    flexGrow: 1,
  },
  body: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
});
