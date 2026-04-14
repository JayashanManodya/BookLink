import type { ComponentType } from 'react';
import { Platform } from 'react-native';
import { LocationMapPicker as LocationMapPickerWeb } from './LocationMapPicker.web';
import type { LocationMapPickerProps } from './LocationMapPicker.web';

export type { LocationMapPickerProps };

const LocationMapPickerNative = require('./LocationMapPicker.native')
  .LocationMapPicker as ComponentType<LocationMapPickerProps>;

/** Native MapView on iOS/Android; OpenStreetMap + pin in WebView on web. */
export const LocationMapPicker: ComponentType<LocationMapPickerProps> =
  Platform.OS === 'web' ? LocationMapPickerWeb : LocationMapPickerNative;
