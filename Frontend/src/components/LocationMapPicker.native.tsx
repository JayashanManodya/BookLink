import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';

export type LocationMapPickerProps = {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
};

const DELTA = 0.04;

export function LocationMapPicker({ latitude, longitude, onChange }: LocationMapPickerProps) {
  const region: Region = useMemo(
    () => ({
      latitude,
      longitude,
      latitudeDelta: DELTA,
      longitudeDelta: DELTA,
    }),
    [latitude, longitude]
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>Tap anywhere on the map or drag the pin to choose the meeting point.</Text>
      <MapView
        style={styles.map}
        initialRegion={region}
        onPress={(e) => {
          const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
          onChange(lat, lng);
        }}
      >
        <Marker
          coordinate={{ latitude, longitude }}
          draggable
          title="Meeting pin"
          onDragEnd={(e) => {
            const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
            onChange(lat, lng);
          }}
        />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  hint: { fontSize: 13, color: '#6b6b76', lineHeight: 18 },
  map: {
    width: '100%',
    height: 300,
    borderRadius: 14,
    overflow: 'hidden',
  },
});
