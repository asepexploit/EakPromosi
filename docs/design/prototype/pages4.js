/* TeleBlast — Subscription & Plans (replaces credits): status, limits, checkout, expiry rules */
(() => {
  const TB = window.TB;
  const { esc, icon, n, pct } = TB;
  const P = (TB.pages = TB.pages || {});
  const S = () => TB.S;
  const DAY = 86400000;

  TB.SS = { active: { l: 'Aktif', c: 'ok' }, pending: { l: 'Pending', c: 'warn' }, expired: { l: 'Kedaluwarsa', c: 'bad' }, cancelled: { l: 'Dibatalkan', c: '' } };
  const EV = { created: ['user-plus', ''], upgraded: ['arrow-up', 'ok'], downgraded: ['arrow-down', 'warn'], renewed: ['refresh', 'ok'], reminder: ['bell', 'info'], payment_failed: ['x-circle', 'bad'], cancelled: ['x', 'bad'], reactivated: ['play', 'ok'], expired: ['clock', 'bad'], pending: ['clock', 'warn'], scheduled: ['calendar', 'info'] };
  const CYC = { monthly: 'Bulanan', yearly: 'Tahunan' };

  TB.planRow = (name) => S().plans.find((p) => p.plan === name) || S().plans[0];
  TB.endOf = (day) => new Date(day + 'T23:59:59+07:00');
  TB.sub = () => {
    const p = S().profile;
    const free = p.plan === 'Free';
    const daysLeft = free || !p.sub_end ? Infinity : Math.ceil((TB.endOf(p.sub_end) - TB.now()) / DAY);
    const st = p.sub_status;
    const inGrace = st === 'expired' && -daysLeft < p.grace_days;
    const effective = st === 'expired' && !inGrace ? 'Free' : p.plan;
    const rem = String(p.reminder_days || '').split(',').map(Number).filter(Boolean);
    const reminder = !free && ['active', 'cancelled', 'pending'].includes(st) && daysLeft > 0 && daysLeft <= Math.max(0, ...rem);
    return { st, plan: p.plan, cycle: p.billing_cycle, start: p.sub_start, end: p.sub_end, daysLeft, inGrace, graceLeft: inGrace ? p.grace_days + daysLeft : 0, effective, reminder, free, rem };
  };
  TB.lim = () => TB.planRow(TB.sub().effective);
  TB.planInfo = TB.lim;
  TB.daysLeft = () => { const d = TB.sub().daysLeft; return d === Infinity ? '∞' : Math.max(0, d); };
  TB.price = (pl, cyc) => (cyc === 'yearly' ? pl.price_year : pl.price_month);
  TB.unl = (v) => (v === -1 ? 'Tanpa batas' : n(v));
  TB.atLimit = (have, max) => max !== -1 && have >= max;

  TB.upsell = (title, text, need = 'Pro') => TB.modal({
    icon: 'crown', tone: 'warn', title, sub: esc(text),
    body: `<div class="tb-alert info" style="padding:10px 12px"><div class="a-ico" style="width:28px;height:28px">${icon('sparkles')}</div><div class="a-b a-s">Paket Anda saat ini: <b style="color:var(--color-fg)">${esc(TB.sub().effective)}</b>. Fitur ini tersedia mulai paket <b style="color:var(--color-fg)">${need}</b>.</div></div>`,
    foot: `<button class="tb-btn" data-close>Nanti saja</button><button class="tb-btn primary" id="up-go">${icon('sparkles')}Lihat paket</button>`,
    onMount: (b) => b.querySelector('#up-go').addEventListener('click', () => { TB.closeModal(); TB.go('billing'); setTimeout(() => document.getElementById('plans-anchor')?.scrollIntoView({ behavior: 'smooth' }), 80); }),
  });
  TB.lock = (txt = 'Pro') => `<span class="tb-tag" style="background:color-mix(in srgb,#F59E0B 14%,transparent);color:color-mix(in srgb,#B45309 80%,var(--color-fg))">${icon('lock')}${txt}</span>`;

  /* Banner shown on overview, live, accounts and the subscription page */
  TB.subAlert = () => {
    const s = TB.sub(), p = S().profile;
    const endTxt = s.end ? TB.date(TB.endOf(s.end), { day: 'numeric', month: 'long', year: 'numeric' }) : '';
    if (s.st === 'expired' && s.inGrace) return `<div class="tb-alert bad"><div class="a-ico">${icon('clock')}</div><div class="a-b"><div class="a-t">Paket ${esc(s.plan)} kedaluwarsa · masa tenggang ${s.graceLeft} hari lagi</div><div class="a-s">Automation masih berjalan selama masa tenggang. Setelahnya akun turun ke paket Free dan fitur dibatasi.</div></div><button class="tb-btn sm primary" data-action="sub-renew">Perpanjang sekarang</button></div>`;
    if (s.st === 'expired') return `<div class="tb-alert bad"><div class="a-ico">${icon('lock')}</div><div class="a-b"><div class="a-t">Langganan berakhir — akun berjalan dengan batas paket Free</div><div class="a-s">Hanya 1 akun Telegram & 1 campaign yang aktif; akun, sumber, dan campaign lain dijeda tanpa dihapus. Perpanjang untuk memulihkan semuanya.</div></div><button class="tb-btn sm primary" data-action="sub-renew">Aktifkan ${esc(s.plan)}</button></div>`;
    if (s.st === 'pending') return `<div class="tb-alert warn"><div class="a-ico">${icon('clock')}</div><div class="a-b"><div class="a-t">Pembayaran ${esc((S().payments.find((i) => i.status === 'pending') || {}).description || 'langganan')} menunggu</div><div class="a-s">Paket saat ini tetap aktif hingga ${endTxt}. Tagihan kedaluwarsa dalam 24 jam bila belum dibayar.</div></div><button class="tb-btn sm primary" data-action="sub-pay">Bayar sekarang</button></div>`;
    if (s.st === 'cancelled') return `<div class="tb-alert warn"><div class="a-ico">${icon('x-circle')}</div><div class="a-b"><div class="a-t">Langganan dibatalkan · tetap aktif hingga ${endTxt}</div><div class="a-s">Tidak ada perpanjangan otomatis. Setelah tanggal tersebut, akun turun ke paket Free.</div></div><button class="tb-btn sm" data-action="sub-reactivate">Aktifkan kembali</button></div>`;
    if (s.reminder) return `<div class="tb-alert info"><div class="a-ico">${icon('bell')}</div><div class="a-b"><div class="a-t">Paket ${esc(s.plan)} berakhir ${s.daysLeft} hari lagi (${endTxt})</div><div class="a-s">${p.auto_renew ? `Perpanjangan otomatis aktif via ${esc(p.payment_method)}.` : 'Perpanjangan otomatis nonaktif — perpanjang manual agar automation tidak terhenti.'}</div></div><button class="tb-btn sm ${p.auto_renew ? '' : 'primary'}" data-action="sub-renew">Perpanjang</button></div>`;
    if (p.scheduled_change) return `<div class="tb-alert info"><div class="a-ico">${icon('calendar')}</div><div class="a-b"><div class="a-t">Paket berubah ke ${esc(p.scheduled_change.plan)} pada ${endTxt}</div><div class="a-s">Fitur ${esc(s.plan)} tetap bisa dipakai sampai akhir periode.</div></div><button class="tb-btn sm ghost" data-action="sub-unschedule">Batalkan perubahan</button></div>`;
    return '';
  };

  /* Enforce the effective plan's limits (pausing, never deleting) */
  TB.applyPlan = (quiet) => {
    const L = TB.lim(), out = [];
    const acc = S().accounts.slice().sort((a, b) => (a.status === 'connected' ? -1 : 1) - (b.status === 'connected' ? -1 : 1));
    let on = 0;
    acc.forEach((a) => {
      if (a.planLocked && (L.accounts === -1 || on < L.accounts)) { a.enabled = true; a.planLocked = false; out.push(`@${a.username} diaktifkan kembali`); }
      if (a.enabled) { if (L.accounts !== -1 && on >= L.accounts) { a.enabled = false; a.planLocked = true; out.push(`@${a.username} dijeda`); } else on++; }
    });
    let run = 0;
    S().campaigns.forEach((c) => {
      if (c.planPaused && (run < L.campaigns_active)) { c.status = 'running'; c.planPaused = false; c.nextAt = Date.now() + 3000; run++; return; }
      if (c.status === 'running') { if (run >= L.campaigns_active) { c.status = 'paused'; c.planPaused = true; TB.hist(c.id, `Dijeda otomatis: batas paket ${L.plan}`, 'Sistem'); out.push(`campaign “${c.name}” dijeda`); } else run++; }
    });
    let src = 0;
    S().sources.forEach((s) => {
      if (s.planLocked && (L.sources === -1 || src < L.sources)) { s.active = true; s.planLocked = false; }
      if (s.active) { if (L.sources !== -1 && src >= L.sources) { s.active = false; s.planLocked = true; } else src++; }
    });
    let rr = 0;
    S().rules.forEach((r) => {
      if (r.planLocked && (L.reply_rules === -1 || rr < L.reply_rules)) { r.active = true; r.planLocked = false; }
      if (r.active) { if (L.reply_rules !== -1 && rr >= L.reply_rules) { r.active = false; r.planLocked = true; } else rr++; }
    });
    if (out.length) { TB.log('warning', null, '—', `Aturan paket ${L.plan} diterapkan: ${out.slice(0, 3).join(', ')}${out.length > 3 ? ` +${out.length - 3} lainnya` : ''}`, 'Sistem', 'system'); if (!quiet) TB.toast(`Batas paket ${L.plan} diterapkan`, `${out.length} perubahan · data tetap aman`, 'warn'); }
  };

  const ev = (event, detail) => S().subEvents.unshift({ ts: TB.now().toISOString(), event, detail });
  const addMonths = (day, k) => { const d = new Date(day + 'T12:00:00+07:00'); d.setMonth(d.getMonth() + k); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); };
  TB.subEv = ev;

  /* Checkout: upgrade (prorated, immediate), renewal (after current end) or downgrade (at period end) */
  TB.checkout = (planName, cycle) => {
    const p = S().profile, s = TB.sub();
    let target = planName || p.plan, cyc = cycle || p.billing_cycle || 'monthly', pay = 'qris';
    const PAY = TB.PAY_METHODS;
    const calc = () => {
      const cur = TB.planRow(p.plan), nw = TB.planRow(target);
      const live = ['active', 'cancelled', 'pending'].includes(s.st) || s.inGrace;
      if (target === 'Free') return { kind: 'free', amount: 0 };
      if (target === p.plan && cyc === p.billing_cycle) {
        const from = s.st === 'expired' && !s.inGrace ? TB.dayKey(0) : (p.sub_end || TB.dayKey(0));
        return { kind: 'renew', amount: TB.price(nw, cyc), from, to: addMonths(from, cyc === 'yearly' ? 12 : 1) };
      }
      if (nw.rank < cur.rank && live && !s.free) return { kind: 'down', amount: 0, from: p.sub_end };
      const curDays = Math.max(1, Math.round((TB.endOf(p.sub_end || TB.dayKey(0)) - TB.endOf(p.sub_start || TB.dayKey(0))) / DAY));
      const credit = live && !s.free && s.daysLeft > 0 ? Math.round(TB.price(cur, p.billing_cycle) * Math.min(1, s.daysLeft / curDays)) : 0;
      const from = TB.dayKey(0);
      return { kind: 'up', amount: Math.max(0, TB.price(nw, cyc) - credit), credit, from, to: addMonths(from, cyc === 'yearly' ? 12 : 1) };
    };
    const step1 = () => TB.modal({
      icon: 'crown', title: 'Ubah atau perpanjang paket', sub: 'Upgrade langsung aktif dengan potongan prorata. Downgrade berlaku di akhir periode berjalan.', wide: true,
      body: `<div class="tb-row between wrap" style="gap:10px;margin-bottom:14px"><div class="tb-label">Pilih paket</div><div class="tb-btn-group" id="ck-cyc"><button class="tb-seg ${cyc === 'monthly' ? 'is-on' : ''}" data-c="monthly">Bulanan</button><button class="tb-seg ${cyc === 'yearly' ? 'is-on' : ''}" data-c="yearly">Tahunan · hemat 2 bulan</button></div></div>
        <div class="tb-grid k3" style="gap:10px" id="ck-plans"></div>
        <div class="tb-label" style="margin:18px 0 10px" id="ck-pay-l">Metode pembayaran</div><div class="tb-pay" id="ck-pay">${PAY.map(([k, l, col]) => `<button class="${pay === k ? 'is-on' : ''}" data-py="${k}"><span class="pm" style="background:${col}">${l.split(' ').pop().slice(0, 4).toUpperCase()}</span>${l}</button>`).join('')}</div>
        <div class="tb-est" style="margin-top:18px;padding:14px;border-radius:12px;background:var(--sunk)" id="ck-sum"></div>`,
      foot: `<div class="left">${icon('shield')}Pembayaran aman · bisa dibatalkan kapan saja</div><button class="tb-btn" data-close>Batal</button><button class="tb-btn primary" id="ck-go">Lanjut</button>`,
      onMount: (box) => {
        const draw = () => {
          box.querySelector('#ck-plans').innerHTML = S().plans.map((pl) => `<button class="tb-pkg ${target === pl.plan ? 'is-on' : ''}" data-pl="${pl.plan}" style="padding:14px">${pl.plan === p.plan ? '<span class="b" style="background:var(--tg-2)">Saat ini</span>' : ''}<div class="c">${esc(pl.plan)}</div><div class="p">${pl.price_month ? TB.rp(TB.price(pl, cyc)) + (cyc === 'yearly' ? '/thn' : '/bln') : 'Gratis'}</div><div class="p" style="margin-top:4px">${TB.unl(pl.accounts)} akun Telegram</div></button>`).join('');
          const k = calc(), nw = TB.planRow(target);
          const showPay = k.kind === 'up' || k.kind === 'renew';
          box.querySelector('#ck-pay').style.display = box.querySelector('#ck-pay-l').style.display = showPay ? '' : 'none';
          const L = TB.planRow(target), lost = [];
          if (k.kind === 'down' || k.kind === 'free') { if (S().accounts.filter((a) => a.enabled).length > L.accounts) lost.push(`${S().accounts.filter((a) => a.enabled).length - L.accounts} akun Telegram akan dijeda`); if (TB.running().length > L.campaigns_active) lost.push(`${TB.running().length - L.campaigns_active} campaign akan dijeda`); if (L.sources !== -1 && S().sources.filter((x) => x.active).length > L.sources) lost.push('sebagian sumber deteksi dinonaktifkan'); }
          box.querySelector('#ck-sum').innerHTML = k.kind === 'renew' ? `<div class="tb-est-row"><span>Perpanjang ${esc(nw.plan)} · ${CYC[cyc]}</span><b>${TB.rp(k.amount)}</b></div><div class="tb-est-row"><span>Periode baru</span><b>${TB.dshort(TB.endOf(k.from))} – ${TB.date(TB.endOf(k.to))}</b></div><div class="tb-est-row tb-est-total"><span>Total bayar <span class="muted" style="font-size:11.5px">(termasuk PPN)</span></span><b>${TB.rp(k.amount)}</b></div>`
            : k.kind === 'up' ? `<div class="tb-est-row"><span>Paket ${esc(nw.plan)} · ${CYC[cyc]}</span><b>${TB.rp(TB.price(nw, cyc))}</b></div>${k.credit ? `<div class="tb-est-row"><span>Sisa nilai paket ${esc(p.plan)} (${s.daysLeft} hari)</span><b style="color:var(--color-ok)">− ${TB.rp(k.credit)}</b></div>` : ''}<div class="tb-est-row"><span>Aktif</span><b>Langsung · ${TB.dshort(TB.endOf(k.from))} – ${TB.date(TB.endOf(k.to))}</b></div><div class="tb-est-row tb-est-total"><span>Total bayar hari ini</span><b>${TB.rp(k.amount)}</b></div>`
              : `<div class="tb-est-row"><span>${k.kind === 'free' ? 'Turun ke paket Free' : `Downgrade ke ${esc(nw.plan)}`}</span><b>Tanpa biaya</b></div><div class="tb-est-row"><span>Berlaku</span><b>${p.sub_end ? 'Akhir periode · ' + TB.date(TB.endOf(p.sub_end)) : 'Segera'}</b></div>${lost.length ? `<div class="tb-alert warn" style="padding:9px 11px"><div class="a-b a-s" style="font-size:12.5px"><b style="color:var(--color-fg)">Saat berlaku:</b> ${lost.join(' · ')}. Data tidak dihapus dan pulih saat upgrade.</div></div>` : ''}`;
          box.querySelector('#ck-go').textContent = k.kind === 'up' ? `Bayar ${TB.rp(k.amount)}` : k.kind === 'renew' ? `Perpanjang · ${TB.rp(k.amount)}` : 'Jadwalkan perubahan';
          box.querySelector('#ck-go').disabled = target === p.plan && cyc === p.billing_cycle && p.plan === 'Free';
        };
        draw();
        box.querySelector('#ck-cyc').addEventListener('click', (e) => { const b = e.target.closest('[data-c]'); if (!b) return; cyc = b.dataset.c; box.querySelectorAll('[data-c]').forEach((x) => x.classList.toggle('is-on', x === b)); draw(); });
        box.querySelector('#ck-plans').addEventListener('click', (e) => { const b = e.target.closest('[data-pl]'); if (!b) return; target = b.dataset.pl; draw(); });
        box.querySelector('#ck-pay').addEventListener('click', (e) => { const b = e.target.closest('[data-py]'); if (!b) return; pay = b.dataset.py; box.querySelectorAll('[data-py]').forEach((x) => x.classList.toggle('is-on', x === b)); });
        box.querySelector('#ck-go').addEventListener('click', (e) => {
          const k = calc();
          if (k.kind === 'down' || k.kind === 'free') {
            if (!p.sub_end || s.free) { p.plan = target; p.billing_cycle = cyc; TB.applyPlan(); TB.closeModal(); TB.emit('change'); return; }
            p.scheduled_change = { plan: target, cycle: cyc }; p.auto_renew = target !== 'Free';
            ev('scheduled', `${target === 'Free' ? 'Turun ke Free' : `Downgrade ke ${target}`} dijadwalkan pada ${TB.date(TB.endOf(p.sub_end))}`);
            TB.closeModal(); TB.toast('Perubahan paket dijadwalkan', `Berlaku ${TB.date(TB.endOf(p.sub_end))}`, 'info'); TB.emit('change'); return;
          }
          const m = PAY.find((x) => x[0] === pay)[1];
          const inv = TB.createPayment({ plan: target, cycle: cyc, kind: k.kind === 'renew' ? 'renew' : 'upgrade', description: `${k.kind === 'renew' ? 'Perpanjangan ' + target : `Upgrade ${p.plan} → ${target}`} · ${CYC[cyc]}`, amount: k.amount, from: k.from, to: k.to, method: m });
          p.pending_change = { plan: target, cycle: cyc, kind: k.kind };
          if (p.sub_status !== 'expired') p.sub_status = 'pending';
          ev('pending', `Transaksi ${inv.id} dibuat di Pakasir · ${TB.rp(k.amount)} via ${m}`);
          TB.busy(e.currentTarget, 600, () => step2(inv), 'Membuat transaksi…');
          TB.emit('change');
        });
      },
    });
    const step2 = (inv) => TB.payModal(inv);
    step1();
  };
  /* Demo-only status preview, so every subscription state and its rules can be seen */
  TB.previewStatus = (k) => {
    const p = S().profile, o = TB.S.profile0;
    S().payments.filter((i) => i.demo && i.status === 'pending').forEach((i) => TB.expirePayment(i, 'Pratinjau demo direset'));
    p.pending_change = null; p.scheduled_change = null;
    if (k === 'active') Object.assign(p, { plan: o.plan, billing_cycle: o.billing_cycle, sub_status: 'active', sub_start: o.sub_start, sub_end: o.sub_end, auto_renew: true });
    if (k === 'expiring') Object.assign(p, { plan: o.plan, sub_status: 'active', sub_start: TB.dayKey(-27), sub_end: TB.dayKey(3), auto_renew: false });
    if (k === 'pending') { Object.assign(p, { plan: o.plan, sub_status: 'pending', sub_start: o.sub_start, sub_end: o.sub_end }); const inv = TB.createPayment({ plan: 'Business', cycle: 'monthly', kind: 'upgrade', description: 'Upgrade Pro → Business · Bulanan', amount: 899000 - 290000, from: TB.dayKey(0), to: addMonths(TB.dayKey(0), 1), method: 'VA BNI' }); inv.demo = true; p.pending_change = { plan: 'Business', cycle: 'monthly', kind: 'up' }; }
    if (k === 'grace') Object.assign(p, { plan: o.plan, sub_status: 'expired', sub_start: TB.dayKey(-32), sub_end: TB.dayKey(-1), auto_renew: false });
    if (k === 'expired') Object.assign(p, { plan: o.plan, sub_status: 'expired', sub_start: TB.dayKey(-36), sub_end: TB.dayKey(-5), auto_renew: false });
    if (k === 'cancelled') Object.assign(p, { plan: o.plan, sub_status: 'cancelled', sub_start: o.sub_start, sub_end: o.sub_end, auto_renew: false });
    S().ui.subPreview = k;
    TB.applyPlan();
    TB.emit('change');
  };

  /* ======================= SUBSCRIPTION PAGE ======================= */
  const FEAT = [['accounts', 'Akun Telegram', (v) => TB.unl(v)], ['discovery', 'Auto Discovery (deteksi link)'], ['join', 'Auto Join'], ['broadcast', 'Auto Broadcast'], ['campaign', 'Campaign Management'], ['monitoring', 'Monitoring'], ['autoreply', 'Auto-Reply'], ['sources', 'Sumber deteksi', (v) => TB.unl(v)], ['campaigns_active', 'Campaign aktif', (v) => TB.unl(v)], ['targets_per_campaign', 'Target per campaign', (v) => TB.unl(v)], ['report_days', 'Riwayat laporan', (v) => (v >= 365 ? '1 tahun' : v + ' hari')]];
  const PREV = [['active', 'Aktif'], ['expiring', 'Menjelang berakhir'], ['pending', 'Pending'], ['cancelled', 'Dibatalkan'], ['grace', 'Masa tenggang'], ['expired', 'Kedaluwarsa']];
  P.billing = {
    title: 'Langganan & Paket', section: 'Akun',
    render(el) {
      const p = S().profile, s = TB.sub(), cur = TB.planRow(p.plan), L = TB.lim(), ui = S().ui;
      const cyc = ui.planCycle;
      const period = s.start && s.end ? Math.max(1, Math.round((TB.endOf(s.end) - TB.endOf(s.start)) / DAY)) : 1;
      const used = [
        ['Akun Telegram aktif', S().accounts.filter((a) => a.enabled).length, L.accounts, 'smartphone'],
        ['Sumber deteksi aktif', S().sources.filter((x) => x.active).length, L.sources, 'scan'],
        ['Campaign berjalan', TB.running().length, L.campaigns_active, 'megaphone'],
        ['Aturan auto-reply aktif', S().rules.filter((r) => r.active).length, L.reply_rules, 'reply'],
        ['Join hari ini', TB.joinsToday(), L.joins_day, 'user-plus'],
      ];
      const stBadge = `<span class="tb-badge ${TB.SS[s.st].c}">${s.st === 'expired' && s.inGrace ? 'Masa tenggang' : TB.SS[s.st].l}</span>`;
      el.innerHTML = `
      <div class="tb-head"><div><h1>Langganan & Paket</h1><p>Akses fitur ditentukan oleh paket berlangganan — tanpa saldo atau kredit per pesan.</p></div>
        <div class="actions"><button class="tb-btn" data-action="invoice-all">${icon('receipt')}Semua invoice</button><button class="tb-btn primary" data-action="sub-change">${icon('sparkles')}Ubah paket</button></div></div>
      <div class="tb-card" style="padding:10px 14px;margin-bottom:16px;border-style:dashed;box-shadow:none"><div class="tb-filters"><span class="muted" style="font-size:12.5px">${icon('eye')} Pratinjau status (demo):</span>${PREV.map(([k, l]) => `<button class="tb-chip ${ui.subPreview === k ? 'is-on' : ''}" style="height:28px" data-action="sub-preview" data-v="${k}">${l}</button>`).join('')}</div></div>
      ${TB.subAlert() ? `<div style="margin-bottom:16px">${TB.subAlert()}</div>` : ''}
      <div class="tb-grid main-side">
        <div class="tb-balance-hero" data-source="profile">
          <div class="l">${icon('crown')}Paket saat ini <span style="margin-left:auto;background:rgba(255,255,255,.18);padding:2px 10px;border-radius:99px;font-weight:600;font-size:12px">${s.st === 'expired' && s.inGrace ? 'Masa tenggang' : TB.SS[s.st].l}</span></div>
          <div class="v">${esc(p.plan)}${s.effective !== p.plan ? `<span style="font-size:16px;font-weight:500;opacity:.85"> → berjalan sebagai ${esc(s.effective)}</span>` : ''}</div>
          <div class="s">${s.free ? 'Gratis selamanya · upgrade kapan saja' : `${TB.rp(TB.price(cur, p.billing_cycle))} / ${p.billing_cycle === 'yearly' ? 'tahun' : 'bulan'} · ${CYC[p.billing_cycle]} · ${esc(p.payment_method)}`}</div>
          ${s.free ? '' : `<div style="position:relative;margin-top:16px"><div class="tb-row between" style="font-size:12.5px;margin-bottom:6px;opacity:.9"><span>Mulai ${TB.date(TB.endOf(s.start))}</span><span>${s.daysLeft > 0 ? `${s.daysLeft} hari lagi` : s.inGrace ? `Tenggang ${s.graceLeft} hari` : 'Berakhir'}</span><span>Akhir ${TB.date(TB.endOf(s.end))}</span></div><div style="height:6px;border-radius:9px;background:rgba(255,255,255,.22);overflow:hidden"><i style="display:block;height:100%;border-radius:9px;background:#fff;width:${Math.max(0, Math.min(100, (1 - s.daysLeft / period) * 100)).toFixed(1)}%"></i></div></div>`}
          <div class="acts">
            ${s.st === 'pending' ? `<button class="tb-btn" data-action="sub-pay">${icon('card')}Bayar tagihan</button>` : s.st === 'expired' ? `<button class="tb-btn" data-action="sub-renew">${icon('refresh')}Aktifkan kembali</button>` : s.st === 'cancelled' ? `<button class="tb-btn" data-action="sub-reactivate">${icon('play')}Batalkan pembatalan</button>` : !s.free ? `<button class="tb-btn" data-action="sub-renew">${icon('refresh')}Perpanjang</button>` : `<button class="tb-btn" data-action="sub-change" data-v="Pro">${icon('sparkles')}Upgrade ke Pro</button>`}
            <button class="tb-btn ghost-w" data-action="sub-change">${icon('sliders')}Ubah paket</button>
            ${!s.free && ['active', 'pending'].includes(s.st) ? `<button class="tb-btn ghost-w" data-action="sub-cancel">${icon('x')}Batalkan langganan</button>` : ''}
          </div>
        </div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Pemakaian vs batas paket</h3><p>Batas paket ${esc(L.plan)}${s.effective !== p.plan ? ' (berlaku saat ini)' : ''}</p></div>${stBadge}</div>
          <div class="tb-card-b"><div class="tb-stack" style="gap:12px" data-source="plans">${used.map(([l, have, max, ic]) => `<div><div class="tb-row between" style="font-size:12.5px;margin-bottom:6px"><span class="muted">${icon(ic)} ${l}</span><b class="num">${n(have)} / ${max === -1 ? '∞' : n(max)}</b></div>${TB.prog(max === -1 ? 0.08 : Math.min(1, have / Math.max(1, max)), max !== -1 && have >= max ? 'warn' : 'ok')}</div>`).join('')}</div>
            ${!s.free ? `<div class="tb-set-row" style="margin-top:8px;padding-bottom:0"><div><div class="t" style="font-size:13px">Perpanjang otomatis</div><div class="d">${p.auto_renew ? `Ditagih ${TB.rp(TB.price(cur, p.billing_cycle))} pada ${TB.date(TB.endOf(s.end))}` : 'Nonaktif — paket berakhir di akhir periode'}</div></div>${TB.sw('autorenew', p.auto_renew, `data-action="autorenew" ${s.st === 'expired' ? 'disabled' : ''}`)}</div>` : ''}</div></div>
      </div>
      <div class="tb-head mt-24" id="plans-anchor" style="margin-bottom:14px"><div><h1 style="font-size:18px">Paket layanan</h1><p>Upgrade langsung aktif dengan potongan sisa masa paket. Downgrade berlaku di akhir periode.</p></div>
        <div class="tb-btn-group"><button class="tb-seg ${cyc === 'monthly' ? 'is-on' : ''}" data-action="plan-cycle" data-v="monthly">Bulanan</button><button class="tb-seg ${cyc === 'yearly' ? 'is-on' : ''}" data-action="plan-cycle" data-v="yearly">Tahunan <span class="tb-badge ok plain" style="height:18px;font-size:10px;margin-left:4px">-17%</span></button></div></div>
      <div class="tb-grid k3" data-source="plans">${S().plans.map((pl) => {
        const isCur = pl.plan === p.plan, up = pl.rank > cur.rank;
        return `<div class="tb-card tb-plan ${isCur ? 'is-current' : ''}">${isCur ? `<span class="tb-badge info p-ribbon">Paket Anda</span>` : pl.plan === 'Pro' ? '<span class="tb-badge violet plain p-ribbon">Paling populer</span>' : ''}
          <div class="p-name">${pl.plan === 'Business' ? icon('crown') : pl.plan === 'Pro' ? icon('sparkles') : icon('user')}${esc(pl.plan)}</div>
          <div class="p-price">${pl.price_month ? TB.rp(TB.price(pl, cyc)) : 'Rp 0'}<small> /${cyc === 'yearly' ? 'tahun' : 'bulan'}</small></div>
          <div class="muted" style="font-size:12.5px;margin-top:-8px">${esc(pl.tagline)}${cyc === 'yearly' && pl.price_month ? ` · setara ${TB.rp(Math.round(pl.price_year / 12))}/bln` : ''}</div>
          <div class="tb-row" style="gap:8px"><span class="tb-badge plain info">${icon('smartphone')} ${TB.unl(pl.accounts)} akun Telegram</span></div>
          <ul>${pl.extras.split('|').map((f) => `<li>${icon('check')}<span>${esc(f)}</span></li>`).join('')}</ul>
          <button class="tb-btn ${isCur ? '' : up ? 'primary' : ''}" style="margin-top:auto" ${isCur && cyc === p.billing_cycle ? 'disabled' : ''} data-action="sub-change" data-v="${esc(pl.plan)}">${isCur ? (cyc === p.billing_cycle ? 'Paket saat ini' : `Ganti ke ${CYC[cyc].toLowerCase()}`) : up ? `Upgrade ke ${esc(pl.plan)}` : `Downgrade ke ${esc(pl.plan)}`}</button></div>`;
      }).join('')}</div>
      <div class="tb-card mt-16"><div class="tb-card-h"><div><h3>Perbandingan fitur</h3><p>Fitur yang tersedia di setiap paket</p></div></div>
        <div class="tb-card-b" style="padding:10px 0 4px"><div class="tb-table-wrap"><table class="tb-table" data-source="plans" data-row-key="plan"><thead><tr><th>Fitur</th>${S().plans.map((pl) => `<th class="r" style="${pl.plan === p.plan ? 'color:var(--tg-ink)' : ''}">${esc(pl.plan)}${pl.plan === p.plan ? ' ✓' : ''}</th>`).join('')}</tr></thead>
          <tbody>${FEAT.map(([k, l, f]) => `<tr><td class="t-main">${l}</td>${S().plans.map((pl) => { const v = pl[k]; const txt = f ? f(v) : v; const tone = v === 'Ya' || v === 'Lengkap' ? 'ok' : v === 'Terbatas' || v === 'Dasar' ? 'warn' : ''; return `<td class="r" style="${pl.plan === p.plan ? 'background:var(--tg-softer)' : ''}">${f ? `<b class="num">${esc(txt)}</b>` : `<span class="tb-badge plain ${tone}">${tone === 'ok' ? '✓ ' : ''}${esc(txt)}</span>`}</td>`; }).join('')}</tr>`).join('')}</tbody></table></div></div></div>
      <div class="tb-grid k2 mt-16">
        <div class="tb-card"><div class="tb-card-h"><div><h3>${icon('shield-alert')}Aturan saat paket kedaluwarsa</h3><p>Data Anda tidak pernah dihapus otomatis</p></div></div>
          <div class="tb-card-b"><div class="tb-list">${[
            ['bell', 'info', 'Pengingat H-7, H-3, dan H-1', 'Dikirim via email, bot Telegram, dan notifikasi in-app sebelum tanggal berakhir.'],
            ['refresh', 'ok', 'Perpanjangan otomatis', 'Bila aktif, tagihan dibuat 3 hari sebelum berakhir. Gagal bayar dicoba ulang 2× dan status menjadi Pending.'],
            ['clock', 'warn', `Masa tenggang ${p.grace_days} hari`, 'Setelah tanggal berakhir, semua automation tetap berjalan sementara agar Anda bisa memperpanjang.'],
            ['lock', 'bad', 'Turun ke batas paket Free', 'Setelah masa tenggang: hanya 1 akun & 1 campaign aktif, 2 sumber deteksi, 10 join/hari, monitoring dasar. Kelebihan dijeda, bukan dihapus.'],
            ['inbox', '', 'Data disimpan 90 hari', 'Campaign, template, log, dan sesi akun tersimpan. Perpanjang kapan saja untuk memulihkan semuanya otomatis.'],
            ['x-circle', '', 'Jika dibatalkan', 'Paket tetap aktif hingga akhir periode yang sudah dibayar, tanpa perpanjangan otomatis, lalu mengikuti aturan di atas.'],
          ].map(([ic, tone, t, d]) => `<div class="tb-li" style="align-items:flex-start"><div class="ico ${tone}">${icon(ic)}</div><div class="body"><div class="t" style="white-space:normal">${t}</div><div class="s" style="white-space:normal">${d}</div></div></div>`).join('')}</div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>${icon('bell')}Pengingat menjelang kedaluwarsa</h3><p>Kapan dan lewat mana Anda diingatkan</p></div></div>
          <div class="tb-card-b"><div class="tb-label" style="margin-bottom:8px">Kirim pengingat</div><div class="tb-row wrap" style="gap:6px">${[14, 7, 3, 1].map((d) => `<button class="tb-chip ${s.rem.includes(d) ? 'is-on' : ''}" data-action="rem-day" data-v="${d}">H-${d}</button>`).join('')}</div>
            <div class="mt-16">${[['email', 'Email', 'mail'], ['bot', 'Bot Telegram', 'bot'], ['app', 'Notifikasi in-app', 'bell']].map(([k, l, ic]) => `<div class="tb-set-row" style="padding:10px 0"><div class="t" style="font-size:13px">${icon(ic)} ${l}</div>${TB.sw('rem_' + k, S().prefs.notif.expiry[k], `data-action="rem-ch" data-v="${k}"`)}</div>`).join('')}</div>
            ${!s.free && s.end ? `<div class="tb-label" style="margin:12px 0 8px">Jadwal pengingat berikutnya</div><div class="tb-stack" style="gap:6px">${s.rem.slice().sort((a, b) => b - a).map((d) => { const at = new Date(TB.endOf(s.end).getTime() - d * DAY); const past = at < TB.now(); return `<div class="tb-row between" style="font-size:12.5px"><span class="${past ? 'muted' : ''}">${past ? icon('check') : icon('clock')} H-${d}</span><span class="muted">${TB.date(at, { weekday: 'short', day: 'numeric', month: 'short' })} · 09:00${past ? ' · terkirim' : ''}</span></div>`; }).join('')}</div>` : ''}</div></div>
      </div>
      <div class="tb-grid main-side mt-16">
        <div class="tb-card"><div class="tb-card-h"><div><h3>Pembayaran terakhir</h3><p>Diproses lewat Pakasir · QRIS & Virtual Account</p></div><button class="tb-btn sm ghost" data-nav="payments">Semua ${icon('arrow-right')}</button></div>
          <div class="tb-card-b" style="padding-top:6px"><div class="tb-list" data-source="payments">${S().payments.slice(0, 5).map((x) => `<button class="tb-li" style="width:100%;background:none;border-left:0;border-right:0;border-top:0;cursor:pointer;text-align:left" data-action="pay-detail" data-id="${esc(x.id)}"><div class="ico ${x.status === 'paid' ? 'ok' : x.status === 'pending' ? 'warn' : x.status === 'failed' ? 'bad' : ''}">${icon(x.status === 'paid' ? 'check' : x.status === 'pending' ? 'clock' : 'x')}</div><div class="body"><div class="t">${esc(x.description)}</div><div class="s">${esc(x.id)} · ${esc(x.method)} · ${TB.dshort(x.created_at)}</div></div><div style="text-align:right"><div class="num" style="font-weight:600;font-size:13px">${TB.rp(x.amount_idr)}</div>${TB.badge(TB.PS, x.status, 'plain')}</div></button>`).join('')}</div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Riwayat langganan</h3><p>Perubahan status & paket</p></div></div>
          <div class="tb-card-b" style="padding-top:6px"><div class="tb-list" data-source="subscription_events">${S().subEvents.slice(0, 9).map((e) => { const [ic, tone] = EV[e.event] || ['info', '']; return `<div class="tb-li" style="align-items:flex-start"><div class="ico ${tone}">${icon(ic)}</div><div class="body"><div class="t" style="white-space:normal">${esc(e.detail)}</div><div class="s">${TB.dt(e.ts)}</div></div></div>`; }).join('')}</div></div></div>
      </div>`;
    },
  };

  TB.cancelFlow = () => {
    const p = S().profile;
    TB.modal({
      icon: 'x-circle', tone: 'bad', title: 'Batalkan langganan?', sub: `Paket ${esc(p.plan)} tetap aktif hingga <b>${TB.date(TB.endOf(p.sub_end), { day: 'numeric', month: 'long', year: 'numeric' })}</b>. Setelah itu akun turun ke paket Free.`,
      body: `<div class="tb-field"><label for="cx-r">Alasan pembatalan (opsional)</label><select class="tb-input" id="cx-r"><option>Harga terlalu mahal</option><option>Fitur kurang sesuai kebutuhan</option><option>Hanya butuh sementara</option><option>Pindah ke layanan lain</option><option>Lainnya</option></select></div>
        <div class="tb-alert warn mt-16" style="padding:10px 12px"><div class="a-b a-s" style="font-size:12.5px">Yang terjadi setelah berakhir: ${S().accounts.filter((a) => a.enabled).length - 1} akun dan ${Math.max(0, TB.running().length - 1)} campaign dijeda, monitoring menjadi dasar. Data disimpan 90 hari.</div></div>`,
      foot: `<button class="tb-btn" data-close>Tetap berlangganan</button><button class="tb-btn danger-solid" id="cx-go">Batalkan langganan</button>`,
      onMount: (b) => b.querySelector('#cx-go').addEventListener('click', () => {
        const why = b.querySelector('#cx-r').value;
        S().payments.filter((i) => i.status === 'pending').forEach((i) => TB.expirePayment(i, 'Dibatalkan karena langganan dibatalkan'));
        p.sub_status = 'cancelled'; p.auto_renew = false; p.pending_change = null;
        ev('cancelled', `Langganan dibatalkan (${why}) · aktif hingga ${TB.date(TB.endOf(p.sub_end))}`);
        TB.closeModal(); TB.toast('Langganan dibatalkan', `Tetap aktif hingga ${TB.date(TB.endOf(p.sub_end))}`, 'warn', { label: 'Urungkan', fn: () => TB.reactivate() }); TB.emit('change');
      }),
    });
  };
  TB.reactivate = () => { const p = S().profile; p.sub_status = 'active'; p.auto_renew = true; ev('reactivated', `Langganan ${p.plan} diaktifkan kembali · perpanjangan otomatis menyala`); TB.toast('Langganan aktif kembali', `Diperpanjang otomatis pada ${TB.date(TB.endOf(p.sub_end))}`); TB.emit('change'); };
})();
