import type { LocationMapPickerProps } from './locationMapPickerTypes';
import { LeafletLocationMapPicker } from './LeafletLocationMapPicker';

export type { LocationMapPickerProps };

/** Same Leaflet/OSM picker as Android (RN Maps avoids Google/native MapView quirks in ScrollViews). */
export function LocationMapPicker(props: LocationMapPickerProps) {
  return <LeafletLocationMapPicker {...props} />;
}
