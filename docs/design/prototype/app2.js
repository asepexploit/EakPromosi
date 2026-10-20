/* TeleBlast — app shell: calcs, state, actions, live engines, navigation */
dash.calc('kpi', {
  title: 'Headline 7 hari',
  description: 'Totals for the last 7 complete days vs the 7 days before, with success rate (delivered ÷ sent) and CTR (clicks ÷ delivered).',
  inputs: ['daily'],
  fn: (daily) => {
    const rows = daily.slice().sort((a, b) => (a.day < b.day ? -1 : 1));
    const cur = rows.slice(-8, -1), prev = rows.slice(-15, -8);
    const s = (a, k) => a.reduce((t, r) => t + Number(r[k] || 0), 0);
    return [{
      sent_7d: s(cur, 'sent'), sent_prev: s(prev, 'sent'),
      delivered_7d: s(cur, 'delivered'),
      rate_7d: s(cur, 'delivered') / s(cur, 'sent'), rate_prev: s(prev, 'delivered') / s(prev, 'sent'),
      clicks_7d: s(cur, 'clicks'), clicks_prev: s(prev, 'clicks'),
      ctr_7d: s(cur, 'clicks') / s(cur, 'delivered'),
    }];
  },
});
dash.calc('campaign_perf', {
  title: 'Rasio per campaign',
  description: 'Per campaign: success rate (delivered ÷ sent) and CTR (clicks ÷ delivered).',
  inputs: ['campaigns'],
  fn: (campaigns) => campaigns.map((c) => ({ id: c.id, success_rate: c.sent ? c.delivered / c.sent : null, ctr: c.delivered ? c.clicks / c.delivered : null })),
});

(() => {
  const TB = window.TB;
  const { esc, icon, n } = TB;
  const IDS = ['profile', 'tg_accounts', 'campaigns', 'targets', 'daily', 'campaign_daily', 'hourly', 'activity', 'failure_reasons', 'payments', 'payment_events', 'subscription_events', 'plans', 'notifications', 'sessions', 'link_sources', 'detected_links', 'autoreply_rules', 'autoreply_log', 'account_daily', 'monthly', 'templates', 'campaign_history'];
  const clone = (x) => JSON.parse(JSON.stringify(x));
  const rand = (a, b) => a + Math.random() * (b - a);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  let S = null;
  const liveSends = [];
  const T0 = Date.now();
  const SPEED = 30; // demo: 1 real second = 30 demo seconds for auto-join pacing
  const JOIN_WIN = 3600000 / SPEED;
  const ME = 'Rizky Pratama';

  TB.hydrateIcons(document.getElementById('tb-app'));

  /* ---------- State ---------- */
  const init = () => {
    const D = (id) => clone(dash.data(id).data);
    S = TB.S = {
      profile: D('profile')[0], accounts: D('tg_accounts'), campaigns: D('campaigns'), targets: D('targets'),
      daily: D('daily').sort((a, b) => (a.day < b.day ? -1 : 1)).map((d) => ({ ...d, sent: +d.sent, delivered: +d.delivered, failed: +d.failed, clicks: +d.clicks })),
      cdaily: D('campaign_daily'), hourly: D('hourly'), activity: D('activity'), fails: D('failure_reasons'),
      plans: D('plans'), payments: D('payments'), payEvents: D('payment_events'), subEvents: D('subscription_events'), notifs: D('notifications'), sessions: D('sessions'),
      sources: D('link_sources'), links: D('detected_links'), rules: D('autoreply_rules'), rlog: D('autoreply_log'),
      adaily: D('account_daily').map((d) => ({ ...d, sent: +d.sent, delivered: +d.delivered, links: +d.links, joins_ok: +d.joins_ok, joins_failed: +d.joins_failed, replies: +d.replies, replies_failed: +d.replies_failed })),
      monthly: D('monthly'), templates: D('templates'), history: D('campaign_history'),
      engine: 'on', seq: 0, emergency: false, detectOn: true,
      join: { state: 'running', nextAt: Date.now() + 6000, gap: 6000, current: null, doneAt: 0, times: [], rr: 0 },
      reply: { on: true, nextAt: Date.now() + rand(5000, 9000) },
      detectNext: Date.now() + rand(7000, 12000),
      prefs: { skip_slow: true, quiet: false, autoQueue: true, replyDays: [0, 1, 2, 3, 4, 5, 6], fallbackOn: true, notif: { campaign_done: { email: true, bot: true, app: true }, flood: { email: false, bot: true, app: true }, disconnect: { email: true, bot: true, app: true }, expiry: { email: true, bot: true, app: true }, daily: { email: true, bot: false, app: false }, billing: { email: true, bot: false, app: true } } },
      ui: { page: 'overview', planCycle: 'monthly', payStatus: 'all', payQ: '', subPreview: 'active', ovRange: 14, campFilter: 'all', campQ: '', campSort: 'recent', logLevel: 'all', logKind: 'all', logAcc: 'all', logCamp: 'all', logTime: 'all', logPaused: false, repRange: 30, repFrom: '', repTo: '', repAcc: 'all', repGran: 'daily', repTq: '', repSort: ['sent_30d', 'desc'], txType: 'all', txQ: '', setTab: 'profile', autoRenew: true, draft: null, promoTab: 'builder', linkStatus: 'all', linkKind: 'all', linkSrc: 'all', linkQ: '', linkSel: new Set(), joinQ: 'group', joinHist: 'all', replyTab: 'rules', replyAcc: 'all' },
    };
    S.profile0 = clone(S.profile);
    S.lastEff = null;
    S.activity.forEach((e) => { e.kind = e.kind || 'broadcast'; });
    S.activity.sort((a, b) => (a.ts < b.ts ? 1 : -1)).forEach((e, i, arr) => (e.seq = arr.length - i));
    S.seq = S.activity.length;
    S.campaigns.forEach((c, i) => { c.idx = i; c.cursor = Math.floor(rand(0, c.targets || 1)); c.gap = rand(2000, 7000); c.nextAt = Date.now() + c.gap; });
    S.accounts.forEach((a) => { if (a.status === 'flood_wait') a.floodUntil = Date.now() + 95000; });
    const nowMs = TB.now().getTime();
    S.links.filter((l) => l.status === 'joined' && l.processed_at && nowMs - new Date(l.processed_at) < 3600000).forEach((l) => S.join.times.push(Date.now() - ((nowMs - new Date(l.processed_at)) / 3600000) * JOIN_WIN));
    document.getElementById('tb-loading').hidden = true;
    const h = location.hash.slice(1);
    TB.go(TB.pages[h] ? h : 'overview', { first: true });
    setInterval(tick, 1000);
  };

  TB.targetsFor = (c) => {
    if (c.targetIds) return c.targetIds.map((id) => S.targets.find((t) => t.id === id)).filter(Boolean);
    const pool = S.targets.filter((t) => t.status !== 'banned' && t.allows_promo !== false);
    const out = [];
    for (let k = 0; k < Math.min(c.targets, pool.length); k++) out.push(pool[(k + (c.idx || 0) * 5) % pool.length]);
    return out;
  };
  TB.queue = () => TB.running().filter((c) => !TB.blocked(c)).reduce((a, c) => a + (c.targets - (c.cursor % Math.max(1, c.targets))), 0);
  TB.throughput = () => {
    const now = Date.now(), el = Math.min(60, (now - T0) / 1000);
    const w = liveSends.filter((t) => t > now - 60000).length;
    if (el < 20 || !w) {
      const hr = +TB.time(TB.now()).slice(0, 2), mins = Math.max(1, +TB.time(TB.now()).slice(3, 5));
      const row = S.hourly.find((h) => h.hour === hr);
      return S.engine === 'paused' || !TB.running().length ? 0 : Math.round(((row && row.sent) || 0) / mins) || 1;
    }
    return Math.round((w * 60) / el);
  };
  TB.joinsToday = () => S.adaily.filter((d) => d.day === TB.dayKey(0)).reduce((a, d) => a + (+d.joins_ok || 0), 0);
  TB.joinsThisHour = () => S.join.times.filter((t) => t > Date.now() - JOIN_WIN).length;
  TB.joinWindowFree = () => { const w = S.join.times.filter((t) => t > Date.now() - JOIN_WIN).sort(); return (w[0] || Date.now()) + JOIN_WIN; };
  const adToday = () => { const k = TB.dayKey(0); return (aid) => S.adaily.find((d) => d.day === k && d.account_id === aid) || (() => { const r = { day: k, account_id: aid, sent: 0, delivered: 0, links: 0, joins_ok: 0, joins_failed: 0, replies: 0, replies_failed: 0 }; S.adaily.push(r); return r; })(); };

  const log = (level, c, target, event, account, kind = 'broadcast') => {
    S.activity.unshift({ seq: ++S.seq, ts: TB.now().toISOString(), level, kind, campaign_id: c ? c.id : '', campaign: c ? c.name : ({ join: 'Auto-Join', detect: 'Auto-Detect', reply: 'Auto-Reply' }[kind] || 'Sistem'), account: account || (c ? TB.accLabel(c.account_id) : '—'), target: target || '—', event });
    if (S.activity.length > 500) S.activity.length = 500;
  };
  TB.log = log;
  const notify = (kind, title, body) => S.notifs.unshift({ id: 'n' + Date.now() + Math.random().toString(36).slice(2, 5), ts: TB.now().toISOString(), kind, title, body, read: false });
  TB.hist = (cid, change, actor = ME) => S.history.unshift({ id: 'h' + Date.now() + Math.random().toString(36).slice(2, 5), campaign_id: cid, ts: TB.now().toISOString(), actor, change });

  /* ---------- Engine: broadcast ---------- */
  const send = (c) => {
    const list = TB.targetsFor(c);
    if (!list.length) return null;
    const t = list[c.cursor++ % list.length];
    const a = TB.acc(c.account_id);
    const hr = +TB.time(TB.now()).slice(0, 2);
    const h = S.hourly.find((x) => x.hour === hr);
    const d = S.daily[S.daily.length - 1];
    const ad = adToday()(a.id);
    const r = Math.random();
    const okP = Math.min(0.95, t.success_rate || 0.9);
    c.lastTarget = t.title;
    if (r < okP) {
      c.sent++; c.delivered++; a.sent_today++; ad.sent++; ad.delivered++;
      if (h) { h.sent = (h.sent || 0) + 1; h.delivered = (h.delivered || 0) + 1; }
      d.sent++; d.delivered++;
      if (Math.random() < 0.19) { c.clicks++; d.clicks++; }
      log('success', c, t.title, 'Pesan terkirim');
      liveSends.push(Date.now());
    } else if (r < okP + 0.035 || t.slow_mode_s) {
      log('warning', c, t.title, t.slow_mode_s ? `Slow mode ${t.slow_mode_s} dtk — dijadwalkan ulang` : 'Grup sibuk — dicoba lagi putaran berikutnya');
    } else {
      c.sent++; c.failed++; a.sent_today++; ad.sent++;
      if (h) h.sent = (h.sent || 0) + 1;
      d.sent++; d.failed++;
      log('error', c, t.title, Math.random() < 0.5 ? 'Gagal: grup membatasi tautan' : 'Gagal: akun dibatasi admin grup');
      liveSends.push(Date.now());
    }
    if (c.cursor % list.length === 0) log('info', c, `${list.length} target`, `Putaran selesai — putaran berikutnya dalam ${c.interval_min} mnt`);
    if (c.sent >= c.planned && c.planned) {
      c.status = 'completed';
      log('info', c, '—', 'Campaign selesai — target pengiriman tercapai');
      TB.hist(c.id, `Campaign selesai — ${n(c.sent)} pesan terkirim`, 'Sistem');
      notify('success', `${c.name} selesai`, `${n(c.sent)} pesan terkirim.`);
      TB.toast('Campaign selesai', c.name, 'ok');
      return 'change';
    }
    if (a.health < 92 && Math.random() < 0.0015) {
      a.status = 'flood_wait'; a.floodUntil = Date.now() + 60000;
      log('warning', c, t.title, 'FloodWait 60 dtk — akun diistirahatkan otomatis');
      notify('warning', `Akun @${a.username} dibatasi sementara`, 'Pengiriman dijeda otomatis selama 1 menit (FloodWait).');
      TB.toast('Pembatasan akun terdeteksi', `@${a.username} diistirahatkan 60 detik secara otomatis`, 'warn');
      return 'change';
    }
    return null;
  };

  /* ---------- Engine: auto-detect ---------- */
  const NAMES = ['Komunitas Kopi Bandung', 'Reseller Snack Nusantara', 'UMKM Jateng Bersatu', 'Grup Seller Pemula', 'Info Bisnis Kuliner', 'Pasar Online Bekasi', 'Coffee Lovers Surabaya', 'Grup Dropship Murah', 'Kanal Promo Harian', 'Forum Usaha Rumahan', 'Barista Komunitas Jakarta', 'Jual Beli Tangerang', 'Pebisnis Online Medan', 'Komunitas Kafe Bali', 'Kanal Info Grosir', 'Seller Kopi Lokal', 'Grup Agen Kopi', 'Kuliner Hits Jogja', 'Peluang Usaha 2026', 'Kanal Diskon Kopi', 'Komunitas Wirausaha Muda', 'Info UMKM Semarang', 'Reseller Produk Lokal', 'Grup Promo Malang'];
  const slug = (s) => s.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '').slice(0, 22);
  const code = () => Array.from({ length: 16 }, () => pick('ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789_-')).join('');
  TB.evalCriteria = (l) => {
    const p = S.profile;
    if (l.kind === 'invalid') return 'Tautan tidak valid';
    if (l.kind === 'public' && !p.join_public) return 'Tautan publik dinonaktifkan di kriteria';
    if (l.kind === 'invite' && !p.join_invite) return 'Undangan privat dinonaktifkan di kriteria';
    const bl = String(p.join_blocklist || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (bl.some((w) => l.title.toLowerCase().includes(w))) return 'Mengandung kata kunci diblokir';
    if (l.members != null && l.members < p.join_min_members) return `Tidak sesuai kriteria (anggota < ${n(p.join_min_members)})`;
    return null;
  };
  const detectOne = (forceNew) => {
    const srcs = S.sources.filter((s) => s.active && (() => { const a = TB.acc(s.account_id); return a && a.status === 'connected' && a.enabled; })());
    if (!srcs.length) return null;
    const s = pick(srcs);
    s.last_scan = TB.now().toISOString();
    const existing = S.links.filter((l) => l.kind !== 'invalid');
    if (!forceNew && Math.random() < 0.28 && existing.length) {
      const l = pick(existing); l.seen++;
      log('info', null, l.url, `Duplikat diabaikan: ${l.url} (terlihat ${l.seen}×)`, '@' + TB.acc(s.account_id).username, 'detect');
      return 'dup';
    }
    const used = new Set(S.links.map((l) => l.title));
    const nm = NAMES.find((x) => !used.has(x)) || `Grup Bisnis ${Math.floor(rand(100, 999))}`;
    const r = Math.random();
    const kind = r < 0.06 ? 'invalid' : r < 0.7 ? 'public' : 'invite';
    const url = kind === 'invalid' ? pick(['t.me/', 't.me/+', 'telegram.me/x']) : kind === 'public' ? pick(['t.me/', 't.me/', 'telegram.me/']) + slug(nm) : pick(['t.me/+', 't.me/+', 't.me/joinchat/']) + code();
    if (S.links.some((l) => l.url === url)) return null;
    const entity = kind === 'invalid' ? 'unknown' : Math.random() < 0.75 ? 'group' : 'channel';
    const l = { id: 'L' + Date.now().toString(36), url, kind, entity, title: kind === 'invalid' ? '—' : kind === 'invite' ? 'Undangan privat · ' + nm : nm, members: kind === 'invalid' ? null : pick([Math.round(rand(200, 4000)), Math.round(rand(4000, 30000)), Math.round(rand(30000, 90000))]), source_id: s.id, source: s.name, account_id: s.account_id, found_at: TB.now().toISOString(), seen: 1, status: 'detected', reason: '' };
    if (S.prefs.autoQueue) { const why = TB.evalCriteria(l); if (why) { l.status = 'skipped'; l.reason = why; l.processed_at = l.found_at; } else l.status = 'pending'; }
    else if (kind === 'invalid') { l.status = 'skipped'; l.reason = 'Tautan tidak valid'; }
    S.links.unshift(l);
    s.links_found++;
    adToday()(s.account_id).links++;
    log(kind === 'invalid' ? 'warning' : 'info', null, s.name, `Link baru terdeteksi: ${url}${l.status === 'pending' ? ' → antrean join' : l.status === 'skipped' ? ` → dilewati (${l.reason})` : ''}`, '@' + TB.acc(s.account_id).username, 'detect');
    return 'new';
  };

  /* ---------- Engine: auto-join ---------- */
  const joinAccounts = () => S.accounts.filter((a) => a.roles.includes('join') && a.enabled && a.status === 'connected');
  const finishJoin = () => {
    const l = S.links.find((x) => x.id === S.join.current);
    S.join.current = null;
    if (!l || l.status !== 'pending') return;
    const accs = joinAccounts();
    const a = accs[S.join.rr++ % Math.max(1, accs.length)] || TB.acc(l.account_id);
    l.account_id = a ? a.id : l.account_id;
    l.processed_at = TB.now().toISOString();
    const ad = adToday()(l.account_id);
    const why = TB.evalCriteria(l);
    const r = Math.random();
    if (why) { l.status = 'skipped'; l.reason = why; }
    else if (S.profile.join_skip_member && r < 0.06) { l.status = 'skipped'; l.reason = 'Sudah menjadi anggota'; }
    else if (l.kind === 'invite' && r < 0.24) { l.status = 'approval'; l.reason = 'Permintaan join terkirim, menunggu persetujuan admin'; }
    else if (l.kind === 'invite' && r < 0.36) { l.status = 'failed'; l.reason = 'Tautan undangan kedaluwarsa'; ad.joins_failed++; }
    else if (r < 0.43) { l.status = 'failed'; l.reason = pick(['Grup sudah penuh (200.000 anggota)', 'Channel privat — tautan dicabut']); ad.joins_failed++; }
    else {
      l.status = 'joined'; l.reason = '';
      if (l.title.startsWith('Undangan privat · ')) l.title = l.title.replace('Undangan privat · ', '');
      ad.joins_ok++;
      S.join.times.push(Date.now());
      if (a) a.groups_joined++;
      if (l.entity !== 'unknown' && !S.targets.some((t) => t.title === l.title)) S.targets.push({ id: 't' + Date.now().toString(36), title: l.title, username: slug(l.title), type: l.entity, members: l.members || 0, status: 'active', success_rate: 0.95, sent_30d: 0, clicks_30d: 0, last_sent: l.processed_at, slow_mode_s: 0, allows_promo: true });
    }
    const lv = { joined: 'success', approval: 'warning', failed: 'error', skipped: 'info' }[l.status];
    const ev = { joined: `Berhasil bergabung: ${l.title}`, approval: `Menunggu persetujuan admin: ${l.title}`, failed: `Gagal bergabung: ${l.reason}`, skipped: `Dilewati: ${l.reason}` }[l.status];
    log(lv, null, l.url, ev, a ? '@' + a.username : '—', 'join');
    if (l.status === 'failed' && S.links.filter((x) => x.status === 'failed' && x.processed_at && Date.now() - new Date(x.processed_at) < 600000).length >= 3) notify('error', 'Beberapa tautan gagal di-join', 'Periksa riwayat Auto-Join untuk detail alasan.');
  };
  const joinStep = () => {
    const J = S.join;
    if (J.state !== 'running') return false;
    if (J.current) { if (Date.now() >= J.doneAt) { finishJoin(); J.gap = (3600000 / S.profile.join_per_hour / SPEED) * rand(0.75, 1.3); J.nextAt = Date.now() + J.gap; return true; } return false; }
    if (Date.now() < J.nextAt || TB.joinsThisHour() >= S.profile.join_per_hour) return false;
    if (TB.lim().joins_day !== -1 && TB.joinsToday() >= TB.lim().joins_day) return false;
    const accs = joinAccounts();
    if (!accs.length) return false;
    const q = S.links.filter((l) => l.status === 'pending').sort((a, b) => (b.prio || 0) - (a.prio || 0) || (a.found_at < b.found_at ? -1 : 1));
    if (!q.length) return false;
    J.current = q[0].id; J.doneAt = Date.now() + 2500;
    log('info', null, q[0].url, `Memproses join: ${q[0].title}`, '@' + accs[J.rr % accs.length].username, 'join');
    return true;
  };

  /* ---------- Engine: auto-reply ---------- */
  const INBOX = [['kak harga arabika berapa?', 0], ['mau order 2 cold brew', 0], ['halo kak', 1], ['bisa jadi reseller?', 0], ['ongkir ke bogor brp ya', 0], ['pricelist dong', 0], ['📷 Foto', 2], ['cara pesan gimana min', 0], ['ready robusta?', 0], ['🎤 Pesan suara', 2], ['bisa cod?', 0], ['halo, saya mau tanya', 1], ['harga grosir 5kg', 0], ['terima kasih kak', 0]];
  const NAMES2 = ['Andi', 'Sari', 'Budi', 'Dewi', 'Rina', 'Fajar', 'Yusuf', 'Mega', 'Tono', 'Lia', 'Hendra', 'Nia', 'Rudi', 'Wulan'];
  const replyStep = () => {
    if (!S.reply.on || Date.now() < S.reply.nextAt) return;
    S.reply.nextAt = Date.now() + rand(9000, 17000);
    const accs = S.accounts.filter((a) => a.roles.includes('reply') && a.enabled && a.status === 'connected');
    if (!accs.length) return;
    const a = pick(accs), [msg, t] = pick(INBOX);
    const from = pick(NAMES2) + ' ' + pick('ABCDEFGHJKLMNPRSTW') + '.';
    const ad = adToday()(a.id);
    const row = { id: 'M' + Date.now().toString(36), ts: TB.now().toISOString(), account_id: a.id, from, incoming: msg, rule_id: '', status: 'replied', latency_s: null, reason: '' };
    if (t === 2) { row.status = 'failed'; row.reason = 'Tipe pesan tidak didukung (media)'; ad.replies_failed++; log('error', null, from, 'Gagal memproses pesan masuk: tipe media tidak didukung', '@' + a.username, 'reply'); }
    else {
      const r = TB.matchRule(msg, a.id, t === 1);
      if (!r) { row.status = 'skipped'; row.reason = 'Tidak ada aturan aktif'; }
      else { row.rule_id = r.id; row.latency_s = Math.round(rand(S.profile.reply_delay_s + 0.4, S.profile.reply_delay_s + 2.8) * 10) / 10; r.hits_7d++; ad.replies++; log('success', null, from, `Balasan otomatis terkirim (${r.name})`, '@' + a.username, 'reply'); }
    }
    S.rlog.unshift(row);
  };

  const tick = () => {
    let changed = false;
    S.accounts.forEach((a) => {
      if (a.status === 'flood_wait' && a.floodUntil && Date.now() >= a.floodUntil) {
        a.status = 'connected'; a.floodUntil = null; a.health = Math.max(a.health, 64);
        log('info', null, '—', `@${a.username} pulih dari pembatasan — automation dilanjutkan`, '@' + a.username, 'system');
        TB.toast('Akun pulih', `@${a.username} kembali aktif`, 'ok');
        changed = true;
      }
    });
    if (!S.emergency) {
      if (S.engine === 'on') {
        TB.running().forEach((c) => {
          if (TB.blocked(c)) return;
          const a = TB.acc(c.account_id);
          if (a.sent_today >= a.daily_limit || !a.roles.includes('broadcast')) return;
          if (Date.now() >= c.nextAt) {
            if (send(c) === 'change') changed = true;
            c.gap = rand(4500, 11000);
            c.nextAt = Date.now() + c.gap;
          }
        });
      }
      if (S.detectOn && Date.now() >= S.detectNext) { S.detectNext = Date.now() + rand(13000, 22000); if (detectOne()) changed = true; }
      if (joinStep()) changed = true;
      replyStep();
    }
    if (TB.paymentsTick()) changed = true;
    const eff = TB.sub().effective;
    if (S.lastEff && eff !== S.lastEff) { TB.applyPlan(); changed = true; }
    S.lastEff = eff;
    while (liveSends.length && liveSends[0] < Date.now() - 70000) liveSends.shift();
    if (changed) TB.emit('sim-change'); else TB.emit('tick');
  };

  /* ---------- Actions ---------- */
  const find = (id) => S.campaigns.find((c) => c.id === id);
  const changed = () => TB.emit('change');
  TB.act = {
    pause(id, quiet) { const c = find(id); if (!c || c.status !== 'running') return; c.status = 'paused'; log('info', c, '—', 'Campaign dijeda oleh pengguna'); TB.hist(id, 'Campaign dijeda'); if (!quiet) TB.toast('Campaign dijeda', c.name, 'warn', { label: 'Urungkan', fn: () => TB.act.resume(id, true) }); changed(); },
    resume(id, quiet) {
      const c = find(id); if (!c) return;
      const a = TB.acc(c.account_id);
      if (!a || a.status === 'disconnected') { TB.toast('Akun pengirim terputus', 'Hubungkan ulang akun sebelum melanjutkan', 'bad', a ? { label: 'Hubungkan', fn: () => TB.connectFlow(a.id) } : null); return; }
      if (S.emergency) { TB.toast('Mode stop darurat aktif', 'Pulihkan automation terlebih dahulu', 'warn', { label: 'Pulihkan', fn: () => TB.act.restore() }); return; }
      if (TB.atLimit(TB.running().length, TB.lim().campaigns_active)) return TB.upsell('Batas campaign aktif tercapai', `Paket ${TB.lim().plan} mengizinkan ${TB.lim().campaigns_active} campaign berjalan bersamaan.`);
      c.planPaused = false;
      c.status = 'running'; c.gap = 2500; c.nextAt = Date.now() + 2500; log('info', c, '—', 'Campaign dilanjutkan'); TB.hist(id, 'Campaign dilanjutkan');
      if (!quiet) TB.toast('Campaign dilanjutkan', S.engine === 'paused' ? 'Catatan: broadcast global masih dijeda' : c.name, S.engine === 'paused' ? 'warn' : 'ok');
      changed();
    },
    stop(id) {
      const c = find(id); if (!c) return;
      TB.confirm({ title: 'Hentikan campaign?', text: `“${c.name}” akan dihentikan. Progres ${n(c.sent)} pesan tetap tercatat dan Anda bisa menjalankannya ulang kapan saja.`, confirm: 'Hentikan campaign', icon: 'circle-stop',
        onYes: () => { c.status = 'stopped'; log('warning', c, '—', 'Campaign dihentikan oleh pengguna'); TB.hist(id, 'Campaign dihentikan'); TB.closeModal(); TB.toast('Campaign dihentikan', c.name, 'bad'); changed(); } });
    },
    launch(id) {
      const c = find(id); if (!c) return;
      if (!c.targets || !c.message || c.message.length < 10) { TB.toast('Lengkapi campaign dulu', 'Target dan pesan belum diatur', 'warn'); TB.editCampaign(id); return; }
      const a = TB.acc(c.account_id);
      if (!a || a.status === 'disconnected') { TB.toast('Akun pengirim terputus', 'Hubungkan ulang akun terlebih dahulu', 'bad', a ? { label: 'Hubungkan', fn: () => TB.connectFlow(a.id) } : null); return; }
      if (S.emergency) { TB.toast('Mode stop darurat aktif', 'Pulihkan automation terlebih dahulu', 'warn'); return; }
      if (TB.atLimit(TB.running().length, TB.lim().campaigns_active)) return TB.upsell('Batas campaign aktif tercapai', `Paket ${TB.lim().plan} mengizinkan ${TB.lim().campaigns_active} campaign berjalan bersamaan.`);
      const was = c.status;
      c.status = 'running'; c.fail_reason = ''; c.start = TB.dayKey(0); c.nextAt = Date.now() + 2000; c.gap = 2000;
      if (was === 'stopped' || was === 'failed') c.planned = c.sent + Math.max(c.planned - c.sent, c.targets * 10);
      log('info', c, '—', was === 'stopped' || was === 'failed' ? 'Campaign dijalankan ulang' : 'Campaign diluncurkan');
      TB.hist(id, was === 'stopped' || was === 'failed' ? 'Campaign dijalankan ulang' : 'Campaign diluncurkan manual');
      TB.toast(was === 'stopped' || was === 'failed' ? 'Campaign dijalankan ulang' : 'Campaign diluncurkan 🚀', c.name, 'ok', { label: 'Pantau', fn: () => TB.go('live') });
      changed();
    },
    del(id) {
      const c = find(id); if (!c) return;
      TB.confirm({ title: 'Hapus campaign?', text: `“${c.name}” akan dihapus dari daftar. Tindakan ini tidak dapat dibatalkan.`, confirm: 'Hapus', icon: 'trash', onYes: () => { S.campaigns = S.campaigns.filter((x) => x.id !== id); TB.closeModal(); TB.toast('Campaign dihapus', c.name, 'info'); changed(); } });
    },
    dupCampaign(id) {
      const c = find(id); if (!c) return;
      const k = { ...clone(c), id: 'c' + Date.now().toString(36), name: c.name + ' (salinan)', status: 'draft', sent: 0, delivered: 0, failed: 0, clicks: 0, idx: S.campaigns.length, cursor: 0, nextAt: 0, lastTarget: null, fail_reason: '' };
      S.campaigns.unshift(k);
      TB.hist(k.id, `Diduplikat dari “${c.name}”`);
      TB.toast('Campaign diduplikat', k.name, 'ok', { label: 'Edit', fn: () => TB.editCampaign(k.id) });
      changed();
    },
    pauseAll() { S.engine = 'paused'; log('warning', null, '—', 'Broadcast dijeda — semua pengiriman ditahan', 'Sistem', 'system'); TB.toast('Semua broadcast dijeda', 'Tidak ada pesan yang dikirim sampai dilanjutkan', 'warn', { label: 'Urungkan', fn: () => TB.act.resumeAll(true) }); changed(); },
    resumeAll(quiet) { if (S.emergency) return TB.act.restore(); S.engine = 'on'; TB.running().forEach((c) => { c.nextAt = Date.now() + rand(1500, 4000); }); log('info', null, '—', 'Broadcast dilanjutkan', 'Sistem', 'system'); if (!quiet) TB.toast('Broadcast dilanjutkan', `${TB.running().length} campaign kembali berjalan`, 'ok'); changed(); },
    stopAll() {
      const act = S.campaigns.filter((c) => ['running', 'paused'].includes(c.status));
      if (!act.length) return;
      TB.confirm({ title: 'Hentikan semua campaign?', text: `${act.length} campaign yang berjalan atau dijeda akan dihentikan. Gunakan “Jeda semua” jika Anda hanya ingin berhenti sementara.`, confirm: `Hentikan ${act.length} campaign`, icon: 'circle-stop',
        onYes: () => { act.forEach((c) => { c.status = 'stopped'; TB.hist(c.id, 'Dihentikan lewat “Hentikan semua”'); }); S.engine = 'on'; log('error', null, '—', `Semua campaign dihentikan (${act.length})`, 'Sistem', 'system'); TB.toast('Semua campaign dihentikan', `${act.length} campaign dihentikan`, 'bad'); changed(); } });
    },
    emergency() {
      TB.confirm({ title: 'Stop darurat semua automation?', text: 'Broadcast, auto-join, deteksi link, dan auto-reply di semua akun akan dihentikan seketika. Campaign yang berjalan dijeda (progres aman) dan bisa dilanjutkan setelah Anda memulihkan automation.', confirm: 'Stop darurat sekarang', icon: 'siren',
        onYes: () => {
          const run = TB.running();
          run.forEach((c) => { c.status = 'paused'; c.emergencyPaused = true; TB.hist(c.id, 'Dijeda oleh stop darurat'); });
          S.emergency = true; S.engine = 'paused'; S.join.state = 'stopped'; S.join.current = null; S.reply.on = false; S.detectOn = false;
          log('error', null, '—', `STOP DARURAT — semua automation dihentikan (${run.length} campaign dijeda)`, ME, 'system');
          notify('error', 'Stop darurat diaktifkan', 'Semua modul automation dihentikan oleh pengguna.');
          TB.toast('Stop darurat aktif', 'Semua automation dihentikan seketika', 'bad', { label: 'Pulihkan', fn: () => TB.act.restore() });
          changed();
        } });
    },
    restore() {
      const held = S.campaigns.filter((c) => c.emergencyPaused);
      S.emergency = false; S.engine = 'on'; S.detectOn = true; S.reply.on = true; S.join.state = 'paused';
      log('info', null, '—', 'Automation dipulihkan — deteksi & auto-reply aktif, auto-join dan campaign menunggu dilanjutkan', ME, 'system');
      TB.toast('Automation dipulihkan', held.length ? `${held.length} campaign masih dijeda — lanjutkan saat siap` : 'Deteksi & auto-reply aktif kembali', 'ok', held.length ? { label: 'Lanjutkan semua', fn: () => { held.forEach((c) => { delete c.emergencyPaused; TB.act.resume(c.id, true); }); S.join.state = 'running'; changed(); } } : null);
      changed();
    },
    joinState(st) {
      if (S.emergency && st === 'running') return TB.toast('Mode stop darurat aktif', 'Pulihkan automation terlebih dahulu', 'warn', { label: 'Pulihkan', fn: () => TB.act.restore() });
      if (st === 'running' && !joinAccounts().length) return TB.toast('Tidak ada akun untuk join', 'Aktifkan peran “Join” pada minimal satu akun yang terhubung', 'warn', { label: 'Akun', fn: () => TB.go('accounts') });
      if (st === 'stopped') return TB.confirm({ title: 'Hentikan Auto-Join?', text: 'Proses join dihentikan. Link di antrean tetap tersimpan dan bisa diproses lagi dengan Start.', confirm: 'Stop', icon: 'circle-stop', onYes: () => { S.join.state = 'stopped'; S.join.current = null; log('warning', null, '—', 'Auto-Join dihentikan', ME, 'join'); TB.toast('Auto-Join dihentikan', '', 'bad'); changed(); } });
      const was = S.join.state;
      S.join.state = st; if (st === 'running') S.join.nextAt = Date.now() + 2500;
      if (st === 'paused') S.join.current = null;
      log('info', null, '—', st === 'running' ? (was === 'paused' ? 'Auto-Join dilanjutkan' : 'Auto-Join dimulai') : 'Auto-Join dijeda', ME, 'join');
      TB.toast(st === 'running' ? (was === 'paused' ? 'Auto-Join dilanjutkan' : 'Auto-Join dimulai') : 'Auto-Join dijeda', `${S.links.filter((l) => l.status === 'pending').length} link di antrean`, st === 'running' ? 'ok' : 'warn');
      changed();
    },
    connected(reId, phone) {
      let a;
      if (reId) { a = TB.acc(reId); a.status = 'connected'; a.enabled = true; a.health = 92; a.session_days = 0; a.last_active = TB.now().toISOString(); a.login_at = TB.now().toISOString(); a.dc = 'DC5 · Singapura'; a.session_ip = '103.47.12.•••'; if (!a.roles.length) a.roles = ['broadcast']; }
      else {
        const k = S.accounts.length + 1;
        a = { id: 'acc' + Date.now().toString(36), display_name: 'Akun Promo ' + k, username: 'promo_nusantara' + k, phone: phone.replace(/(\+62 \d{3})-\d{4}-/, '$1-••••-'), status: 'connected', health: 100, groups_joined: 0, sent_today: 0, daily_limit: 400, last_active: TB.now().toISOString(), session_days: 0, dc: 'DC5 · Singapura', enabled: !TB.atLimit(S.accounts.filter((x) => x.enabled).length, TB.lim().accounts), roles: ['broadcast'], two_fa: false, login_at: TB.now().toISOString(), session_ip: '103.47.12.•••', device: 'TeleBlast Cloud · SG-2' };
        S.accounts.push(a);
      }
      log('info', null, '—', `Akun @${a.username} ${reId ? 'terhubung kembali' : 'berhasil dihubungkan'}`, '@' + a.username, 'system');
      changed();
      return a;
    },
    disconnect(id) { const a = TB.acc(id); a.status = 'disconnected'; a.floodUntil = null; a.health = 0; log('warning', null, '—', `Koneksi @${a.username} diputus oleh pengguna`, '@' + a.username, 'system'); TB.toast('Koneksi diputus', `Sesi @${a.username} dihapus dari server`, 'info'); changed(); },
    removeAcc(id) { const a = TB.acc(id); S.accounts = S.accounts.filter((x) => x.id !== id); TB.toast('Akun dihapus', '@' + a.username, 'info'); changed(); },
    checkHealth(id) { const a = TB.acc(id); TB.toast('Memeriksa kesehatan akun…', '@' + a.username, 'info'); setTimeout(() => TB.toast(`@${a.username}: ${a.health >= 85 ? 'Sehat' : a.health >= 60 ? 'Perlu perhatian' : 'Berisiko'}`, `Skor ${a.health}/100 · tidak ada spam report · batas ${n(a.daily_limit)}/hari`, a.health >= 85 ? 'ok' : 'warn'), 1300); },
    addSource(ch, accId) {
      const s = { id: 's' + Date.now().toString(36), name: ch.name, type: ch.type, account_id: accId, active: true, links_found: 0, last_scan: TB.now().toISOString() };
      S.sources.push(s);
      log('info', null, ch.name, `Sumber pemantauan ditambahkan: ${ch.name}`, TB.accLabel(accId), 'detect');
      TB.toast('Sumber ditambahkan', `${ch.name} kini dipantau`, 'ok');
      S.detectNext = Date.now() + 2500;
      changed();
    },
    saveRule(id, f) {
      if (id) { Object.assign(S.rules.find((r) => r.id === id), f); TB.toast('Aturan diperbarui', f.name); }
      else { const can = !TB.atLimit(S.rules.filter((x) => x.active).length, TB.lim().reply_rules); S.rules.push({ id: 'r' + Date.now().toString(36), active: can, hits_7d: 0, ...f }); TB.toast('Aturan ditambahkan', can ? f.name : `${f.name} disimpan nonaktif — batas aturan paket ${TB.lim().plan} tercapai`, can ? 'ok' : 'warn'); }
      changed();
    },
    saveTemplate(id, f) {
      if (id) { Object.assign(S.templates.find((t) => t.id === id), f, { updated: TB.now().toISOString() }); TB.toast('Template diperbarui', f.name); }
      else { S.templates.unshift({ id: 'tp' + Date.now().toString(36), used: 0, updated: TB.now().toISOString(), ...f }); TB.toast('Template disimpan', f.name); }
      changed();
    },
  };

  /* ---------- Navigation ---------- */
  const SEC = { overview: 'Utama', live: 'Utama', detect: 'Automation', join: 'Automation', promo: 'Automation', reply: 'Automation', campaigns: 'Automation', accounts: 'Akun', reports: 'Analitik', billing: 'Akun', payments: 'Akun', settings: 'Akun' };
  TB.go = (page, { first } = {}) => {
    const pg = TB.pages[page]; if (!pg) return;
    const prev = S.ui.page;
    S.ui.page = page;
    document.querySelectorAll('.tb-page[data-page]').forEach((s) => { s.hidden = s.dataset.page !== page; if (s.dataset.page !== page) s.innerHTML = ''; });
    document.querySelectorAll('.tb-nav-btn[data-nav]').forEach((b) => b.classList.toggle('is-active', b.dataset.nav === page));
    document.getElementById('tb-crumb-sec').textContent = SEC[page];
    document.getElementById('tb-crumb-title').textContent = pg.title;
    const el = document.getElementById(page);
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    renderPage();
    try { dash.setLink(page); } catch (e) { /* noop */ }
    if (!first && prev !== page) { const app = document.getElementById('tb-app'); if (app.getBoundingClientRect().top < 0) app.scrollIntoView({ block: 'start' }); }
    TB.closeMenu();
  };
  const renderPage = () => {
    const page = S.ui.page, pg = TB.pages[page], el = document.getElementById(page);
    pg.render(el);
    shell();
    TB.refreshBinds(el);
    requestAnimationFrame(() => pg.charts && pg.charts(el));
  };
  TB.renderPage = renderPage;
  const shell = () => {
    const p = S.profile;
    document.getElementById('tb-avatar').textContent = TB.initials(p.name);
    document.getElementById('tb-ws-av').textContent = TB.initials(p.workspace);
    document.getElementById('tb-ws-av').style.background = TB.grad(p.workspace);
    document.getElementById('tb-ws-name').textContent = p.workspace;
    document.getElementById('tb-crumb-ws').textContent = p.workspace;
    document.getElementById('tb-ws-plan').textContent = p.plan;
    const m = TB.mods();
    document.getElementById('tb-nav-live').textContent = Object.values(m).filter((x) => x === 'running').length;
    document.getElementById('tb-nav-camp').textContent = S.campaigns.filter((c) => ['running', 'paused', 'scheduled'].includes(c.status)).length;
    document.getElementById('tb-nav-detect').textContent = S.links.filter((l) => l.status === 'detected').length;
    const pp = S.payments.filter((x) => x.status === 'pending').length, np = document.getElementById('tb-nav-pay'); np.textContent = pp; np.hidden = !pp;
    document.getElementById('tb-nav-join').textContent = S.links.filter((l) => l.status === 'pending').length;
    const rf = S.rlog.filter((x) => x.status === 'failed').length;
    const nr = document.getElementById('tb-nav-reply'); nr.textContent = rf; nr.classList.toggle('is-bad', !!rf); nr.hidden = !rf;
    const bad = S.accounts.filter((a) => a.status !== 'connected').length;
    const na = document.getElementById('tb-nav-acc'); na.textContent = bad || S.accounts.length; na.classList.toggle('is-bad', !!bad);
    const o = TB.overall();
    document.getElementById('tb-engine-dot').className = 'tb-pulse ' + (o[1] === 'ok' ? '' : o[1] === 'warn' ? 'paused' : 'off');
    document.getElementById('tb-engine-lbl').textContent = S.emergency ? 'Stop darurat aktif' : o[1] === 'ok' ? 'Automation aktif' : o[1] === 'warn' ? 'Sebagian aktif' : 'Automation mati';
    document.getElementById('tb-notif-dot').hidden = !S.notifs.some((x) => !x.read);
    const sb = TB.sub();
    document.getElementById('tb-side-plan').textContent = p.plan + (sb.effective !== p.plan ? ' → ' + sb.effective : '');
    document.getElementById('tb-side-st').textContent = sb.st === 'expired' && sb.inGrace ? 'Tenggang' : TB.SS[sb.st].l;
    document.getElementById('tb-side-exp').textContent = sb.free ? 'Gratis · tanpa batas waktu' : sb.daysLeft > 0 ? `${sb.daysLeft} hari lagi · ${p.billing_cycle === 'yearly' ? 'tahunan' : 'bulanan'}` : 'Masa aktif berakhir';
    sideBar();
    TB.refreshBinds(document.getElementById('tb-side'));
  };
  const sideBar = () => { const sb = TB.sub(); document.getElementById('tb-side-bar').style.width = (sb.free ? 100 : Math.max(0, Math.min(100, (1 - sb.daysLeft / 31) * 100))).toFixed(1) + '%'; };
  const canRerender = (page, el) => {
    if (['promo', 'settings'].includes(page)) return false;
    if (page === 'reply' && S.ui.replyTab === 'hours') return false;
    const ae = document.activeElement;
    if (ae && el.contains(ae) && /INPUT|TEXTAREA|SELECT/.test(ae.tagName)) return false;
    if (el.querySelector('.tb-tip.on')) return false;
    return true;
  };

  TB.on((what) => {
    if (!S) return;
    const pg = TB.pages[S.ui.page], el = document.getElementById(S.ui.page);
    if (what === 'tick') { TB.refreshBinds(); pg.tick && pg.tick(el); sideBar(); return; }
    if (what === 'sim-change' && !canRerender(S.ui.page, el)) { shell(); TB.refreshBinds(); pg.tick && pg.tick(el); return; }
    const y = window.scrollY;
    const sc = [...el.querySelectorAll('.tb-table-wrap.scroll, .tb-target-list')].map((x) => x.scrollTop);
    renderPage();
    el.querySelectorAll('.tb-table-wrap.scroll, .tb-target-list').forEach((x, i) => { if (sc[i]) x.scrollTop = sc[i]; });
    if (what === 'sim-change' && window.scrollY !== y) window.scrollTo(0, y);
  });

  /* ---------- Menus ---------- */
  const userMenu = (btn) => {
    const p = S.profile;
    TB.menu(btn, `<div class="m-user"><span style="width:36px;height:36px;border-radius:10px;display:grid;place-items:center;color:#fff;font-weight:650;background:linear-gradient(140deg,#8B7CF7,#2AABEE)">${esc(TB.initials(p.name))}</span><div style="min-width:0"><div style="font-weight:600">${esc(p.name)}</div><div style="font-size:12px;color:var(--muted)">${esc(p.email)}</div></div></div><div class="m-sep"></div>
      ${TB.mi('settings', 'user', 'Profil & pengaturan')}${TB.mi('billing', 'wallet', 'Saldo & langganan')}${TB.mi('security', 'shield', 'Keamanan akun')}${TB.mi('keys', 'key', 'Pintasan keyboard')}<div class="m-sep"></div>${TB.mi('logout', 'logout', 'Keluar', { danger: true })}`, (m) => {
      if (m === 'settings') { S.ui.setTab = 'profile'; TB.go('settings'); }
      if (m === 'security') { S.ui.setTab = 'security'; TB.go('settings'); }
      if (m === 'billing') TB.go('billing');
      if (m === 'keys') TB.toast('Pintasan keyboard', 'Ctrl/⌘ + K untuk mencari · Esc untuk menutup', 'info');
      if (m === 'logout') TB.toast('Mode demo', 'Fitur keluar dinonaktifkan pada demo ini', 'info');
    }, { width: 260, align: btn.classList.contains('tb-ws') ? 'start' : 'end' });
  };
  const notifMenu = (btn) => {
    const draw = () => `<div class="m-h">Notifikasi <button data-m="readall">Tandai semua dibaca</button></div>` + (S.notifs.length ? S.notifs.slice(0, 8).map((x) => `<button class="n-item ${x.read ? 'read' : ''}" data-m="n:${x.id}"><span class="nd" style="${x.kind === 'error' && !x.read ? 'background:var(--color-bad)' : ''}"></span><span style="min-width:0"><div class="nt">${esc(x.title)}</div><div class="nb">${esc(x.body)}</div><div class="nm">${TB.ago(x.ts)}</div></span></button>`).join('') : `<div style="padding:24px;text-align:center;color:var(--muted)">Tidak ada notifikasi</div>`);
    TB.menu(btn, draw(), (m) => {
      if (m === 'readall') { S.notifs.forEach((x) => (x.read = true)); document.getElementById('tb-pop').innerHTML = draw(); shell(); return true; }
      const x = S.notifs.find((k) => 'n:' + k.id === m);
      if (x) { x.read = true; shell(); TB.go(/paket|langganan/i.test(x.title) ? 'billing' : /join/i.test(x.title) ? 'join' : /campaign/i.test(x.title) ? 'campaigns' : x.kind === 'warning' || x.kind === 'error' ? 'accounts' : x.kind === 'success' ? 'campaigns' : 'billing'); }
    }, { width: 340 });
  };
  const engineMenu = (btn) => {
    const m = TB.mods();
    TB.menu(btn, `<div class="m-h">Status automation</div><div style="padding:2px 10px 8px;font-size:12.5px;color:var(--muted)">${esc(TB.overall()[2])}</div>
      ${[['detect', 'Auto-Detect'], ['join', 'Auto-Join'], ['broadcast', 'Broadcast'], ['reply', 'Auto-Reply']].map(([k, l]) => `<div style="display:flex;align-items:center;gap:8px;padding:5px 10px;font-size:12.5px"><span class="tb-pulse ${TB.MS[m[k]][2]}" style="width:7px;height:7px"></span><span style="flex:1">${l}</span><span style="color:var(--muted)">${TB.MS[m[k]][0]}</span></div>`).join('')}
      <div class="m-sep"></div>
      ${S.engine === 'paused' ? TB.mi('resume', 'play', 'Lanjutkan broadcast') : TB.mi('pause', 'pause', 'Jeda broadcast', { disabled: !TB.running().length })}
      ${S.emergency ? TB.mi('restore', 'power', 'Pulihkan automation') : TB.mi('emergency', 'siren', 'Stop darurat', { danger: true })}<div class="m-sep"></div>${TB.mi('live', 'activity', 'Buka Live Monitoring')}`, (k) => {
      if (k === 'resume') TB.act.resumeAll(); if (k === 'pause') TB.act.pauseAll(); if (k === 'emergency') TB.act.emergency(); if (k === 'restore') TB.act.restore(); if (k === 'live') TB.go('live');
    }, { width: 260 });
  };

  /* ---------- Command palette ---------- */
  const cmdk = () => {
    const PI = { overview: 'layout-dashboard', live: 'activity', detect: 'scan', join: 'user-plus', promo: 'send', reply: 'reply', campaigns: 'megaphone', accounts: 'smartphone', reports: 'bar-chart', billing: 'crown', payments: 'receipt', settings: 'settings' };
    const pages = Object.keys(PI).map((k) => ({ g: 'Halaman', ic: PI[k], l: TB.pages[k].title, run: () => TB.go(k) }));
    const acts = [
      { g: 'Aksi cepat', ic: 'plus', l: 'Buat campaign baru', run: () => TB.newCampaign() },
      { g: 'Aksi cepat', ic: 'scan', l: 'Pindai link sekarang', run: () => { TB.go('detect'); setTimeout(() => document.querySelector('[data-action="scan-now"]')?.click(), 50); } },
      { g: 'Aksi cepat', ic: 'reply', l: 'Tambah aturan auto-reply', run: () => TB.ruleModal() },
      { g: 'Aksi cepat', ic: 'crown', l: 'Kelola langganan & paket', run: () => TB.go('billing') },
      { g: 'Aksi cepat', ic: 'smartphone', l: 'Hubungkan akun Telegram', run: () => TB.connectFlow() },
      S.emergency ? { g: 'Aksi cepat', ic: 'power', l: 'Pulihkan automation', run: () => TB.act.restore() } : { g: 'Aksi cepat', ic: 'siren', l: 'Stop darurat semua automation', run: () => TB.act.emergency() },
    ];
    const camps = S.campaigns.map((c) => ({ g: 'Campaign', ic: 'megaphone', l: c.name, sub: TB.CS[c.status].l, run: () => TB.campDetail(c.id) }));
    const accs = S.accounts.map((a) => ({ g: 'Akun', ic: 'user', l: '@' + a.username, sub: TB.AS[a.status].l, run: () => TB.go('accounts') }));
    const all = [...acts, ...pages, ...camps, ...accs];
    let sel = 0, list = all;
    TB.modal({
      icon: '', title: '', body: '',
      onMount: (box) => {
        box.querySelector('.tb-dlg-h').remove();
        box.querySelector('.tb-dlg-b').outerHTML = `<div class="tb-cmd-input">${icon('search')}<input id="cmd-q" placeholder="Cari halaman, campaign, akun, atau aksi…" autocomplete="off"><kbd class="tb-kbd">Esc</kbd></div><div class="tb-cmd-list" id="cmd-l"></div>`;
        const q = box.querySelector('#cmd-q'), L = box.querySelector('#cmd-l');
        const draw = () => {
          let g = '';
          L.innerHTML = list.length ? list.map((it, i) => { const head = it.g !== g ? `<div class="tb-cmd-group">${it.g}</div>` : ''; g = it.g; return `${head}<button class="tb-cmd-item ${i === sel ? 'is-on' : ''}" data-i="${i}"><span class="ci">${icon(it.ic)}</span><span style="flex:1;min-width:0" class="tb-ellipsis">${esc(it.l)}</span>${it.sub ? `<span class="muted" style="font-size:12px">${esc(it.sub)}</span>` : ''}</button>`; }).join('')
            : TB.empty('search', 'Tidak ditemukan', 'Coba kata kunci lain.');
          const on = L.querySelector('.is-on'); if (on) on.scrollIntoView({ block: 'nearest' });
        };
        const run = (i) => { const it = list[i]; if (!it) return; TB.closeModal(); setTimeout(it.run, 10); };
        q.addEventListener('input', () => { const v = q.value.toLowerCase().trim(); list = v ? all.filter((it) => (it.l + ' ' + it.g + ' ' + (it.sub || '')).toLowerCase().includes(v)) : all; sel = 0; draw(); });
        q.addEventListener('keydown', (e) => {
          if (e.key === 'ArrowDown') { sel = Math.min(list.length - 1, sel + 1); draw(); e.preventDefault(); }
          if (e.key === 'ArrowUp') { sel = Math.max(0, sel - 1); draw(); e.preventDefault(); }
          if (e.key === 'Enter') run(sel);
        });
        L.addEventListener('click', (e) => { const b = e.target.closest('[data-i]'); if (b) run(+b.dataset.i); });
        draw(); q.focus();
      },
    });
  };

  /* ---------- Download helper ---------- */
  const download = (name, text) => {
    try {
      const a = document.createElement('a');
      a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(text);
      a.download = name;
      document.body.appendChild(a); a.click(); a.remove();
      TB.toast('File diunduh', name, 'ok');
    } catch (e) { TB.toast('Laporan disiapkan', 'Tautan unduhan dikirim ke email Anda', 'info'); }
  };
  const csv = (rows, cols) => [cols.join(',')].concat(rows.map((r) => cols.map((k) => `"${String(r[k] ?? '').replace(/"/g, '""')}"`).join(','))).join('\n');
  const copy = (txt) => { try { navigator.clipboard.writeText(txt); } catch (e) { /* noop */ } TB.toast('Disalin', txt, 'info'); };

  /* ---------- Event delegation ---------- */
  document.addEventListener('keydown', (e) => {
    if (!S) return;
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); cmdk(); }
  });
  const STEPS_ERR = ['Isi nama, pilih akun yang terhubung, dan sumber deteksi bila diaktifkan', 'Pilih minimal satu target', 'Tulis pesan minimal 10 karakter', 'Periksa hari aktif dan tanggal'];
  document.addEventListener('click', (e) => {
    if (!S) return;
    const nav = e.target.closest('[data-nav]');
    if (nav && !e.target.closest('[data-action]')) { TB.go(nav.dataset.nav); return; }
    const b = e.target.closest('[data-action]');
    if (!b) return;
    const a = b.dataset.action, v = b.dataset.v, id = b.dataset.id, ui = S.ui;
    const pageEl = document.getElementById(ui.page);
    const d = ui.draft;
    const promo = TB.pages.promo;
    const L = (lid) => S.links.find((x) => x.id === lid);
    switch (a) {
      case 'menu-user': return userMenu(b);
      case 'menu-notif': return notifMenu(b);
      case 'menu-engine': return engineMenu(b);
      case 'cmdk': return cmdk();
      case 'emergency': return S.emergency ? TB.act.restore() : TB.act.emergency();
      case 'restore': return TB.act.restore();
      case 'new-campaign': ui.promoTab = 'builder'; return TB.newCampaign();
      case 'pause-all': return TB.act.pauseAll();
      case 'resume-all': return TB.act.resumeAll();
      case 'stop-all': return TB.act.stopAll();
      case 'c-pause': e.stopPropagation(); return TB.act.pause(id);
      case 'c-resume': e.stopPropagation(); return TB.act.resume(id);
      case 'c-stop': e.stopPropagation(); return TB.act.stop(id);
      case 'c-launch': e.stopPropagation(); return TB.act.launch(id);
      case 'c-menu': e.stopPropagation(); return TB.campMenu(b, id);
      case 'c-detail': return TB.campDetail(id);
      case 'camp-filter': ui.campFilter = v; if (ui.page !== 'campaigns') return TB.go('campaigns'); return renderPage();
      case 'camp-clear': ui.campQ = ''; return renderPage();
      case 'export-campaigns': return download('campaign-teleblast.csv', csv(S.campaigns, ['id', 'name', 'status', 'flow', 'targets', 'interval_min', 'sent', 'delivered', 'failed', 'clicks', 'start', 'end']));
      /* accounts */
      case 'connect': return TB.connectFlow();
      case 'reconnect': return TB.connectFlow(id);
      case 'acc-menu': return TB.accMenu(b, id);
      case 'acc-session': return TB.sessionModal(id);
      case 'acc-enable': {
        const acc = TB.acc(id);
        if (b.checked && TB.atLimit(S.accounts.filter((x) => x.enabled).length, TB.lim().accounts)) { b.checked = false; return TB.upsell('Batas akun Telegram tercapai', `Paket ${TB.lim().plan} mendukung ${TB.lim().accounts} akun aktif. Nonaktifkan akun lain atau upgrade paket.`); }
        acc.enabled = b.checked; acc.planLocked = false;
        const hit = S.campaigns.filter((c) => c.account_id === id && c.status === 'running').length;
        log('info', null, '—', `@${acc.username} ${acc.enabled ? 'diaktifkan' : 'dinonaktifkan'} untuk automation`, '@' + acc.username, 'system');
        TB.toast(acc.enabled ? 'Akun diaktifkan' : 'Akun dinonaktifkan', acc.enabled ? `@${acc.username} kembali dipakai automation` : hit ? `${hit} campaign yang memakai akun ini tertahan` : `@${acc.username} dilewati semua modul`, acc.enabled ? 'ok' : 'warn');
        return changed();
      }
      case 'role-toggle': {
        const acc = TB.acc(id); if (!acc) return;
        const on = acc.roles.includes(v);
        acc.roles = on ? acc.roles.filter((r) => r !== v) : [...acc.roles, v];
        const L2 = { broadcast: 'Broadcast', join: 'Auto-Join', reply: 'Auto-Reply' }[v];
        TB.toast(`${L2} ${on ? 'dinonaktifkan' : 'diaktifkan'}`, `untuk @${acc.username}`, on ? 'info' : 'ok');
        if (on && v === 'join' && !joinAccounts().length && S.join.state === 'running') TB.toast('Tidak ada akun untuk Auto-Join', 'Antrean berhenti diproses sampai ada akun dengan peran Join', 'warn');
        return changed();
      }
      case 'acc-check-all': return TB.busy(b, 1500, () => TB.toast('Pemeriksaan selesai', `${S.accounts.filter((x) => x.status === 'connected').length} akun sehat · ${S.accounts.filter((x) => x.status !== 'connected').length} perlu perhatian`, 'ok'), 'Memeriksa…');
      case 'topup': return TB.go('billing');
      case 'ov-range': ui.ovRange = +v; return renderPage();
      /* live */
      case 'log-kind': ui.logKind = v; return renderPage();
      case 'log-pause': ui.logPaused = !ui.logPaused; return renderPage();
      case 'log-export': if (TB.lim().monitoring === 'Dasar') return TB.upsell('Ekspor log tersedia di paket Pro', 'Monitoring dasar menampilkan log 24 jam tanpa filter lanjutan dan ekspor.');
        return download('log-aktivitas.csv', csv(S.activity, ['ts', 'kind', 'level', 'campaign', 'account', 'target', 'event']));
      /* module toggles */
      case 'detect-flip': case 'detect-toggle': {
        if (S.emergency && !S.detectOn) return TB.toast('Mode stop darurat aktif', 'Pulihkan automation terlebih dahulu', 'warn');
        S.detectOn = a === 'detect-toggle' ? b.checked : !S.detectOn;
        log('info', null, '—', `Auto-Detect ${S.detectOn ? 'diaktifkan' : 'dijeda'}`, ME, 'detect');
        TB.toast(S.detectOn ? 'Auto-Detect aktif' : 'Auto-Detect dijeda', S.detectOn ? `${S.sources.filter((s) => s.active).length} sumber dipantau` : 'Tidak ada link baru yang dicari', S.detectOn ? 'ok' : 'warn');
        return changed();
      }
      case 'reply-flip': case 'reply-global': {
        if (S.emergency && !S.reply.on) return TB.toast('Mode stop darurat aktif', 'Pulihkan automation terlebih dahulu', 'warn');
        S.reply.on = a === 'reply-global' ? b.checked : !S.reply.on;
        log('info', null, '—', `Auto-Reply ${S.reply.on ? 'diaktifkan' : 'dijeda'}`, ME, 'reply');
        TB.toast(S.reply.on ? 'Auto-Reply aktif' : 'Auto-Reply dijeda', S.reply.on ? 'Pesan masuk dibalas otomatis' : 'Pesan masuk tidak dibalas otomatis', S.reply.on ? 'ok' : 'warn');
        return changed();
      }
      /* auto-detect */
      case 'src-add': return TB.addSourceFlow();
      case 'src-toggle': { const s = S.sources.find((x) => x.id === id); if (b.checked && TB.atLimit(S.sources.filter((x) => x.active).length, TB.lim().sources)) { b.checked = false; return TB.upsell('Batas sumber deteksi tercapai', `Paket ${TB.lim().plan} mendukung ${TB.lim().sources} sumber aktif.`); } s.active = b.checked; s.planLocked = false; TB.toast(s.active ? 'Sumber diaktifkan' : 'Sumber dijeda', s.name, s.active ? 'ok' : 'info'); return changed(); }
      case 'src-del': { const s = S.sources.find((x) => x.id === id); return TB.confirm({ title: 'Hapus sumber?', text: `“${s.name}” tidak akan dipantau lagi. Link yang sudah ditemukan tetap tersimpan.`, confirm: 'Hapus sumber', icon: 'trash', onYes: () => { S.sources = S.sources.filter((x) => x.id !== id); TB.toast('Sumber dihapus', s.name, 'info'); changed(); } }); }
      case 'scan-now': return TB.busy(b, 1300, () => { if (S.emergency) return TB.toast('Mode stop darurat aktif', 'Pulihkan automation terlebih dahulu', 'warn'); const r1 = detectOne(true), r2 = detectOne(false); const nn = [r1, r2].filter((x) => x === 'new').length, dd = [r1, r2].filter((x) => x === 'dup').length; TB.toast('Pemindaian selesai', nn || dd ? `${nn} link baru · ${dd} duplikat dicegah` : 'Tidak ada sumber aktif yang bisa dipindai', nn ? 'ok' : 'info'); changed(); }, 'Memindai…');
      case 'auto-queue': S.prefs.autoQueue = b.checked; return TB.toast(b.checked ? 'Otomatis ke antrean aktif' : 'Otomatis ke antrean nonaktif', b.checked ? 'Link yang lolos kriteria langsung Pending' : 'Link baru berstatus Detected sampai Anda memilihnya', 'info');
      case 'link-tab': ui.linkStatus = v; ui.linkSel.clear(); return renderPage();
      case 'link-reset': ui.linkStatus = 'all'; ui.linkKind = 'all'; ui.linkSrc = 'all'; ui.linkQ = ''; return renderPage();
      case 'link-sel': ui.linkSel.has(id) ? ui.linkSel.delete(id) : ui.linkSel.add(id); return TB.pages.detect.table(pageEl);
      case 'link-selall': { const rows = TB.pages.detect.rows().slice(0, 200); const all = rows.every((r) => ui.linkSel.has(r.id)); rows.forEach((r) => (all ? ui.linkSel.delete(r.id) : ui.linkSel.add(r.id))); return TB.pages.detect.table(pageEl); }
      case 'link-bulk': {
        if (v === 'clear') { ui.linkSel.clear(); return TB.pages.detect.table(pageEl); }
        let k = 0;
        ui.linkSel.forEach((lid) => { const l = L(lid); if (!l) return; if (v === 'queue' && ['detected', 'failed'].includes(l.status) && l.kind !== 'invalid') { l.status = 'pending'; l.reason = ''; k++; } if (v === 'skip' && ['detected', 'pending'].includes(l.status)) { l.status = 'skipped'; l.reason = 'Dilewati manual'; l.processed_at = TB.now().toISOString(); k++; } });
        ui.linkSel.clear();
        TB.toast(v === 'queue' ? `${k} link dikirim ke antrean join` : `${k} link dilewati`, k ? '' : 'Tidak ada link yang sesuai status', k ? 'ok' : 'info');
        return changed();
      }
      case 'link-queue': { const l = L(id); const why = TB.evalCriteria(l); if (why && l.kind === 'invalid') return TB.toast('Tidak bisa diantrekan', why, 'warn'); l.status = 'pending'; l.reason = ''; TB.toast('Dikirim ke antrean join', why ? `Catatan: ${why} — akan dilewati saat diproses` : l.url, why ? 'warn' : 'ok', { label: 'Lihat antrean', fn: () => TB.go('join') }); return changed(); }
      case 'link-unqueue': { const l = L(id); l.status = 'detected'; TB.toast('Dikeluarkan dari antrean', l.url, 'info'); return changed(); }
      case 'link-skip': { const l = L(id); l.status = 'skipped'; l.reason = 'Dilewati manual'; l.processed_at = TB.now().toISOString(); TB.toast('Link dilewati', l.url, 'info', { label: 'Urungkan', fn: () => { l.status = 'detected'; l.reason = ''; changed(); } }); return changed(); }
      case 'link-retry': { const l = L(id); l.status = 'pending'; l.reason = ''; l.prio = 1; TB.toast('Dijadwalkan ulang', `${l.title} masuk antrean prioritas`, 'ok'); return changed(); }
      case 'link-top': { const l = L(id); l.prio = (Math.max(0, ...S.links.map((x) => x.prio || 0))) + 1; TB.toast('Diprioritaskan', l.title, 'info'); return changed(); }
      case 'link-copy': return copy(L(id).url);
      /* auto-join */
      case 'join-start': return TB.act.joinState('running');
      case 'join-resume': return TB.act.joinState('running');
      case 'join-pause': return TB.act.joinState('paused');
      case 'join-stop': return TB.act.joinState('stopped');
      case 'join-q': ui.joinQ = v; return renderPage();
      case 'join-hist': ui.joinHist = v; return renderPage();
      case 'join-recheck': return TB.busy(b, 1100, () => { const l = L(id); if (Math.random() < 0.5) { l.status = 'joined'; l.reason = ''; l.processed_at = TB.now().toISOString(); adToday()(l.account_id).joins_ok++; log('success', null, l.url, `Disetujui admin: ${l.title}`, TB.accLabel(l.account_id), 'join'); TB.toast('Permintaan disetujui', `Berhasil bergabung ke ${l.title}`, 'ok'); changed(); } else TB.toast('Masih menunggu persetujuan', 'Admin grup belum menyetujui permintaan join', 'info'); }, '');
      case 'join-save': {
        const box = pageEl.querySelector('#join-crit'), p = S.profile;
        box.querySelectorAll('[name]').forEach((inp) => { p[inp.name] = inp.type === 'checkbox' ? inp.checked : inp.type === 'range' || inp.type === 'number' ? Math.max(0, +inp.value || 0) : inp.value; });
        if (p.join_per_hour > 10) TB.toast('Batas tinggi', 'Di atas 10 join/jam berisiko memicu pembatasan', 'warn');
        TB.toast('Kriteria disimpan', `Maks ${p.join_per_hour} join/jam · min ${n(p.join_min_members)} anggota`);
        return changed();
      }
      /* auto-reply */
      case 'reply-tab': ui.replyTab = v; return renderPage();
      case 'rule-add': return TB.ruleModal();
      case 'faq-add': return TB.ruleModal(null, { type: 'faq', ...TB.FAQ[+v] });
      case 'rule-toggle': { const r = S.rules.find((x) => x.id === id); if (b.checked && TB.atLimit(S.rules.filter((x) => x.active).length, TB.lim().reply_rules)) { b.checked = false; return TB.upsell('Batas aturan auto-reply tercapai', `Paket ${TB.lim().plan} mendukung ${TB.lim().reply_rules} aturan aktif.`); } r.active = b.checked; r.planLocked = false; TB.toast(r.active ? 'Aturan aktif' : 'Aturan dinonaktifkan', r.name, r.active ? 'ok' : 'info'); return changed(); }
      case 'rule-menu': { const r = S.rules.find((x) => x.id === id); return TB.menu(b, `${TB.mi('edit', 'pencil', 'Edit aturan')}${TB.mi('dup', 'copy', 'Duplikat')}<div class="m-sep"></div>${TB.mi('del', 'trash', 'Hapus', { danger: true })}`, (m) => { if (m === 'edit') TB.ruleModal(id); if (m === 'dup') { S.rules.push({ ...clone(r), id: 'r' + Date.now().toString(36), name: r.name + ' (salinan)', hits_7d: 0 }); TB.toast('Aturan diduplikat', r.name); changed(); } if (m === 'del') TB.confirm({ title: 'Hapus aturan?', text: `“${r.name}” akan dihapus.`, confirm: 'Hapus', icon: 'trash', onYes: () => { S.rules = S.rules.filter((x) => x.id !== id); TB.toast('Aturan dihapus', r.name, 'info'); changed(); } }); }, { width: 190 }); }
      case 'reply-test': return TB.replyTest(pageEl);
      case 'reply-day': { const k = +v; S.prefs.replyDays = S.prefs.replyDays.includes(k) ? S.prefs.replyDays.filter((x) => x !== k) : [...S.prefs.replyDays, k].sort(); b.classList.toggle('is-on'); return; }
      case 'reply-hours-save': { const box = pageEl.querySelector('#reply-hours'); box.querySelectorAll('[name]').forEach((inp) => { if (inp.name === 'fallback_on') S.prefs.fallbackOn = inp.checked; else S.profile[inp.name] = inp.name === 'reply_delay_s' ? +inp.value : inp.value; }); return TB.busy(b, 600, () => TB.toast('Pengaturan auto-reply disimpan', `Aktif ${S.profile.reply_start}–${S.profile.reply_end} WIB`), 'Menyimpan…'); }
      case 'reply-resolve': { const x = S.rlog.find((k) => k.id === id); x.status = 'resolved'; x.reason = 'Ditandai selesai'; TB.toast('Ditandai selesai', x.from, 'info'); return changed(); }
      case 'reply-manual': {
        const x = S.rlog.find((k) => k.id === id);
        return TB.modal({ icon: 'reply', title: `Balas ${x.from}`, sub: `Pesan masuk: “${esc(x.incoming)}” · via ${esc(TB.accLabel(x.account_id))}`, body: `<textarea class="tb-input" id="rm-t" rows="4" placeholder="Tulis balasan…"></textarea>`, foot: `<button class="tb-btn" data-close>Batal</button><button class="tb-btn primary" id="rm-go">${icon('send')}Kirim balasan</button>`,
          onMount: (bx) => { const t = bx.querySelector('#rm-t'); t.focus(); bx.querySelector('#rm-go').addEventListener('click', (ev) => { if (t.value.trim().length < 2) return t.focus(); TB.busy(ev.currentTarget, 700, () => { x.status = 'resolved'; x.reason = 'Dibalas manual'; log('success', null, x.from, 'Balasan manual terkirim', TB.accLabel(x.account_id), 'reply'); TB.closeModal(); TB.toast('Balasan terkirim', x.from); changed(); }, 'Mengirim…'); }); } });
      }
      /* broadcast builder */
      case 'promo-tab': ui.promoTab = v; return renderPage();
      case 'tpl-new': return TB.tplModal();
      case 'tpl-from-draft': if (!d || d.message.trim().length < 10) return TB.toast('Tulis pesan dulu', 'Pesan minimal 10 karakter', 'warn'); return TB.tplModal(null, { name: d.name || '', body: d.message });
      case 'tpl-use': { const t = S.templates.find((x) => x.id === id); t.used++; ui.promoTab = 'builder'; TB.newCampaign({ message: t.body, template_id: t.id, step: 0 }); return TB.toast('Template diterapkan', t.name, 'info'); }
      case 'tpl-menu': { const t = S.templates.find((x) => x.id === id); return TB.menu(b, `${TB.mi('use', 'zap', 'Gunakan')}${TB.mi('edit', 'pencil', 'Edit')}<div class="m-sep"></div>${TB.mi('del', 'trash', 'Hapus', { danger: true })}`, (m) => { if (m === 'use') document.querySelector(`[data-action="tpl-use"][data-id="${id}"]`)?.click(); if (m === 'edit') TB.tplModal(id); if (m === 'del') TB.confirm({ title: 'Hapus template?', text: `“${t.name}” akan dihapus. Campaign yang sudah memakainya tidak berubah.`, confirm: 'Hapus', icon: 'trash', onYes: () => { S.templates = S.templates.filter((x) => x.id !== id); TB.toast('Template dihapus', t.name, 'info'); changed(); } }); }, { width: 180 }); }
      case 'flow-toggle': { const s = d.flowSteps.find((x) => x.k === v); s.on = b.checked; return promo.paint(pageEl); }
      case 'flow-move': { const i = +v; if (i > 0 && d.flowSteps[i - 1].k !== 'broadcast') { [d.flowSteps[i - 1], d.flowSteps[i]] = [d.flowSteps[i], d.flowSteps[i - 1]]; } return promo.paint(pageEl); }
      case 'd-src': d.sources = d.sources.includes(v) ? d.sources.filter((x) => x !== v) : [...d.sources, v]; return promo.paint(pageEl);
      case 'pr-step': { const t = +v; if (t > d.step) { for (let s = d.step; s < t; s++) if (!promo.validate(s)) { d.step = s; promo.paint(pageEl); promo.validate(s); return; } } d.step = t; return promo.paint(pageEl); }
      case 'pr-next': if (!promo.validate(d.step)) return; d.step++; return promo.paint(pageEl);
      case 'pr-prev': d.step = Math.max(0, d.step - 1); return promo.paint(pageEl);
      case 'd-acc': d.account_id = v; return promo.paint(pageEl);
      case 'd-tf': d.tf = v; return promo.left(pageEl);
      case 'd-t': { const t = S.targets.find((x) => x.id === v); if (t.status === 'banned') return TB.toast('Grup tidak tersedia', 'Akun Anda diblokir di grup ini', 'warn'); if (t.allows_promo === false) return TB.toast('Grup melarang promosi', 'Pesan promosi tidak dikirim ke grup ini sesuai aturan grup', 'warn'); d.targets = d.targets.includes(v) ? d.targets.filter((x) => x !== v) : [...d.targets, v]; const sc = pageEl.querySelector('.tb-target-list').scrollTop; promo.left(pageEl); pageEl.querySelector('.tb-target-list').scrollTop = sc; return promo.right(pageEl); }
      case 'd-tall': { const q = d.tq.toLowerCase(); const vis = S.targets.filter((t) => t.status !== 'banned' && t.allows_promo !== false && (d.tf === 'all' || t.type === d.tf) && (!q || (t.title + t.username).toLowerCase().includes(q))).map((t) => t.id); const all = vis.every((x) => d.targets.includes(x)); d.targets = all ? d.targets.filter((x) => !vis.includes(x)) : [...new Set([...d.targets, ...vis])]; promo.left(pageEl); return promo.right(pageEl); }
      case 'd-day': { const k = +v; d.days = d.days.includes(k) ? d.days.filter((x) => x !== k) : [...d.days, k].sort(); b.classList.toggle('is-on'); b.closest('.tb-field').classList.remove('has-err'); return promo.right(pageEl); }
      case 'fmt': {
        if (v === 'media') return TB.toast('Unggah media', 'Lampiran gambar/video tersedia setelah aplikasi terhubung ke storage', 'info');
        const ta = pageEl.querySelector('#d-msg');
        if (v === 'ai') { d.message = '☕ **Promo spesial untuk member {nama_grup}!**\n\n{Dapatkan|Nikmati} diskon 20% untuk semua kopi Arabika Gayo, khusus hari ini {tanggal}.\n✅ Gratis ongkir Jabodetabek\n✅ Bisa COD\n\n👉 Order: t.me/nusantara_cs'; ta.value = d.message; }
        else {
          const s0 = ta.selectionStart, s1 = ta.selectionEnd, sel = ta.value.slice(s0, s1);
          const ins = { bold: `**${sel || 'teks tebal'}**`, italic: `__${sel || 'teks miring'}__`, link: sel ? `${sel} (https://t.me/nusantara_cs)` : 'https://t.me/nusantara_cs', emoji: '🔥', var: '{nama_grup}', date: '{tanggal}', spin: `{${sel || 'Halo'}|Hai|Hallo}` }[v];
          ta.setRangeText(ins, s0, s1, 'end'); d.message = ta.value; ta.focus();
        }
        pageEl.querySelector('#d-msg-c').textContent = d.message.length + ' / 4096';
        ta.closest('.tb-field').classList.remove('has-err');
        return promo.right(pageEl);
      }
      case 'draft-reset': return TB.confirm({ title: 'Reset formulir?', text: 'Semua isian campaign yang belum disimpan akan dihapus.', confirm: 'Reset', tone: 'bad', icon: 'refresh', onYes: () => { ui.draft = TB.blankDraft(); promo.render(pageEl); } });
      case 'draft-cancel': ui.draft = null; return TB.go('campaigns');
      case 'draft-save':
      case 'pr-launch': {
        const launch = a === 'pr-launch';
        if (launch) { for (let s = 0; s < 4; s++) if (!promo.validate(s)) { d.step = s; promo.paint(pageEl); promo.validate(s); return TB.toast('Lengkapi data campaign', STEPS_ERR[s], 'warn'); } }
        else if (d.name.trim().length < 3) { d.step = 0; promo.paint(pageEl); promo.validate(0); return TB.toast('Beri nama campaign dulu', 'Nama diperlukan untuk menyimpan draft', 'warn'); }
        const e2 = promo.est(d), c0 = d.id && S.campaigns.find((x) => x.id === d.id);
        if (launch && d.start <= TB.dayKey(0) && !(c0 && c0.status === 'running') && TB.atLimit(TB.running().length, TB.lim().campaigns_active)) return TB.upsell('Batas campaign aktif tercapai', `Paket ${TB.lim().plan} mengizinkan ${TB.lim().campaigns_active} campaign berjalan bersamaan. Simpan sebagai draft atau upgrade paket.`);
        if (launch && S.emergency) return TB.toast('Mode stop darurat aktif', 'Pulihkan automation sebelum meluncurkan campaign', 'warn', { label: 'Pulihkan', fn: () => TB.act.restore() });
        const DN = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
        const daysTxt = d.days.length === 7 ? 'Setiap hari' : d.days.join() === '0,1,2,3,4' ? 'Sen–Jum' : d.days.join() === '0,1,2,3,4,5' ? 'Sen–Sab' : d.days.map((k) => DN[k]).join(', ');
        const flow = d.flowSteps.filter((s) => s.on).map((s) => s.k).join(',');
        const fields = { name: d.name.trim(), account_id: d.account_id, targets: d.targets.length, targetIds: d.targets.slice(), message: d.message, btn_text: d.btn_text, btn_url: d.btn_url, interval_min: d.interval_min, window: `${d.t_start}–${d.t_end}`, days: daysTxt, daysArr: d.days.slice(), start: d.start, end: d.end, flow, sources: d.sources.join(','), template_id: d.template_id };
        const todayS = TB.dayKey(0);
        let c = d.id && S.campaigns.find((x) => x.id === d.id);
        if (c) {
          const diffs = [];
          if (c.name !== fields.name) diffs.push('nama');
          if (c.interval_min !== fields.interval_min) diffs.push(`interval ${c.interval_min} → ${fields.interval_min} mnt`);
          if (c.targets !== fields.targets) diffs.push(`target ${c.targets} → ${fields.targets}`);
          if (c.message !== fields.message) diffs.push('isi pesan');
          if (c.window !== fields.window || c.days !== fields.days || c.start !== fields.start || c.end !== fields.end) diffs.push('jadwal');
          if ((c.flow || 'broadcast') !== flow) diffs.push('urutan proses');
          if (c.account_id !== fields.account_id) diffs.push('akun pengirim');
          Object.assign(c, fields);
          c.planned = Math.max(c.sent + 1, c.sent + e2.total);
          if (launch && c.status === 'draft') c.status = d.start > todayS ? 'scheduled' : 'running';
          TB.hist(c.id, diffs.length ? 'Diperbarui: ' + diffs.join(', ') : 'Konfigurasi disimpan tanpa perubahan');
          log('info', c, '—', 'Konfigurasi campaign diperbarui');
          TB.toast(launch ? 'Perubahan disimpan' : 'Draft disimpan', c.name, 'ok');
        } else {
          c = { id: 'c' + Date.now().toString(36), status: launch ? (d.start > todayS ? 'scheduled' : 'running') : 'draft', sent: 0, delivered: 0, failed: 0, clicks: 0, planned: e2.total, idx: S.campaigns.length, cursor: 0, gap: 2500, nextAt: Date.now() + 2500, fail_reason: '', ...fields };
          S.campaigns.unshift(c);
          const tpl = S.templates.find((t) => t.id === d.template_id);
          TB.hist(c.id, `Campaign dibuat${tpl ? ` dari template “${tpl.name}”` : ''} · alur ${d.flowSteps.filter((s) => s.on).map((s) => TB.KIND[s.k][0]).join(' → ')}`);
          if (launch) { log('info', c, '—', c.status === 'scheduled' ? 'Campaign dijadwalkan' : 'Campaign diluncurkan'); TB.hist(c.id, c.status === 'scheduled' ? `Dijadwalkan mulai ${TB.date(TB.parseDay(c.start))}` : 'Campaign diluncurkan'); }
          if (launch && c.flow.includes('join') && S.join.state !== 'running') TB.toast('Auto-Join belum berjalan', 'Mulai Auto-Join agar grup baru diikuti sebelum broadcast', 'info', { label: 'Start', fn: () => TB.act.joinState('running') });
          TB.toast(launch ? (c.status === 'scheduled' ? 'Campaign dijadwalkan' : 'Campaign diluncurkan 🚀') : 'Draft disimpan', launch ? `${c.name} · ${n(e2.total)} pesan terjadwal` : c.name, 'ok', launch && c.status === 'running' ? { label: 'Pantau', fn: () => TB.go('live') } : null);
        }
        ui.draft = null;
        ui.campFilter = 'all';
        return TB.go('campaigns');
      }
      /* reports */
      case 'rep-range': if (+v > TB.lim().report_days) return TB.upsell(`Laporan ${v} hari tersedia di paket Pro`, `Paket ${TB.lim().plan} menyimpan riwayat laporan ${TB.lim().report_days} hari.`); ui.repRange = +v; return renderPage();
      case 'rep-gran': if (v === 'monthly' && TB.lim().report_days < 180) return TB.upsell('Laporan bulanan tersedia di paket Pro', `Paket ${TB.lim().plan} hanya menyimpan ${TB.lim().report_days} hari riwayat.`); ui.repGran = v; return renderPage();
      case 'rep-sort': { const [k, dir] = ui.repSort; ui.repSort = [v, k === v && dir === 'desc' ? 'asc' : 'desc']; return TB.pages.reports.targets(pageEl); }
      case 'rep-csv': {
        if (ui.repGran === 'monthly') return download('laporan-bulanan.csv', csv(S.monthly, ['month', 'sent', 'delivered', 'links', 'joins', 'replies']));
        const { rows, from, to } = TB.repRows();
        return download(`laporan-${from}_${to}${ui.repAcc !== 'all' ? '-' + TB.accLabel(ui.repAcc).slice(1) : ''}.csv`, csv(rows, ['day', 'sent', 'delivered', 'failed', 'clicks', 'links', 'joins_ok', 'joins_failed', 'replies', 'replies_failed']));
      }
      case 'rep-pdf': return TB.busy(b, 1600, () => TB.toast('Laporan PDF siap', `Dikirim ke ${S.profile.email}`, 'ok'), 'Menyusun…');
      /* billing */
      case 'autorenew': { const p = S.profile; p.auto_renew = b.checked; TB.subEv(b.checked ? 'reactivated' : 'scheduled', b.checked ? 'Perpanjangan otomatis diaktifkan' : `Perpanjangan otomatis dimatikan · paket berakhir ${TB.date(TB.endOf(p.sub_end))}`); if (!b.checked && p.sub_status === 'active') TB.toast('Perpanjangan otomatis nonaktif', `Paket berakhir ${TB.date(TB.endOf(p.sub_end))} — Anda akan diingatkan H-${Math.max(...TB.sub().rem)}`, 'warn'); else TB.toast('Perpanjangan otomatis aktif', `Ditagih pada ${TB.date(TB.endOf(p.sub_end))}`); return changed(); }
      case 'renew': case 'sub-renew': return TB.checkout(S.profile.plan, S.profile.billing_cycle);
      case 'sub-change': return TB.checkout(v || undefined, v ? ui.planCycle : undefined);
      case 'sub-pay': { const inv = S.payments.find((i) => i.status === 'pending'); return inv ? TB.payModal(inv) : TB.checkout(); }
      case 'sub-cancel': return TB.cancelFlow();
      case 'sub-reactivate': return TB.reactivate();
      case 'sub-unschedule': { const p = S.profile; p.scheduled_change = null; p.auto_renew = true; TB.subEv('reactivated', `Perubahan paket dibatalkan · tetap di ${p.plan}`); TB.toast('Perubahan paket dibatalkan', `Tetap di paket ${p.plan}`); return changed(); }
      case 'sub-preview': return TB.previewStatus(v);
      case 'plan-cycle': ui.planCycle = v; return renderPage();
      case 'pay-pay': e.stopPropagation(); return TB.payModal(S.payments.find((i) => i.id === id));
      case 'pay-detail': return TB.paymentDetail(id);
      case 'pay-check': return TB.reconcile(S.payments.find((i) => i.id === id), b);
      case 'pay-status': ui.payStatus = v; return renderPage();
      case 'pay-export': return download('riwayat-pembayaran.csv', csv(S.payments, ['id', 'created_at', 'description', 'plan', 'cycle', 'amount_idr', 'method', 'pakasir_ref', 'status', 'paid_at', 'period_start', 'period_end', 'verified', 'activated_at', 'webhook_count', 'duplicates_ignored']));
      case 'rem-day': { const p = S.profile, k = +v; let r = TB.sub().rem; r = r.includes(k) ? r.filter((x) => x !== k) : [...r, k]; p.reminder_days = r.sort((x, y) => y - x).join(','); return renderPage(); }
      case 'rem-ch': S.prefs.notif.expiry[v] = b.checked; return TB.toast(b.checked ? 'Saluran pengingat aktif' : 'Saluran pengingat nonaktif', { email: 'Email', bot: 'Bot Telegram', app: 'In-app' }[v], 'info');
      case 'invoice': e.stopPropagation(); return TB.toast('Invoice diunduh', `INV-${id.replace('TRX-', '')}.pdf`, 'info');
      case 'invoice-all': return TB.toast('Arsip invoice disiapkan', `Dikirim ke ${S.profile.email}`, 'info');
      /* settings */
      case 'set-tab': ui.setTab = v; return renderPage();
      case 'set-save': return TB.pages.settings.save(pageEl, b);
      case 'set-discard': return renderPage();
      case 'avatar': return TB.toast('Ganti foto profil', 'Unggah foto tersedia saat terhubung ke storage', 'info');
      case 'pw-save': {
        const p1 = pageEl.querySelector('#pw1'), p2 = pageEl.querySelector('#pw2'), p0 = pageEl.querySelector('#pw0');
        if (!p0.value) { p0.focus(); return TB.toast('Masukkan kata sandi saat ini', '', 'warn'); }
        if (p1.value.length < 8) { p1.closest('.tb-field').classList.add('has-err'); p1.focus(); return TB.toast('Kata sandi terlalu pendek', 'Minimal 8 karakter', 'warn'); }
        if (p1.value !== p2.value) { p2.closest('.tb-field').classList.add('has-err'); return; }
        return TB.busy(b, 900, () => { [p0, p1, p2].forEach((x) => (x.value = '')); pageEl.querySelectorAll('#pw-m i').forEach((i) => (i.style.background = '')); TB.toast('Kata sandi diperbarui', 'Sesi lain tetap aktif'); }, 'Menyimpan…');
      }
      case 'toggle-2fa': {
        const on = b.checked;
        if (!on) { b.checked = true; return TB.confirm({ title: 'Nonaktifkan 2FA?', text: 'Akun Anda akan lebih rentan jika kata sandi bocor. Kami sangat menyarankan tetap mengaktifkan 2FA.', confirm: 'Nonaktifkan', onYes: () => { S.profile.two_factor = false; TB.toast('2FA dinonaktifkan', '', 'warn'); renderPage(); } }); }
        S.profile.two_factor = true; return TB.toast('2FA diaktifkan', 'Kode authenticator akan diminta saat login');
      }
      case 'revoke': { const s = S.sessions.find((x) => x.id === id); S.sessions = S.sessions.filter((x) => x.id !== id); TB.toast('Sesi dikeluarkan', s.device, 'info'); return renderPage(); }
      case 'revoke-all': return TB.confirm({ title: 'Keluar dari semua perangkat lain?', text: 'Semua sesi kecuali perangkat ini akan dikeluarkan.', confirm: 'Keluarkan semua', onYes: () => { S.sessions = S.sessions.filter((x) => x.current); TB.toast('Semua sesi lain dikeluarkan'); renderPage(); } });
      case 'test-notif': return TB.busy(b, 800, () => TB.toast('Notifikasi tes terkirim', 'Cek chat @TeleBlastNotifyBot', 'ok'), '');
      default:
    }
  });

  /* ---------- Data ---------- */
  let lastW = 0, lastCalc = '';
  dash.onData(() => {
    const st = IDS.map((id) => dash.data(id));
    if (!S) {
      const bad = st.find((s) => ['error', 'missing', 'connect', 'declined'].includes(s.status));
      if (bad) {
        document.getElementById('tb-loading').innerHTML = `<div class="tb-card" style="min-height:320px;display:flex;align-items:center;justify-content:center"><span style="display:inline-flex;align-items:center;gap:8px;color:var(--color-fg-muted);font-size:13px"><i style="width:.375rem;height:.375rem;border-radius:50%;background:var(--color-bad);display:inline-block"></i>Failed to load</span></div>`;
        return;
      }
      if (st.every((s) => s.status === 'ok') && ['kpi', 'campaign_perf'].every((id) => dash.data(id).status !== 'loading')) init();
      return;
    }
    const calcReady = ['kpi', 'campaign_perf'].map((id) => dash.data(id).status).join();
    if (calcReady !== lastCalc) { lastCalc = calcReady; TB.emit('change'); return; }
    const w = document.getElementById('tb-app').clientWidth;
    if (w !== lastW) {
      lastW = w;
      const pg = TB.pages[S.ui.page];
      if (pg.charts) pg.charts(document.getElementById(S.ui.page));
    }
  });
})();
