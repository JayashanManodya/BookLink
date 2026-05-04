const LEAFLET_CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
const LEAFLET_JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';

type BridgeKind = 'native' | 'web';

/** Full HTML doc: OpenStreetMap tiles + draggable marker + map tap. */
export function buildLeafletMapHtml(kind: BridgeKind, latitude: number, longitude: number): string {
  const lat = Number(latitude.toFixed(6));
  const lng = Number(longitude.toFixed(6));
  const notify = `
    function notify(lat, lng) {
      var payload = JSON.stringify({
        latitude: lat,
        longitude: lng,
      });
      ${kind === 'web'
        ? `if (window.parent) window.parent.postMessage({ source: 'booklink-map', latitude: lat, longitude: lng }, '*');`
        : `try { window.ReactNativeWebView.postMessage(payload); } catch (e) {}`}
    }
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link rel="stylesheet" href="${LEAFLET_CSS}"/>
<style>
  html,body,#map { margin: 0; padding: 0; height: 100%; width: 100%; }
</style>
</head>
<body>
<div id="map"></div>
<script src="${LEAFLET_JS}"></script>
<script>
(function () {
${notify}

  function initLeaflet(){
    try {
      if (typeof L === 'undefined') { setTimeout(initLeaflet, 30); return; }
      delete L.Icon.Default.prototype._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
        iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
        shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
      });

      var map = L.map('map', { zoomControl: true, attributionControl: true }).setView([${lat}, ${lng}], 14);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
      }).addTo(map);

      var marker = L.marker([${lat}, ${lng}], { draggable: true }).addTo(map);
      marker.on('dragend', function (ev) {
        var p = ev.target.getLatLng();
        notify(p.lat, p.lng);
      });
      map.on('click', function (ev) {
        marker.setLatLng(ev.latlng);
        notify(ev.latlng.lat, ev.latlng.lng);
      });

      window.setPin = function (la, lo) {
        try {
          var newLat = parseFloat(la);
          var newLng = parseFloat(lo);
          if (!isFinite(newLat) || !isFinite(newLng)) return;
          marker.setLatLng([newLat, newLng]);
          map.setView([newLat, newLng], map.getZoom());
        } catch (_e) {}
      };
      notify(${lat}, ${lng});
      map.invalidateSize(true);
      setTimeout(function () { map.invalidateSize(true); }, 200);
    } catch (_e2) {}
  }
  window.addEventListener('load', initLeaflet);
  initLeaflet();
})();
</script>
</body>
</html>`;
}
