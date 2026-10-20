/* TeleBlast — core UI kit: icons, formatters, store, components, overlays */
(() => {
  const TB = (window.TB = window.TB || {});

  /* ---------- Lucide icons (ISC) ---------- */
  const P = (d) => d.split('|').map((x) => `<path d="${x}"/>`).join('');
  const I = {
    'layout-dashboard': '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
    send: P('M14.536 21.686a.5.5 0 0 0 .937-.024l6.5-19a.496.496 0 0 0-.635-.635l-19 6.5a.5.5 0 0 0-.024.937l7.93 3.18a2 2 0 0 1 1.112 1.11z|m21.854 2.147-10.94 10.939'),
    smartphone: '<rect width="14" height="20" x="5" y="2" rx="2"/><path d="M12 18h.01"/>',
    megaphone: P('m3 11 18-5v12L3 14v-3z|M11.6 16.8a3 3 0 1 1-5.8-1.6'),
    zap: P('M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'),
    activity: P('M22 12h-2.48a2 2 0 0 0-1.93 1.46l-2.35 8.36a.25.25 0 0 1-.48 0L9.24 2.18a.25.25 0 0 0-.48 0l-2.35 8.36A2 2 0 0 1 4.49 12H2'),
    'bar-chart': P('M3 3v18h18|M18 17V9|M13 17V5|M8 17v-3'),
    wallet: P('M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1|M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'),
    settings: P('M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z') + '<circle cx="12" cy="12" r="3"/>',
    plus: P('M5 12h14|M12 5v14'),
    pause: '<rect x="14" y="4" width="4" height="16" rx="1"/><rect x="6" y="4" width="4" height="16" rx="1"/>',
    play: '<polygon points="6 3 20 12 6 21 6 3"/>',
    stop: '<rect x="5" y="5" width="14" height="14" rx="2"/>',
    'circle-stop': '<circle cx="12" cy="12" r="10"/><rect x="9" y="9" width="6" height="6" rx="1"/>',
    search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
    bell: P('M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9|M10.3 21a1.94 1.94 0 0 0 3.4 0'),
    'chevron-down': P('m6 9 6 6 6-6'),
    'chevron-right': P('m9 18 6-6-6-6'),
    'chevron-left': P('m15 18-6-6 6-6'),
    'chevrons-up-down': P('m7 15 5 5 5-5|m7 9 5-5 5 5'),
    x: P('M18 6 6 18|m6 6 12 12'),
    check: P('M20 6 9 17l-5-5'),
    'check-check': P('M18 6 7 17l-5-5|m22 10-7.5 7.5L13 16'),
    alert: P('m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3|M12 9v4|M12 17h.01'),
    clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
    link: P('M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71|M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'),
    unlink: P('m18.84 12.25 1.72-1.71h-.02a5.004 5.004 0 0 0-.12-7.07 5.006 5.006 0 0 0-6.95 0l-1.72 1.71|m5.17 11.75-1.71 1.71a5.004 5.004 0 0 0 .12 7.07 5.006 5.006 0 0 0 6.95 0l1.71-1.71|M8 2v3|M2 8h3|M16 22v-3|M22 16h-3'),
    refresh: P('M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8|M21 3v5h-5|M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16|M8 16H3v5'),
    trash: P('M3 6h18|M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6|M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2'),
    pencil: P('M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z|m15 5 4 4'),
    eye: P('M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0') + '<circle cx="12" cy="12" r="3"/>',
    more: '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
    download: P('M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4|m7 10 5 5 5-5|M12 15V3'),
    card: '<rect width="20" height="14" x="2" y="5" rx="2"/><path d="M2 10h20"/>',
    shield: P('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z|m9 12 2 2 4-4'),
    user: P('M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2') + '<circle cx="12" cy="7" r="4"/>',
    users: P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M22 21v-2a4 4 0 0 0-3-3.87|M16 3.13a4 4 0 0 1 0 7.75') + '<circle cx="9" cy="7" r="4"/>',
    logout: P('M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4|m16 17 5-5-5-5|M21 12H9'),
    calendar: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
    message: P('M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'),
    hash: P('M4 9h16|M4 15h16|M10 3 8 21|M16 3l-2 18'),
    radio: P('M4.9 19.1C1 15.2 1 8.8 4.9 4.9|M7.8 16.2c-2.3-2.3-2.3-6.1 0-8.5|M16.2 7.8c2.3 2.3 2.3 6.1 0 8.5|M19.1 4.9C23 8.8 23 15.1 19.1 19') + '<circle cx="12" cy="12" r="2"/>',
    copy: '<rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
    info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/>',
    'check-circle': '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
    'x-circle': '<circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/>',
    'trend-up': P('M22 7 13.5 15.5 8.5 10.5 2 17|M16 7h6v6'),
    'trend-down': P('M22 17 13.5 8.5 8.5 13.5 2 7|M16 17h6v-6'),
    crown: P('M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z|M5 21h14'),
    sparkles: P('M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z|M20 3v4|M22 5h-4'),
    'arrow-up-right': P('M7 7h10v10|M7 17 17 7'),
    'arrow-right': P('M5 12h14|m12 5 7 7-7 7'),
    'arrow-left': P('m12 19-7-7 7-7|M19 12H5'),
    globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/>',
    filter: '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    target: '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>',
    loader: P('M21 12a9 9 0 1 1-6.219-8.56'),
    bold: P('M6 12h9a4 4 0 0 1 0 8H7a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h7a4 4 0 0 1 0 8'),
    italic: P('M19 4h-9|M14 20H5|M15 4 9 20'),
    image: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>',
    smile: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><path d="M9 9h.01"/><path d="M15 9h.01"/>',
    gauge: P('m12 14 4-4|M3.34 19a10 10 0 1 1 17.32 0'),
    lock: '<rect width="18" height="11" x="3" y="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
    monitor: '<rect width="20" height="14" x="2" y="3" rx="2"/><path d="M8 21h8"/><path d="M12 17v4"/>',
    mail: '<rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>',
    bot: '<rect width="16" height="12" x="4" y="8" rx="2"/><path d="M12 8V4H8"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/>',
    inbox: P('M22 12h-6l-2 3h-4l-2-3H2|M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'),
    power: P('M12 2v10|M18.4 6.6a9 9 0 1 1-12.77.04'),
    file: P('M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z|M14 2v4a2 2 0 0 0 2 2h4|M10 9H8|M16 13H8|M16 17H8'),
    coins: '<circle cx="8" cy="8" r="6"/><path d="M18.09 10.37A6 6 0 1 1 10.34 18"/><path d="M7 6h1v4"/><path d="m16.71 13.88.7.71-2.82 2.82"/>',
    'heart-pulse': P('M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z|M3.22 12H9.5l.5-1 2 4.5 2-7 1.5 3.5h5.27'),
    'qr-code': '<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>',
    key: P('m15.5 7.5 2.3 2.3a1 1 0 0 0 1.4 0l2.1-2.1a1 1 0 0 0 0-1.4L19 4|m21 2-9.6 9.6') + '<circle cx="7.5" cy="15.5" r="5.5"/>',
    sliders: P('M20 7h-9|M14 17H5') + '<circle cx="17" cy="17" r="3"/><circle cx="7" cy="7" r="3"/>',
    shuffle: P('m18 14 4 4-4 4|m18 2 4 4-4 4|M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22|M2 6h1.972a4 4 0 0 1 3.6 2.2|M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45'),
    receipt: P('M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z|M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8|M12 17.5v-11'),
    moon: P('M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'),
    rocket: P('M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z|m12 15-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.35 22.35 0 0 1-4 2z|M9 12H4s.55-3.03 2-4c1.62-1.08 5 0 5 0|M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5'),
    scan: P('M3 7V5a2 2 0 0 1 2-2h2|M17 3h2a2 2 0 0 1 2 2v2|M21 17v2a2 2 0 0 1-2 2h-2|M7 21H5a2 2 0 0 1-2-2v-2|m16 16-1.9-1.9') + '<circle cx="11" cy="11" r="3"/>',
    'user-plus': P('M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2|M19 8v6|M22 11h-6') + '<circle cx="9" cy="7" r="4"/>',
    reply: P('m9 17-5-5 5-5|M20 18v-2a4 4 0 0 0-4-4H4'),
    'message-circle': P('M7.9 20A9 9 0 1 0 4 16.1L2 22Z'),
    list: P('M3 12h.01|M3 18h.01|M3 6h.01|M8 12h13|M8 18h13|M8 6h13'),
    siren: P('M7 18v-6a5 5 0 1 1 10 0v6|M5 21a1 1 0 0 1-1-1v-1a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1z|M21 12h1|M18.5 4.5 18 5|M2 12h1|M12 2v1|m4.929 4.929.707.707|M12 12v6'),
    workflow: '<rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/>',
    history: P('M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8|M3 3v5h5|M12 7v5l4 2'),
    'arrow-up': P('m5 12 7-7 7 7|M12 19V5'),
    'arrow-down': P('M12 5v14|m19 12-7 7-7-7'),
    'skip-forward': P('M6 4l10 8-10 8z|M18 4v16'),
    server: '<rect width="20" height="8" x="2" y="2" rx="2"/><rect width="20" height="8" x="2" y="14" rx="2"/><path d="M6 6h.01"/><path d="M6 18h.01"/>',
    template: '<rect width="18" height="7" x="3" y="3" rx="1"/><rect width="9" height="7" x="3" y="14" rx="1"/><rect width="5" height="7" x="16" y="14" rx="1"/>',
    'shield-alert': P('M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z|M12 8v4|M12 16h.01'),
    menu: P('M4 12h16|M4 6h16|M4 18h16'),
  };
  TB.icon = (n, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${I[n] || I.info}</svg>`;
  TB.hydrateIcons = (root = document) => root.querySelectorAll('[data-icon]').forEach((el) => {
    if (el.dataset.iconDone) return;
    el.insertAdjacentHTML('afterbegin', TB.icon(el.dataset.icon));
    el.dataset.iconDone = '1';
    if (el.tagName === 'SPAN' && !el.textContent.trim()) el.style.display = 'inline-flex';
  });

  /* ---------- Formatters (id-ID) ---------- */
  const nf = new Intl.NumberFormat('id-ID');
  const cf = new Intl.NumberFormat('id-ID', { notation: 'compact', maximumFractionDigits: 1 });
  TB.esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TB.n = (v) => (v == null || Number.isNaN(+v) ? '—' : nf.format(Math.round(+v)));
  TB.c = (v) => (v == null || Number.isNaN(+v) ? '—' : (Math.abs(v) >= 10000 ? cf.format(v) : nf.format(Math.round(v))));
  TB.pct = (v, d = 1) => (v == null || !Number.isFinite(+v) ? '—' : (v * 100).toLocaleString('id-ID', { minimumFractionDigits: d, maximumFractionDigits: d }) + '%');
  TB.rp = (v) => 'Rp ' + nf.format(Math.round(v || 0));
  const TZ = 'Asia/Jakarta';
  TB.date = (d, o = { day: 'numeric', month: 'short', year: 'numeric' }) => new Date(d).toLocaleDateString('id-ID', { timeZone: TZ, ...o });
  TB.dshort = (d) => new Date(d).toLocaleDateString('id-ID', { timeZone: TZ, day: 'numeric', month: 'short' });
  TB.time = (d, sec) => new Date(d).toLocaleTimeString('id-ID', { timeZone: TZ, hour: '2-digit', minute: '2-digit', ...(sec ? { second: '2-digit' } : {}) }).replace(/\./g, ':');
  TB.dt = (d) => TB.dshort(d) + ', ' + TB.time(d);
  TB.parseDay = (s) => new Date(String(s).slice(0, 10) + 'T00:00:00+07:00');

  /* Demo clock: anchored to the dataset's "now", ticking in real time */
  const ANCHOR = new Date('2026-10-20T14:22:10+07:00').getTime();
  const T0 = Date.now();
  TB.now = () => new Date(ANCHOR + (Date.now() - T0));
  TB.ago = (d) => {
    const s = Math.max(0, (TB.now() - new Date(d)) / 1000);
    if (s < 45) return 'baru saja';
    if (s < 3600) return Math.round(s / 60) + ' mnt lalu';
    if (s < 86400) return Math.round(s / 3600) + ' jam lalu';
    if (s < 86400 * 7) return Math.round(s / 86400) + ' hari lalu';
    return TB.dshort(d);
  };
  TB.dur = (s) => {
    s = Math.max(0, Math.round(s));
    const m = Math.floor(s / 60), r = s % 60;
    return m >= 60 ? `${Math.floor(m / 60)}j ${m % 60}m` : `${String(m).padStart(2, '0')}:${String(r).padStart(2, '0')}`;
  };
  TB.initials = (s) => String(s || '?').replace(/[^\p{L}\p{N} ]/gu, ' ').trim().split(/\s+/).slice(0, 2).map((w) => w[0]).join('').toUpperCase() || '?';
  const GRADS = [['#37BBFE', '#1E88D6'], ['#8B7CF7', '#5B4FE0'], ['#34D399', '#059669'], ['#FBBF24', '#F97316'], ['#F472B6', '#DB2777'], ['#60A5FA', '#4F46E5'], ['#2DD4BF', '#0E7490']];
  TB.grad = (key) => {
    let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const g = GRADS[h % GRADS.length];
    return `linear-gradient(140deg, ${g[0]}, ${g[1]})`;
  };

  TB.calc = (id) => { const d = dash.data(id); return d && Array.isArray(d.data) ? d.data : []; };

  /* ---------- Status vocab ---------- */
  TB.CS = {
    running: { l: 'Berjalan', c: 'ok live' },
    paused: { l: 'Dijeda', c: 'warn' },
    scheduled: { l: 'Terjadwal', c: 'info' },
    completed: { l: 'Selesai', c: 'violet' },
    stopped: { l: 'Dihentikan', c: 'bad' },
    draft: { l: 'Draft', c: '' },
    failed: { l: 'Gagal', c: 'bad' },
  };
  TB.LS = {
    detected: { l: 'Detected', c: 'info' },
    pending: { l: 'Pending', c: 'warn' },
    joined: { l: 'Joined', c: 'ok' },
    skipped: { l: 'Skipped', c: '' },
    failed: { l: 'Failed', c: 'bad' },
    approval: { l: 'Menunggu persetujuan', c: 'violet' },
    joining: { l: 'Memproses', c: 'info live' },
  };
  TB.LK = { public: { l: 'Publik', c: 'info' }, invite: { l: 'Undangan privat', c: 'violet' }, invalid: { l: 'Tidak valid', c: 'bad' } };
  TB.RS = { replied: { l: 'Dibalas', c: 'ok' }, failed: { l: 'Gagal', c: 'bad' }, skipped: { l: 'Dilewati', c: '' }, resolved: { l: 'Diselesaikan', c: 'info' } };
  TB.RT = { welcome: { l: 'Sambutan', c: 'info' }, keyword: { l: 'Kata kunci', c: 'violet' }, faq: { l: 'FAQ', c: 'ok' }, fallback: { l: 'Fallback', c: 'warn' } };
  TB.KIND = { broadcast: ['Broadcast', 'send'], join: ['Auto-Join', 'user-plus'], detect: ['Auto-Detect', 'scan'], reply: ['Auto-Reply', 'reply'], system: ['Sistem', 'server'] };
  TB.AS = {
    connected: { l: 'Terhubung', c: 'ok' },
    flood_wait: { l: 'FloodWait', c: 'warn' },
    disconnected: { l: 'Terputus', c: 'bad' },
    connecting: { l: 'Menghubungkan', c: 'info' },
  };
  TB.TS = {
    active: { l: 'Aktif', c: 'ok' },
    slow_mode: { l: 'Slow mode', c: 'warn' },
    restricted: { l: 'Dibatasi', c: 'warn' },
    banned: { l: 'Diblokir', c: 'bad' },
  };
  TB.badge = (vocab, key, extra = '') => {
    const v = vocab[key] || { l: key, c: '' };
    return `<span class="tb-badge ${v.c} ${extra}">${TB.esc(v.l)}</span>`;
  };
  TB.delta = (cur, prev, { goodUp = true, pts = false } = {}) => {
    if (prev == null || cur == null || (!pts && !prev)) return '<span class="tb-delta flat">—</span>';
    const d = pts ? (cur - prev) * 100 : (cur - prev) / prev;
    const up = d > 0.0005, down = d < -0.0005;
    const good = up ? goodUp : down ? !goodUp : null;
    const cls = good == null ? 'flat' : good ? 'up' : 'down';
    const txt = pts ? (d > 0 ? '+' : '') + d.toLocaleString('id-ID', { maximumFractionDigits: 1 }) + ' poin' : (d > 0 ? '+' : '') + TB.pct(d);
    return `<span class="tb-delta ${cls}">${TB.icon(up ? 'trend-up' : down ? 'trend-down' : 'arrow-right')}${txt}</span>`;
  };
  TB.empty = (icon, title, text, action = '') => `<div class="tb-empty"><div class="e-ill">${TB.icon(icon)}</div><h4>${TB.esc(title)}</h4><p>${TB.esc(text)}</p>${action}</div>`;
  TB.prog = (v, cls = '') => `<div class="tb-prog ${cls}"><i style="width:${Math.max(0, Math.min(100, v * 100)).toFixed(1)}%"></i></div>`;
  TB.sw = (name, on, attrs = '') => `<label class="tb-switch"><input type="checkbox" name="${name}" ${on ? 'checked' : ''} ${attrs}><span></span></label>`;

  /* ---------- Store & bindings ---------- */
  const listeners = new Set();
  TB.on = (fn) => listeners.add(fn);
  TB.emit = (what) => listeners.forEach((fn) => fn(what));
  TB.binds = {};
  TB.bind = (name, fn) => (TB.binds[name] = fn);
  TB.refreshBinds = (root = document) => {
    root.querySelectorAll('[data-bind]').forEach((el) => {
      const [name, arg] = el.dataset.bind.split(':');
      const fn = TB.binds[name];
      if (!fn) return;
      const v = fn(arg, el);
      if (v === undefined) return;
      const s = String(v);
      if (el.textContent !== s) {
        el.textContent = s;
        if (el.dataset.flash != null) { el.classList.remove('tb-flash'); void el.offsetWidth; el.classList.add('tb-flash'); }
      }
    });
  };

  /* ---------- Toasts ---------- */
  const toastHost = () => {
    const h = document.getElementById('tb-toasts');
    try { if (!h.matches(':popover-open')) h.showPopover(); } catch (e) { /* popover unsupported */ }
    return h;
  };
  TB.toast = (title, sub = '', kind = 'ok', action) => {
    const h = toastHost();
    const el = document.createElement('div');
    el.className = `tb-toast ${kind}`;
    el.setAttribute('role', 'status');
    const ic = { ok: 'check-circle', warn: 'alert', bad: 'x-circle', info: 'info' }[kind] || 'info';
    el.innerHTML = `${TB.icon(ic)}<div><div class="tt">${TB.esc(title)}</div>${sub ? `<div class="ts">${TB.esc(sub)}</div>` : ''}</div>${action ? `<button>${TB.esc(action.label)}</button>` : ''}`;
    if (action) el.querySelector('button').addEventListener('click', () => { action.fn(); close(); });
    h.appendChild(el);
    while (h.children.length > 4) h.firstElementChild.remove();
    let t;
    const close = () => { clearTimeout(t); el.classList.add('out'); setTimeout(() => el.remove(), 260); };
    t = setTimeout(close, action ? 6000 : 3800);
  };

  /* ---------- Dialog ---------- */
  const dlg = () => document.getElementById('tb-dlg');
  TB.modal = ({ icon = 'info', tone = '', title, sub = '', body = '', foot = '', wide = false, onMount, onClose } = {}) => {
    const d = dlg();
    d.classList.toggle('wide', !!wide);
    d.innerHTML = `<div class="tb-dlg-box">
      <div class="tb-dlg-h">${icon ? `<div class="d-ico ${tone}">${TB.icon(icon)}</div>` : ''}<div style="min-width:0"><h2>${TB.esc(title)}</h2>${sub ? `<p>${sub}</p>` : ''}</div>
      <button class="tb-btn ghost sm icon x" data-close aria-label="Tutup">${TB.icon('x')}</button></div>
      <div class="tb-dlg-b">${body}</div>${foot ? `<div class="tb-dlg-f">${foot}</div>` : ''}</div>`;
    d.onclick = (e) => { if (e.target === d || e.target.closest('[data-close]')) TB.closeModal(); };
    d.onclose = () => { onClose && onClose(); };
    TB.hydrateIcons(d);
    if (!d.open) { try { d.showModal(); } catch (e) { d.setAttribute('open', ''); } }
    onMount && onMount(d.querySelector('.tb-dlg-box'));
    return d.querySelector('.tb-dlg-box');
  };
  TB.closeModal = () => { const d = dlg(); if (d.open) d.close(); };
  TB.confirm = ({ title, text, confirm = 'Lanjutkan', tone = 'bad', icon = 'alert', onYes }) => {
    TB.modal({
      icon, tone, title, sub: TB.esc(text),
      foot: `<button class="tb-btn" data-close>Batal</button><button class="tb-btn ${tone === 'bad' ? 'danger-solid' : 'primary'}" data-yes>${TB.esc(confirm)}</button>`,
      onMount: (box) => {
        const y = box.querySelector('[data-yes]');
        y.focus();
        y.addEventListener('click', () => { TB.closeModal(); onYes && onYes(); });
      },
    });
  };

  /* ---------- Popover menu (top layer) ---------- */
  const pop = () => document.getElementById('tb-pop');
  let popAnchor = null;
  TB.menu = (anchor, html, onClick, { align = 'end', width } = {}) => {
    const p = pop();
    if (popAnchor === anchor && p.matches(':popover-open')) { p.hidePopover(); popAnchor = null; return; }
    p.innerHTML = html;
    p.style.minWidth = width ? width + 'px' : '';
    p.onclick = (e) => {
      const it = e.target.closest('[data-m]');
      if (!it || it.disabled) return;
      const keep = onClick && onClick(it.dataset.m, it);
      if (keep !== true) p.hidePopover();
    };
    try { p.showPopover(); } catch (e) { return; }
    popAnchor = anchor;
    const r = anchor.getBoundingClientRect();
    const pw = p.offsetWidth, ph = p.offsetHeight;
    let left = align === 'end' ? r.right - pw : r.left;
    left = Math.max(8, Math.min(left, window.innerWidth - pw - 8));
    let top = r.bottom + 6;
    if (top + ph > window.innerHeight - 8) top = Math.max(8, r.top - ph - 6);
    p.style.left = left + 'px';
    p.style.top = top + 'px';
    p.addEventListener('toggle', (e) => { if (e.newState === 'closed') popAnchor = null; }, { once: true });
  };
  TB.closeMenu = () => { try { pop().hidePopover(); } catch (e) { /* noop */ } };
  TB.mi = (key, icon, label, { danger, disabled } = {}) => `<button class="m-item${danger ? ' danger' : ''}" data-m="${key}" ${disabled ? 'disabled' : ''}>${TB.icon(icon)}<span>${TB.esc(label)}</span></button>`;

  /* ---------- Button loading helper ---------- */
  TB.busy = (btn, ms, done, label) => {
    if (!btn) return setTimeout(done, ms);
    const html = btn.innerHTML;
    btn.classList.add('is-loading');
    btn.innerHTML = TB.icon('loader') + (label ? `<span>${TB.esc(label)}</span>` : '');
    setTimeout(() => { if (btn.isConnected) { btn.classList.remove('is-loading'); btn.innerHTML = html; } done(); }, ms);
  };
})();
