export type LocationMapPickerProps = {
  latitude: number;
  longitude: number;
  /** Called whenever the marker moves (drag or map tap). */
  onChange: (latitude: number, longitude: number) => void;
};
