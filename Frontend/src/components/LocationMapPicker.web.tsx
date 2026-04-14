import { useMemo, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';

export type LocationMapPickerProps = {
  latitude: number;
  longitude: number;
  onChange: (lat: number, lng: number) => void;
};

function leafletHtml(lat: number, lng: number): string {
  const safeLat = Number.isFinite(lat) ? lat : 0;
  const safeLng = Number.isFinite(lng) ? lng : 0;
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" crossorigin="" />
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" crossorigin=""></script>
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; }
    .leaflet-container { background: #dfe8f2; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    (function () {
      var lat = ${JSON.stringify(safeLat)};
      var lng = ${JSON.stringify(safeLng)};
      var map = L.map('map', { zoomControl: true }).setView([lat, lng], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap',
        maxZoom: 19
      }).addTo(map);
      var marker = L.marker([lat, lng], { draggable: true }).addTo(map);
      function publish() {
        var ll = marker.getLatLng();
        var msg = JSON.stringify({ type: 'pin', lat: ll.lat, lng: ll.lng });
        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
          window.ReactNativeWebView.postMessage(msg);
        }
      }
      map.on('click', function (e) {
        marker.setLatLng(e.latlng);
        publish();
      });
      marker.on('dragend', publish);
      setTimeout(function () { map.invalidateSize(); }, 200);
      setTimeout(function () { map.invalidateSize(); }, 700);
      publish();
    })();
  <\/script>
</body>
</html>`;
}

/** Interactive OpenStreetMap + draggable pin (WebView). Same interaction model as native. */
export function LocationMapPicker({ latitude, longitude, onChange }: LocationMapPickerProps) {
  const initial = useRef({ lat: latitude, lng: longitude });
  const html = useMemo(
    () => leafletHtml(initial.current.lat, initial.current.lng),
    []
  );

  return (
    <View style={styles.wrap}>
      <Text style={styles.hint}>Tap anywhere on the map or drag the pin to choose the meeting point.</Text>
      <WebView
        source={{ html }}
        style={styles.web}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled
        setSupportMultipleWindows={false}
        onMessage={(e) => {
          try {
            const raw = e.nativeEvent.data;
            const data = JSON.parse(raw) as { type?: string; lat?: unknown; lng?: unknown };
            if (
              data.type === 'pin' &&
              typeof data.lat === 'number' &&
              typeof data.lng === 'number' &&
              Number.isFinite(data.lat) &&
              Number.isFinite(data.lng)
            ) {
              onChange(data.lat, data.lng);
            }
          } catch {
            /* ignore non-JSON messages */
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8 },
  hint: { fontSize: 13, color: '#6b6b76', lineHeight: 18 },
  web: {
    width: '100%',
    height: 300,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#e8e8ee',
  },
});
