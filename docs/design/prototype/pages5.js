/* TeleBlast — Payment History via Pakasir: transactions, webhook, verification, idempotent activation, reconciliation */
(() => {
  const TB = window.TB;
  const { esc, icon, n } = TB;
  const P = (TB.pages = TB.pages || {});
  const S = () => TB.S;
  const CYC = { monthly: 'Bulanan', yearly: 'Tahunan' };

  TB.PS = { pending: { l: 'Pending', c: 'warn' }, paid: { l: 'Paid', c: 'ok' }, expired: { l: 'Expired', c: '' }, failed: { l: 'Failed', c: 'bad' } };
  const ET = { created: ['receipt', 'info', 'Transaksi dibuat'], webhook: ['radio', 'info', 'Webhook diterima'], verified: ['shield', 'ok', 'Diverifikasi backend'], activated: ['check-circle', 'ok', 'Langganan diaktifkan'], duplicate: ['copy', 'warn', 'Notifikasi duplikat diabaikan'], reconciled: ['refresh', '', 'Rekonsiliasi'], expired: ['clock', '', 'Kedaluwarsa'], failed: ['x-circle', 'bad', 'Gagal'], checked: ['search', '', 'Cek status manual'] };
  TB.PAY_METHODS = [['qris', 'QRIS', '#E11D48', 60], ['va_bni', 'VA BNI', '#F97316', 1440], ['va_bri', 'VA BRI', '#1D4ED8', 1440], ['va_cimb', 'VA CIMB Niaga', '#B91C1C', 1440], ['va_permata', 'VA Permata', '#0F766E', 1440]];

  const nowIso = () => TB.now().toISOString();
  TB.evp = (pay, type, detail) => S().payEvents.unshift({ payment_id: pay.id, ts: nowIso(), type, detail });
  const hex = (k) => Array.from({ length: k }, () => '0123456789ABCDEF'[Math.floor(Math.random() * 16)]).join('');

  /* Create a transaction (re-uses an open one for the same purchase instead of making duplicates) */
  TB.createPayment = ({ plan, cycle, kind, description, amount, from, to, method }) => {
    const open = S().payments.find((x) => x.status === 'pending' && x.plan === plan && x.cycle === cycle && x.kind === kind && x.amount_idr === amount);
    if (open) { TB.toast('Transaksi yang sama masih menunggu pembayaran', `${open.id} dipakai ulang agar tidak ada tagihan ganda`, 'info'); return open; }
    const m = TB.PAY_METHODS.find((x) => x[1] === method) || TB.PAY_METHODS[0];
    const d = TB.dayKey(0).replace(/-/g, '').slice(2);
    const pay = { id: `TB-${d}-${String(Math.floor(Math.random() * 9000) + 1000)}`, created_at: nowIso(), plan, cycle, kind, description, amount_idr: amount, method: m[1], pakasir_ref: 'PKS-' + hex(8), status: 'pending', expires_at: new Date(TB.now().getTime() + m[3] * 60000).toISOString(), paid_at: null, period_start: from, period_end: to, verified: false, activated_at: null, webhook_count: 0, duplicates_ignored: 0, reconciled_at: null, fail_reason: '' };
    S().payments.unshift(pay);
    TB.evp(pay, 'created', `Transaksi dibuat di Pakasir · ${m[1]} · berlaku ${m[3] >= 1440 ? '24 jam' : '60 menit'}`);
    TB.log('info', null, '—', `Transaksi ${pay.id} dibuat (${TB.rp(amount)} via ${m[1]})`, 'Sistem', 'system');
    return pay;
  };

  /* Idempotent activation: one paid transaction can activate/extend a subscription exactly once */
  TB.activatePayment = (pay) => {
    if (pay.activated_at) { pay.duplicates_ignored++; TB.evp(pay, 'duplicate', 'Notifikasi berulang diabaikan — transaksi sudah diproses (tidak ada aktivasi ganda)'); return false; }
    const p = S().profile, was = p.plan;
    p.plan = pay.plan; p.billing_cycle = pay.cycle; p.sub_start = pay.period_start; p.sub_end = pay.period_end;
    p.sub_status = 'active'; p.auto_renew = true; p.pending_change = null; p.scheduled_change = null;
    pay.activated_at = nowIso();
    TB.evp(pay, 'activated', `${pay.kind === 'renew' ? 'Langganan ' + pay.plan + ' diperpanjang' : `${was === pay.plan ? 'Paket' : 'Upgrade ke'} ${pay.plan} diaktifkan`} · berlaku hingga ${TB.date(TB.endOf(pay.period_end))}`);
    TB.subEv(pay.kind === 'renew' ? 'renewed' : 'upgraded', pay.kind === 'renew' ? `Paket ${pay.plan} diperpanjang via ${pay.id}` : `${was} → ${pay.plan} (${CYC[pay.cycle].toLowerCase()}) via ${pay.id}`);
    TB.applyPlan(true);
    TB.log('success', null, '—', `Pembayaran ${pay.id} terverifikasi — paket ${pay.plan} aktif hingga ${TB.date(TB.endOf(pay.period_end))}`, 'Sistem', 'system');
    return true;
  };

  /* Simulated Pakasir webhook → backend re-verifies with the Pakasir API → activation */
  TB.webhook = (pay, onStep) => {
    const step = (k) => { onStep && onStep(k); TB.emit('change'); };
    pay.webhook_count++;
    TB.evp(pay, 'webhook', `Notifikasi pembayaran diterima dari Pakasir (#${pay.webhook_count})`);
    step('webhook');
    if (pay.activated_at) { setTimeout(() => { TB.activatePayment(pay); step('duplicate'); }, 500); return; }
    setTimeout(() => {
      if (!pay.paidAtPakasir) { TB.evp(pay, 'verified', 'Diverifikasi ke API Pakasir: belum lunas · notifikasi diabaikan'); step('unpaid'); return; }
      pay.verified = true; pay.status = 'paid'; pay.paid_at = pay.paidAtPakasir;
      TB.evp(pay, 'verified', `Status diverifikasi ulang ke API Pakasir: lunas · jumlah cocok ${TB.rp(pay.amount_idr)}`);
      step('verified');
      setTimeout(() => { TB.activatePayment(pay); step('activated'); }, 800);
    }, 1000);
  };

  /* Reconciliation: ask Pakasir for the true status; fixes missed webhooks without double-activating */
  TB.reconcile = (pay, btn) => TB.busy(btn, 1200, () => {
    pay.reconciled_at = nowIso();
    if (pay.status === 'pending' && pay.paidAtPakasir) {
      pay.status = 'paid'; pay.paid_at = pay.paidAtPakasir; pay.verified = true;
      TB.evp(pay, 'reconciled', 'Rekonsiliasi: Pakasir mencatat lunas, webhook belum diterima — status disinkronkan');
      TB.activatePayment(pay);
      TB.toast('Pembayaran ditemukan', `${pay.id} lunas — langganan diaktifkan`, 'ok');
    } else if (pay.status === 'pending' && new Date(pay.expires_at) < TB.now()) {
      TB.expirePayment(pay, 'Rekonsiliasi: batas waktu habis tanpa pembayaran');
      TB.toast('Transaksi kedaluwarsa', pay.id, 'info');
    } else if (pay.status === 'pending') {
      TB.evp(pay, 'checked', 'Cek status ke Pakasir: belum ada pembayaran masuk');
      TB.toast('Belum ada pembayaran', 'Selesaikan pembayaran sebelum batas waktu', 'info');
    } else if (pay.status === 'paid' && !pay.activated_at) {
      TB.evp(pay, 'reconciled', 'Rekonsiliasi: lunas namun belum diaktifkan — aktivasi dijalankan');
      TB.activatePayment(pay);
      TB.toast('Langganan diaktifkan', pay.id);
    } else {
      TB.evp(pay, 'reconciled', `Rekonsiliasi: cocok dengan data Pakasir (${TB.PS[pay.status].l.toLowerCase()})${pay.activated_at ? ' · aktivasi tercatat 1×' : ''}`);
      TB.toast('Status cocok', `${pay.id} · ${TB.PS[pay.status].l}`, 'ok');
    }
    TB.emit('change');
  }, 'Mengecek…');

  TB.expirePayment = (pay, why) => {
    if (pay.status !== 'pending') return;
    pay.status = 'expired';
    TB.evp(pay, 'expired', why || 'Batas waktu pembayaran habis · langganan tidak diubah');
    const p = S().profile;
    if (p.sub_status === 'pending' && !S().payments.some((x) => x.status === 'pending')) { p.sub_status = TB.endOf(p.sub_end) < TB.now() ? 'expired' : 'active'; p.pending_change = null; }
  };
  TB.paymentsTick = () => {
    let ch = false;
    S().payments.forEach((x) => { if (x.status === 'pending' && new Date(x.expires_at) < TB.now()) { TB.expirePayment(x); ch = true; } });
    return ch;
  };

  /* Pakasir checkout */
  TB.payModal = (pay) => {
    if (!pay) return;
    if (pay.status !== 'pending') return TB.paymentDetail(pay.id);
    const qris = pay.method === 'QRIS';
    const STEPS = [['paid', 'Pembayaran di Pakasir'], ['webhook', 'Webhook diterima'], ['verified', 'Diverifikasi backend'], ['activated', 'Langganan aktif']];
    const box = TB.modal({
      icon: qris ? 'qr-code' : 'card', title: `Bayar ${pay.id}`, sub: `${esc(pay.description)} · <b>${TB.rp(pay.amount_idr)}</b> · diproses oleh <b>Pakasir</b>`,
      body: `<div class="tb-row between" style="font-size:12.5px;margin-bottom:12px"><span class="muted">Ref. Pakasir <span class="num">${esc(pay.pakasir_ref)}</span></span><span>Berlaku hingga <b class="num" id="pk-cd">—</b></span></div>
        ${qris ? `<div style="text-align:center"><div class="tb-qr" id="pk-qr"></div><p class="muted" style="font-size:13px;margin:12px 0 0">Pindai QRIS dengan m-banking atau e-wallet apa pun.</p></div>`
          : `<div style="text-align:center;padding:6px 0"><div class="muted" style="font-size:12.5px">Nomor ${esc(pay.method)}</div><div style="font-size:26px;font-weight:700;letter-spacing:.04em;margin:6px 0" class="num">9888 0142 ${pay.id.slice(-4)} 7731</div><button class="tb-btn sm" id="pk-copy">${icon('copy')}Salin nomor</button></div>`}
        <div class="tb-steps" id="pk-steps" style="margin:18px 0 0">${STEPS.map(([k, l], i) => `<div class="tb-step" data-st="${k}" style="cursor:default"><span class="n">${i + 1}</span><span class="tt">${l}</span></div>`).join('')}</div>
        <p class="muted" style="font-size:12px;margin:10px 0 0">Langganan diaktifkan setelah backend memverifikasi pembayaran langsung ke Pakasir — bukan dari notifikasi saja.</p>
        <div class="tb-row wrap" style="gap:6px;margin-top:10px;font-size:12px"><span class="muted">Simulasi demo:</span><button class="tb-btn xs ghost" id="pk-miss">Bayar, tapi webhook tidak sampai</button><button class="tb-btn xs ghost" id="pk-exp">Biarkan kedaluwarsa</button></div>`,
      foot: `<button class="tb-btn" data-close>Bayar nanti</button><button class="tb-btn" id="pk-check">${icon('refresh')}Cek status</button><button class="tb-btn primary" id="pk-paid">Saya sudah bayar</button>`,
    });
    const q = box.querySelector('#pk-qr');
    if (q) { let s2 = 11, h = ''; const r = () => ((s2 = (s2 * 9301 + 49297) % 233280) / 233280); for (let i = 0; i < 441; i++) { const row = Math.floor(i / 21), col = i % 21; const f = [[0, 0], [0, 14], [14, 0]].find(([a, b]) => row >= a && row < a + 7 && col >= b && col < b + 7); const on = f ? (row === f[0] || row === f[0] + 6 || col === f[1] || col === f[1] + 6 || (row >= f[0] + 2 && row <= f[0] + 4 && col >= f[1] + 2 && col <= f[1] + 4)) : r() > 0.5; h += `<i class="${on ? '' : 'o'}"></i>`; } q.innerHTML = h; }
    const cp = box.querySelector('#pk-copy'); if (cp) cp.addEventListener('click', () => TB.toast('Nomor VA disalin', '', 'info'));
    const cd = box.querySelector('#pk-cd');
    const t = setInterval(() => { if (!cd.isConnected) return clearInterval(t); const s = Math.max(0, (new Date(pay.expires_at) - TB.now()) / 1000); cd.textContent = s > 3600 ? `${Math.floor(s / 3600)}j ${Math.floor((s % 3600) / 60)}m` : TB.dur(s); }, 1000);
    const mark = (k) => { const order = STEPS.map((x) => x[0]); const idx = order.indexOf(k); box.querySelectorAll('[data-st]').forEach((el, i) => { el.classList.toggle('is-done', i <= idx); el.classList.toggle('is-on', i === idx + 1); }); };
    box.querySelector('#pk-paid').addEventListener('click', (e) => {
      const btn = e.currentTarget; btn.disabled = true; box.querySelector('#pk-check').disabled = true;
      pay.paidAtPakasir = nowIso();
      mark('paid');
      setTimeout(() => TB.webhook(pay, (k) => {
        if (!box.isConnected) return;
        if (k === 'webhook' || k === 'verified') mark(k);
        if (k === 'activated') {
          mark('activated');
          setTimeout(() => {
            const p = S().profile;
            TB.modal({ icon: '', title: '', body: `<div class="tb-success"><div class="s-ico">${icon('check')}</div><h2 style="margin:0;font-size:18px">Pembayaran terverifikasi</h2><p class="muted" style="margin:6px 0 0;font-size:13.5px">Paket <b>${esc(p.plan)}</b> aktif hingga <b>${TB.date(TB.endOf(p.sub_end), { day: 'numeric', month: 'long', year: 'numeric' })}</b>.<br>Transaksi ${esc(pay.id)} · ${esc(pay.method)} via Pakasir</p></div>`, foot: `<button class="tb-btn" id="pk-det">${icon('receipt')}Lihat transaksi</button><button class="tb-btn primary" data-close>Selesai</button>`, onMount: (b2) => b2.querySelector('#pk-det').addEventListener('click', () => TB.paymentDetail(pay.id)) });
            setTimeout(() => TB.webhook(pay, (k2) => { if (k2 === 'duplicate') TB.toast('Notifikasi duplikat dari Pakasir diabaikan', `${pay.id} sudah diproses — langganan tidak diperpanjang dua kali`, 'info'); }), 2600);
          }, 600);
        }
      }), 900);
    });
    box.querySelector('#pk-check').addEventListener('click', (e) => { TB.reconcile(pay, e.currentTarget); setTimeout(() => { if (pay.status !== 'pending' && box.isConnected) TB.closeModal(); }, 1400); });
    box.querySelector('#pk-miss').addEventListener('click', () => { pay.paidAtPakasir = nowIso(); mark('paid'); TB.toast('Dibayar di Pakasir — webhook tidak terkirim', 'Tekan “Cek status” untuk rekonsiliasi manual', 'warn'); });
    box.querySelector('#pk-exp').addEventListener('click', () => { TB.expirePayment(pay); TB.closeModal(); TB.toast('Transaksi kedaluwarsa', `${pay.id} · langganan tidak diubah`, 'info'); TB.emit('change'); });
  };

  /* Transaction detail */
  TB.paymentDetail = (id) => {
    const pay = S().payments.find((x) => x.id === id);
    if (!pay) return;
    const ev = S().payEvents.filter((e) => e.payment_id === id).sort((a, b) => (a.ts < b.ts ? 1 : -1));
    const row = (l, v) => `<div class="tb-est-row"><span>${l}</span><b style="text-align:right">${v}</b></div>`;
    TB.modal({
      icon: 'receipt', title: pay.id, wide: true, sub: `${TB.badge(TB.PS, pay.status)} <span style="margin-left:6px">${esc(pay.description)}</span>`,
      body: `<div class="tb-grid k2" style="gap:16px">
          <div class="tb-est" style="padding:14px;border-radius:12px;background:var(--sunk)">
            ${row('Jumlah', TB.rp(pay.amount_idr))}${row('Metode', esc(pay.method) + ' · Pakasir')}${row('Ref. Pakasir', `<span class="num">${esc(pay.pakasir_ref)}</span>`)}
            ${row('Dibuat', TB.dt(pay.created_at))}${row(pay.status === 'paid' ? 'Dibayar' : 'Batas bayar', pay.paid_at ? TB.dt(pay.paid_at) : TB.dt(pay.expires_at))}
            ${row('Periode langganan', `${TB.dshort(TB.endOf(pay.period_start))} – ${TB.date(TB.endOf(pay.period_end))}`)}</div>
          <div class="tb-est" style="padding:14px;border-radius:12px;background:var(--sunk)">
            ${row('Verifikasi backend', pay.verified ? '<span class="tb-badge ok plain">Terverifikasi ke API</span>' : '<span class="tb-badge plain">Belum</span>')}
            ${row('Aktivasi langganan', pay.activated_at ? `<span class="tb-badge ok plain">1× · ${TB.dt(pay.activated_at)}</span>` : '<span class="tb-badge plain">Tidak ada</span>')}
            ${row('Webhook diterima', `${pay.webhook_count}×`)}${row('Duplikat diabaikan', pay.duplicates_ignored ? `<span class="tb-badge warn plain">${pay.duplicates_ignored}×</span>` : '0')}
            ${row('Rekonsiliasi terakhir', pay.reconciled_at ? TB.dt(pay.reconciled_at) : '—')}${pay.fail_reason ? row('Alasan', `<span style="color:var(--color-bad)">${esc(pay.fail_reason)}</span>`) : ''}</div>
        </div>
        <div class="tb-label" style="margin:18px 0 8px">Riwayat pemrosesan</div>
        <div class="tb-list" data-source="payment_events">${ev.map((e) => { const [ic, tone, l] = ET[e.type] || ['info', '', e.type]; return `<div class="tb-li" style="align-items:flex-start"><div class="ico ${tone}">${icon(ic)}</div><div class="body"><div class="t">${l}</div><div class="s" style="white-space:normal">${esc(e.detail)}</div></div><div class="time">${TB.dt(e.ts)}</div></div>`; }).join('')}</div>`,
      foot: `<div class="left">${icon('shield')}Aktivasi hanya terjadi sekali per transaksi</div>
        <button class="tb-btn" id="pd-rec">${icon('refresh')}Cek ulang ke Pakasir</button>
        ${pay.status === 'pending' ? `<button class="tb-btn primary" id="pd-pay">${icon('card')}Bayar sekarang</button>` : pay.status === 'paid' ? `<button class="tb-btn primary" id="pd-inv">${icon('download')}Invoice</button>` : `<button class="tb-btn primary" id="pd-retry">${icon('refresh')}Buat transaksi baru</button>`}`,
      onMount: (b) => {
        b.querySelector('#pd-rec').addEventListener('click', (e) => { TB.reconcile(pay, e.currentTarget); setTimeout(() => TB.paymentDetail(id), 1300); });
        const pp = b.querySelector('#pd-pay'); if (pp) pp.addEventListener('click', () => TB.payModal(pay));
        const pi = b.querySelector('#pd-inv'); if (pi) pi.addEventListener('click', () => TB.toast('Invoice diunduh', pay.id + '.pdf', 'info'));
        const pr = b.querySelector('#pd-retry'); if (pr) pr.addEventListener('click', () => { TB.closeModal(); TB.checkout(pay.plan, pay.cycle); });
      },
    });
  };

  /* ======================= PAYMENT HISTORY PAGE ======================= */
  const PF = [['all', 'Semua'], ['paid', 'Paid'], ['pending', 'Pending'], ['expired', 'Expired'], ['failed', 'Failed']];
  P.payments = {
    title: 'Riwayat Pembayaran', section: 'Akun',
    render(el) {
      const ui = S().ui, A = S().payments;
      const yearAgo = new Date(TB.now().getTime() - 365 * 86400000);
      const paidYear = A.filter((x) => x.status === 'paid' && new Date(x.paid_at) > yearAgo);
      const pend = A.filter((x) => x.status === 'pending');
      const q = ui.payQ.toLowerCase();
      const rows = A.filter((x) => (ui.payStatus === 'all' || x.status === ui.payStatus) && (!q || (x.id + x.description + x.method + x.pakasir_ref).toLowerCase().includes(q)));
      const dups = A.reduce((s, x) => s + x.duplicates_ignored, 0);
      el.innerHTML = `
      <div class="tb-head"><div><h1>Riwayat Pembayaran</h1><p>Semua pembelian dan perpanjangan paket yang diproses lewat Pakasir. Tidak ada saldo, wallet, atau potongan per operasi.</p></div>
        <div class="actions"><button class="tb-btn" data-action="pay-export">${icon('download')}Ekspor CSV</button><button class="tb-btn primary" data-action="sub-change">${icon('crown')}Beli / perpanjang paket</button></div></div>
      ${pend.map((x) => `<div class="tb-alert warn" style="margin-bottom:12px"><div class="a-ico">${icon('clock')}</div><div class="a-b"><div class="a-t">${esc(x.id)} menunggu pembayaran · ${TB.rp(x.amount_idr)}</div><div class="a-s">${esc(x.description)} · ${esc(x.method)} · berlaku hingga ${TB.dt(x.expires_at)}</div></div><button class="tb-btn sm" data-action="pay-check" data-id="${esc(x.id)}">${icon('refresh')}Cek status</button><button class="tb-btn sm primary" data-action="pay-pay" data-id="${esc(x.id)}">Bayar</button></div>`).join('')}
      <div class="tb-grid k4" data-source="payments">
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Total dibayar · 12 bulan</span><span class="k-ico ok">${icon('check-circle')}</span></div><div class="k-val" style="font-size:24px">${TB.rp(paidYear.reduce((s, x) => s + x.amount_idr, 0))}</div><div class="k-foot">${paidYear.length} transaksi lunas</div></div>
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Pending</span><span class="k-ico warn">${icon('clock')}</span></div><div class="k-val">${pend.length}</div><div class="k-foot">${pend.length ? 'menunggu pembayaran' : 'tidak ada tagihan terbuka'}</div></div>
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Expired / failed</span><span class="k-ico violet">${icon('x-circle')}</span></div><div class="k-val">${A.filter((x) => x.status === 'expired').length}<small>/ ${A.filter((x) => x.status === 'failed').length}</small></div><div class="k-foot">langganan tidak berubah</div></div>
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl" data-tip="Notifikasi berulang dari Pakasir yang tidak memicu aktivasi kedua">Duplikat dicegah ${icon('info')}</span><span class="k-ico">${icon('shield')}</span></div><div class="k-val">${dups}</div><div class="k-foot">0 aktivasi ganda</div></div>
      </div>
      <div class="tb-grid main-side mt-16">
        <div class="tb-card">
          <div class="tb-row wrap" style="padding:14px 16px;gap:8px">${PF.map(([k, l]) => `<button class="tb-chip ${ui.payStatus === k ? 'is-on' : ''}" data-action="pay-status" data-v="${k}">${l}<span class="tb-count">${k === 'all' ? A.length : A.filter((x) => x.status === k).length}</span></button>`).join('')}
            <span class="tb-sp"></span><div class="tb-input-icon" style="width:min(240px,100%)">${icon('search')}<input class="tb-input sm" id="pay-q" placeholder="Order ID / ref. Pakasir…" value="${esc(ui.payQ)}"></div></div>
          ${rows.length ? `<div class="tb-table-wrap"><table class="tb-table" data-source="payments" data-row-key="id"><thead><tr><th>Transaksi</th><th>Paket</th><th class="tb-hide-sm">Metode</th><th class="r" data-field="amount_idr">Jumlah</th><th>Status</th><th class="tb-hide-sm">Pemrosesan</th><th class="r"></th></tr></thead>
            <tbody>${rows.map((x) => `<tr class="clickable" data-key="${esc(x.id)}" data-action="pay-detail" data-id="${esc(x.id)}"><td><div class="t-main num" style="font-size:12.5px">${esc(x.id)}</div><div class="t-sub">${TB.dt(x.created_at)}</div></td>
              <td><div class="tb-ellipsis" style="max-width:220px">${esc(x.description)}</div><div class="t-sub">${TB.dshort(TB.endOf(x.period_start))} – ${TB.date(TB.endOf(x.period_end))}</div></td>
              <td class="tb-hide-sm muted">${esc(x.method)}</td><td class="r num">${TB.rp(x.amount_idr)}</td><td>${TB.badge(TB.PS, x.status)}</td>
              <td class="tb-hide-sm"><div class="tb-row" style="gap:4px;flex-wrap:wrap">${x.verified ? `<span class="tb-tag" data-tip="Status dicek langsung ke API Pakasir">${icon('shield')}Verified</span>` : ''}${x.activated_at ? `<span class="tb-tag" style="color:var(--color-ok)">${icon('check')}Aktif 1×</span>` : ''}${x.duplicates_ignored ? `<span class="tb-tag" data-tip="Notifikasi berulang diabaikan">${icon('copy')}${x.duplicates_ignored} duplikat</span>` : ''}${!x.verified && !x.activated_at ? '<span class="t-sub">—</span>' : ''}</div></td>
              <td class="r" style="white-space:nowrap">${x.status === 'pending' ? `<button class="tb-btn xs primary" data-action="pay-pay" data-id="${esc(x.id)}">Bayar</button>` : x.status === 'paid' ? `<button class="tb-btn xs icon ghost" data-action="invoice" data-id="${esc(x.id)}" data-tip="Unduh invoice">${icon('download')}</button>` : ''}</td></tr>`).join('')}</tbody></table></div>`
            : TB.empty('receipt', 'Tidak ada transaksi', 'Tidak ada transaksi yang cocok dengan filter ini.')}
        </div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>${icon('shield')}Cara pembayaran diproses</h3><p>Aman dari aktivasi ganda</p></div></div>
          <div class="tb-card-b"><div class="tb-list">${[
            ['receipt', 'info', 'Transaksi dibuat', 'Order ID unik dibuat di Pakasir dengan batas waktu (QRIS 60 menit, VA 24 jam). Tagihan yang sama dipakai ulang, tidak digandakan.'],
            ['radio', 'info', 'Webhook dari Pakasir', 'Notifikasi pembayaran diterima backend TeleBlast.'],
            ['shield', 'ok', 'Verifikasi di backend', 'Status & jumlah dicek ulang langsung ke API Pakasir sebelum diproses — notifikasi saja tidak cukup.'],
            ['check-circle', 'ok', 'Aktivasi otomatis', 'Langganan diaktifkan atau diperpanjang otomatis, tepat satu kali per transaksi.'],
            ['copy', 'warn', 'Notifikasi berulang', 'Webhook dengan Order ID yang sudah diproses diabaikan (idempoten).'],
            ['refresh', '', 'Rekonsiliasi', 'Dicocokkan otomatis setiap hari dengan data Pakasir; Anda juga bisa menekan “Cek status” bila webhook terlambat.'],
          ].map(([ic, tone, t, d]) => `<div class="tb-li" style="align-items:flex-start"><div class="ico ${tone}">${icon(ic)}</div><div class="body"><div class="t">${t}</div><div class="s" style="white-space:normal">${d}</div></div></div>`).join('')}</div></div></div>
      </div>`;
      el.querySelector('#pay-q').addEventListener('input', (e) => { ui.payQ = e.target.value; const pos = e.target.selectionStart; this.render(el); const i = el.querySelector('#pay-q'); i.focus(); i.setSelectionRange(pos, pos); });
    },
  };
})();
