import { Platform } from 'react-native';
import type { NativeStackNavigationOptions } from '@react-navigation/native-stack';

/**
 * Shared native-stack options for web. Fade transitions reduce focus / screen-reader
 * oddities with the default slide animation in some browsers.
 */
export const webStackSceneOptions: Partial<NativeStackNavigationOptions> =
  Platform.OS === 'web' ? { animation: 'fade' } : {};
