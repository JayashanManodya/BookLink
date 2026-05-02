import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import { CommonActions } from '@react-navigation/native';
import {
  createBottomTabNavigator,
  type BottomTabBarProps,
} from '@react-navigation/bottom-tabs';
import { useAuth } from '@clerk/clerk-expo';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { setAuthTokenProvider } from '../lib/api';
import { ClerkUserSync } from '../components/ClerkUserSync';
import { BrowseStack } from './BrowseStack';
import { ProfileStack } from './ProfileStack';
import { RequestsStack } from './RequestsStack';
import { WishlistStack } from './WishlistStack';
import { themeGreen, themeNavMint, themeNavMintBorder, themePageBg } from '../theme/courseTheme';
import { chineseSilver } from '../theme/colors';
import { font } from '../theme/typography';

export type MainTabParamList = {
  Browse: undefined;
  Requests: undefined;
  Wishlist: undefined;
  Profile: undefined;
};

/** Content row height (icons + optional dot); safe area added below. */
const TAB_BAR_CONTENT_MIN = 28;
const TAB_BAR_VERTICAL_PAD = 6;
const TAB_OVERLAY_PAD = TAB_BAR_CONTENT_MIN + TAB_BAR_VERTICAL_PAD * 2;
const ICON_INACTIVE = '#8E8E8E';

const Tab = createBottomTabNavigator<MainTabParamList>();

function AuthApiSetup({ children }: { children: ReactNode }) {
  const { getToken } = useAuth();
  useEffect(() => {
    setAuthTokenProvider(() => getToken());
  }, [getToken]);
  return (
    <>
      <ClerkUserSync />
      {children}
    </>
  );
}

type IonName = ComponentProps<typeof Ionicons>['name'];

function iconFor(routeName: string, focused: boolean): IonName {
  if (routeName === 'Browse') return focused ? 'home' : 'home-outline';
  if (routeName === 'Requests') return focused ? 'swap-horizontal' : 'swap-horizontal-outline';
  if (routeName === 'Wishlist') return focused ? 'heart' : 'heart-outline';
  return focused ? 'person' : 'person-outline';
}

function labelFor(routeName: keyof MainTabParamList): string {
  if (routeName === 'Browse') return 'Home';
  if (routeName === 'Requests') return 'Exchange';
  if (routeName === 'Wishlist') return 'Wanted';
  return 'Profile';
}

function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  const live = navigation.getState();
  const routes = live?.routes ?? state.routes;
  const rawIdx = typeof live?.index === 'number' ? live.index : state.index;
  const safeIdx =
    typeof rawIdx === 'number' &&
    Number.isFinite(rawIdx) &&
    routes.length > 0 &&
    rawIdx >= 0 &&
    rawIdx < routes.length
      ? rawIdx
      : 0;

  const anyFocusedByNav = state.routes.some((r) => {
    const nav = descriptors[r.key]?.navigation;
    return typeof nav?.isFocused === 'function' && nav.isFocused();
  });

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: bottomPad }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route, index) => {
          const descriptor = descriptors[route.key];
          const { options, navigation: routeNav } = descriptor;
          const focusedByNav = typeof routeNav.isFocused === 'function' && routeNav.isFocused();
          const isFocused = anyFocusedByNav ? focusedByNav : index === safeIdx;
          const ion = iconFor(route.name, isFocused);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.dispatch({
                ...CommonActions.navigate(route),
                target: state.key,
              });
            }
          };

          const onLongPress = () => {
            navigation.emit({ type: 'tabLongPress', target: route.key });
          };

          return (
            <Pressable
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              accessibilityLabel={options.tabBarAccessibilityLabel ?? route.name}
              testID={options.tabBarButtonTestID}
              onPress={onPress}
              onLongPress={onLongPress}
              style={styles.tabSlot}
              hitSlop={{ top: 6, bottom: 4, left: 8, right: 8 }}
            >
              {isFocused ? (
                <View style={styles.mintPill}>
                  <Ionicons name={ion} size={22} color={themeGreen} />
                  <Text style={styles.mintLabel}>{labelFor(route.name as keyof MainTabParamList)}</Text>
                </View>
              ) : (
                <Ionicons name={ion} size={26} color={ICON_INACTIVE} />
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function MainTabs() {
  const insets = useSafeAreaInsets();
  const contentBottomPad = TAB_OVERLAY_PAD + Math.max(insets.bottom, 8) + 8;

  return (
    <AuthApiSetup>
      <Tab.Navigator
        id="MainTabsRoot"
        tabBar={(props) => <PillTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          sceneStyle: { paddingBottom: contentBottomPad, backgroundColor: themePageBg },
        }}
      >
        <Tab.Screen
          name="Browse"
          component={BrowseStack}
          options={{ tabBarAccessibilityLabel: 'Browse listings' }}
        />
        <Tab.Screen
          name="Requests"
          component={RequestsStack}
          options={{ tabBarAccessibilityLabel: 'Exchange requests and messages' }}
        />
        <Tab.Screen
          name="Wishlist"
          component={WishlistStack}
          options={{ tabBarAccessibilityLabel: 'Wanted books board' }}
        />
        <Tab.Screen
          name="Profile"
          component={ProfileStack}
          options={{ tabBarAccessibilityLabel: 'Profile' }}
        />
      </Tab.Navigator>
    </AuthApiSetup>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'box-none',
    paddingTop: TAB_BAR_VERTICAL_PAD,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: chineseSilver,
    ...Platform.select({
      ios: {
        shadowColor: '#101011',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.06,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
      web: { boxShadow: '0px -3px 12px rgba(16,16,17,0.06)' },
      default: {},
    }),
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    minHeight: TAB_BAR_CONTENT_MIN,
    paddingHorizontal: 8,
    backgroundColor: '#ffffff',
  },
  tabSlot: {
    flex: 1,
    maxWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  mintPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: themeNavMint,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: themeNavMintBorder,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
  },
  mintLabel: {
    fontFamily: font.semi,
    fontSize: 13,
    color: themeGreen,
    letterSpacing: -0.2,
  },
});
