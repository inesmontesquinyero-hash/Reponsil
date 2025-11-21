const defaultZones = [
  'UTC',
  Intl.DateTimeFormat().resolvedOptions().timeZone, // local
  'Europe/Madrid',
  'America/New_York',
  'America/Los_Angeles',
  'Europe/London',
  'Asia/Tokyo',
  'Asia/Kolkata',
  'Australia/Sydney',
  'America/Sao_Paulo',
  'Africa/Johannesburg'
];

// Try to get a canonical list from Intl (if available) or use a curated list.
const commonZones = [
  ...new Set([...defaultZones].filter(Boolean))
];

const tzInput = document.getElementById('tz-input');
const tzList = document.getElementById('tz-list');
const addBtn = document.getElementById('add-btn');
const clocksContainer = document.getElementById('clocks');
const showDateCheckbox = document.getElementById('show-date');
const hour12Checkbox = document.getElementById('hour12');
const resetBtn = document.getElementById('reset-defaults');

let zones = loadZones();
rendertDatalist();
rendertAllClocks();

// Update every second
let timer = setInterval(updateAllClocks, 1000);

addBtn.addEventListener('click', () => {
  const tz = tzInput.value.trim();
  if (!tz) return;
  addZone(tz);
  tzInput.value = '';
});

tzInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    addBtn.click();
  }
});

showDateCheckbox.addEventListener('change', () => {
  saveSettings();
  updateAllClocks();
});
hour12Checkbox.addEventListener('change', () => {
  saveSettings();
  updateAllClocks();
});

resetBtn.addEventListener('click', () => {
  zones = [...defaultZones];
  saveZones();
  renderAllClocks(true);
});

// Functions

function renderDatalist() {
  // populate datalist with common zones
  tzList.innerHTML = '';
  const curated = [
    'UTC','Europe/Madrid','Europe/London','America/New_York','America/Los_Angeles',
    'America/Sao_Paulo','Asia/Tokyo','Asia/Hong_Kong','Asia/Kolkata','Australia/Sydney',
    'Africa/Johannesburg','Pacific/Auckland'
  ];
  curated.forEach(z => {
    const opt = document.createElement('option');
    opt.value = z;
    tzList.appendChild(opt);
  });
}

function loadZones(){
  try {
    const raw = localStorage.getItem('tz-clocks-zones');
    if (raw) return JSON.parse(raw);
  } catch(e){}
  return [...defaultZones];
}

function saveZones(){
  try {
    localStorage.setItem('tz-clocks-zones', JSON.stringify(zones));
  } catch(e){}
}

function saveSettings(){
  try {
    localStorage.setItem('tz-clocks-settings', JSON.stringify({
      showDate: showDateCheckbox.checked,
      hour12: hour12Checkbox.checked
    }));
  } catch(e){}
}

function loadSettings(){
  try {
    const raw = localStorage.getItem('tz-clocks-settings');
    if (!raw) return;
    const s = JSON.parse(raw);
    showDateCheckbox.checked = !!s.showDate;
    hour12Checkbox.checked = !!s.hour12;
  } catch(e){}
}
loadSettings();

function renderAllClocks(forceClean=false){
  if (forceClean) clocksContainer.innerHTML = '';
  // ensure uniqueness
  zones = [...new Set(zones)];
  saveZones();
  clocksContainer.innerHTML = '';
  zones.forEach(z => {
    createClockCard(z);
  });
  updateAllClocks();
}

function createClockCard(tz){
  const card = document.createElement('article');
  card.className = 'clock-card';
  card.dataset.timezone = tz;

  const head = document.createElement('div');
  head.className = 'clock-head';

  const name = document.createElement('div');
  name.className = 'tz-name';
  name.textContent = tz;

  const remove = document.createElement('button');
  remove.className = 'remove-btn';
  remove.textContent = 'Eliminar';
  remove.title = `Eliminar ${tz}`;
  remove.addEventListener('click', () => {
    zones = zones.filter(x => x !== tz);
    saveZones();
    card.remove();
  });

  head.appendChild(name);
  head.appendChild(remove);

  const timeEl = document.createElement('div');
  timeEl.className = 'time';
  timeEl.textContent = '--:--:--';

  const dateEl = document.createElement('div');
  dateEl.className = 'date';
  dateEl.textContent = '';

  const meta = document.createElement('div');
  meta.className = 'small';
  meta.textContent = '';

  card.appendChild(head);
  card.appendChild(timeEl);
  card.appendChild(dateEl);
  card.appendChild(meta);

  clocksContainer.appendChild(card);
}

function updateAllClocks(){
  const cards = [...document.querySelectorAll('.clock-card')];
  const now = new Date();
  cards.forEach(card => {
    const tz = card.dataset.timezone || 'UTC';
    const timeEl = card.querySelector('.time');
    const dateEl = card.querySelector('.date');
    const meta = card.querySelector('.small');

    // Time format
    const hour12 = !!hour12Checkbox.checked;
    const showDate = !!showDateCheckbox.checked;

    const timeOptions = {
      hour: '2-digit', minute: '2-digit', second: '2-digit',
      hour12,
      timeZone: tz
    };

    const dateOptions = {
      weekday: 'short', year: 'numeric', month: 'short', day: '2-digit',
      timeZone: tz
    };

    // Format time and date using Intl
    try {
      const timeFormatter = new Intl.DateTimeFormat(undefined, timeOptions);
      const dateFormatter = new Intl.DateTimeFormat(undefined, dateOptions);

      timeEl.textContent = timeFormatter.format(now);
      dateEl.textContent = showDate ? dateFormatter.format(now) : '';

      // Get timezone short name / offset text
      const tzName = getTimeZoneShortName(now, tz);
      meta.textContent = tzName;
    } catch (err) {
      // If timezone invalid, indicate error
      timeEl.textContent = 'Zona inválida';
      dateEl.textContent = '';
      meta.textContent = `${tz} • ${err.message}`;
    }
  });
}

function getTimeZoneShortName(date, timeZone) {
  // Use formatToParts to extract timeZoneName (like GMT+1 or CEST)
  try {
    const f = new Intl.DateTimeFormat(undefined, {
      timeZone,
      timeZoneName: 'short'
    });
    const parts = f.formatToParts(date);
    const tzPart = parts.find(p => p.type === 'timeZoneName');
    if (tzPart) return tzPart.value;
    return '';
  } catch (e) {
    return '';
  }
}

function addZone(tz) {
  // Validate by trying to format with Intl
  try {
    // Try to format now with that timezone; will throw if invalid
    new Intl.DateTimeFormat(undefined, { timeZone: tz }).format();
  } catch (e) {
    alert('Zona horaria inválida. Usa un identificador IANA, p. ej. "Europe/Madrid" o "America/New_York".');
    return;
  }
  if (zones.includes(tz)) {
    // bring it to front
    zones = [tz, ...zones.filter(z => z !== tz)];
  } else {
    zones.unshift(tz);
  }
  saveZones();
  renderAllClocks(true);
}

// initialize if no clocks present
if (clocksContainer.children.length === 0) {
  renderAllClocks();
}