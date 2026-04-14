import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
import { cascadingWhite, iconOnLead, lead } from '../theme/colors';
import { tabBarShadow } from '../theme/shadows';

export type MainTabParamList = {
  Browse: undefined;
  Requests: undefined;
  Wishlist: undefined;
  Profile: undefined;
};

/** Vertical inset top/bottom; bubble fits that inner height. */
const GAP = 6;
/** Left/right inset (0 = end icons flush to inner curve). */
const GAP_H = 0;
const TAB_BAR_HEIGHT = 68;
const BUBBLE = TAB_BAR_HEIGHT - 2 * GAP;
const TAB_OVERLAY_PAD = TAB_BAR_HEIGHT + 0;

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

/** Icons match each tab: Browse · Requests · Wishlist · Profile */
function iconFor(routeName: string, focused: boolean): IonName {
  if (routeName === 'Browse') return focused ? 'compass' : 'compass-outline';
  if (routeName === 'Requests') return focused ? 'swap-horizontal' : 'swap-horizontal-outline';
  if (routeName === 'Wishlist') return focused ? 'heart' : 'heart-outline';
  return focused ? 'person' : 'person-outline';
}

function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottom = Math.max(insets.bottom, 10);

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: bottom }]}>
      <View style={[styles.tabBarPill, tabBarShadow]}>
        {state.routes.map((route) => {
          const { options } = descriptors[route.key];
          const isFocused = state.routes[state.index]?.key === route.key;
          const ion = iconFor(route.name, isFocused);

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });
            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
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
              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
            >
              {isFocused ? (
                <View style={styles.activeBubble}>
                  <Ionicons name={ion} size={24} color={lead} />
                </View>
              ) : (
                <View style={styles.inactiveIconWrap}>
                  <Ionicons name={ion} size={24} color={iconOnLead} />
                </View>
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
  const contentBottomPad = TAB_OVERLAY_PAD + Math.max(insets.bottom, 10) + 12;

  return (
    <AuthApiSetup>
      <Tab.Navigator
        id="MainTabsRoot"
        tabBar={(props) => <PillTabBar {...props} />}
        screenOptions={{
          headerShown: false,
          tabBarShowLabel: false,
          sceneStyle: { paddingBottom: contentBottomPad, backgroundColor: cascadingWhite },
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
          options={{ tabBarAccessibilityLabel: 'Exchange requests' }}
        />
        <Tab.Screen
          name="Wishlist"
          component={WishlistStack}
          options={{ tabBarAccessibilityLabel: 'Wishlist' }}
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
    alignItems: 'center',
    pointerEvents: 'box-none',
    paddingTop: 10,
  },
  tabBarPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    width: '78%',
    maxWidth: 300,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: GAP_H,
    paddingVertical: GAP,
    backgroundColor: lead,
    borderRadius: 999,
    overflow: 'hidden',
  },
  /** Equal columns; height comes from pill content box (after padding). */
  tabSlot: {
    flex: 1,
    alignSelf: 'stretch',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeBubble: {
    width: BUBBLE,
    height: BUBBLE,
    borderRadius: BUBBLE / 2,
    backgroundColor: cascadingWhite,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inactiveIconWrap: {
    width: BUBBLE,
    height: BUBBLE,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
