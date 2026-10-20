/* TeleBlast — pages: Auto Promotion builder, Reports, Billing, Settings */
(() => {
  const TB = window.TB;
  const { esc, icon, n, c, pct } = TB;
  const P = (TB.pages = TB.pages || {});
  const S = () => TB.S;

  /* ======================= AUTO PROMOTION (builder) ======================= */
  const STEPS = [['Dasar', 'Nama & akun'], ['Target', 'Grup & channel'], ['Pesan', 'Konten promosi'], ['Jadwal', 'Interval & waktu'], ['Tinjau', 'Cek & luncurkan']];
  const DAYS = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];
  const today = () => TB.now().toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' });
  const addDays = (s, k) => { const d = TB.parseDay(s); d.setUTCDate(d.getUTCDate() + k); return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Jakarta' }); };

  TB.blankDraft = (over = {}) => ({
    id: null, step: 0, name: '', account_id: (S().accounts.find((a) => a.status === 'connected') || {}).id || '',
    targets: [], message: '', btn_text: '', btn_url: '', interval_min: S().profile.default_interval, jitter: true, safe: true,
    t_start: '08:00', t_end: '21:00', days: [0, 1, 2, 3, 4, 5, 6], start: today(), end: addDays(today(), 7), cap: 600, tq: '', tf: 'all', flowSteps: TB.flowSteps('broadcast'), sources: [], template_id: '', ...over,
  });
  TB.newCampaign = (over) => { S().ui.draft = TB.blankDraft(over); S().ui.promoTab = 'builder'; TB.go('promo'); };
  TB.editCampaign = (id) => {
    const x = S().campaigns.find((k) => k.id === id);
    if (!x) return;
    const [ts, te] = x.window.split('–');
    const dayMap = { 'Setiap hari': [0, 1, 2, 3, 4, 5, 6], 'Sen–Sab': [0, 1, 2, 3, 4, 5], 'Sen–Jum': [0, 1, 2, 3, 4] };
    S().ui.draft = TB.blankDraft({ id, name: x.name, account_id: x.account_id, targets: TB.targetsFor(x).map((t) => t.id), message: x.message, interval_min: x.interval_min, t_start: ts, t_end: te, days: x.daysArr || dayMap[x.days] || [0, 1, 2, 3, 4, 5, 6], start: x.start, end: x.end, btn_text: x.btn_text || '', btn_url: x.btn_url || '', flowSteps: TB.flowSteps(x.flow), sources: String(x.sources || '').split(',').filter(Boolean), template_id: x.template_id || '' });
    S().ui.promoTab = 'builder'; TB.go('promo');
  };

  const est = (d) => {
    const [h1, m1] = d.t_start.split(':').map(Number), [h2, m2] = d.t_end.split(':').map(Number);
    const mins = Math.max(0, h2 * 60 + m2 - (h1 * 60 + m1));
    const runs = Math.max(0, Math.floor(mins / d.interval_min));
    const perDay = Math.min(d.targets.length * runs, d.cap);
    let days = 0;
    if (d.start && d.end && d.end >= d.start) {
      for (let s = d.start, k = 0; s <= d.end && k < 400; s = addDays(s, 1), k++) { const wd = (TB.parseDay(s).getUTCDay() + 6) % 7; if (d.days.includes(wd)) days++; }
    }
    const total = perDay * days;
    let risk = 0;
    if (d.interval_min < 30) risk += 2; else if (d.interval_min < 45) risk += 1;
    if (!d.jitter) risk += 1;
    if (!d.safe) risk += 1;
    if (perDay > 800) risk += 2; else if (perDay > 500) risk += 1;
    const acc = TB.acc(d.account_id);
    if (acc && acc.health < 70) risk += 1;
    return { runs, perDay, days, total, risk: risk <= 1 ? 'ok' : risk <= 3 ? 'warn' : 'bad', mins };
  };
  const renderMsg = (d) => {
    const t = S().targets.find((x) => x.id === d.targets[0]);
    let s = esc(d.message || 'Tulis pesan promosi Anda di sini…');
    s = s.replace(/\{([^{}|]+)\|[^{}]+\}/g, '$1')
      .replace(/\{nama_grup\}/g, esc(t ? t.title : 'Nama Grup'))
      .replace(/\{tanggal\}/g, TB.date(TB.now(), { day: 'numeric', month: 'long' }))
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>').replace(/__([^_]+)__/g, '<i>$1</i>')
      .replace(/(t\.me\/[\w/]+|https?:\/\/[^\s<]+)/g, '<a>$1</a>');
    return s;
  };

  P.promo = {
    title: 'Auto Broadcast', section: 'Automation',
    render(el) {
      if (S().ui.promoTab === 'templates') return TB.renderTemplates(el);
      if (!S().ui.draft) S().ui.draft = TB.blankDraft();
      const d = S().ui.draft;
      el.innerHTML = `
      <div class="tb-head"><div><h1>${d.id ? 'Edit campaign' : 'Auto Broadcast'}</h1><p>${d.id ? `Perbarui konfigurasi <b>${esc(d.name)}</b>. Perubahan berlaku pada putaran kirim berikutnya.` : 'Buat pesan promosi, pilih grup/channel yang mengizinkan promosi, atur jadwal & interval sesuai batas platform, lalu tinjau sebelum dijalankan.'}</p></div>
        <div class="actions">${d.id ? `<button class="tb-btn" data-action="draft-cancel">${icon('x')}Batal edit</button>` : `<button class="tb-btn" data-action="draft-reset">${icon('refresh')}Reset</button>`}<button class="tb-btn" data-action="draft-save">${icon('file')}Simpan draft</button></div></div>
      <div class="tb-tabs">${[['builder', 'Buat campaign', 'zap'], ['templates', 'Template pesan', 'template']].map(([k, l, ic]) => `<button class="tb-tab ${k === 'builder' ? 'is-on' : ''}" data-action="promo-tab" data-v="${k}">${icon(ic)}${l}${k === 'templates' ? `<span class="tb-count">${S().templates.length}</span>` : ''}</button>`).join('')}</div>
      <div class="tb-steps" id="pr-steps"></div>
      <div class="tb-grid main-side">
        <div class="tb-card" id="pr-left"></div>
        <div class="tb-stack tb-sticky" id="pr-right" style="align-self:start"></div>
      </div>`;
      this.paint(el);
    },
    paint(el) {
      this.steps(el); this.left(el); this.right(el);
    },
    steps(el) {
      const d = S().ui.draft;
      el.querySelector('#pr-steps').innerHTML = STEPS.map(([t, s], i) => `<button class="tb-step ${i === d.step ? 'is-on' : ''} ${i < d.step ? 'is-done' : ''}" data-action="pr-step" data-v="${i}"><span class="n">${i < d.step ? icon('check') : i + 1}</span><span><span class="tt" style="display:block">${t}</span><span class="ts">${s}</span></span></button>`).join('');
    },
    left(el) {
      const d = S().ui.draft, box = el.querySelector('#pr-left');
      const accs = S().accounts;
      const nav = `<div class="tb-card-f"><button class="tb-btn" data-action="pr-prev" ${d.step === 0 ? 'disabled' : ''}>${icon('arrow-left')}Kembali</button>
        ${d.step < 4 ? `<button class="tb-btn primary" data-action="pr-next">Lanjut ${icon('arrow-right')}</button>` : `<button class="tb-btn primary" data-action="pr-launch">${icon('rocket')}${d.id ? 'Simpan perubahan' : d.start > today() ? 'Jadwalkan campaign' : 'Luncurkan sekarang'}</button>`}</div>`;
      let body = '';
      if (d.step === 0) body = `
        <div class="tb-card-h"><div><h3>${icon('sparkles')}Informasi dasar</h3><p>Beri nama campaign dan pilih akun pengirim.</p></div></div>
        <div class="tb-card-b"><div class="tb-stack">
          <div class="tb-field" data-f="name"><label for="d-name">Nama campaign</label><input class="tb-input" id="d-name" data-d="name" maxlength="60" placeholder="mis. Promo Payday Akhir Bulan" value="${esc(d.name)}"><div class="err">Nama minimal 3 karakter.</div><div class="hint">Hanya terlihat oleh Anda.</div></div>
          <div class="tb-field" data-f="account"><label>Akun pengirim</label>
            <div class="tb-stack" style="gap:8px">${accs.map((a) => `<button class="tb-target ${d.account_id === a.id ? 'is-checked' : ''}" style="border:1.5px solid ${d.account_id === a.id ? 'var(--tg)' : 'var(--line)'};border-radius:12px;${a.status === 'disconnected' ? 'opacity:.6' : ''}" data-action="d-acc" data-v="${a.id}">
              <span class="tb-check" style="border-radius:50%">${icon('check')}</span>
              <span class="tb-avatar sm round" style="background:${TB.grad(a.username)}">${esc(TB.initials(a.display_name))}</span>
              <span style="flex:1;min-width:0"><span class="t-main" style="display:block;font-weight:600">${esc(a.display_name)}</span><span class="muted" style="font-size:12px">@${esc(a.username)} · kesehatan ${a.health}% · ${n(a.daily_limit - a.sent_today)} sisa kuota hari ini</span></span>${TB.badge(TB.AS, a.status)}</button>`).join('') || TB.empty('smartphone', 'Belum ada akun', 'Hubungkan akun Telegram terlebih dahulu.', `<button class="tb-btn sm primary" data-action="connect">Hubungkan akun</button>`)}</div>
            <div class="err">Pilih akun pengirim yang terhubung.</div></div>
          <div class="tb-field"><label>Urutan proses automation</label><div class="hint" style="margin-top:-2px">Aktifkan modul dan atur urutannya. Broadcast selalu berjalan terakhir.</div>
            <div class="tb-order">${d.flowSteps.map((s, i) => `<div class="tb-order-row ${s.on ? '' : 'off'}"><span class="no">${i + 1}</span><span style="width:30px;height:30px;border-radius:9px;display:grid;place-items:center;background:var(--tg-soft);color:var(--tg-ink)">${icon(TB.KIND[s.k][1])}</span><span style="flex:1;min-width:0"><b style="font-size:13px">${TB.KIND[s.k][0]}</b><span class="muted" style="display:block;font-size:12px">${{ detect: 'Ambil link grup baru dari sumber pantauan', join: 'Ikuti grup yang lolos kriteria, lalu jadikan target', broadcast: 'Kirim pesan ke target terpilih' }[s.k]}</span></span>
              ${s.k !== 'broadcast' ? `<button class="tb-btn xs ghost icon" data-action="flow-move" data-v="${i}" data-tip="Naikkan" ${i === 0 ? 'disabled' : ''}>${icon('arrow-up')}</button>${TB.sw('flow_' + s.k, s.on, `data-action="flow-toggle" data-v="${s.k}"`)}` : '<span class="tb-badge ok plain">Wajib</span>'}</div>`).join('')}</div></div>
          ${d.flowSteps.find((s) => s.k === 'detect').on ? `<div class="tb-field" data-f="sources"><label>Sumber deteksi</label><div class="tb-row wrap" style="gap:6px">${S().sources.map((s) => `<button class="tb-chip ${d.sources.includes(s.id) ? 'is-on' : ''}" data-action="d-src" data-v="${s.id}">${icon(s.type === 'channel' ? 'radio' : s.type === 'chat' ? 'message-circle' : 'users')}${esc(s.name)}</button>`).join('')}</div><div class="err">Pilih minimal satu sumber deteksi.</div></div>` : ''}
        </div></div>`;
      if (d.step === 1) {
        const q = d.tq.toLowerCase();
        const list = S().targets.filter((t) => (d.tf === 'all' || t.type === d.tf) && (!q || (t.title + t.username).toLowerCase().includes(q)));
        const selectable = list.filter((t) => t.status !== 'banned' && t.allows_promo !== false);
        const allOn = selectable.length && selectable.every((t) => d.targets.includes(t.id));
        body = `
        <div class="tb-card-h"><div><h3>${icon('target')}Target grup & channel</h3><p>Pilih tempat promosi dikirim. <b class="num">${d.targets.length}</b> dipilih · jangkauan ± <b class="num">${c(S().targets.filter((t) => d.targets.includes(t.id)).reduce((a, t) => a + t.members, 0))}</b> anggota.</p></div></div>
        <div class="tb-card-b" data-f="targets"><div class="tb-row wrap" style="gap:8px;margin-bottom:12px">
            <div class="tb-input-icon" style="flex:1;min-width:180px">${icon('search')}<input class="tb-input sm" id="d-tq" placeholder="Cari grup atau @username…" value="${esc(d.tq)}"></div>
            ${[['all', 'Semua'], ['group', 'Grup'], ['channel', 'Channel']].map(([k, l]) => `<button class="tb-chip ${d.tf === k ? 'is-on' : ''}" data-action="d-tf" data-v="${k}">${l}</button>`).join('')}
          </div>
          <div class="tb-target-list" data-source="targets">
            <button class="tb-target ${allOn ? 'is-checked' : ''}" data-action="d-tall" style="background:var(--sunk);position:sticky;top:0;z-index:1"><span class="tb-check">${icon('check')}</span><b style="font-size:13px">Pilih semua yang tampil (${selectable.length})</b></button>
            ${list.map((t) => {
              const on = d.targets.includes(t.id), dis = t.status === 'banned' || t.allows_promo === false;
              return `<button class="tb-target ${on ? 'is-checked' : ''} ${dis ? 'is-disabled' : ''}" data-action="d-t" data-v="${t.id}" ${dis ? 'aria-disabled="true"' : ''}>
                <span class="tb-check">${icon('check')}</span><span class="tav" style="background:${TB.grad(t.title)}">${esc(TB.initials(t.title))}</span>
                <span style="flex:1;min-width:0"><span style="display:block;font-weight:600;font-size:13px" class="tb-ellipsis">${esc(t.title)}</span><span class="muted" style="font-size:12px">${icon(t.type === 'channel' ? 'radio' : 'users')} ${c(t.members)} anggota · @${esc(t.username)}${t.slow_mode_s ? ` · slow mode ${t.slow_mode_s} dtk` : ''}</span></span>
                ${t.allows_promo === false ? '<span class="tb-badge bad plain">Melarang promosi</span>' : t.status !== 'active' ? TB.badge(TB.TS, t.status) : `<span class="muted num" style="font-size:12px" data-tip="Tingkat keberhasilan 30 hari">${pct(t.success_rate, 0)}</span>`}</button>`;
            }).join('') || `<div style="padding:30px">${TB.empty('search', 'Tidak ditemukan', 'Tidak ada grup yang cocok dengan pencarian.')}</div>`}
          </div><div class="err" style="margin-top:8px">Pilih minimal satu target.</div>
          <div class="hint mt-8" style="font-size:12px;color:var(--muted)">${icon('info')} Hanya grup/channel yang mengizinkan promosi yang bisa dipilih. Grup yang melarang promosi atau memblokir akun Anda dinonaktifkan otomatis.</div></div>`;
      }
      if (d.step === 2) body = `
        <div class="tb-card-h"><div><h3>${icon('message')}Konten pesan</h3><p>Gunakan variabel & spintax agar setiap pesan terasa unik dan aman dari filter spam.</p></div></div>
        <div class="tb-card-b"><div class="tb-stack">
          <div class="tb-row wrap" style="gap:8px"><select class="tb-input sm" id="d-tpl" style="flex:1;min-width:200px" aria-label="Template"><option value="">Mulai dari template…</option>${S().templates.map((t) => `<option value="${t.id}" ${d.template_id === t.id ? 'selected' : ''}>${esc(t.name)} · ${esc(t.category)}</option>`).join('')}</select><button class="tb-btn sm" data-action="tpl-from-draft">${icon('template')}Simpan sebagai template</button></div>
          <div class="tb-field" data-f="message"><label for="d-msg">Pesan promosi</label>
            <div class="tb-fmt-bar">
              <button class="tb-btn xs ghost icon" data-action="fmt" data-v="bold" data-tip="Tebal">${icon('bold')}</button>
              <button class="tb-btn xs ghost icon" data-action="fmt" data-v="italic" data-tip="Miring">${icon('italic')}</button>
              <button class="tb-btn xs ghost icon" data-action="fmt" data-v="link" data-tip="Tautan">${icon('link')}</button>
              <button class="tb-btn xs ghost icon" data-action="fmt" data-v="emoji" data-tip="Emoji">${icon('smile')}</button>
              <span style="width:1px;background:var(--line);margin:3px 4px"></span>
              <button class="tb-btn xs ghost" data-action="fmt" data-v="var">{nama_grup}</button>
              <button class="tb-btn xs ghost" data-action="fmt" data-v="date">{tanggal}</button>
              <button class="tb-btn xs ghost" data-action="fmt" data-v="spin">${icon('shuffle')}Spintax</button>
              <span class="tb-sp"></span><button class="tb-btn xs ghost" data-action="fmt" data-v="ai">${icon('sparkles')}Contoh</button>
            </div>
            <textarea class="tb-input" id="d-msg" data-d="message" rows="8" maxlength="4096" placeholder="☕ Promo spesial untuk member {nama_grup}!…">${esc(d.message)}</textarea>
            <div class="tb-row between"><div class="err">Pesan minimal 10 karakter.</div><span class="hint num" id="d-msg-c" style="margin-left:auto">${d.message.length} / 4096</span></div></div>
          <div class="tb-form-grid">
            <div class="tb-field"><label for="d-bt">Teks tombol (opsional)</label><input class="tb-input" id="d-bt" data-d="btn_text" placeholder="🛒 Order sekarang" value="${esc(d.btn_text)}"></div>
            <div class="tb-field"><label for="d-bu">Tautan tombol</label><input class="tb-input" id="d-bu" data-d="btn_url" placeholder="https://t.me/nusantara_cs" value="${esc(d.btn_url)}"></div>
          </div>
          <button class="tb-btn" style="align-self:flex-start" data-action="fmt" data-v="media">${icon('image')}Lampirkan gambar / video</button>
        </div></div>`;
      if (d.step === 3) body = `
        <div class="tb-card-h"><div><h3>${icon('clock')}Interval & jadwal</h3><p>Atur ritme pengiriman. Interval lebih panjang = akun lebih aman.</p></div></div>
        <div class="tb-card-b"><div class="tb-stack" style="gap:20px">
          <div class="tb-field"><div class="tb-row between"><label for="d-int">Interval antar putaran</label><b class="num" id="d-int-v">${d.interval_min} menit</b></div>
            <input type="range" class="tb-range" id="d-int" data-d="interval_min" min="15" max="240" step="5" value="${d.interval_min}">
            <div class="tb-row between muted" style="font-size:11.5px"><span>15 mnt · agresif</span><span>45–90 mnt · disarankan</span><span>4 jam</span></div></div>
          <div class="tb-form-grid">
            <div class="tb-field"><label for="d-ts">Jam mulai</label><input type="time" class="tb-input" id="d-ts" data-d="t_start" value="${d.t_start}"></div>
            <div class="tb-field"><label for="d-te">Jam selesai</label><input type="time" class="tb-input" id="d-te" data-d="t_end" value="${d.t_end}"></div>
            <div class="tb-field" data-f="dates"><label for="d-sd">Tanggal mulai</label><input type="date" class="tb-input" id="d-sd" data-d="start" value="${d.start}" min="2026-01-01" max="2027-12-31"></div>
            <div class="tb-field" data-f="dates2"><label for="d-ed">Tanggal selesai</label><input type="date" class="tb-input" id="d-ed" data-d="end" value="${d.end}" min="2026-01-01" max="2027-12-31"><div class="err">Tanggal selesai harus setelah tanggal mulai.</div></div>
          </div>
          <div class="tb-field" data-f="days"><label>Hari aktif</label><div class="tb-days">${DAYS.map((l, i) => `<button class="tb-chip ${d.days.includes(i) ? 'is-on' : ''}" data-action="d-day" data-v="${i}">${l}</button>`).join('')}</div><div class="err">Pilih minimal satu hari.</div></div>
          <div class="tb-field"><div class="tb-row between"><label for="d-cap">Batas pesan per hari</label><b class="num" id="d-cap-v">${n(d.cap)}</b></div><input type="range" class="tb-range" id="d-cap" data-d="cap" min="50" max="1500" step="50" value="${d.cap}"></div>
          <div>
            <div class="tb-set-row"><div><div class="t">Jeda acak antar grup</div><div class="d">Tambahkan jeda 8–40 detik acak agar pola kirim terlihat natural.</div></div>${TB.sw('jitter', d.jitter, 'data-d="jitter"')}</div>
            <div class="tb-set-row"><div><div class="t">Safe mode anti-flood</div><div class="d">Jeda otomatis saat terdeteksi FloodWait atau slow mode, lalu lanjut sendiri.</div></div>${TB.sw('safe', d.safe, 'data-d="safe"')}</div>
          </div>
        </div></div>`;
      if (d.step === 4) {
        const e = est(d), acc = TB.acc(d.account_id);
        const checks = [
          [!d.flowSteps.find((s) => s.k === 'detect').on || d.sources.length > 0, 'Urutan proses', d.flowSteps.filter((s) => s.on).map((s) => TB.KIND[s.k][0]).join(' → ') + (d.sources.length ? ` · ${d.sources.length} sumber deteksi` : ''), 0],
          [d.name.trim().length >= 3, 'Nama campaign', esc(d.name) || '—', 0],
          [acc && acc.status !== 'disconnected', 'Akun pengirim', acc ? '@' + esc(acc.username) + (acc.status === 'flood_wait' ? ' (sedang FloodWait)' : '') : '—', 0],
          [d.targets.length > 0, 'Target', `${d.targets.length} grup/channel`, 1],
          [d.message.trim().length >= 10, 'Pesan', `${d.message.length} karakter${d.btn_text ? ' + tombol' : ''}`, 2],
          [d.days.length > 0 && d.end >= d.start, 'Jadwal', `${d.t_start}–${d.t_end} · ${d.days.length} hari/minggu · ${TB.dshort(TB.parseDay(d.start))} – ${TB.dshort(TB.parseDay(d.end))}`, 3],
          [TB.lim().targets_per_campaign === -1 || d.targets.length <= TB.lim().targets_per_campaign, 'Batas paket ' + TB.lim().plan, `${d.targets.length} / ${TB.unl(TB.lim().targets_per_campaign)} target · ${TB.running().length} / ${TB.unl(TB.lim().campaigns_active)} campaign berjalan · ${n(e.total)} pesan terjadwal`, null],
        ];
        body = `
        <div class="tb-card-h"><div><h3>${icon('check-circle')}Tinjau sebelum meluncur</h3><p>Pastikan semuanya sudah benar. Anda tetap bisa menjeda atau menghentikan kapan saja.</p></div></div>
        <div class="tb-card-b"><div class="tb-list">${checks.map(([ok, l, v, st]) => `<div class="tb-li"><div class="ico ${ok ? 'ok' : 'bad'}">${icon(ok ? 'check' : 'x')}</div><div class="body"><div class="t">${l}</div><div class="s">${v}</div></div>${st != null ? `<button class="tb-btn xs ghost" data-action="pr-step" data-v="${st}">Ubah</button>` : ok ? '' : `<button class="tb-btn xs primary" data-action="sub-change">Upgrade</button>`}</div>`).join('')}</div></div>`;
      }
      box.innerHTML = body + nav;
      this.wire(el);
    },
    wire(el) {
      const d = S().ui.draft, box = el.querySelector('#pr-left');
      box.querySelectorAll('[data-d]').forEach((inp) => {
        const ev = inp.type === 'checkbox' || inp.type === 'date' || inp.type === 'time' ? 'change' : 'input';
        inp.addEventListener(ev, () => {
          const k = inp.dataset.d;
          d[k] = inp.type === 'checkbox' ? inp.checked : inp.type === 'range' ? +inp.value : inp.value;
          inp.closest('.tb-field')?.classList.remove('has-err');
          if (k === 'interval_min') box.querySelector('#d-int-v').textContent = d[k] + ' menit';
          if (k === 'cap') box.querySelector('#d-cap-v').textContent = n(d[k]);
          if (k === 'message') box.querySelector('#d-msg-c').textContent = d.message.length + ' / 4096';
          this.right(el);
        });
      });
      const tp = box.querySelector('#d-tpl');
      if (tp) tp.addEventListener('change', () => { const t = S().templates.find((x) => x.id === tp.value); d.template_id = tp.value; if (t) { d.message = t.body; box.querySelector('#d-msg').value = t.body; box.querySelector('#d-msg-c').textContent = t.body.length + ' / 4096'; TB.toast('Template diterapkan', t.name, 'info'); } this.right(el); });
      const tq = box.querySelector('#d-tq');
      if (tq) tq.addEventListener('input', () => { d.tq = tq.value; const pos = tq.selectionStart; this.left(el); const t2 = el.querySelector('#d-tq'); t2.focus(); t2.setSelectionRange(pos, pos); });
    },
    right(el) {
      const d = S().ui.draft, e = est(d), acc = TB.acc(d.account_id), L = TB.lim(), over = L.targets_per_campaign !== -1 && d.targets.length > L.targets_per_campaign;
      const riskL = { ok: ['Aman', 'ok', 'Pengaturan ini sesuai praktik terbaik.'], warn: ['Sedang', 'warn', 'Pertimbangkan interval lebih panjang atau jeda acak.'], bad: ['Berisiko', 'bad', 'Risiko FloodWait tinggi. Perpanjang interval & kurangi batas harian.'] }[e.risk];
      el.querySelector('#pr-right').innerHTML = `
        <div class="tb-card"><div class="tb-card-h"><div><h3>${icon('eye')}Pratinjau Telegram</h3><p>Tampilan pesan di grup target</p></div></div>
          <div class="tb-card-b"><div class="tb-tg-head"><span class="tb-avatar sm round" style="background:${TB.grad(d.targets[0] || 'x')}">${esc(TB.initials((S().targets.find((t) => t.id === d.targets[0]) || {}).title || 'Grup'))}</span><div style="min-width:0"><div style="font-weight:620;font-size:13px" class="tb-ellipsis">${esc((S().targets.find((t) => t.id === d.targets[0]) || {}).title || 'Grup target')}</div><div class="muted" style="font-size:11.5px">${c((S().targets.find((t) => t.id === d.targets[0]) || {}).members || 0)} anggota</div></div></div>
            <div class="tb-tg-prev joined"><div class="tb-bubble"><div class="from">${esc(acc ? acc.display_name : 'Akun Anda')}</div>${renderMsg(d)}<div class="meta">${TB.time(TB.now())}${icon('check-check')}</div></div>${d.btn_text ? `<div class="tb-bubble-btn">${esc(d.btn_text)}</div>` : ''}</div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>${icon('gauge')}Estimasi</h3><p>Dihitung dari jadwal & target</p></div><span class="tb-badge ${riskL[1]}">${riskL[0]}</span></div>
          <div class="tb-card-b"><div class="tb-est">
            <div class="tb-est-row"><span>Putaran per hari</span><b>${n(e.runs)}×</b></div>
            <div class="tb-est-row"><span>Pesan per hari</span><b>${n(e.perDay)}</b></div>
            <div class="tb-est-row"><span>Hari aktif</span><b>${n(e.days)} hari</b></div>
            <div class="tb-est-row tb-est-total"><span>Total pesan</span><b>${n(e.total)}</b></div>
            <div class="tb-row between" style="font-size:12px"><span class="muted">Target vs batas paket ${esc(L.plan)}</span><b class="num">${d.targets.length} / ${TB.unl(L.targets_per_campaign)}</b></div>
            ${TB.prog(L.targets_per_campaign === -1 ? 0.05 : Math.min(1, d.targets.length / L.targets_per_campaign), over ? 'bad' : 'ok')}
            <div class="muted" style="font-size:12px">${over ? `<span style="color:var(--color-bad)">Melebihi batas ${n(L.targets_per_campaign)} target.</span> <button class="tb-btn xs" data-action="sub-change">Upgrade</button>` : `Tanpa biaya per pesan — termasuk dalam paket ${esc(L.plan)}. Campaign berjalan: ${TB.running().length} / ${TB.unl(L.campaigns_active)}.`}</div>
            <div class="tb-alert ${riskL[1]}" style="padding:9px 11px;margin-top:2px"><div class="a-b a-s" style="font-size:12px">${riskL[2]}</div></div>
          </div></div></div>`;
    },
    validate(step) {
      const d = S().ui.draft, el = document.getElementById('promo');
      const err = (f) => { const x = el.querySelector(`[data-f="${f}"]`); if (x) x.classList.add('has-err'); return false; };
      if (step === 0) { if (d.name.trim().length < 3) return err('name'); const a = TB.acc(d.account_id); if (!a || a.status === 'disconnected') return err('account'); if (d.flowSteps.find((s) => s.k === 'detect').on && !d.sources.length) return err('sources'); }
      if (step === 1 && !d.targets.length) return err('targets');
      if (step === 1 && TB.lim().targets_per_campaign !== -1 && d.targets.length > TB.lim().targets_per_campaign) { TB.upsell('Target melebihi batas paket', `Paket ${TB.lim().plan} mendukung maksimal ${TB.lim().targets_per_campaign} target per campaign.`); return err('targets'); }
      if (step === 2 && d.message.trim().length < 10) return err('message');
      if (step === 3) { if (!d.days.length) return err('days'); if (!(d.end >= d.start)) return err('dates2'); }
      return true;
    },
    est,
  };

  TB.flowSteps = (flow) => {
    const on = String(flow || 'broadcast').split(',').filter(Boolean);
    const order = [...on.filter((k) => k !== 'broadcast'), ...['detect', 'join'].filter((k) => !on.includes(k))];
    return [...order.map((k) => ({ k, on: on.includes(k) })), { k: 'broadcast', on: true }];
  };
  TB.renderTemplates = (el) => {
    const T = S().templates;
    el.innerHTML = `
      <div class="tb-head"><div><h1>Auto Broadcast</h1><p>Simpan pesan promosi sebagai template agar bisa dipakai ulang di campaign mana pun.</p></div>
        <div class="actions"><button class="tb-btn primary" data-action="tpl-new">${icon('plus')}Template baru</button></div></div>
      <div class="tb-tabs">${[['builder', 'Buat campaign', 'zap'], ['templates', 'Template pesan', 'template']].map(([k, l, ic]) => `<button class="tb-tab ${k === 'templates' ? 'is-on' : ''}" data-action="promo-tab" data-v="${k}">${icon(ic)}${l}${k === 'templates' ? `<span class="tb-count">${T.length}</span>` : ''}</button>`).join('')}</div>
      ${T.length ? `<div class="tb-grid" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr))" data-source="templates">${T.map((t) => `
        <div class="tb-card tb-rule interactive"><div class="tb-row between"><span class="tb-badge plain info">${esc(t.category)}</span><button class="tb-btn xs ghost icon" data-action="tpl-menu" data-id="${t.id}" aria-label="Aksi template">${icon('more')}</button></div>
          <div style="font-weight:620">${esc(t.name)}</div>
          <div class="r-reply">${esc(t.body)}</div>
          <div class="tb-row between muted" style="font-size:12px"><span>Dipakai ${n(t.used)}× · diperbarui ${TB.ago(t.updated)}</span><button class="tb-btn xs primary" data-action="tpl-use" data-id="${t.id}">${icon('zap')}Gunakan</button></div></div>`).join('')}</div>`
        : `<div class="tb-card">${TB.empty('template', 'Belum ada template', 'Simpan pesan promosi favorit Anda agar mudah dipakai ulang.', `<button class="tb-btn primary sm" data-action="tpl-new">${icon('plus')}Template baru</button>`)}</div>`}`;
  };
  TB.tplModal = (id, preset) => {
    const t = id ? S().templates.find((x) => x.id === id) : { name: '', category: 'Promo', body: '', ...(preset || {}) };
    TB.modal({
      icon: 'template', title: id ? 'Edit template' : 'Template baru', sub: 'Gunakan {nama_grup}, {tanggal}, dan spintax {A|B} agar pesan terasa unik.',
      body: `<div class="tb-stack"><div class="tb-form-grid"><div class="tb-field" data-f="tn"><label for="tm-n">Nama template</label><input class="tb-input" id="tm-n" value="${esc(t.name)}"><div class="err">Isi nama template.</div></div>
        <div class="tb-field"><label for="tm-c">Kategori</label><select class="tb-input" id="tm-c">${['Promo', 'Launching', 'Kemitraan', 'Engagement', 'Lainnya'].map((k) => `<option ${t.category === k ? 'selected' : ''}>${k}</option>`).join('')}</select></div></div>
        <div class="tb-field" data-f="tb"><label for="tm-b">Isi pesan</label><textarea class="tb-input" id="tm-b" rows="7">${esc(t.body)}</textarea><div class="err">Pesan minimal 10 karakter.</div></div></div>`,
      foot: `<button class="tb-btn" data-close>Batal</button><button class="tb-btn primary" id="tm-s">${icon('check')}Simpan</button>`,
      onMount: (box) => box.querySelector('#tm-s').addEventListener('click', () => {
        const nm = box.querySelector('#tm-n').value.trim(), body = box.querySelector('#tm-b').value.trim();
        box.querySelectorAll('.has-err').forEach((x) => x.classList.remove('has-err'));
        if (!nm) return box.querySelector('[data-f="tn"]').classList.add('has-err');
        if (body.length < 10) return box.querySelector('[data-f="tb"]').classList.add('has-err');
        TB.act.saveTemplate(id, { name: nm, category: box.querySelector('#tm-c').value, body });
        TB.closeModal();
      }),
    });
  };

  /* ======================= REPORTS ======================= */
  const sumBy = (rows, k) => rows.reduce((s, x) => s + (+x[k] || 0), 0);
  TB.repRows = () => {
    const ui = S().ui;
    let from, to;
    if (ui.repRange === 'custom') { from = ui.repFrom; to = ui.repTo; } else { from = TB.dayKey(-(+ui.repRange - 1)); to = TB.dayKey(0); }
    const days = [...new Set(S().adaily.map((d) => d.day))].sort().filter((d) => d >= from && d <= to);
    const mk = (dayList) => dayList.map((day) => {
      const x = S().adaily.filter((d) => d.day === day && (ui.repAcc === 'all' || d.account_id === ui.repAcc));
      const dd = S().daily.find((d) => d.day === day) || {};
      const sent = sumBy(x, 'sent'), del = sumBy(x, 'delivered');
      return { day, sent, delivered: del, failed: sent - del, links: sumBy(x, 'links'), joins_ok: sumBy(x, 'joins_ok'), joins_failed: sumBy(x, 'joins_failed'), replies: sumBy(x, 'replies'), replies_failed: sumBy(x, 'replies_failed'), clicks: ui.repAcc === 'all' ? +dd.clicks || 0 : null };
    });
    const rows = mk(days);
    const len = days.length, allDays = [...new Set(S().adaily.map((d) => d.day))].sort();
    const i0 = allDays.indexOf(days[0]);
    const prev = i0 >= len ? mk(allDays.slice(i0 - len, i0)) : null;
    return { rows, prev, from, to };
  };
  P.reports = {
    title: 'Statistik & Laporan', section: 'Analitik',
    render(el) {
      const ui = S().ui, { rows, prev, from, to } = TB.repRows();
      const T = (a) => ({ sent: sumBy(a, 'sent'), del: sumBy(a, 'delivered'), links: sumBy(a, 'links'), jo: sumBy(a, 'joins_ok'), jf: sumBy(a, 'joins_failed'), rp: sumBy(a, 'replies'), rf: sumBy(a, 'replies_failed') });
      const t = T(rows), pv = prev ? T(prev) : null;
      const perf = TB.calc('campaign_perf');
      const fr = S().fails, frMax = Math.max(...fr.map((x) => x.n));
      const L = S().links;
      const jcount = (s) => L.filter((l) => l.status === s && l.kind !== 'invalid').length;
      const jreasons = {};
      L.filter((l) => (l.status === 'failed' || l.status === 'skipped') && l.reason).forEach((l) => (jreasons[l.reason] = (jreasons[l.reason] || 0) + 1));
      const jr = Object.entries(jreasons).sort((a, b) => b[1] - a[1]);
      const jrMax = Math.max(1, ...jr.map((x) => x[1]));
      const monthly = ui.repGran === 'monthly';
      const kpi = (l, v, dl, sub, ic, tone) => `<div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">${l}</span><span class="k-ico ${tone}">${icon(ic)}</span></div><div class="k-val">${v}</div><div class="k-foot">${dl || ''}<span>${sub}</span></div></div>`;
      el.innerHTML = `
      <div class="tb-head"><div><h1>Statistik & Laporan</h1><p>Performa broadcast, deteksi link, auto-join, dan auto-reply — filter per tanggal dan akun, lalu ekspor.</p></div>
        <div class="actions"><button class="tb-btn" data-action="rep-csv">${icon('download')}Ekspor CSV</button><button class="tb-btn primary" data-action="rep-pdf">${icon('file')}Laporan PDF</button></div></div>
      <div class="tb-card" style="padding:12px 14px;margin-bottom:16px"><div class="tb-filters">
        <div class="tb-btn-group">${[['daily', 'Harian'], ['monthly', 'Bulanan']].map(([k, l]) => `<button class="tb-seg ${ui.repGran === k ? 'is-on' : ''}" data-action="rep-gran" data-v="${k}">${l}</button>`).join('')}</div>
        ${monthly ? '<span class="muted" style="font-size:12.5px">6 bulan terakhir · semua akun</span>' : `<div class="tb-btn-group">${[7, 14, 30].map((v) => `<button class="tb-seg ${String(ui.repRange) === String(v) ? 'is-on' : ''}" data-action="rep-range" data-v="${v}">${v} hari${v > TB.lim().report_days ? ' ' + icon('lock') : ''}</button>`).join('')}</div>
        <div class="tb-row" style="gap:6px"><input type="date" class="tb-input sm" id="rp-from" value="${from}" min="${TB.dayKey(-(Math.min(TB.lim().report_days, 30) - 1))}" max="${TB.dayKey(0)}" aria-label="Dari tanggal"><span class="muted">–</span><input type="date" class="tb-input sm" id="rp-to" value="${to}" min="${TB.dayKey(-(Math.min(TB.lim().report_days, 30) - 1))}" max="${TB.dayKey(0)}" aria-label="Sampai tanggal"></div>
        <select class="tb-input sm" id="rp-acc" aria-label="Akun"><option value="all">Semua akun</option>${S().accounts.map((a) => `<option value="${a.id}" ${ui.repAcc === a.id ? 'selected' : ''}>@${esc(a.username)}</option>`).join('')}</select>`}
        <span class="tb-sp"></span>${!monthly ? `<span class="muted" style="font-size:12.5px">${TB.dshort(TB.parseDay(from))} – ${TB.date(TB.parseDay(to))} · ${rows.length} hari</span>` : ''}
      </div></div>
      ${monthly ? '' : `<div class="tb-grid k4" data-source="account_daily">
        ${kpi('Pesan broadcast', n(t.sent), pv && TB.delta(t.sent, pv.sent), `${pct(t.del / (t.sent || 1))} berhasil`, 'send', '')}
        ${kpi('Link terdeteksi', n(t.links), pv && TB.delta(t.links, pv.links), `${n(t.jo + t.jf)} diproses join`, 'scan', 'violet')}
        ${kpi('Join berhasil', n(t.jo), pv && TB.delta(t.jo, pv.jo), `${n(t.jf)} gagal · ${pct(t.jo / ((t.jo + t.jf) || 1), 0)} sukses`, 'user-plus', 'ok')}
        ${kpi('Auto-reply', n(t.rp), pv && TB.delta(t.rp, pv.rp), `${n(t.rf)} gagal diproses`, 'reply', 'warn')}
      </div>`}
      <div class="tb-grid main-side ${monthly ? '' : 'mt-16'}">
        <div class="tb-card"><div class="tb-card-h"><div><h3>Aktivitas broadcast ${monthly ? 'bulanan' : 'harian'}</h3><p>${monthly ? 'Terkirim dan berhasil per bulan' : 'Berhasil vs gagal per hari'}</p></div><div class="tb-legend"><span><i style="background:${TB.COL.tg}"></i>${monthly ? 'Terkirim' : 'Berhasil'}</span><span><i style="background:${monthly ? 'var(--color-ok)' : 'var(--color-bad)'}"></i>${monthly ? 'Berhasil' : 'Gagal'}</span></div></div>
          <div class="tb-card-b"><div class="tb-chart" id="rp-vol" data-source="${monthly ? 'monthly' : 'account_daily'}" style="min-height:250px"></div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Ringkasan join</h3><p>Semua tautan yang diproses</p></div></div>
          <div class="tb-card-b" data-source="detected_links"><div class="tb-mini3" style="grid-template-columns:repeat(4,1fr)">${[['Joined', jcount('joined'), 'var(--color-ok)'], ['Gagal', jcount('failed'), 'var(--color-bad)'], ['Persetujuan', jcount('approval'), ''], ['Dilewati', L.filter((l) => l.status === 'skipped').length, '']].map(([l, v, col]) => `<div><div class="v" ${col ? `style="color:${col}"` : ''}>${n(v)}</div><div class="l">${l}</div></div>`).join('')}</div>
            <div class="tb-label" style="margin:16px 0 10px">Alasan gagal / dilewati</div>
            <div class="tb-hbar">${jr.map(([r, v], i) => `<span class="hb-l">${esc(r)}</span><span class="hb-v">${n(v)}</span><div class="hb-track"><i style="width:${(v / jrMax) * 100}%;background:${i === 0 ? 'var(--color-bad)' : 'color-mix(in srgb, var(--color-bad) 45%, transparent)'}"></i></div>`).join('')}</div></div></div>
      </div>
      <div class="tb-grid k2 mt-16">
        <div class="tb-card"><div class="tb-card-h"><div><h3>Link terdeteksi & diproses</h3><p>${monthly ? 'Per bulan' : 'Per hari'}</p></div><div class="tb-legend"><span><i style="background:${TB.COL.violet}"></i>Terdeteksi</span><span><i style="background:var(--color-ok)"></i>Join berhasil</span>${monthly ? '' : '<span><i style="background:var(--color-bad)"></i>Join gagal</span>'}</div></div><div class="tb-card-b"><div class="tb-chart" id="rp-join" data-source="${monthly ? 'monthly' : 'account_daily'}" style="min-height:210px"></div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Statistik auto-reply</h3><p>${monthly ? 'Balasan per bulan' : 'Dibalas vs gagal per hari'}</p></div></div><div class="tb-card-b"><div class="tb-chart" id="rp-reply" data-source="${monthly ? 'monthly' : 'account_daily'}" style="min-height:210px"></div></div></div>
      </div>
      <div class="tb-grid main-side mt-16">
        <div class="tb-card"><div class="tb-card-h"><div><h3>Performa campaign</h3><p>Sejak campaign dimulai</p></div></div>
          <div class="tb-card-b" style="padding:12px 0 6px"><div class="tb-table-wrap"><table class="tb-table" data-source="campaigns" data-row-key="id">
            <thead><tr><th data-field="name">Campaign</th><th>Status</th><th class="r" data-field="sent">Terkirim</th><th class="r" data-source="campaign_perf" data-field="success_rate">Keberhasilan</th><th class="r tb-hide-sm" data-field="clicks">Klik</th><th class="r tb-hide-sm" data-source="campaign_perf" data-field="ctr">CTR</th></tr></thead>
            <tbody>${S().campaigns.filter((x) => x.sent > 0 && (ui.repAcc === 'all' || monthly || x.account_id === ui.repAcc)).map((x) => { const pf = perf.find((p) => p.id === x.id) || { success_rate: TB.rate(x), ctr: x.delivered ? x.clicks / x.delivered : null }; return `<tr class="clickable" data-key="${esc(x.id)}" data-action="c-detail" data-id="${x.id}"><td class="t-main">${esc(x.name)}</td><td>${TB.badge(TB.CS, x.status)}</td><td class="r num">${n(x.sent)}</td><td class="r num"><span class="tb-badge plain ${pf.success_rate >= 0.95 ? 'ok' : pf.success_rate >= 0.92 ? 'warn' : 'bad'}">${pct(pf.success_rate)}</span></td><td class="r num tb-hide-sm">${n(x.clicks)}</td><td class="r num tb-hide-sm">${pct(pf.ctr)}</td></tr>`; }).join('') || `<tr><td colspan="6">${TB.empty('megaphone', 'Tidak ada campaign', 'Akun ini belum menjalankan campaign.')}</td></tr>`}</tbody></table></div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Penyebab broadcast gagal</h3><p>30 hari terakhir</p></div></div>
          <div class="tb-card-b"><div class="tb-hbar" data-source="failure_reasons">${fr.map((x, i) => `<span class="hb-l">${esc(x.reason)}</span><span class="hb-v">${n(x.n)}</span><div class="hb-track"><i style="width:${(x.n / frMax) * 100}%;background:${i === 0 ? 'var(--color-bad)' : 'color-mix(in srgb, var(--color-bad) 45%, transparent)'}"></i></div>`).join('')}</div>
            <div class="tb-alert info" style="padding:10px 12px"><div class="a-ico" style="width:26px;height:26px">${icon('sparkles')}</div><div class="a-b a-s" style="font-size:12px"><b style="color:var(--color-fg)">Saran:</b> ${esc(fr[0].reason)} adalah penyebab utama. Perpanjang interval untuk grup dengan slow mode.</div></div></div></div>
      </div>
      <div class="tb-card mt-16"><div class="tb-card-h"><div><h3>Performa target</h3><p>Grup & channel · 30 hari terakhir</p></div>
          <div class="tb-input-icon" style="width:min(260px,100%)">${icon('search')}<input class="tb-input sm" id="rp-tq" placeholder="Cari grup…" value="${esc(ui.repTq)}"></div></div>
        <div class="tb-card-b" style="padding:12px 0 6px"><div class="tb-table-wrap scroll" id="rp-targets"></div></div></div>`;
      this.targets(el);
      el.querySelector('#rp-tq').addEventListener('input', (e) => { ui.repTq = e.target.value; this.targets(el); });
      const f = el.querySelector('#rp-from'), t2 = el.querySelector('#rp-to'), ac = el.querySelector('#rp-acc');
      const setRange = () => { if (f.value && t2.value && f.validity.valid && t2.validity.valid && f.value <= t2.value) { ui.repRange = 'custom'; ui.repFrom = f.value; ui.repTo = t2.value; this.render(el); this.charts(el); } };
      if (f) { f.addEventListener('change', setRange); t2.addEventListener('change', setRange); }
      if (ac) ac.addEventListener('change', (e) => { ui.repAcc = e.target.value; this.render(el); this.charts(el); });
    },
    targets(el) {
      const ui = S().ui, q = ui.repTq.toLowerCase();
      const [key, dir] = ui.repSort;
      let rows = S().targets.filter((t) => !q || t.title.toLowerCase().includes(q));
      rows = rows.slice().sort((a, b) => { const va = a[key], vb = b[key]; return (typeof va === 'string' ? va.localeCompare(vb) : va - vb) * (dir === 'asc' ? 1 : -1); });
      const max = Math.max(...S().targets.map((t) => t.sent_30d), 1);
      const th = (k, l, cls = '', cite = true) => `<th class="${cls}" ${cite ? `data-field="${k}"` : ''} ${key === k ? `aria-sort="${dir === 'asc' ? 'ascending' : 'descending'}"` : ''}><button class="sort" data-action="rep-sort" data-v="${k}">${l}${icon('chevrons-up-down')}</button></th>`;
      el.querySelector('#rp-targets').innerHTML = rows.length ? `<table class="tb-table" data-source="targets" data-row-key="id"><thead><tr>${th('title', 'Grup / channel', '', false)}${th('type', 'Tipe', 'tb-hide-sm', false)}${th('members', 'Anggota', 'r', false)}${th('sent_30d', 'Terkirim', 'r')}${th('success_rate', 'Keberhasilan', 'r')}${th('clicks_30d', 'Klik', 'r tb-hide-sm')}${th('status', 'Status', '', false)}</tr></thead>
        <tbody>${rows.map((t) => `<tr data-key="${esc(t.id)}"><td><div class="tb-row" style="gap:10px"><span class="tb-avatar sm round" style="background:${TB.grad(t.title)};width:28px;height:28px;font-size:10.5px">${esc(TB.initials(t.title))}</span><div style="min-width:0"><div class="t-main tb-ellipsis" style="max-width:240px">${esc(t.title)}</div><div class="t-sub">@${esc(t.username)}${t.allows_promo === false ? ' · <span style="color:var(--color-bad)">melarang promosi</span>' : ''}</div></div></div></td>
          <td class="tb-hide-sm"><span class="tb-tag">${icon(t.type === 'channel' ? 'radio' : 'users')}${t.type === 'channel' ? 'Channel' : 'Grup'}</span></td><td class="r num">${c(t.members)}</td>
          <td class="r"><div class="tb-cell-bar" style="min-width:120px;justify-content:flex-end"><div class="tb-prog" style="max-width:70px"><i style="width:${(t.sent_30d / max) * 100}%"></i></div><span class="num" style="min-width:32px">${n(t.sent_30d)}</span></div></td>
          <td class="r num">${pct(t.success_rate)}</td><td class="r num tb-hide-sm">${n(t.clicks_30d)}</td><td>${TB.badge(TB.TS, t.status)}</td></tr>`).join('')}</tbody></table>`
        : TB.empty('search', 'Tidak ada grup', 'Tidak ada grup yang cocok dengan pencarian Anda.');
    },
    charts(el) {
      const ui = S().ui;
      if (ui.repGran === 'monthly') {
        const M = S().monthly.map((m) => ({ ...m, label: new Date(m.month + '-15T00:00:00+07:00').toLocaleDateString('id-ID', { month: 'short', year: '2-digit' }) }));
        const tt = (d) => new Date(d.month + '-15T00:00:00+07:00').toLocaleDateString('id-ID', { month: 'long', year: 'numeric' }) + (d.month === TB.dayKey(0).slice(0, 7) ? ' (berjalan)' : '');
        TB.chart.bars(el.querySelector('#rp-vol'), { rows: M, height: 250, maxBar: 26, series: [{ key: 'sent', label: 'Terkirim', color: TB.COL.tg }, { key: 'delivered', label: 'Berhasil', color: 'var(--color-ok)' }], xFmt: (d) => d.label, tipTitle: tt });
        TB.chart.bars(el.querySelector('#rp-join'), { rows: M, height: 210, maxBar: 22, series: [{ key: 'links', label: 'Terdeteksi', color: TB.COL.violet }, { key: 'joins', label: 'Join berhasil', color: 'var(--color-ok)' }], xFmt: (d) => d.label, tipTitle: tt });
        TB.chart.bars(el.querySelector('#rp-reply'), { rows: M, height: 210, maxBar: 26, series: [{ key: 'replies', label: 'Balasan', color: 'var(--color-ok)' }], xFmt: (d) => d.label, tipTitle: tt });
        return;
      }
      const { rows } = TB.repRows();
      const xf = (d) => TB.dshort(TB.parseDay(d.day)), tt = (d) => TB.date(TB.parseDay(d.day), { weekday: 'long', day: 'numeric', month: 'short' });
      TB.chart.bars(el.querySelector('#rp-vol'), { rows, stacked: true, height: 250, maxBar: 26, series: [{ key: 'delivered', label: 'Berhasil', color: TB.COL.tg }, { key: 'failed', label: 'Gagal', color: 'var(--color-bad)' }], xFmt: xf, tipTitle: tt, tipExtra: (d) => (d.clicks != null ? [['Klik', n(d.clicks)]] : []) });
      TB.chart.bars(el.querySelector('#rp-join'), { rows, height: 210, maxBar: 24, pad: 0.24, series: [{ key: 'links', label: 'Terdeteksi', color: TB.COL.violet }, { key: 'joins_ok', label: 'Join berhasil', color: 'var(--color-ok)' }, { key: 'joins_failed', label: 'Join gagal', color: 'var(--color-bad)' }], xFmt: xf, tipTitle: tt });
      TB.chart.bars(el.querySelector('#rp-reply'), { rows, stacked: true, height: 210, maxBar: 22, series: [{ key: 'replies', label: 'Dibalas', color: 'var(--color-ok)' }, { key: 'replies_failed', label: 'Gagal', color: 'var(--color-bad)' }], xFmt: xf, tipTitle: tt });
    },
  };

  /* ======================= SETTINGS ======================= */
  const TABS = [['profile', 'Profil', 'user'], ['prefs', 'Preferensi', 'sliders'], ['security', 'Keamanan', 'shield'], ['notif', 'Notifikasi', 'bell']];
  const NOTIF = [['campaign_done', 'Campaign selesai', 'Saat campaign mencapai target pengiriman'], ['flood', 'FloodWait & pembatasan', 'Saat akun dijeda otomatis oleh Telegram'], ['disconnect', 'Akun terputus', 'Saat sesi akun kedaluwarsa atau logout'], ['expiry', 'Langganan hampir berakhir', 'Pengingat H-7, H-3, H-1 dan saat masa tenggang'], ['daily', 'Ringkasan harian', 'Laporan performa setiap pukul 21:00'], ['billing', 'Tagihan & pembayaran', 'Invoice, perpanjangan, dan perubahan paket']];
  P.settings = {
    title: 'Pengaturan', section: 'Akun',
    render(el) {
      const ui = S().ui, p = S().profile, pr = S().prefs;
      this.dirty = false;
      let body = '';
      if (ui.setTab === 'profile') body = `
        <div class="tb-card"><div class="tb-card-h"><div><h3>Profil pengguna</h3><p>Informasi akun dan workspace Anda.</p></div></div>
          <div class="tb-card-b"><div class="tb-row" style="gap:16px;margin-bottom:20px"><span class="tb-avatar lg">${esc(TB.initials(p.name))}</span><div><b>${esc(p.name)}</b><div class="muted" style="font-size:12.5px">Member sejak ${TB.date(p.member_since + 'T12:00:00+07:00', { month: 'long', year: 'numeric' })}</div><div class="tb-row mt-8" style="gap:6px"><button class="tb-btn xs" data-action="avatar">${icon('image')}Ganti foto</button><button class="tb-btn xs ghost">Hapus</button></div></div></div>
            <div class="tb-form-grid" data-source="profile">
              <div class="tb-field"><label for="s-name">Nama lengkap</label><input class="tb-input" id="s-name" name="name" value="${esc(p.name)}"></div>
              <div class="tb-field"><label for="s-ws">Nama workspace / bisnis</label><input class="tb-input" id="s-ws" name="workspace" value="${esc(p.workspace)}"></div>
              <div class="tb-field" data-f="email"><label for="s-mail">Email</label><input class="tb-input" id="s-mail" name="email" type="email" value="${esc(p.email)}"><div class="err">Format email tidak valid.</div></div>
              <div class="tb-field"><label for="s-ph">Nomor WhatsApp / telepon</label><input class="tb-input" id="s-ph" name="phone" value="${esc(p.phone)}"></div>
              <div class="tb-field"><label for="s-tz">Zona waktu</label><select class="tb-input" id="s-tz" name="timezone">${['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura'].map((z) => `<option ${p.timezone === z ? 'selected' : ''} value="${z}">${{ 'Asia/Jakarta': 'WIB — Jakarta (GMT+7)', 'Asia/Makassar': 'WITA — Makassar (GMT+8)', 'Asia/Jayapura': 'WIT — Jayapura (GMT+9)' }[z]}</option>`).join('')}</select></div>
              <div class="tb-field"><label for="s-lang">Bahasa</label><select class="tb-input" id="s-lang" name="language"><option value="id" ${p.language === 'id' ? 'selected' : ''}>Bahasa Indonesia</option><option value="en">English</option></select></div>
            </div></div></div>`;
      if (ui.setTab === 'prefs') body = `
        <div class="tb-card"><div class="tb-card-h"><div><h3>Preferensi automation</h3><p>Nilai bawaan untuk campaign baru dan perilaku mesin.</p></div></div>
          <div class="tb-card-b">
            <div class="tb-set-row"><div><div class="t">Interval bawaan</div><div class="d">Dipakai saat membuat campaign baru.</div></div><select class="tb-input sm" name="default_interval" style="width:140px">${[30, 45, 60, 90, 120].map((v) => `<option value="${v}" ${p.default_interval === v ? 'selected' : ''}>${v} menit</option>`).join('')}</select></div>
            <div class="tb-set-row"><div><div class="t">Safe mode anti-flood</div><div class="d">Jeda otomatis saat FloodWait terdeteksi, lanjut sendiri setelah aman.</div></div>${TB.sw('safe_mode', p.safe_mode)}</div>
            <div class="tb-set-row"><div><div class="t">Auto-pause saat akun terputus</div><div class="d">Jeda campaign terkait agar tidak terjadi kegagalan kirim berulang.</div></div>${TB.sw('auto_pause_flood', p.auto_pause_flood)}</div>
            <div class="tb-set-row"><div><div class="t">Lewati grup dengan slow mode panjang</div><div class="d">Grup dengan slow mode &gt; 5 menit dilewati pada putaran tersebut.</div></div>${TB.sw('skip_slow', pr.skip_slow)}</div>
            <div class="tb-set-row"><div><div class="t">Pengingat langganan</div><div class="d">Jadwal pengingat sebelum paket berakhir diatur di halaman Langganan.</div></div><button class="tb-btn sm" data-nav="billing">${icon('bell')}Atur pengingat</button></div>
            <div class="tb-set-row"><div><div class="t">Mode jam tenang</div><div class="d">Tidak mengirim pada 22:00–06:00 di semua campaign.</div></div>${TB.sw('quiet', pr.quiet)}</div>
          </div></div>`;
      if (ui.setTab === 'security') body = `
        <div class="tb-stack">
        <div class="tb-card"><div class="tb-card-h"><div><h3>Ubah kata sandi</h3><p>Gunakan minimal 8 karakter dengan kombinasi huruf, angka, dan simbol.</p></div></div>
          <div class="tb-card-b"><div class="tb-form-grid">
            <div class="tb-field full"><label for="pw0">Kata sandi saat ini</label><input class="tb-input" type="password" id="pw0" autocomplete="current-password"></div>
            <div class="tb-field" data-f="pw1"><label for="pw1">Kata sandi baru</label><input class="tb-input" type="password" id="pw1" autocomplete="new-password"><div class="tb-pw-meter" id="pw-m"><i></i><i></i><i></i><i></i></div><div class="hint" id="pw-h">Kekuatan kata sandi</div></div>
            <div class="tb-field" data-f="pw2"><label for="pw2">Konfirmasi kata sandi</label><input class="tb-input" type="password" id="pw2" autocomplete="new-password"><div class="err">Kata sandi tidak sama.</div></div>
          </div><button class="tb-btn primary mt-16" data-action="pw-save">${icon('key')}Perbarui kata sandi</button></div></div>
        <div class="tb-card"><div class="tb-card-b">
          <div class="tb-set-row"><div><div class="t">${icon('shield')} Autentikasi dua faktor (2FA)</div><div class="d">Kode dari aplikasi authenticator diminta setiap login.</div></div>${TB.sw('two_factor', p.two_factor, 'data-action="toggle-2fa"')}</div>
          <div class="tb-set-row"><div><div class="t">Notifikasi login baru</div><div class="d">Kirim email saat ada login dari perangkat baru.</div></div>${TB.sw('login_alert', true)}</div></div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Sesi aktif</h3><p>Perangkat yang sedang masuk ke akun TeleBlast Anda.</p></div><button class="tb-btn sm danger" data-action="revoke-all" ${S().sessions.length < 2 ? 'disabled' : ''}>${icon('logout')}Keluar dari semua</button></div>
          <div class="tb-card-b"><div class="tb-list" data-source="sessions">${S().sessions.map((s) => `<div class="tb-li"><div class="ico ${s.current ? 'info' : ''}">${icon(/iPhone|Android/.test(s.device) ? 'smartphone' : 'monitor')}</div><div class="body"><div class="t">${esc(s.device)} ${s.current ? '<span class="tb-badge ok plain" style="height:19px;font-size:10.5px">Perangkat ini</span>' : ''}</div><div class="s">${esc(s.location)} · ${esc(s.ip)} · ${s.current ? 'aktif sekarang' : TB.ago(s.last_seen)}</div></div>${s.current ? '' : `<button class="tb-btn xs" data-action="revoke" data-id="${s.id}">Keluarkan</button>`}</div>`).join('')}</div></div></div>
        </div>`;
      if (ui.setTab === 'notif') body = `
        <div class="tb-card"><div class="tb-card-h"><div><h3>Pengaturan notifikasi</h3><p>Pilih kejadian dan saluran pemberitahuan.</p></div></div>
          <div class="tb-card-b" style="padding-top:8px"><div class="tb-table-wrap"><table class="tb-table"><thead><tr><th>Kejadian</th><th class="r">${icon('mail')} Email</th><th class="r">${icon('bot')} Bot Telegram</th><th class="r">${icon('bell')} In-app</th></tr></thead>
            <tbody>${NOTIF.map(([k, t, d]) => `<tr><td><div class="t-main">${t}</div><div class="t-sub">${d}</div></td>${['email', 'bot', 'app'].map((ch) => `<td class="r"><div style="display:inline-block">${TB.sw(`n_${k}_${ch}`, pr.notif[k][ch])}</div></td>`).join('')}</tr>`).join('')}</tbody></table></div>
            <div class="tb-alert info mt-16"><div class="a-ico">${icon('bot')}</div><div class="a-b"><div class="a-t">Bot notifikasi terhubung</div><div class="a-s">@TeleBlastNotifyBot mengirim pemberitahuan ke akun Telegram Anda.</div></div><button class="tb-btn sm" data-action="test-notif">Kirim tes</button></div></div></div>`;
      el.innerHTML = `
        <div class="tb-head"><div><h1>Pengaturan</h1><p>Kelola profil, preferensi automation, keamanan akun, dan notifikasi.</p></div></div>
        <div class="tb-tabs">${TABS.map(([k, l, ic]) => `<button class="tb-tab ${ui.setTab === k ? 'is-on' : ''}" data-action="set-tab" data-v="${k}">${icon(ic)}${l}</button>`).join('')}</div>
        <div style="max-width:880px" id="set-body">${body}</div>
        <div id="set-bar"></div>`;
      const sb = el.querySelector('#set-body');
      sb.addEventListener('input', (e) => { if (e.target.name || e.target.id === 'pw1') this.markDirty(el, e); });
      sb.addEventListener('change', (e) => { if (e.target.name && !e.target.closest('[data-action]')) this.markDirty(el, e); });
    },
    markDirty(el, e) {
      if (e.target.id === 'pw1') {
        const v = e.target.value, sc = (v.length >= 8) + /[A-Z]/.test(v) + /\d/.test(v) + /[^A-Za-z0-9]/.test(v);
        const col = ['var(--color-bad)', 'var(--color-bad)', 'var(--color-warn)', 'var(--color-ok)', 'var(--color-ok)'][sc];
        el.querySelectorAll('#pw-m i').forEach((i, k) => (i.style.background = k < sc ? col : ''));
        el.querySelector('#pw-h').textContent = v ? ['Sangat lemah', 'Lemah', 'Cukup', 'Kuat', 'Sangat kuat'][sc] : 'Kekuatan kata sandi';
        return;
      }
      if (e.target.closest('#pw0,#pw2') || ['two_factor'].includes(e.target.name)) return;
      if (this.dirty) return;
      this.dirty = true;
      const bar = el.querySelector('#set-bar');
      bar.innerHTML = `<div class="tb-savebar">${icon('info')}<span style="flex:1;font-size:13px">Ada perubahan yang belum disimpan.</span><button class="tb-btn sm" data-action="set-discard">Batalkan</button><button class="tb-btn sm primary" data-action="set-save">Simpan perubahan</button></div>`;
    },
    save(el, btn) {
      const ui = S().ui, p = S().profile, pr = S().prefs;
      const mail = el.querySelector('[name=email]');
      if (mail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(mail.value)) { mail.closest('.tb-field').classList.add('has-err'); mail.focus(); return; }
      TB.busy(btn, 650, () => {
        el.querySelectorAll('#set-body [name]').forEach((inp) => {
          const k = inp.name, v = inp.type === 'checkbox' ? inp.checked : inp.tagName === 'SELECT' && /^\d+$/.test(inp.value) ? +inp.value : inp.value;
          if (k.startsWith('n_')) { const [, ev, ch] = k.match(/^n_(.+)_(email|bot|app)$/); pr.notif[ev][ch] = v; } else if (k in p) p[k] = v; else pr[k] = v;
        });
        TB.toast('Pengaturan disimpan', ui.setTab === 'notif' ? 'Preferensi notifikasi diperbarui' : 'Perubahan langsung berlaku');
        TB.emit('change');
      }, 'Menyimpan…');
    },
  };
})();
