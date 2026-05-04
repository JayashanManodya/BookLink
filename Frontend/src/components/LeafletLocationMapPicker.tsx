import { createElement, useCallback, useEffect, useMemo, useRef } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import WebView from 'react-native-webview';

import type { LocationMapPickerProps } from './locationMapPickerTypes';
import { buildLeafletMapHtml } from './leafletEmbedHtml';

const MAP_HEIGHT = 280;

function parseMessagePayload(raw: string): { latitude: number; longitude: number } | null {
  try {
    const obj = JSON.parse(raw) as { latitude?: number; longitude?: number };
    if (!Number.isFinite(obj.latitude ?? NaN) || !Number.isFinite(obj.longitude ?? NaN)) return null;
    return { latitude: obj.latitude as number, longitude: obj.longitude as number };
  } catch {
    return null;
  }
}

function LeafletLocationMapPickerWeb({
  latitude,
  longitude,
  onChange,
}: LocationMapPickerProps) {
  const html = useMemo(() => buildLeafletMapHtml('web', latitude, longitude), [latitude, longitude]);

  useEffect(() => {
    function onWinMessage(ev: MessageEvent) {
      const d = ev.data as { source?: string; latitude?: number; longitude?: number };
      if (!d || d.source !== 'booklink-map') return;
      if (!Number.isFinite(d.latitude ?? NaN) || !Number.isFinite(d.longitude ?? NaN)) return;
      onChange(d.latitude as number, d.longitude as number);
    }
    if (typeof window !== 'undefined') {
      window.addEventListener('message', onWinMessage);
      return () => window.removeEventListener('message', onWinMessage);
    }
    return undefined;
  }, [onChange]);

  return (
    <View style={styles.box}>
      {createElement('iframe', {
        title: 'Location map',
        sandbox: 'allow-scripts allow-same-origin',
        srcDoc: html,
        style: { border: 'none', width: '100%', height: MAP_HEIGHT },
      })}
    </View>
  );
}

function LeafletLocationMapPickerNative({
  latitude,
  longitude,
  onChange,
}: LocationMapPickerProps) {
  const webRef = useRef<WebView>(null);

  const nativeHtml = useMemo(
    () => buildLeafletMapHtml('native', latitude, longitude),
    [latitude, longitude]
  );

  useEffect(() => {
    const cmd = `(function(){ try { window.setPin && window.setPin(${latitude}, ${longitude}); } catch(e){} })();true;`;
    webRef.current?.injectJavaScript(cmd);
  }, [latitude, longitude]);

  const onBridgeMessage = useCallback(
    (raw: unknown) => {
      if (typeof raw !== 'string') return;
      const p = parseMessagePayload(raw);
      if (!p) return;
      onChange(p.latitude, p.longitude);
    },
    [onChange]
  );

  return (
    <View style={styles.box}>
      <WebView
        ref={webRef}
        style={styles.web}
        originWhitelist={['*']}
        mixedContentMode="always"
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        nestedScrollEnabled
        source={{
          html: nativeHtml,
          baseUrl: 'https://booklink.invalid',
        }}
        onMessage={(ev) => onBridgeMessage(ev.nativeEvent?.data)}
      />
    </View>
  );
}

/** OSM tiles + Leaflet: WebView on native, iframe on web. */
export function LeafletLocationMapPicker(props: LocationMapPickerProps) {
  if (Platform.OS === 'web') {
    return <LeafletLocationMapPickerWeb {...props} />;
  }
  return <LeafletLocationMapPickerNative {...props} />;
}

const styles = StyleSheet.create({
  box: {
    width: '100%',
    height: MAP_HEIGHT,
    borderRadius: 14,
    overflow: 'hidden',
    marginTop: 10,
    marginBottom: 4,
    backgroundColor: '#e8e6e6',
  },
  web: { flex: 1, backgroundColor: 'transparent' },
});
