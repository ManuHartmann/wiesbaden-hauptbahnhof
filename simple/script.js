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
