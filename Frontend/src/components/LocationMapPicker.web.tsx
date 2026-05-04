import type { LocationMapPickerProps } from './locationMapPickerTypes';
import { LeafletLocationMapPicker } from './LeafletLocationMapPicker';

export type { LocationMapPickerProps };

export function LocationMapPicker(props: LocationMapPickerProps) {
  return <LeafletLocationMapPicker {...props} />;
}
