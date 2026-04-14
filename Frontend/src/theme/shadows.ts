import { Platform, type ViewStyle } from 'react-native';

/** react-native-web deprecates shadow*; use boxShadow on web. */
export function platformElevation(opts: {
  offsetY: number;
  opacity: number;
  radius: number;
  elevation: number;
}): ViewStyle {
  const { offsetY, opacity, radius, elevation } = opts;
  return Platform.select<ViewStyle>({
    web: {
      boxShadow: `0px ${offsetY}px ${radius}px rgba(0, 0, 0, ${opacity})`,
    },
    default: {
      shadowColor: '#000',
      shadowOffset: { width: 0, height: offsetY },
      shadowOpacity: opacity,
      shadowRadius: radius,
      elevation,
    },
  })!;
}

export const cardShadow: ViewStyle = platformElevation({
  offsetY: 2,
  opacity: 0.08,
  radius: 8,
  elevation: 3,
});

export const tabBarShadow: ViewStyle = platformElevation({
  offsetY: 4,
  opacity: 0.12,
  radius: 12,
  elevation: 8,
});
