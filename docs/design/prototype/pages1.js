/* TeleBlast — pages: Overview, Live Monitoring, Campaigns, Accounts */
(() => {
  const TB = window.TB;
  const { esc, icon, n, c, pct } = TB;
  const P = (TB.pages = TB.pages || {});
  const S = () => TB.S;

  /* ---------- shared helpers ---------- */
  TB.acc = (id) => S().accounts.find((a) => a.id === id);
  TB.accLabel = (id) => { const a = TB.acc(id); return a ? '@' + a.username : 'Akun dihapus'; };
  TB.rate = (o) => (o.sent ? o.delivered / o.sent : null);
  TB.running = () => S().campaigns.filter((x) => x.status === 'running');
  TB.blocked = (cmp) => {
    const a = TB.acc(cmp.account_id);
    if (S().engine === 'paused') return 'engine';
    if (!a || a.status === 'disconnected') return 'disconnected';
    if (!a.enabled) return 'disabled';
    if (a.status === 'flood_wait') return 'flood';
    return null;
  };
  const BL = { flood: 'FloodWait', engine: 'Dijeda global', disconnected: 'Akun terputus', disabled: 'Akun nonaktif' };
  TB.greet = () => { const h = +TB.time(TB.now()).slice(0, 2); return h < 11 ? 'Selamat pagi' : h < 15 ? 'Selamat siang' : h < 18 ? 'Selamat sore' : 'Selamat malam'; };
  TB.flowHTML = (flow) => `<span class="tb-flow">${String(flow || 'broadcast').split(',').map((f) => `<span class="f" data-tip="${TB.KIND[f][0]}">${icon(TB.KIND[f][1])}</span>`).join('<span class="sep">›</span>')}</span>`;
  TB.dayKey = (off = 0) => { const d = TB.parseDay(TB.now().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' })); d.setUTCDate(d.getUTCDate() + off); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); };

  /* modules */
  TB.mods = () => {
    const run = TB.running().length;
    const bc = S().engine === 'paused' ? 'paused' : run ? 'running' : 'idle';
    const det = S().detectOn ? (S().sources.some((s) => s.active) ? 'running' : 'idle') : 'stopped';
    const rep = S().reply.on ? (S().accounts.some((a) => a.roles.includes('reply') && a.status === 'connected' && a.enabled) ? 'running' : 'idle') : 'stopped';
    return { detect: det, join: S().join.state, broadcast: bc, reply: rep };
  };
  const MS = { running: ['Berjalan', 'ok', ''], paused: ['Dijeda', 'warn', 'paused'], stopped: ['Berhenti', 'bad', 'off'], idle: ['Siaga', '', 'off'] };
  TB.MS = MS;
  TB.overall = () => {
    if (S().emergency) return ['Dihentikan darurat', 'bad', 'Semua modul dihentikan. Pulihkan saat siap melanjutkan.'];
    const m = Object.values(TB.mods());
    if (m.every((x) => x === 'running')) return ['Semua automation berjalan', 'ok', 'Deteksi, join, broadcast, dan auto-reply aktif normal.'];
    if (m.some((x) => x === 'running')) return ['Sebagian automation aktif', 'warn', `${m.filter((x) => x === 'running').length} dari 4 modul berjalan.`];
    return ['Automation tidak aktif', '', 'Tidak ada modul yang berjalan.'];
  };
  TB.automationCard = () => {
    const m = TB.mods(), o = TB.overall();
    const pend = S().links.filter((l) => l.status === 'pending').length;
    const tile = (key, name, ic, val, unit, nav, actions) => {
      const st = MS[m[key]];
      return `<div class="tb-mod"><div class="m-top"><span class="m-ico">${icon(ic)}</span><div style="min-width:0"><div class="m-name">${name}</div><div class="m-st"><span class="tb-pulse ${st[2]}" style="width:7px;height:7px"></span>${st[0]}</div></div></div>
        <div class="m-val">${val}<small>${unit}</small></div><div class="m-act">${actions}<button class="tb-btn xs ghost" data-nav="${nav}">Buka ${icon('arrow-right')}</button></div></div>`;
    };
    return `<div class="tb-card" id="automation-card">
      <div class="tb-overall"><span class="tb-pulse ${o[1] === 'ok' ? '' : o[1] === 'warn' ? 'paused' : 'off'}" style="width:11px;height:11px"></span><div style="flex:1;min-width:200px"><div class="o-t">${o[0]}</div><div class="o-s">${o[2]}</div></div>
        ${S().emergency ? `<button class="tb-btn primary" data-action="restore">${icon('power')}Pulihkan automation</button>` : `<button class="tb-btn danger" data-action="emergency">${icon('siren')}Stop darurat</button>`}</div>
      <div class="tb-mods">
        ${tile('detect', 'Auto-Detect', 'scan', `<span data-bind="links-today">—</span>`, 'link hari ini', 'detect', `<button class="tb-btn xs" data-action="detect-flip">${icon(S().detectOn ? 'pause' : 'play')}${S().detectOn ? 'Jeda' : 'Aktifkan'}</button>`)}
        ${tile('join', 'Auto-Join', 'user-plus', `<span data-bind="joins-today">—</span>`, `join hari ini · ${pend} antre`, 'join', m.join === 'running' ? `<button class="tb-btn xs" data-action="join-pause">${icon('pause')}Pause</button>` : m.join === 'paused' ? `<button class="tb-btn xs" data-action="join-resume">${icon('play')}Resume</button>` : `<button class="tb-btn xs" data-action="join-start" ${pend ? '' : 'disabled'}>${icon('play')}Start</button>`)}
        ${tile('broadcast', 'Auto Broadcast', 'send', `<span data-bind="today:sent">—</span>`, `terkirim · ${TB.running().length} campaign`, 'campaigns', S().engine === 'paused' ? `<button class="tb-btn xs" data-action="resume-all">${icon('play')}Lanjutkan</button>` : `<button class="tb-btn xs" data-action="pause-all" ${TB.running().length ? '' : 'disabled'}>${icon('pause')}Jeda</button>`)}
        ${tile('reply', 'Auto-Reply', 'reply', `<span data-bind="replies-today">—</span>`, 'balasan hari ini', 'reply', `<button class="tb-btn xs" data-action="reply-flip">${icon(S().reply.on ? 'pause' : 'play')}${S().reply.on ? 'Jeda' : 'Aktifkan'}</button>`)}
      </div></div>`;
  };

  TB.engineCard = () => {
    const run = TB.running().length, eng = S().engine;
    const paused = eng === 'paused', idle = !paused && !run;
    const cls = paused ? 'paused' : idle ? 'idle' : '';
    const title = paused ? 'Broadcast dijeda' : idle ? 'Tidak ada campaign berjalan' : 'Broadcast berjalan';
    const sub = paused ? `Semua pengiriman ditahan. ${run} campaign siap dilanjutkan kapan saja.`
      : idle ? 'Aktifkan atau buat campaign untuk mulai promosi otomatis.'
        : `${run} campaign aktif · <span data-bind="throughput">—</span> pesan/menit · mesin anti-flood aktif`;
    return `<div class="tb-engine ${cls}" id="engine-card">
      <div class="e-ico">${icon(paused ? 'pause' : idle ? 'power' : 'radio')}</div>
      <div style="min-width:0"><div class="e-t"><span class="tb-pulse ${paused ? 'paused' : idle ? 'off' : ''}"></span>${title}</div><div class="e-s">${sub}</div></div>
      <div class="e-actions">
        ${paused ? `<button class="tb-btn primary" data-action="resume-all">${icon('play')}Lanjutkan semua</button>`
          : `<button class="tb-btn warn" data-action="pause-all" ${idle ? 'disabled' : ''}>${icon('pause')}Jeda semua</button>`}
        <button class="tb-btn danger" data-action="stop-all" ${!run && !S().campaigns.some((x) => x.status === 'paused') ? 'disabled' : ''}>${icon('circle-stop')}Hentikan semua</button>
      </div></div>`;
  };

  TB.alerts = () => {
    const out = [];
    S().accounts.forEach((a) => {
      if (a.status === 'disconnected') out.push(`<div class="tb-alert bad"><div class="a-ico">${icon('unlink')}</div><div class="a-b"><div class="a-t">Sesi @${esc(a.username)} kedaluwarsa · koneksi terputus</div><div class="a-s">Campaign, auto-join, dan auto-reply yang memakai akun ini tertahan sampai akun dihubungkan ulang.</div></div><button class="tb-btn sm" data-action="reconnect" data-id="${a.id}">${icon('refresh')}Hubungkan ulang</button></div>`);
      if (a.status === 'flood_wait') out.push(`<div class="tb-alert warn"><div class="a-ico">${icon('clock')}</div><div class="a-b"><div class="a-t">@${esc(a.username)} dibatasi sementara (FloodWait) · pulih dalam <span class="num" data-bind="flood:${a.id}">—</span></div><div class="a-s">Pengiriman dari akun ini dijeda otomatis untuk mencegah pembatasan permanen dari Telegram.</div></div><button class="tb-btn sm ghost" data-nav="accounts">Lihat akun</button></div>`);
    });
    const p = S().profile;
    const sa = TB.subAlert(); if (sa) out.unshift(sa);
    return out.length ? `<div class="tb-stack mt-16" style="gap:10px">${out.join('')}</div>` : '';
  };

  const today = () => TB.dayKey(0);
  const adToday = (k) => S().adaily.filter((d) => d.day === today()).reduce((a, d) => a + (+d[k] || 0), 0);
  TB.bind('throughput', () => n(TB.throughput()));
  TB.bind('flood', (id) => { const a = TB.acc(id); return a && a.floodUntil ? TB.dur((a.floodUntil - Date.now()) / 1000) : '—'; });
  TB.bind('csent', (id) => { const x = S().campaigns.find((k) => k.id === id); return x ? n(x.sent) : '—'; });
  TB.bind('cpct', (id) => { const x = S().campaigns.find((k) => k.id === id); return x && x.planned ? pct(Math.min(1, x.sent / x.planned), 0) : '—'; });
  TB.bind('crate', (id) => { const x = S().campaigns.find((k) => k.id === id); return x ? pct(TB.rate(x)) : '—'; });
  TB.bind('asent', (id) => { const a = TB.acc(id); return a ? n(a.sent_today) : '—'; });
  TB.bind('today', (k) => n(S().hourly.reduce((s, h) => s + (+h[k] || 0), 0)));
  TB.bind('today-rate', () => { const s = S().hourly.reduce((a, h) => a + (+h.sent || 0), 0), d = S().hourly.reduce((a, h) => a + (+h.delivered || 0), 0); return pct(s ? d / s : null); });
  TB.bind('links-today', () => n(S().links.filter((l) => TB.isToday(l.found_at)).length));
  TB.bind('joins-today', () => n(adToday('joins_ok')));
  TB.bind('replies-today', () => n(adToday('replies')));
  TB.bind('queue', () => n(TB.queue()));
  TB.bind('join-pend', () => n(S().links.filter((l) => l.status === 'pending').length));
  TB.bind('next', (id) => { const x = S().campaigns.find((k) => k.id === id); if (!x || x.status !== 'running' || TB.blocked(x)) return '—'; return Math.max(0, Math.ceil((x.nextAt - Date.now()) / 1000)) + 'd'; });
  TB.bind('cur', (id) => { const x = S().campaigns.find((k) => k.id === id); return x && x.lastTarget ? x.lastTarget : 'Menyiapkan target pertama…'; });
  TB.bind('takeaway', () => TB.takeaway());

  TB.takeaway = () => {
    const k = TB.calc('kpi')[0] || {};
    const issues = S().accounts.filter((a) => a.status !== 'connected').length;
    return `${TB.overall()[0]} · keberhasilan broadcast ${pct(k.rate_7d)} dalam 7 hari${issues ? ` · ${issues} akun perlu perhatian` : ' · semua akun sehat'}.`;
  };

  const progCls = (x) => (x.status === 'running' ? (TB.blocked(x) ? 'warn' : 'striped') : x.status === 'paused' ? 'warn' : x.status === 'completed' ? 'ok' : x.status === 'stopped' || x.status === 'failed' ? 'bad' : 'muted');
  TB.progCls = progCls;
  const mini3 = (items) => `<div class="tb-mini3">${items.map(([v, l, col]) => `<div><div class="v" ${col ? `style="color:${col}"` : ''}>${v}</div><div class="l">${l}</div></div>`).join('')}</div>`;

  /* ======================= OVERVIEW ======================= */
  P.overview = {
    title: 'Overview', section: 'Utama',
    render(el) {
      const p = S().profile, k = TB.calc('kpi')[0] || {}, s = TB.sub(), Lm = TB.lim();
      const first = p.name.split(' ')[0];
      const A = S().accounts, L = S().links.filter((l) => l.kind !== 'invalid'), C = S().campaigns;
      const lim = TB.planInfo().accounts;
      const errs = [...S().notifs.filter((x) => x.kind === 'error' || x.kind === 'warning').map((x) => ({ t: x.title, s: x.body, ts: x.ts, k: x.kind })), ...S().activity.filter((e) => e.level === 'error').slice(0, 4).map((e) => ({ t: e.event, s: `${TB.KIND[e.kind || 'broadcast'][0]} · ${e.target !== '—' ? e.target : e.account}`, ts: e.ts, k: 'error' }))].sort((a, b) => (a.ts < b.ts ? 1 : -1)).slice(0, 6);
      const rep7 = S().adaily.filter((d) => d.day > TB.dayKey(-8) && d.day < today());
      const repN = rep7.reduce((a, d) => a + d.replies, 0), repF = rep7.reduce((a, d) => a + d.replies_failed, 0);
      const all = S().links.length;
      const funnel = [['Terdeteksi', all, TB.COL.tg], ['Lolos kriteria', S().links.filter((l) => l.status !== 'skipped' && l.kind !== 'invalid').length, TB.COL.tg], ['Diproses join', S().links.filter((l) => ['joined', 'failed', 'approval'].includes(l.status)).length, TB.COL.tg], ['Berhasil diikuti', S().links.filter((l) => l.status === 'joined').length, 'var(--color-ok)']];
      el.innerHTML = `
      <div class="tb-head"><div><h1>${TB.greet()}, ${esc(first)} 👋</h1><p data-bind="takeaway">—</p></div>
        <div class="actions"><button class="tb-btn" data-nav="reports">${icon('bar-chart')}Laporan</button><button class="tb-btn primary" data-action="new-campaign">${icon('plus')}Campaign baru</button></div></div>
      ${TB.automationCard()}
      ${TB.alerts()}
      <div class="tb-grid k4 mt-16">
        <div class="tb-card tb-kpi interactive" data-source="tg_accounts"><div class="k-top"><span class="k-lbl">Akun Telegram terhubung</span><span class="k-ico">${icon('smartphone')}</span></div>
          <div class="k-val">${A.filter((a) => a.status === 'connected').length}<small>/ ${lim} slot</small></div>
          ${mini3([[A.filter((a) => a.status === 'connected').length, 'Terhubung', 'var(--color-ok)'], [A.filter((a) => a.status === 'flood_wait').length, 'Dibatasi', 'var(--color-warn)'], [A.filter((a) => a.status === 'disconnected').length, 'Terputus', 'var(--color-bad)']])}</div>
        <div class="tb-card tb-kpi interactive" data-source="detected_links"><div class="k-top"><span class="k-lbl">Grup & channel</span><span class="k-ico violet">${icon('users')}</span></div>
          <div class="k-val">${n(L.filter((l) => l.status === 'joined').length)}<small>diikuti dari ${n(L.length)} ditemukan</small></div>
          ${mini3([[n(L.length), 'Ditemukan'], [n(L.filter((l) => l.status === 'joined').length), 'Diikuti', 'var(--color-ok)'], [`<span data-bind="join-pend">—</span>`, 'Antrean']])}</div>
        <div class="tb-card tb-kpi interactive" data-source="campaigns"><div class="k-top"><span class="k-lbl">Campaign</span><span class="k-ico ok">${icon('megaphone')}</span></div>
          <div class="k-val">${C.filter((x) => x.status === 'running').length}<small>berjalan sekarang</small></div>
          ${mini3([[C.filter((x) => ['running', 'paused'].includes(x.status)).length, 'Aktif'], [C.filter((x) => x.status === 'scheduled').length, 'Terjadwal'], [C.filter((x) => x.status === 'completed').length, 'Selesai']])}</div>
        <div class="tb-card tb-kpi interactive" data-source="profile"><div class="k-top"><span class="k-lbl">Langganan</span><span class="k-ico warn">${icon('crown')}</span></div>
          <div class="k-val">${esc(p.plan)}<small>${s.free ? 'gratis' : p.billing_cycle === 'yearly' ? 'tahunan' : 'bulanan'}${s.effective !== p.plan ? ' · batas ' + esc(s.effective) : ''}</small></div>
          <div class="k-foot"><span class="tb-badge ${TB.SS[s.st].c}">${s.st === 'expired' && s.inGrace ? 'Masa tenggang' : TB.SS[s.st].l}</span><span>${s.free ? 'tanpa masa berlaku' : s.daysLeft > 0 ? `${s.daysLeft} hari lagi · ${TB.dshort(TB.endOf(p.sub_end))}` : `berakhir ${TB.dshort(TB.endOf(p.sub_end))}`}</span></div>
          <div style="margin-top:8px">${TB.prog(s.free ? 1 : Math.max(0, Math.min(1, 1 - s.daysLeft / 31)), s.daysLeft <= 3 || s.st === 'expired' ? 'warn' : '')}</div>
          <div class="k-foot" style="margin-top:6px;justify-content:space-between"><span>${icon('smartphone')} ${A.filter((a) => a.enabled).length}/${TB.unl(Lm.accounts)} akun aktif</span><button class="tb-btn xs" data-nav="billing">Kelola</button></div></div>
      </div>
      <div class="tb-grid main-side mt-16">
        <div class="tb-card" id="ov-perf">
          <div class="tb-card-h"><div><h3>Statistik broadcast</h3><p>Pesan berhasil dan gagal per hari</p></div>
            <div class="tb-btn-group" role="tablist">${[7, 14, 30].map((r) => `<button class="tb-seg ${S().ui.ovRange === r ? 'is-on' : ''}" data-action="ov-range" data-v="${r}">${r} hari</button>`).join('')}</div></div>
          <div class="tb-card-b"><div class="tb-row wrap" style="gap:22px;margin-bottom:12px">
              <div><div class="muted" style="font-size:12px">Terkirim · 7 hari</div><div class="tb-row" style="gap:8px"><b style="font-size:18px" class="num" data-source="kpi" data-field="sent_7d" data-row="0">${n(k.sent_7d)}</b>${TB.delta(k.sent_7d, k.sent_prev)}</div></div>
              <div><div class="muted" style="font-size:12px">Keberhasilan</div><div class="tb-row" style="gap:8px"><b style="font-size:18px" class="num" data-source="kpi" data-field="rate_7d" data-row="0">${pct(k.rate_7d)}</b>${TB.delta(k.rate_7d, k.rate_prev, { pts: true })}</div></div>
              <div><div class="muted" style="font-size:12px">Klik tautan</div><div class="tb-row" style="gap:8px"><b style="font-size:18px" class="num" data-source="kpi" data-field="clicks_7d" data-row="0">${n(k.clicks_7d)}</b>${TB.delta(k.clicks_7d, k.clicks_prev)}</div></div>
              <span class="tb-sp"></span><div class="tb-legend"><span><i style="background:${TB.COL.tg}"></i>Berhasil</span><span><i style="background:var(--color-bad)"></i>Gagal</span></div></div>
            <div class="tb-chart" id="ov-chart" data-source="daily" style="min-height:230px"></div></div>
        </div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Statistik auto-reply</h3><p>7 hari terakhir</p></div><button class="tb-btn sm ghost" data-nav="reply">Kelola ${icon('arrow-right')}</button></div>
          <div class="tb-card-b" data-source="account_daily">${mini3([[n(repN + repF), 'Pesan masuk'], [n(repN), 'Dibalas', 'var(--color-ok)'], [n(repF), 'Gagal', 'var(--color-bad)']])}
            <div class="tb-chart mt-16" id="ov-reply" style="min-height:150px"></div>
            <div class="tb-row between mt-8" style="font-size:12.5px"><span class="muted">Aturan aktif</span><b>${S().rules.filter((r) => r.active).length} dari ${S().rules.length}</b></div>
            <div class="tb-row between mt-8" style="font-size:12.5px"><span class="muted">Paling sering terpakai</span><b class="tb-ellipsis" style="max-width:60%">${esc((S().rules.slice().sort((a, b) => b.hits_7d - a.hits_7d)[0] || {}).name || '—')}</b></div></div></div>
      </div>
      <div class="tb-grid k3 mt-16">
        <div class="tb-card"><div class="tb-card-h"><div><h3>Aktivitas terbaru <span class="tb-badge ok live" style="margin-left:2px">Live</span></h3><p>Semua modul automation</p></div><button class="tb-btn sm ghost" data-nav="live">Monitor ${icon('arrow-right')}</button></div>
          <div class="tb-card-b" style="padding-top:6px"><div class="tb-list" id="ov-activity" data-source="activity"></div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Notifikasi error</h3><p>Masalah yang perlu ditindaklanjuti</p></div><span class="tb-badge bad plain">${errs.length}</span></div>
          <div class="tb-card-b" style="padding-top:6px"><div class="tb-list" data-source="notifications">${errs.length ? errs.map((e) => `<div class="tb-li"><div class="ico ${e.k === 'warning' ? 'warn' : 'bad'}">${icon(e.k === 'warning' ? 'alert' : 'x-circle')}</div><div class="body"><div class="t">${esc(e.t)}</div><div class="s">${esc(e.s)}</div></div><div class="time">${TB.ago(e.ts)}</div></div>`).join('') : TB.empty('check-circle', 'Tidak ada error', 'Semua automation berjalan tanpa masalah.')}</div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Alur link → join</h3><p>Dari deteksi hingga bergabung</p></div><button class="tb-btn sm ghost" data-nav="detect">Detail ${icon('arrow-right')}</button></div>
          <div class="tb-card-b"><div class="tb-hbar" data-source="detected_links">${funnel.map(([l, v, col]) => `<span class="hb-l">${l}</span><span class="hb-v">${n(v)} <span class="muted" style="font-weight:500">${pct(v / (all || 1), 0)}</span></span><div class="hb-track"><i style="width:${(v / (all || 1)) * 100}%;background:${col}"></i></div>`).join('')}</div></div></div>
      </div>`;
      this.tick(el);
    },
    charts(el) {
      const r = S().ui.ovRange;
      TB.chart.bars(el.querySelector('#ov-chart'), {
        rows: S().daily.slice(-r), stacked: true, height: 230, maxBar: 26,
        series: [{ key: 'delivered', label: 'Berhasil', color: TB.COL.tg }, { key: 'failed', label: 'Gagal', color: 'var(--color-bad)' }],
        xFmt: (d) => TB.dshort(TB.parseDay(d.day)),
        tipTitle: (d) => TB.date(TB.parseDay(d.day), { weekday: 'long', day: 'numeric', month: 'short' }),
        tipExtra: (d) => [['Keberhasilan', pct(d.sent ? d.delivered / d.sent : null)]],
      });
      const days = [...new Set(S().adaily.map((d) => d.day))].sort().slice(-7);
      const rows = days.map((day) => { const x = S().adaily.filter((d) => d.day === day); return { day, replies: x.reduce((a, d) => a + d.replies, 0), failed: x.reduce((a, d) => a + d.replies_failed, 0) }; });
      TB.chart.bars(el.querySelector('#ov-reply'), { rows, stacked: true, height: 150, maxBar: 22, series: [{ key: 'replies', label: 'Dibalas', color: 'var(--color-ok)' }, { key: 'failed', label: 'Gagal', color: 'var(--color-bad)' }], xFmt: (d) => TB.date(TB.parseDay(d.day), { weekday: 'short' }), tipTitle: (d) => TB.date(TB.parseDay(d.day), { weekday: 'long', day: 'numeric', month: 'short' }) });
    },
    tick(el) {
      const box = el.querySelector('#ov-activity');
      if (box) box.innerHTML = S().activity.slice(0, 6).map(TB.activityLi).join('');
    },
  };
  TB.activityLi = (e) => {
    const tone = { success: 'ok', info: 'info', warning: 'warn', error: 'bad' }[e.level];
    const K = TB.KIND[e.kind || 'broadcast'];
    return `<div class="tb-li"><div class="ico ${tone}">${icon(K[1])}</div><div class="body"><div class="t">${esc(e.event)}</div><div class="s">${esc(K[0])} · ${esc(e.target !== '—' ? e.target : e.account)}</div></div><div class="time">${TB.ago(e.ts)}</div></div>`;
  };

  /* ======================= LIVE MONITORING ======================= */
  const KF = [['all', 'Semua'], ['broadcast', 'Broadcast'], ['join', 'Join'], ['detect', 'Deteksi'], ['reply', 'Reply'], ['system', 'Sistem']];
  P.live = {
    title: 'Live Monitoring', section: 'Utama',
    render(el) {
      const ui = S().ui, m = TB.mods();
      const runs = S().campaigns.filter((x) => ['running', 'paused'].includes(x.status));
      const pend = S().links.filter((l) => l.status === 'pending').length, jt = adToday('joins_ok');
      const W = [['Broadcast worker', m.broadcast, 'SG-2'], ['Join worker', m.join, 'SG-2'], ['Link listener', m.detect, 'SG-1'], ['Reply listener', m.reply, 'SG-1']];
      const JS = { running: { l: 'Berjalan', c: 'ok live' }, paused: { l: 'Dijeda', c: 'warn' }, stopped: { l: 'Berhenti', c: 'bad' } };
      el.innerHTML = `
      <div class="tb-head"><div><h1>Live Monitoring</h1><p>Pantau worker, antrean, dan setiap aktivitas automation secara real-time.</p></div>
        <div class="actions"><span class="tb-badge ok live" style="height:30px;padding:0 12px">Realtime · diperbarui tiap detik</span></div></div>
      <div class="tb-emergency">
        <div style="width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:var(--bad-soft);color:var(--bad);flex:none">${icon('siren')}</div>
        <div style="flex:1;min-width:220px"><b>Kontrol penghentian darurat</b><div class="muted" style="font-size:12.5px">${S().emergency ? 'Semua modul sedang dihentikan. Campaign tetap dijeda sampai Anda melanjutkannya satu per satu.' : 'Hentikan seketika broadcast, auto-join, deteksi link, dan auto-reply di semua akun.'}</div></div>
        ${S().emergency ? `<button class="tb-btn primary" data-action="restore">${icon('power')}Pulihkan automation</button>` : `<button class="tb-btn danger-solid" data-action="emergency">${icon('siren')}Stop darurat</button>`}
      </div>
      ${TB.alerts()}
      <div class="tb-card tb-live-hero mt-16" id="live-hero" data-source="hourly">
        <div><div class="l">${icon('server')}Status worker</div><div class="tb-workers">${W.map(([nm, st, node]) => `<div><span class="tb-pulse ${MS[st][2]}"></span><span style="flex:1">${nm}</span><span class="muted" style="font-size:11.5px">${MS[st][0]} · ${node}</span></div>`).join('')}</div></div>
        <div><div class="l">${icon('scan')}Link ditemukan hari ini</div><div class="v" data-bind="links-today" data-flash>—</div><div class="l">${S().sources.filter((s) => s.active).length} sumber dipantau</div></div>
        <div><div class="l">${icon('user-plus')}Antrean auto-join</div><div class="v"><span data-bind="joins-today">—</span><span class="muted" style="font-size:13px;font-weight:500"> / ${jt + pend} hari ini</span></div><div style="margin-top:8px">${TB.prog(jt / ((jt + pend) || 1), 'ok')}</div><div class="l" style="margin-top:6px"><span data-bind="join-pend">—</span> menunggu · ${MS[m.join][0].toLowerCase()}</div></div>
        <div><div class="l">${icon('send')}Broadcast hari ini</div><div class="v" data-bind="today:sent" data-flash>—</div><div class="l"><span data-bind="throughput">—</span>/mnt · <span data-bind="today-rate">—</span> sukses</div></div>
        <div><div class="l">${icon('reply')}Auto-reply hari ini</div><div class="v" data-bind="replies-today" data-flash>—</div><div class="l">${S().rlog.filter((x) => x.status === 'failed').length} gagal diproses</div></div>
      </div>
      <div class="tb-grid main-side mt-16">
        <div class="tb-console" id="live-console" data-source="activity">
          <div class="tb-console-h"><h3>${icon('activity')}Log aktivitas${TB.lim().monitoring === 'Dasar' ? ' ' + TB.lock('Monitoring dasar') : ''}</h3><span class="tb-sp"></span>
            <button class="tb-btn xs" data-action="log-pause">${icon(ui.logPaused ? 'play' : 'pause')}${ui.logPaused ? 'Lanjutkan' : 'Jeda stream'}</button>
            <button class="tb-btn xs icon" data-action="log-export" data-tip="Unduh log CSV">${icon('download')}</button>
            <div class="tb-row wrap" style="gap:6px;width:100%">${KF.map(([k, l]) => `<button class="tb-chip ${ui.logKind === k ? 'is-on' : ''}" data-action="log-kind" data-v="${k}">${l}</button>`).join('')}</div>
            <div class="tb-row wrap" style="gap:6px;width:100%">
              <select class="tb-input sm" id="lg-level" aria-label="Level"><option value="all">Semua level</option>${[['success', 'Sukses'], ['info', 'Info'], ['warning', 'Peringatan'], ['error', 'Error']].map(([k, l]) => `<option value="${k}" ${ui.logLevel === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
              <select class="tb-input sm" id="lg-acc" ${TB.lim().monitoring === 'Dasar' ? 'disabled title="Filter lanjutan tersedia di paket Pro"' : ''} aria-label="Akun"><option value="all">Semua akun</option>${S().accounts.map((a) => `<option value="@${esc(a.username)}" ${ui.logAcc === '@' + a.username ? 'selected' : ''}>@${esc(a.username)}</option>`).join('')}</select>
              <select class="tb-input sm" id="lg-camp" ${TB.lim().monitoring === 'Dasar' ? 'disabled title="Filter lanjutan tersedia di paket Pro"' : ''} aria-label="Campaign"><option value="all">Semua campaign</option>${S().campaigns.map((x) => `<option value="${x.id}" ${ui.logCamp === x.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
              <select class="tb-input sm" id="lg-time" ${TB.lim().monitoring === 'Dasar' ? 'disabled title="Filter lanjutan tersedia di paket Pro"' : ''} aria-label="Waktu">${[['15', '15 menit terakhir'], ['60', '1 jam terakhir'], ['today', 'Hari ini'], ['all', 'Semua waktu']].map(([k, l]) => `<option value="${k}" ${ui.logTime === k ? 'selected' : ''}>${l}</option>`).join('')}</select>
            </div>
          </div>
          <div class="tb-console-body" id="live-log"></div>
          <div class="tb-console-f"><span id="live-log-count">—</span><span>${ui.logPaused ? '⏸ stream dijeda' : '● streaming'}</span></div>
        </div>
        <div class="tb-stack" id="live-runs">
          <div class="tb-card tb-run" data-source="detected_links"><div class="tb-run-top"><span style="width:40px;height:40px;border-radius:11px;display:grid;place-items:center;background:var(--tg-soft);color:var(--tg-ink);flex:none">${icon('user-plus')}</span><div style="flex:1;min-width:0"><b>Progres auto-join</b><div class="muted tb-ellipsis" style="font-size:12px" data-bind="join-next">—</div></div>${TB.badge(JS, S().join.state)}</div>
            <div><div class="tb-row between" style="font-size:12px;margin-bottom:6px"><span class="muted">Batas jam ini</span><span class="num"><b data-bind="join-hour">—</b> / ${S().profile.join_per_hour}</span></div><div class="tb-prog ok"><i data-joinw style="width:0%"></i></div></div>
            <div class="tb-row" style="gap:6px">${S().join.state === 'running' ? `<button class="tb-btn sm warn" data-action="join-pause">${icon('pause')}Pause</button>` : S().join.state === 'paused' ? `<button class="tb-btn sm primary" data-action="join-resume">${icon('play')}Resume</button>` : `<button class="tb-btn sm primary" data-action="join-start">${icon('play')}Start</button>`}<button class="tb-btn sm danger" data-action="join-stop" ${S().join.state === 'stopped' ? 'disabled' : ''}>${icon('circle-stop')}Stop</button><span class="tb-sp"></span><button class="tb-btn sm ghost" data-nav="join">Antrean ${icon('arrow-right')}</button></div></div>
          ${runs.length ? runs.map((x) => {
            const b = x.status === 'running' && TB.blocked(x);
            return `<div class="tb-card tb-run" data-source="campaigns">
              <div class="tb-run-top">
                <div class="tb-countdown" data-cd="${x.id}"><span data-bind="next:${x.id}">—</span></div>
                <div style="min-width:0;flex:1"><div class="t tb-ellipsis" style="font-weight:620;letter-spacing:-0.01em">${esc(x.name)}</div>
                  <div class="tb-run-meta"><span>${icon('smartphone')}${esc(TB.accLabel(x.account_id))}</span><span>${icon('clock')}tiap ${x.interval_min} mnt</span></div></div>
                ${b ? `<span class="tb-badge warn">${BL[b]}</span>` : TB.badge(TB.CS, x.status)}
              </div>
              <div class="tb-now">${icon(x.status === 'running' && !b ? 'send' : 'pause')}<span class="tb-ellipsis">${x.status === 'running' && !b ? '<span class="muted">Terakhir: </span>' : ''}<span data-bind="cur:${x.id}">—</span></span></div>
              <div><div class="tb-row between" style="font-size:12px;margin-bottom:6px"><span class="muted"><b class="num" style="color:var(--color-fg)" data-bind="csent:${x.id}">—</b> / ${n(x.planned)} pesan</span><span class="num" data-bind="cpct:${x.id}">—</span></div>
                <div class="tb-prog ${progCls(x)}"><i data-progw="${x.id}" style="width:${(Math.min(1, x.sent / x.planned) * 100).toFixed(1)}%"></i></div></div>
              <div class="tb-row" style="gap:6px">
                ${x.status === 'running' ? `<button class="tb-btn sm warn" data-action="c-pause" data-id="${x.id}">${icon('pause')}Jeda</button>` : `<button class="tb-btn sm primary" data-action="c-resume" data-id="${x.id}">${icon('play')}Lanjutkan</button>`}
                <button class="tb-btn sm danger" data-action="c-stop" data-id="${x.id}">${icon('circle-stop')}Hentikan</button>
                <span class="tb-sp"></span><button class="tb-btn sm ghost icon" data-action="c-detail" data-id="${x.id}" data-tip="Detail">${icon('eye')}</button>
              </div></div>`;
          }).join('') : `<div class="tb-card">${TB.empty('radio', 'Tidak ada campaign berjalan', 'Campaign yang berjalan atau dijeda akan muncul di sini beserta progresnya.', `<button class="tb-btn primary sm" data-action="new-campaign">${icon('plus')}Buat campaign</button>`)}</div>`}
        </div>
      </div>
      <div class="tb-grid main-side mt-16">
        <div class="tb-card"><div class="tb-card-h"><div><h3>Broadcast per jam · hari ini</h3><p>Jam berjalan disorot, diperbarui langsung</p></div></div>
          <div class="tb-card-b"><div class="tb-chart" id="live-hourly" data-source="hourly" style="min-height:220px"></div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Koneksi & kesehatan akun</h3><p>Sesi, batas harian, dan status anti-flood</p></div></div>
          <div class="tb-card-b" style="padding-top:8px" data-source="tg_accounts"><div class="tb-list">${S().accounts.map((a) => `
            <div class="tb-li" style="flex-wrap:wrap">
              <span class="tb-avatar sm round" style="background:${TB.grad(a.username)}">${esc(TB.initials(a.display_name))}</span>
              <div class="body"><div class="t">@${esc(a.username)}${a.enabled ? '' : ' <span class="tb-tag">nonaktif</span>'}</div><div class="s">${a.status === 'flood_wait' ? `Pulih dalam <span data-bind="flood:${a.id}">—</span>` : a.status === 'disconnected' ? 'Koneksi terputus · sesi kedaluwarsa' : `Kesehatan ${a.health}% · ${esc(a.device)}`}</div></div>
              ${TB.badge(TB.AS, a.status)}
              <div style="width:100%" class="tb-cell-bar"><div class="tb-prog ${a.sent_today / a.daily_limit > 0.85 ? 'warn' : ''}"><i data-accw="${a.id}" style="width:${Math.min(100, (a.sent_today / a.daily_limit) * 100)}%"></i></div><span class="num muted" style="font-size:12px;white-space:nowrap"><span data-bind="asent:${a.id}">—</span>/${n(a.daily_limit)}</span></div>
            </div>`).join('')}</div></div></div>
      </div>`;
      ['lg-level:logLevel', 'lg-acc:logAcc', 'lg-camp:logCamp', 'lg-time:logTime'].forEach((pair) => { const [idd, key] = pair.split(':'); el.querySelector('#' + idd).addEventListener('change', (e) => { ui[key] = e.target.value; this.lastLog = null; this.renderLog(el, true); }); });
      this.lastLog = null;
      this.renderLog(el, true);
      this.tick(el);
    },
    renderLog(el, full) {
      const ui = S().ui, box = el.querySelector('#live-log');
      if (!box) return;
      const now = TB.now().getTime();
      const filt = (e) => (ui.logKind === 'all' || (e.kind || 'broadcast') === ui.logKind) && (ui.logLevel === 'all' || e.level === ui.logLevel) && (ui.logAcc === 'all' || e.account === ui.logAcc) && (ui.logCamp === 'all' || e.campaign_id === ui.logCamp)
        && (ui.logTime === 'all' || (ui.logTime === 'today' ? TB.isToday(e.ts) : now - new Date(e.ts).getTime() <= +ui.logTime * 60000));
      const KS = { broadcast: 'BC', join: 'JOIN', detect: 'LINK', reply: 'DM', system: 'SYS' };
      const row = (e, isNew) => `<div class="tb-log-row ${isNew ? 'is-new' : ''}"><span class="ts">${TB.time(e.ts, true)}</span><span class="lv ${e.level}">${{ success: 'OK', info: 'INFO', warning: 'WARN', error: 'FAIL' }[e.level]}</span><span class="msg"><span class="kind">${KS[e.kind || 'broadcast']}</span>${esc(e.event)}${e.target && e.target !== '—' ? ` <span class="dim">→</span> <em>${esc(e.target)}</em>` : ''} <span class="dim">· ${esc(e.account)}${e.campaign_id ? ' · ' + esc(e.campaign) : ''}</span></span></div>`;
      if (full || this.lastLog == null) {
        const list = S().activity.filter(filt).slice(0, 150);
        box.innerHTML = list.length ? list.map((e) => row(e, false)).join('') : `<div style="padding:40px;text-align:center;color:#6b8196">Tidak ada log untuk filter ini.</div>`;
      } else if (!ui.logPaused) {
        const fresh = [];
        for (const e of S().activity) { if (e.seq <= this.lastLog) break; if (filt(e)) fresh.push(e); }
        if (fresh.length) {
          if (box.firstElementChild && !box.firstElementChild.classList.contains('tb-log-row')) box.innerHTML = '';
          box.insertAdjacentHTML('afterbegin', fresh.map((e) => row(e, true)).join(''));
          while (box.children.length > 150) box.lastElementChild.remove();
        }
      }
      if (!ui.logPaused || full) this.lastLog = S().activity[0] ? S().activity[0].seq : 0;
      const cnt = el.querySelector('#live-log-count');
      if (cnt) cnt.textContent = `${n(S().activity.filter(filt).length)} event · ${n(S().activity.filter((e) => filt(e) && e.level === 'error').length)} error`;
    },
    charts(el) {
      const hr = +TB.time(TB.now()).slice(0, 2);
      TB.chart.bars(el.querySelector('#live-hourly'), {
        rows: S().hourly, height: 220, pad: 0.22,
        series: [{ key: 'sent', label: 'Terkirim', color: (r) => (r.hour === hr ? TB.COL.tg2 : 'color-mix(in srgb, #2AABEE 42%, transparent)') }],
        xFmt: (r) => String(r.hour).padStart(2, '0'),
        tipTitle: (r) => `${String(r.hour).padStart(2, '0')}:00 – ${String(r.hour).padStart(2, '0')}:59${r.hour === hr ? ' (berjalan)' : ''}`,
        tipExtra: (r) => (r.sent == null ? [] : [['Berhasil', n(r.delivered)]]),
      });
      this.lastChart = Date.now();
    },
    tick(el) {
      this.renderLog(el, false);
      el.querySelectorAll('[data-cd]').forEach((cd) => {
        const x = S().campaigns.find((k) => k.id === cd.dataset.cd);
        if (!x) return;
        const ok = x.status === 'running' && !TB.blocked(x);
        const p = ok ? Math.max(0, Math.min(1, (x.nextAt - Date.now()) / (x.gap || 1))) : 0;
        cd.style.setProperty('--p', (100 - p * 100).toFixed(1));
      });
      el.querySelectorAll('[data-progw]').forEach((i) => { const x = S().campaigns.find((k) => k.id === i.dataset.progw); if (x) i.style.width = (Math.min(1, x.sent / x.planned) * 100).toFixed(1) + '%'; });
      el.querySelectorAll('[data-accw]').forEach((i) => { const a = TB.acc(i.dataset.accw); if (a) i.style.width = Math.min(100, (a.sent_today / a.daily_limit) * 100) + '%'; });
      const jw = el.querySelector('[data-joinw]'); if (jw) jw.style.width = Math.min(100, (TB.joinsThisHour() / S().profile.join_per_hour) * 100) + '%';
      if (!this.lastChart || Date.now() - this.lastChart > 8000) {
        const ch = el.querySelector('#live-hourly');
        if (ch && !ch.querySelector('.tb-tip.on')) this.charts(el);
      }
    },
  };

  /* ======================= CAMPAIGNS ======================= */
  const CF = [['all', 'Semua'], ['draft', 'Draft'], ['scheduled', 'Scheduled'], ['running', 'Running'], ['paused', 'Paused'], ['completed', 'Completed'], ['failed', 'Failed'], ['stopped', 'Dihentikan']];
  P.campaigns = {
    title: 'Campaign', section: 'Automation',
    render(el) {
      const ui = S().ui, all = S().campaigns;
      const cnt = (k) => (k === 'all' ? all.length : all.filter((x) => x.status === k).length);
      el.innerHTML = `
      <div class="tb-head"><div><h1>Manajemen Campaign</h1><p>Gabungkan akun, sumber deteksi, target, dan template menjadi alur automation — lalu kendalikan kapan saja.</p></div>
        <div class="actions"><button class="tb-btn" data-action="export-campaigns">${icon('download')}Ekspor CSV</button><button class="tb-btn primary" data-action="new-campaign">${icon('plus')}Buat campaign</button></div></div>
      ${TB.engineCard()}
      <div class="tb-grid k4 mt-16" style="margin-bottom:16px" data-source="campaigns">
        ${[['running', 'Running', 'radio', 'ok'], ['scheduled', 'Scheduled', 'calendar', ''], ['completed', 'Completed', 'check-circle', 'violet'], ['failed', 'Failed', 'x-circle', 'warn']].map(([k, l, ic, tone]) => `
          <button class="tb-card tb-kpi interactive" style="text-align:left;cursor:pointer;padding:14px 16px" data-action="camp-filter" data-v="${k}">
            <div class="k-top"><span class="k-lbl">${l}</span><span class="k-ico ${tone}" style="width:28px;height:28px">${icon(ic)}</span></div>
            <div class="k-val" style="font-size:24px;margin-top:2px">${cnt(k)}</div></button>`).join('')}
      </div>
      <div class="tb-card">
        <div style="padding:14px 16px 0"><div class="tb-tabs" style="margin-bottom:0">${CF.map(([k, l]) => `<button class="tb-tab ${ui.campFilter === k ? 'is-on' : ''}" data-action="camp-filter" data-v="${k}">${l}<span class="tb-count ${k === 'failed' && cnt(k) ? 'is-bad' : ''}">${cnt(k)}</span></button>`).join('')}</div></div>
        <div class="tb-row wrap" style="padding:14px 16px;gap:10px">
          <div class="tb-input-icon" style="flex:1;min-width:200px;max-width:360px">${icon('search')}<input class="tb-input sm" id="camp-q" placeholder="Cari nama campaign atau akun…" value="${esc(ui.campQ)}"></div>
          <span class="tb-sp"></span>
          <select class="tb-input sm" id="camp-sort" style="width:auto" aria-label="Urutkan">
            ${[['recent', 'Terbaru'], ['progress', 'Progres tertinggi'], ['rate', 'Keberhasilan tertinggi'], ['sent', 'Paling banyak terkirim'], ['name', 'Nama A–Z']].map(([v, l]) => `<option value="${v}" ${ui.campSort === v ? 'selected' : ''}>${l}</option>`).join('')}
          </select>
        </div>
        <div id="camp-table"></div>
      </div>`;
      this.table(el);
      const q = el.querySelector('#camp-q');
      q.addEventListener('input', () => { ui.campQ = q.value; this.table(el); });
      el.querySelector('#camp-sort').addEventListener('change', (e) => { ui.campSort = e.target.value; this.table(el); });
    },
    table(el) {
      const ui = S().ui;
      let rows = S().campaigns.filter((x) => ui.campFilter === 'all' || x.status === ui.campFilter);
      const q = ui.campQ.trim().toLowerCase();
      if (q) rows = rows.filter((x) => (x.name + ' ' + TB.accLabel(x.account_id)).toLowerCase().includes(q));
      const srt = { recent: (a, b) => (b.start > a.start ? 1 : -1), progress: (a, b) => (b.planned ? b.sent / b.planned : 0) - (a.planned ? a.sent / a.planned : 0), rate: (a, b) => (TB.rate(b) || 0) - (TB.rate(a) || 0), sent: (a, b) => b.sent - a.sent, name: (a, b) => a.name.localeCompare(b.name) }[ui.campSort];
      rows = rows.slice().sort(srt);
      const box = el.querySelector('#camp-table');
      if (!rows.length) {
        box.innerHTML = q ? TB.empty('search', 'Tidak ada hasil', `Tidak ada campaign yang cocok dengan “${ui.campQ}”. Coba kata kunci lain.`, `<button class="tb-btn sm" data-action="camp-clear">Hapus pencarian</button>`)
          : TB.empty('megaphone', `Belum ada campaign ${CF.find((f) => f[0] === ui.campFilter)[1].toLowerCase()}`, 'Campaign dengan status ini akan muncul di sini.', `<button class="tb-btn primary sm" data-action="new-campaign">${icon('plus')}Buat campaign</button>`);
        return;
      }
      box.innerHTML = `<div class="tb-table-wrap"><table class="tb-table" data-source="campaigns" data-row-key="id">
        <thead><tr><th>Campaign</th><th>Status</th><th class="tb-hide-sm">Alur</th><th>Progres</th><th class="r" data-field="targets">Target</th><th class="r tb-hide-sm">Keberhasilan</th><th class="tb-hide-sm">Periode</th><th class="r"></th></tr></thead>
        <tbody>${rows.map((x) => {
          const b = x.status === 'running' && TB.blocked(x);
          return `<tr class="clickable" data-key="${esc(x.id)}" data-action="c-detail" data-id="${x.id}">
          <td><div class="tb-row" style="gap:10px"><span class="tb-avatar sm" style="background:${TB.grad(x.id + x.name)}">${icon('megaphone')}</span><div style="min-width:0"><div class="t-main tb-ellipsis" style="max-width:250px">${esc(x.name)}</div><div class="t-sub">${esc(TB.accLabel(x.account_id))}${x.status === 'failed' ? ' · <span style="color:var(--color-bad)">perlu tindakan</span>' : ''}</div></div></div></td>
          <td>${b ? `<span class="tb-badge warn" data-tip="${BL[b]}">Tertahan</span>` : TB.badge(TB.CS, x.status)}</td>
          <td class="tb-hide-sm">${TB.flowHTML(x.flow)}</td>
          <td><div class="tb-cell-bar"><div class="tb-prog ${progCls(x)}"><i data-progw="${x.id}" style="width:${x.planned ? (Math.min(1, x.sent / x.planned) * 100).toFixed(1) : 0}%"></i></div><span class="num muted" style="font-size:12px;min-width:84px;text-align:right"><span data-bind="csent:${x.id}">${n(x.sent)}</span>/${c(x.planned)}</span></div></td>
          <td class="r num">${n(x.targets)}</td>
          <td class="r num tb-hide-sm" data-bind="crate:${x.id}">${pct(TB.rate(x))}</td>
          <td class="tb-hide-sm"><span class="t-sub">${TB.dshort(TB.parseDay(x.start))} – ${TB.dshort(TB.parseDay(x.end))}</span></td>
          <td class="r" style="white-space:nowrap">
            ${x.status === 'running' ? `<button class="tb-btn xs icon warn" data-action="c-pause" data-id="${x.id}" data-tip="Jeda">${icon('pause')}</button>`
              : x.status === 'paused' ? `<button class="tb-btn xs icon" data-action="c-resume" data-id="${x.id}" data-tip="Lanjutkan">${icon('play')}</button>`
                : ['draft', 'scheduled', 'failed'].includes(x.status) ? `<button class="tb-btn xs icon" data-action="c-launch" data-id="${x.id}" data-tip="${x.status === 'failed' ? 'Jalankan ulang' : 'Mulai sekarang'}">${icon(x.status === 'failed' ? 'refresh' : 'rocket')}</button>` : ''}
            ${['running', 'paused'].includes(x.status) ? `<button class="tb-btn xs icon danger" data-action="c-stop" data-id="${x.id}" data-tip="Hentikan">${icon('stop')}</button>` : ''}
            <button class="tb-btn xs icon ghost" data-action="c-menu" data-id="${x.id}" aria-label="Aksi lainnya">${icon('more')}</button></td></tr>`;
        }).join('')}</tbody></table></div>
        <div class="tb-card-f"><span class="muted" style="font-size:12.5px">Menampilkan ${rows.length} dari ${S().campaigns.length} campaign</span><span class="muted" style="font-size:12px">Klik baris untuk detail & riwayat perubahan</span></div>`;
      TB.refreshBinds(box);
    },
    tick(el) {
      el.querySelectorAll('[data-progw]').forEach((i) => { const x = S().campaigns.find((k) => k.id === i.dataset.progw); if (x && x.planned) i.style.width = (Math.min(1, x.sent / x.planned) * 100).toFixed(1) + '%'; });
    },
  };

  TB.campMenu = (btn, id) => {
    const x = S().campaigns.find((k) => k.id === id);
    if (!x) return;
    const st = x.status;
    const html = `${TB.mi('detail', 'eye', 'Lihat detail')}${TB.mi('history', 'history', 'Riwayat perubahan')}${TB.mi('edit', 'pencil', 'Edit campaign', { disabled: st === 'completed' })}${TB.mi('dup', 'copy', 'Duplikat')}
      <div class="m-sep"></div>
      ${st === 'running' ? TB.mi('pause', 'pause', 'Jeda') : ''}${st === 'paused' ? TB.mi('resume', 'play', 'Lanjutkan') : ''}${['draft', 'scheduled', 'stopped', 'failed'].includes(st) ? TB.mi('launch', 'rocket', st === 'stopped' || st === 'failed' ? 'Jalankan ulang' : 'Mulai sekarang') : ''}
      ${['running', 'paused', 'scheduled'].includes(st) ? TB.mi('stop', 'circle-stop', 'Hentikan', { danger: true }) : ''}
      ${['draft', 'stopped', 'completed', 'failed'].includes(st) ? TB.mi('del', 'trash', 'Hapus', { danger: true }) : ''}`;
    TB.menu(btn, html, (m) => ({ detail: () => TB.campDetail(id), history: () => TB.campDetail(id, 'history'), edit: () => TB.editCampaign(id), dup: () => TB.act.dupCampaign(id), pause: () => TB.act.pause(id), resume: () => TB.act.resume(id), launch: () => TB.act.launch(id), stop: () => TB.act.stop(id), del: () => TB.act.del(id) }[m]()), { width: 220 });
  };

  TB.campDetail = (id, tab = 'summary') => {
    const x = S().campaigns.find((k) => k.id === id);
    if (!x) return;
    const daily = S().cdaily.filter((r) => r.campaign_id === id);
    const tl = TB.targetsFor(x).slice(0, 6);
    const st = x.status;
    const hist = S().history.filter((h) => h.campaign_id === id).sort((a, b) => (a.ts < b.ts ? 1 : -1));
    const tpl = S().templates.find((t) => t.id === x.template_id);
    const srcs = String(x.sources || '').split(',').filter(Boolean).map(TB.srcName);
    const summary = `${st === 'failed' ? `<div class="tb-alert bad" style="margin-bottom:14px"><div class="a-ico">${icon('x-circle')}</div><div class="a-b"><div class="a-t">Campaign gagal</div><div class="a-s">${esc(x.fail_reason || 'Terjadi kesalahan saat menjalankan campaign.')}</div></div></div>` : ''}
        <div class="tb-grid k4" style="gap:10px">
          ${[['Terkirim', n(x.sent)], ['Berhasil', pct(TB.rate(x))], ['Klik', n(x.clicks)], ['CTR', pct(x.delivered ? x.clicks / x.delivered : null)]].map(([l, v]) => `<div style="background:var(--sunk);border-radius:12px;padding:12px"><div class="muted" style="font-size:12px">${l}</div><div style="font-size:20px;font-weight:680;letter-spacing:-0.02em" class="num">${v}</div></div>`).join('')}
        </div>
        <div class="mt-16"><div class="tb-row between" style="font-size:12.5px;margin-bottom:6px"><span class="muted">Progres ${n(x.sent)} / ${n(x.planned)} pesan</span><b class="num">${x.planned ? pct(Math.min(1, x.sent / x.planned), 0) : '—'}</b></div>${TB.prog(x.planned ? x.sent / x.planned : 0, progCls(x))}</div>
        <div class="tb-grid k2 mt-16" style="gap:16px">
          <div><div class="tb-label" style="margin-bottom:8px">Pengiriman 14 hari</div>${daily.length ? `<div class="tb-chart" id="cd-chart" data-source="campaign_daily" style="min-height:170px"></div>` : `<div class="muted" style="font-size:13px;padding:30px 0;text-align:center">Belum ada riwayat pengiriman.</div>`}</div>
          <div><div class="tb-label" style="margin-bottom:8px">Pratinjau pesan${tpl ? ` <span class="tb-tag">${icon('template')}${esc(tpl.name)}</span>` : ''}</div><div class="tb-tg-prev" style="min-height:170px"><div class="tb-bubble"><div class="from">${esc((TB.acc(x.account_id) || {}).display_name || 'Akun')}</div>${esc(x.message)}<div class="meta">${TB.time(TB.now())}${icon('check-check')}</div></div></div></div>
        </div>
        <div class="tb-grid k3 mt-16" style="gap:10px;font-size:13px">
          <div><div class="muted" style="font-size:12px">Urutan proses</div><div class="mt-8">${TB.flowHTML(x.flow)}</div></div>
          <div><div class="muted" style="font-size:12px">Interval · jam aktif</div><b>Setiap ${x.interval_min} mnt · ${esc(x.window)}</b></div>
          <div><div class="muted" style="font-size:12px">Hari</div><b>${esc(x.days)}</b></div>
        </div>
        ${srcs.length ? `<div class="mt-16"><div class="tb-label" style="margin-bottom:8px">Sumber deteksi</div><div class="tb-row wrap" style="gap:6px">${srcs.map((s) => `<span class="tb-tag">${icon('scan')}${esc(s)}</span>`).join('')}</div></div>` : ''}
        <div class="mt-16"><div class="tb-label" style="margin-bottom:8px">Target (${x.targets})</div><div class="tb-row wrap" style="gap:6px">${tl.map((t) => `<span class="tb-tag">${icon(t.type === 'channel' ? 'radio' : 'users')}${esc(t.title)}</span>`).join('')}${x.targets > tl.length ? `<span class="tb-tag">+${x.targets - tl.length} lainnya</span>` : ''}</div></div>`;
    const history = hist.length ? `<div class="tb-list" data-source="campaign_history">${hist.map((h) => `<div class="tb-li" style="align-items:flex-start"><div class="ico ${h.actor === 'Sistem' ? '' : 'info'}">${icon(h.actor === 'Sistem' ? 'server' : 'pencil')}</div><div class="body"><div class="t" style="white-space:normal">${esc(h.change)}</div><div class="s">${esc(h.actor)}</div></div><div class="time">${TB.dt(h.ts)}</div></div>`).join('')}</div>` : TB.empty('history', 'Belum ada riwayat', 'Perubahan konfigurasi campaign akan tercatat di sini.');
    TB.modal({
      icon: 'megaphone', title: x.name, wide: true,
      sub: `${TB.badge(TB.CS, st)} <span style="margin-left:6px">${esc(TB.accLabel(x.account_id))} · ${TB.dshort(TB.parseDay(x.start))} – ${TB.date(TB.parseDay(x.end))}</span>`,
      body: `<div class="tb-tabs" style="margin-bottom:16px"><button class="tb-tab ${tab === 'summary' ? 'is-on' : ''}" data-dt="summary">${icon('layout-dashboard')}Ringkasan</button><button class="tb-tab ${tab === 'history' ? 'is-on' : ''}" data-dt="history">${icon('history')}Riwayat perubahan<span class="tb-count">${hist.length}</span></button></div><div id="cd-body">${tab === 'summary' ? summary : history}</div>`,
      foot: `<div class="left">${icon('info')}ID ${esc(x.id)}</div>
        ${['running', 'paused', 'scheduled'].includes(st) ? `<button class="tb-btn danger" data-dm="stop">${icon('circle-stop')}Hentikan</button>` : ''}
        ${st !== 'completed' ? `<button class="tb-btn" data-dm="edit">${icon('pencil')}Edit</button>` : `<button class="tb-btn" data-dm="dup">${icon('copy')}Duplikat</button>`}
        ${st === 'running' ? `<button class="tb-btn primary" data-dm="pause">${icon('pause')}Jeda</button>` : st === 'paused' ? `<button class="tb-btn primary" data-dm="resume">${icon('play')}Lanjutkan</button>` : ['draft', 'scheduled', 'stopped', 'failed'].includes(st) ? `<button class="tb-btn primary" data-dm="launch">${icon('rocket')}${st === 'stopped' || st === 'failed' ? 'Jalankan ulang' : 'Mulai sekarang'}</button>` : ''}`,
      onMount: (box) => {
        const drawChart = () => { const ch = box.querySelector('#cd-chart'); if (ch) requestAnimationFrame(() => TB.chart.bars(ch, { rows: daily, height: 170, stacked: false, maxBar: 18, series: [{ key: 'sent', label: 'Terkirim', color: TB.COL.tg }], xFmt: (d) => TB.dshort(TB.parseDay(d.day)), tipExtra: (d) => [['Berhasil', n(d.delivered)], ['Klik', n(d.clicks)]] })); };
        drawChart();
        box.querySelectorAll('[data-dt]').forEach((b) => b.addEventListener('click', () => { box.querySelectorAll('[data-dt]').forEach((k) => k.classList.toggle('is-on', k === b)); box.querySelector('#cd-body').innerHTML = b.dataset.dt === 'summary' ? summary : history; drawChart(); }));
        box.querySelectorAll('[data-dm]').forEach((b) => b.addEventListener('click', () => {
          const m = b.dataset.dm;
          if (m === 'edit') { TB.closeModal(); TB.editCampaign(id); return; }
          if (m === 'dup') { TB.closeModal(); TB.act.dupCampaign(id); return; }
          if (m === 'stop') { TB.act.stop(id); return; }
          TB.act[m](id);
          TB.closeModal();
        }));
      },
    });
  };

  /* ======================= ACCOUNTS ======================= */
  const ROLES = [['broadcast', 'Broadcast', 'send'], ['join', 'Join', 'user-plus'], ['reply', 'Reply', 'reply']];
  P.accounts = {
    title: 'Akun Telegram', section: 'Akun',
    render(el) {
      const accs = S().accounts, lim = TB.planInfo().accounts;
      const cnt = (s) => accs.filter((a) => a.status === s).length;
      el.innerHTML = `
      <div class="tb-head"><div><h1>Telegram Account Manager</h1><p>Hubungkan beberapa akun sesuai paket, pilih peran tiap akun dalam automation, dan kelola sesi dengan aman.</p></div>
        <div class="actions"><button class="tb-btn" data-action="acc-check-all">${icon('heart-pulse')}Cek kesehatan</button><button class="tb-btn primary" data-action="connect">${icon('plus')}Hubungkan akun</button></div></div>
      <div class="tb-row wrap" style="gap:8px;margin-bottom:4px" data-source="tg_accounts">
        <span class="tb-badge ok" style="height:28px;padding:0 12px">${cnt('connected')} terhubung</span>
        <span class="tb-badge warn" style="height:28px;padding:0 12px">${cnt('flood_wait')} dibatasi</span>
        <span class="tb-badge bad" style="height:28px;padding:0 12px">${cnt('disconnected')} sesi kedaluwarsa</span>
        <span class="tb-badge plain" style="height:28px;padding:0 12px">${accs.filter((a) => a.enabled).length} aktif untuk automation</span>
        <span class="tb-sp"></span>
        <span class="muted" style="font-size:12.5px">${accs.length} / ${lim} slot akun paket ${esc(S().profile.plan)}</span>
        <div style="width:120px">${TB.prog(accs.length / lim, accs.length >= lim ? 'warn' : '')}</div>
      </div>
      ${TB.alerts()}
      <div class="tb-grid mt-16" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,320px),1fr))" data-source="tg_accounts">
        ${accs.map((a) => {
          const used = S().campaigns.filter((x) => x.account_id === a.id && ['running', 'paused', 'scheduled'].includes(x.status));
          const tone = a.status === 'connected' ? '' : a.status === 'flood_wait' ? 'warn' : 'bad';
          const hc = a.health >= 85 ? 'var(--color-ok)' : a.health >= 60 ? 'var(--color-warn)' : 'var(--color-bad)';
          return `<div class="tb-card tb-acc interactive" style="${a.enabled ? '' : 'opacity:.85'}">
            <div class="tb-acc-head">
              <div class="tb-acc-av"><span class="tb-avatar round" style="width:46px;height:46px;font-size:15px;background:${TB.grad(a.username)}">${esc(TB.initials(a.display_name))}</span><span class="st ${tone}"></span></div>
              <div style="min-width:0;flex:1"><div style="font-weight:640;letter-spacing:-0.01em" class="tb-ellipsis">${esc(a.display_name)}</div><div class="muted" style="font-size:12.5px">@${esc(a.username)} · ${esc(a.phone)}${a.planLocked ? ' ' + TB.lock('Dijeda: batas paket') : ''}</div></div>
              <button class="tb-btn xs icon ghost" data-action="acc-menu" data-id="${a.id}" aria-label="Aksi akun">${icon('more')}</button>
            </div>
            <div class="tb-row between">${TB.badge(TB.AS, a.status)}
              <div class="tb-row" style="gap:8px" data-tip="Skor kesehatan akun"><span class="muted" style="font-size:12px">Kesehatan</span><div class="tb-ring" style="--p:${a.health};--c:${hc};width:38px;height:38px"><span style="font-size:10.5px">${a.status === 'disconnected' ? '—' : a.health}</span></div></div></div>
            ${a.status === 'flood_wait' ? `<div class="tb-alert warn" style="padding:9px 11px"><div class="a-b"><div class="a-t" style="font-size:12.5px">Pembatasan sementara · <span class="num" data-bind="flood:${a.id}">—</span></div><div class="a-s" style="font-size:12px">Telegram membatasi kecepatan kirim. Diistirahatkan otomatis.</div></div></div>` : ''}
            ${a.status === 'disconnected' ? `<div class="tb-alert bad" style="padding:9px 11px"><div class="a-b"><div class="a-t" style="font-size:12.5px">Sesi kedaluwarsa</div><div class="a-s" style="font-size:12px">Terakhir aktif ${TB.ago(a.last_active)}</div></div><button class="tb-btn xs" data-action="reconnect" data-id="${a.id}">Hubungkan</button></div>` : ''}
            <div class="tb-set-row" style="padding:2px 0;border:0"><div><div class="t" style="font-size:13px">Aktif untuk automation</div><div class="d">${a.enabled ? 'Dipakai sesuai peran di bawah' : 'Akun dilewati semua modul'}</div></div>${TB.sw('en_' + a.id, a.enabled, `data-action="acc-enable" data-id="${a.id}"`)}</div>
            <div><div class="muted" style="font-size:11.5px;margin-bottom:6px">Pilih akun untuk automation</div><div class="tb-row wrap" style="gap:6px">${ROLES.map(([k, l, ic]) => `<button class="tb-chip ${a.roles.includes(k) ? 'is-on' : ''}" style="height:28px" data-action="role-toggle" data-id="${a.id}" data-v="${k}" ${!a.enabled || a.status === 'disconnected' ? 'disabled' : ''}>${icon(ic)}${l}</button>`).join('')}</div></div>
            <div><div class="tb-row between" style="font-size:12px;margin-bottom:6px"><span class="muted">Terkirim hari ini</span><span class="num"><b data-bind="asent:${a.id}">${n(a.sent_today)}</b> / ${n(a.daily_limit)}</span></div>
              <div class="tb-prog ${a.sent_today / a.daily_limit > 0.85 ? 'warn' : ''}"><i data-accw="${a.id}" style="width:${Math.min(100, (a.sent_today / a.daily_limit) * 100)}%"></i></div></div>
            <div class="tb-acc-stats"><div><div class="l">Grup</div><div class="v">${n(a.groups_joined)}</div></div><div><div class="l">Campaign</div><div class="v">${used.length}</div></div><div><div class="l">Umur sesi</div><div class="v">${a.session_days ? a.session_days + ' hr' : '—'}</div></div></div>
            <div class="tb-row between" style="font-size:11.5px"><span class="muted">${icon('lock')} ${a.two_fa ? '2FA aktif' : '<span style="color:var(--color-warn)">2FA belum aktif</span>'} · ${esc(a.dc)}</span><button class="tb-btn xs ghost" data-action="acc-session" data-id="${a.id}">${icon('key')}Kelola sesi</button></div>
          </div>`;
        }).join('')}
        <button class="tb-acc-add" data-action="connect"><span class="plus">${icon('plus')}</span><b style="color:var(--color-fg)">Hubungkan akun baru</b><span style="font-size:12.5px">${lim - accs.length > 0 ? `${lim - accs.length} slot tersisa · nomor HP atau QR code` : 'Slot penuh — upgrade paket'}</span></button>
      </div>
      <div class="tb-card pad mt-16"><div class="tb-row" style="align-items:flex-start;gap:14px">
        <div style="width:38px;height:38px;border-radius:10px;display:grid;place-items:center;background:var(--tg-soft);color:var(--tg-ink);flex:none">${icon('shield')}</div>
        <div><b>Keamanan sesi</b><div class="muted" style="font-size:13px;margin-top:4px;line-height:1.6">Sesi disimpan terenkripsi di server TeleBlast dan hanya dipakai untuk automation yang Anda aktifkan. Putuskan sesi kapan saja dari sini atau dari Telegram › Pengaturan › Perangkat. Gunakan akun berumur &gt; 30 hari dan aktifkan 2FA.</div></div></div></div>`;
    },
    tick(el) {
      el.querySelectorAll('[data-accw]').forEach((i) => { const a = TB.acc(i.dataset.accw); if (a) i.style.width = Math.min(100, (a.sent_today / a.daily_limit) * 100) + '%'; });
    },
  };

  TB.accMenu = (btn, id) => {
    const a = TB.acc(id);
    if (!a) return;
    TB.menu(btn, `<div class="m-h">@${esc(a.username)}</div>
      ${TB.mi('session', 'key', 'Kelola sesi')}
      ${TB.mi('health', 'heart-pulse', 'Cek kesehatan', { disabled: a.status === 'disconnected' })}
      ${TB.mi('limit', 'sliders', 'Atur batas harian')}
      ${a.status === 'disconnected' ? TB.mi('reconnect', 'refresh', 'Hubungkan ulang') : TB.mi('disconnect', 'unlink', 'Putuskan koneksi')}
      <div class="m-sep"></div>${TB.mi('remove', 'trash', 'Hapus akun', { danger: true })}`, (m) => {
      if (m === 'session') TB.sessionModal(id);
      if (m === 'health') TB.act.checkHealth(id);
      if (m === 'limit') TB.limitModal(id);
      if (m === 'reconnect') TB.connectFlow(id);
      if (m === 'disconnect') TB.disconnectConfirm(id);
      if (m === 'remove') TB.confirm({ title: `Hapus @${a.username}?`, text: 'Akun dan sesinya akan dihapus permanen dari workspace. Riwayat statistik tetap tersimpan.', confirm: 'Hapus akun', onYes: () => TB.act.removeAcc(id) });
    }, { width: 220 });
  };
  TB.disconnectConfirm = (id) => { const a = TB.acc(id); TB.confirm({ title: `Putuskan @${a.username}?`, text: 'Sesi akan dikeluarkan dan dihapus dari server TeleBlast. Campaign, auto-join, dan auto-reply yang memakai akun ini akan tertahan sampai akun dihubungkan kembali.', confirm: 'Putuskan koneksi', onYes: () => TB.act.disconnect(id) }); };
  TB.sessionModal = (id) => {
    const a = TB.acc(id);
    const row = (l, v) => `<div class="tb-est-row"><span>${l}</span><b style="text-align:right">${v}</b></div>`;
    TB.modal({
      icon: 'key', title: `Sesi @${a.username}`, sub: 'Detail koneksi MTProto yang dipakai TeleBlast.',
      body: `<div class="tb-est" style="padding:14px;border-radius:12px;background:var(--sunk)">
        ${row('Status koneksi', TB.badge(TB.AS, a.status))}${row('Perangkat sesi', esc(a.device))}${row('Data center', esc(a.dc))}${row('IP server', esc(a.session_ip))}
        ${row('Login sejak', TB.date(a.login_at))}${row('Aktivitas terakhir', TB.ago(a.last_active))}${row('Verifikasi dua langkah', a.two_fa ? '<span class="tb-badge ok plain">Aktif</span>' : '<span class="tb-badge warn plain">Belum aktif</span>')}${row('Penyimpanan sesi', 'Terenkripsi di server')}</div>
        ${a.two_fa ? '' : `<div class="tb-alert warn mt-16" style="padding:10px 12px"><div class="a-ico" style="width:26px;height:26px">${icon('shield-alert')}</div><div class="a-b a-s" style="font-size:12.5px">Aktifkan 2FA di Telegram › Privasi & Keamanan agar akun lebih aman dari pembajakan.</div></div>`}`,
      foot: `<button class="tb-btn danger" id="ss-dc" ${a.status === 'disconnected' ? 'disabled' : ''}>${icon('unlink')}Putuskan</button><span class="tb-sp"></span>${a.status === 'disconnected' ? `<button class="tb-btn primary" id="ss-re">${icon('refresh')}Hubungkan ulang</button>` : `<button class="tb-btn" id="ss-ref">${icon('refresh')}Segarkan sesi</button>`}<button class="tb-btn" data-close>Tutup</button>`,
      onMount: (box) => {
        box.querySelector('#ss-dc').addEventListener('click', () => { TB.closeModal(); TB.disconnectConfirm(id); });
        const re = box.querySelector('#ss-re'); if (re) re.addEventListener('click', () => { TB.closeModal(); TB.connectFlow(id); });
        const rf = box.querySelector('#ss-ref'); if (rf) rf.addEventListener('click', (e) => TB.busy(e.currentTarget, 1000, () => { a.last_active = TB.now().toISOString(); TB.toast('Sesi disegarkan', `@${a.username} terhubung normal`); }, 'Menyegarkan…'));
      },
    });
  };

  TB.limitModal = (id) => {
    const a = TB.acc(id);
    TB.modal({
      icon: 'sliders', title: 'Batas kirim harian', sub: `Atur jumlah maksimum pesan per hari untuk @${esc(a.username)}.`,
      body: `<div class="tb-field"><div class="tb-row between"><label for="lim-r">Batas harian</label><b class="num" id="lim-v">${n(a.daily_limit)} pesan</b></div>
        <input type="range" class="tb-range" id="lim-r" min="100" max="1500" step="50" value="${a.daily_limit}">
        <div class="tb-row between muted" style="font-size:11.5px"><span>100</span><span>Disarankan ≤ 800</span><span>1.500</span></div>
        <div class="tb-alert warn mt-8" id="lim-warn" ${a.daily_limit > 800 ? '' : 'hidden'} style="padding:9px 11px"><div class="a-ico" style="width:26px;height:26px">${icon('alert')}</div><div class="a-b a-s">Batas tinggi meningkatkan risiko FloodWait dan pembatasan akun.</div></div></div>`,
      foot: `<button class="tb-btn" data-close>Batal</button><button class="tb-btn primary" id="lim-save">Simpan</button>`,
      onMount: (box) => {
        const r = box.querySelector('#lim-r');
        r.addEventListener('input', () => { box.querySelector('#lim-v').textContent = n(r.value) + ' pesan'; box.querySelector('#lim-warn').hidden = +r.value <= 800; });
        box.querySelector('#lim-save').addEventListener('click', () => { a.daily_limit = +r.value; TB.closeModal(); TB.toast('Batas harian diperbarui', `@${a.username}: ${n(a.daily_limit)} pesan/hari`); TB.emit('change'); });
      },
    });
  };

  /* Connect / reconnect flow */
  TB.connectFlow = (reId) => {
    const re = reId ? TB.acc(reId) : null;
    if (!re && S().accounts.length >= TB.planInfo().accounts) {
      TB.modal({ icon: 'crown', tone: 'warn', title: 'Slot akun penuh', sub: `Paket ${esc(S().profile.plan)} mendukung hingga ${TB.planInfo().accounts} akun Telegram.`, body: '<p class="muted" style="margin:0;font-size:13.5px">Upgrade ke paket Business untuk menghubungkan hingga 15 akun dengan rotasi otomatis, atau hapus akun yang tidak terpakai.</p>', foot: `<button class="tb-btn" data-close>Nanti saja</button><button class="tb-btn primary" id="go-up">${icon('sparkles')}Lihat paket</button>`, onMount: (b) => b.querySelector('#go-up').addEventListener('click', () => { TB.closeModal(); TB.go('billing'); }) });
      return;
    }
    let method = 'phone', phone = '';
    const qrHTML = () => { let seed = 7, html = ''; const rnd = () => ((seed = (seed * 9301 + 49297) % 233280) / 233280); for (let r = 0; r < 21; r++) for (let c2 = 0; c2 < 21; c2++) { const f = [[0, 0], [0, 14], [14, 0]].find(([a, b]) => r >= a && r < a + 7 && c2 >= b && c2 < b + 7); const on = f ? (r === f[0] || r === f[0] + 6 || c2 === f[1] || c2 === f[1] + 6 || (r >= f[0] + 2 && r <= f[0] + 4 && c2 >= f[1] + 2 && c2 <= f[1] + 4)) : rnd() > 0.5; html += `<i class="${on ? '' : 'o'}"></i>`; } return html; };
    const stepPhone = () => TB.modal({
      icon: 'smartphone', title: re ? `Hubungkan ulang @${re.username}` : 'Hubungkan akun Telegram',
      sub: 'Login aman lewat API resmi Telegram (MTProto). Kami tidak menyimpan kata sandi Anda.',
      body: `<div class="tb-btn-group" style="width:100%;margin-bottom:16px"><button class="tb-seg ${method === 'phone' ? 'is-on' : ''}" style="flex:1" data-m="phone">Nomor HP</button><button class="tb-seg ${method === 'qr' ? 'is-on' : ''}" style="flex:1" data-m="qr">QR code</button></div>
        ${method === 'phone' ? `<div class="tb-field" id="ph-f"><label for="ph">Nomor telepon</label>
          <div class="tb-row" style="gap:8px"><select class="tb-input" style="width:104px"><option>🇮🇩 +62</option><option>🇲🇾 +60</option><option>🇸🇬 +65</option></select><input class="tb-input" id="ph" inputmode="tel" placeholder="812 3456 7890" value="${esc(phone)}" autocomplete="off"></div>
          <div class="err">Masukkan nomor yang valid (9–13 digit).</div><div class="hint">Kode verifikasi akan dikirim ke aplikasi Telegram Anda.</div></div>`
        : `<div style="text-align:center"><div class="tb-qr">${qrHTML()}</div><p class="muted" style="font-size:13px;margin:14px 0 4px">Buka Telegram › <b>Pengaturan</b> › <b>Perangkat</b> › <b>Tautkan perangkat</b>, lalu pindai kode ini.</p><div class="tb-row" style="justify-content:center;gap:8px;font-size:12.5px">${icon('loader')}<span class="muted">Menunggu pemindaian… kode diperbarui dalam 30 dtk</span></div></div>`}`,
      foot: method === 'phone' ? `<div class="left">${icon('lock')}Terenkripsi</div><button class="tb-btn" data-close>Batal</button><button class="tb-btn primary" id="ph-go">Kirim kode ${icon('arrow-right')}</button>`
        : `<div class="left">${icon('lock')}Terenkripsi</div><button class="tb-btn" data-close>Batal</button><button class="tb-btn primary" id="qr-go">${icon('qr-code')}Simulasikan pindai</button>`,
      onMount: (box) => {
        box.querySelectorAll('[data-m]').forEach((b) => b.addEventListener('click', () => { method = b.dataset.m; stepPhone(); }));
        if (method === 'phone') {
          const inp = box.querySelector('#ph'), f = box.querySelector('#ph-f');
          inp.focus();
          const go = () => {
            const d = inp.value.replace(/\D/g, '');
            if (d.length < 9 || d.length > 13) { f.classList.add('has-err'); inp.focus(); return; }
            phone = '+62 ' + d.replace(/^0/, '').replace(/(\d{3})(\d{4})(\d+)/, '$1-$2-$3');
            TB.busy(box.querySelector('#ph-go'), 900, stepOtp, 'Mengirim…');
          };
          inp.addEventListener('input', () => f.classList.remove('has-err'));
          inp.addEventListener('keydown', (e) => { if (e.key === 'Enter') go(); });
          box.querySelector('#ph-go').addEventListener('click', go);
        } else {
          box.querySelector('#qr-go').addEventListener('click', (e) => TB.busy(e.currentTarget, 1100, () => { phone = re ? re.phone : '+62 813-••••-' + String(1000 + Math.floor(Math.random() * 8999)); finish(); }, 'Memverifikasi…'));
        }
      },
    });
    const stepOtp = () => TB.modal({
      icon: 'message', title: 'Masukkan kode verifikasi', sub: `Kode 5 digit dikirim ke Telegram untuk <b>${esc(phone)}</b>.`,
      body: `<div class="tb-otp" id="otp">${'<input class="tb-input" inputmode="numeric" maxlength="1" autocomplete="one-time-code">'.repeat(5)}</div>
        <p class="muted" style="text-align:center;font-size:12.5px;margin:14px 0 0" id="otp-msg">Mode demo: masukkan 5 digit apa saja.</p>
        <p style="text-align:center;font-size:12.5px;margin:6px 0 0"><button class="tb-btn xs ghost" id="otp-re">${icon('refresh')}Kirim ulang kode</button></p>`,
      foot: `<button class="tb-btn" id="otp-back">${icon('arrow-left')}Ubah nomor</button><button class="tb-btn primary" id="otp-go">Verifikasi</button>`,
      onMount: (box) => {
        const ins = [...box.querySelectorAll('#otp input')];
        ins[0].focus();
        let busy = false;
        const verify = () => {
          if (busy) return;
          if (!ins.every((x) => x.value)) { box.querySelector('#otp-msg').innerHTML = '<span style="color:var(--color-bad)">Lengkapi 5 digit kode.</span>'; return; }
          busy = true;
          TB.busy(box.querySelector('#otp-go'), 1000, finish, 'Memverifikasi…');
        };
        ins.forEach((inp, i) => {
          inp.addEventListener('input', () => { inp.value = inp.value.replace(/\D/g, '').slice(-1); if (inp.value && ins[i + 1]) ins[i + 1].focus(); if (ins.every((x) => x.value)) verify(); });
          inp.addEventListener('keydown', (e) => { if (e.key === 'Backspace' && !inp.value && ins[i - 1]) ins[i - 1].focus(); });
          inp.addEventListener('paste', (e) => { const t = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 5); if (t) { e.preventDefault(); t.split('').forEach((ch, k) => (ins[k].value = ch)); if (t.length === 5) verify(); } });
        });
        box.querySelector('#otp-go').addEventListener('click', verify);
        box.querySelector('#otp-back').addEventListener('click', stepPhone);
        box.querySelector('#otp-re').addEventListener('click', () => TB.toast('Kode dikirim ulang', 'Periksa aplikasi Telegram Anda', 'info'));
      },
    });
    const finish = () => {
      const a = TB.act.connected(re ? re.id : null, phone);
      TB.modal({
        icon: '', title: '', body: `<div class="tb-success"><div class="s-ico">${icon('check')}</div><h2 style="margin:0;font-size:18px">${re ? 'Akun terhubung kembali' : 'Akun berhasil terhubung'}</h2><p class="muted" style="margin:6px 0 0;font-size:13.5px">@${esc(a.username)} siap digunakan.${re ? ' Modul yang tertahan akan berjalan otomatis.' : ' Atur perannya (Broadcast, Join, Reply) di kartu akun.'}</p></div>`,
        foot: `<button class="tb-btn" data-close>Tutup</button><button class="tb-btn primary" id="fin-go">${icon('zap')}Buat campaign</button>`,
        onMount: (b) => b.querySelector('#fin-go').addEventListener('click', () => { TB.closeModal(); TB.newCampaign({ account_id: a.id }); }),
      });
    };
    stepPhone();
  };
})();
