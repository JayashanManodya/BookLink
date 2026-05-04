import type { LocationMapPickerProps } from './locationMapPickerTypes';
import { LeafletLocationMapPicker } from './LeafletLocationMapPicker';

export type { LocationMapPickerProps };

/** OpenStreetMap in WebView — avoids Google Maps / MapView instability and ScrollView clashes on Android. */
export function LocationMapPicker(props: LocationMapPickerProps) {
  return <LeafletLocationMapPicker {...props} />;
}
