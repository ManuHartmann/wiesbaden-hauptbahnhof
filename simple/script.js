const tage = ['Sonntag', 'Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag'];

function tick() {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  const s = String(d.getSeconds()).padStart(2, '0');
  document.getElementById('uhr').textContent = h + ':' + m + ':' + s;
  document.getElementById('datum').textContent = tage[d.getDay()] + ', ' + d.toLocaleDateString('de-DE');
}
tick();
setInterval(tick, 1000);

// ── Leaflet Karte ─────────────────────────────────────────────
const map = L.map('map', { zoomControl: true }).setView([50.0708, 8.2439], 15);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: '© <a href="https://www.openstreetmap.org/">OpenStreetMap</a>',
  maxZoom: 19
}).addTo(map);

L.marker([50.0708, 8.2439])
  .addTo(map)
  .bindPopup('Wiesbaden Hauptbahnhof');
