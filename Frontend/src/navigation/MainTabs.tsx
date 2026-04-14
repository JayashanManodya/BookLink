import { useEffect, type ComponentProps, type ReactNode } from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
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
import { cascadingWhite, dreamland, lead, warmHaze } from '../theme/colors';

export type MainTabParamList = {
  Browse: undefined;
  Requests: undefined;
  Wishlist: undefined;
  Profile: undefined;
};

/** Content row height (icons + optional dot); safe area added below. */
const TAB_BAR_CONTENT_MIN = 20;
const TAB_BAR_VERTICAL_PAD = 4;
const TAB_OVERLAY_PAD = TAB_BAR_CONTENT_MIN + TAB_BAR_VERTICAL_PAD * 2;
const ACTIVE_DOT = '#e53935';

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

/** Outline when idle, solid when active — travel-style tab bar. */
function iconFor(routeName: string, focused: boolean): IonName {
  if (routeName === 'Browse') return focused ? 'home' : 'home-outline';
  if (routeName === 'Requests') return focused ? 'swap-horizontal' : 'swap-horizontal-outline';
  if (routeName === 'Wishlist') return focused ? 'heart' : 'heart-outline';
  return focused ? 'person' : 'person-outline';
}

function PillTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const insets = useSafeAreaInsets();
  const bottomPad = Math.max(insets.bottom, 8);

  return (
    <View style={[styles.tabBarOuter, { paddingBottom: bottomPad }]}>
      <View style={styles.tabBarInner}>
        {state.routes.map((route) => {
          const { options } = descriptors[route.key];
          const isFocused = state.routes[state.index]?.key === route.key;
          const ion = iconFor(route.name, isFocused);
          const iconColor = isFocused ? lead : warmHaze;

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
              hitSlop={{ top: 6, bottom: 4, left: 8, right: 8 }}
            >
              <Ionicons name={ion} size={26} color={iconColor} />
              <View style={[styles.activeDot, !isFocused && styles.activeDotHidden]} />
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
    pointerEvents: 'box-none',
    paddingTop: TAB_BAR_VERTICAL_PAD,
    backgroundColor: '#ffffff',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: dreamland,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 6,
      },
      android: { elevation: 12 },
      web: { boxShadow: '0px -2px 8px rgba(0, 0, 0, 0.06)' },
      default: {},
    }),
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-around',
    minHeight: TAB_BAR_CONTENT_MIN,
    paddingHorizontal: 4,
    backgroundColor: '#ffffff',
  },
  tabSlot: {
    flex: 1,
    maxWidth: 96,
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 4,
    gap: 4,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: ACTIVE_DOT,
  },
  activeDotHidden: {
    opacity: 0,
  },
});
