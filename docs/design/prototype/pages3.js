/* TeleBlast — pages: Auto-Detect Link, Auto-Join, Auto-Reply */
(() => {
  const TB = window.TB;
  const { esc, icon, n, c, pct } = TB;
  const P = (TB.pages = TB.pages || {});
  const S = () => TB.S;

  TB.srcName = (id) => (S().sources.find((s) => s.id === id) || {}).name || 'Sumber dihapus';
  TB.isToday = (ts) => TB.date(ts, { day: 'numeric', month: 'numeric', year: 'numeric' }) === TB.date(TB.now(), { day: 'numeric', month: 'numeric', year: 'numeric' });
  TB.urlKind = (u) => (/^(t|telegram)\.me\/(\+|joinchat\/)[\w-]{6,}$/.test(u) ? 'invite' : /^(t|telegram)\.me\/[a-zA-Z][\w]{3,}$/.test(u) ? 'public' : 'invalid');
  const entityLabel = (e) => (e === 'group' ? 'Grup' : e === 'channel' ? 'Channel' : '—');
  const entityIcon = (e) => (e === 'channel' ? 'radio' : e === 'group' ? 'users' : 'x-circle');

  /* ======================= AUTO-DETECT ======================= */
  const LTABS = [['all', 'Semua'], ['detected', 'Detected'], ['pending', 'Pending'], ['joined', 'Joined'], ['skipped', 'Skipped'], ['failed', 'Failed'], ['approval', 'Persetujuan']];
  P.detect = {
    title: 'Auto-Detect Link', section: 'Automation',
    render(el) {
      const L = S().links, ui = S().ui;
      const today = L.filter((l) => TB.isToday(l.found_at)).length;
      const dup = L.reduce((a, l) => a + (l.seen - 1), 0);
      const pat = [
        ['t.me/username', 'Publik', (u) => /^t\.me\/[a-zA-Z]/.test(u) && !u.startsWith('t.me/joinchat'), 'info'],
        ['t.me/+invitecode', 'Undangan privat', (u) => u.startsWith('t.me/+') && u.length > 8, 'violet'],
        ['telegram.me/username', 'Publik', (u) => /^telegram\.me\/[a-zA-Z]{3}/.test(u), 'info'],
        ['t.me/joinchat/…', 'Undangan (lama)', (u) => /^t\.me\/joinchat\/.{6,}/.test(u), 'violet'],
      ];
      const on = S().detectOn;
      el.innerHTML = `
      <div class="tb-head"><div><h1>Auto-Detect Link ${TB.lim().discovery === 'Terbatas' ? TB.lock('Terbatas · ' + TB.lim().sources + ' sumber') : ''}</h1><p>Memantau sumber pesan pilihan Anda dan otomatis menemukan tautan grup & channel Telegram baru.</p></div>
        <div class="actions"><button class="tb-btn" data-action="src-add">${icon('plus')}Tambah sumber</button><button class="tb-btn primary" data-action="scan-now">${icon('scan')}Pindai sekarang</button></div></div>
      <div class="tb-alert info" style="margin-bottom:16px"><div class="a-ico">${icon('shield')}</div><div class="a-b"><div class="a-t">Hanya chat yang dapat diakses akun Anda</div><div class="a-s">Pemantauan mencakup grup, channel, dan chat tempat akun Anda sudah menjadi anggota. TeleBlast tidak membaca chat lain atau mengakses pesan pribadi orang lain.</div></div>
        <div class="tb-row" style="gap:8px"><span class="muted" style="font-size:12.5px">${on ? 'Listener aktif' : 'Listener mati'}</span>${TB.sw('detect_on', on, 'data-action="detect-toggle"')}</div></div>
      <div class="tb-grid k4" data-source="detected_links">
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Link terdeteksi</span><span class="k-ico">${icon('scan')}</span></div><div class="k-val">${n(L.length)}</div><div class="k-foot"><span class="tb-delta up">${icon('plus')}${n(today)}</span><span>hari ini</span></div></div>
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Tautan publik</span><span class="k-ico">${icon('globe')}</span></div><div class="k-val">${n(L.filter((l) => l.kind === 'public').length)}</div><div class="k-foot">t.me/username · telegram.me</div></div>
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Undangan privat</span><span class="k-ico violet">${icon('lock')}</span></div><div class="k-val">${n(L.filter((l) => l.kind === 'invite').length)}</div><div class="k-foot">t.me/+kode · joinchat</div></div>
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl" data-tip="Tautan yang sama ditemukan ulang tidak disimpan dua kali">Duplikat dicegah ${icon('info')}</span><span class="k-ico warn">${icon('copy')}</span></div><div class="k-val">${n(dup)}</div><div class="k-foot"><span class="tb-badge bad plain">${n(L.filter((l) => l.kind === 'invalid').length)} tidak valid</span></div></div>
      </div>
      <div class="tb-grid main-side mt-16">
        <div class="tb-card"><div class="tb-card-h"><div><h3>Sumber yang dipantau</h3><p>${S().sources.filter((s) => s.active).length} dari ${S().sources.length} sumber aktif</p></div><button class="tb-btn sm" data-action="src-add">${icon('plus')}Tambah</button></div>
          <div class="tb-card-b" style="padding-top:6px" data-source="link_sources"><div class="tb-list">${S().sources.map((s) => {
            const a = TB.acc(s.account_id), ok = a && a.status === 'connected' && a.enabled;
            return `<div class="tb-li"><div class="ico ${s.active && ok ? 'info' : ''}">${icon(s.type === 'channel' ? 'radio' : s.type === 'chat' ? 'message-circle' : 'users')}</div>
              <div class="body"><div class="t">${esc(s.name)}</div><div class="s">${s.type === 'chat' ? 'Chat' : s.type === 'channel' ? 'Channel' : 'Grup'} · ${esc(TB.accLabel(s.account_id))} · ${n(s.links_found)} link · ${!ok ? '<span style="color:var(--color-warn)">akun tidak aktif</span>' : s.active ? 'dipindai ' + TB.ago(s.last_scan) : 'dijeda'}</div></div>
              ${TB.sw('src_' + s.id, s.active, `data-action="src-toggle" data-id="${s.id}"`)}<button class="tb-btn xs icon ghost" data-action="src-del" data-id="${s.id}" data-tip="Hapus sumber">${icon('trash')}</button></div>`;
          }).join('') || TB.empty('scan', 'Belum ada sumber', 'Tambahkan grup, channel, atau chat yang ingin dipantau.')}</div></div></div>
        <div class="tb-stack">
          <div class="tb-card"><div class="tb-card-h"><div><h3>Format yang dikenali</h3><p>Dipisahkan otomatis berdasarkan pola tautan</p></div></div>
            <div class="tb-card-b"><div class="tb-stack" style="gap:8px">${pat.map(([f, l, fn, tone]) => `<div class="tb-pattern"><code>${f}</code><span class="tb-badge plain ${tone}">${l}</span><b class="num" style="min-width:28px;text-align:right">${L.filter((x) => fn(x.url)).length}</b></div>`).join('')}
              <div class="tb-pattern"><code>t.me/ · tautan rusak</code><span class="tb-badge plain bad">Tidak valid</span><b class="num" style="min-width:28px;text-align:right">${L.filter((x) => x.kind === 'invalid').length}</b></div></div></div></div>
          <div class="tb-card pad"><div class="tb-set-row" style="padding:0"><div><div class="t">Kirim otomatis ke antrean join</div><div class="d">Link yang lolos kriteria Auto-Join langsung berstatus Pending.</div></div>${TB.sw('auto_queue', S().prefs.autoQueue, 'data-action="auto-queue"')}</div></div>
        </div>
      </div>
      <div class="tb-card mt-16" id="link-queue">
        <div style="padding:14px 16px 0"><div class="tb-tabs" style="margin-bottom:0">${LTABS.map(([k, l]) => `<button class="tb-tab ${ui.linkStatus === k ? 'is-on' : ''}" data-action="link-tab" data-v="${k}">${l}<span class="tb-count">${k === 'all' ? L.length : L.filter((x) => x.status === k).length}</span></button>`).join('')}</div></div>
        <div class="tb-filters" style="padding:14px 16px">
          <div class="tb-input-icon" style="flex:1;min-width:200px;max-width:320px">${icon('search')}<input class="tb-input sm" id="lk-q" placeholder="Cari tautan atau nama…" value="${esc(ui.linkQ)}"></div>
          <select class="tb-input sm" id="lk-kind" aria-label="Jenis link"><option value="all">Semua jenis</option>${Object.entries(TB.LK).map(([k, v]) => `<option value="${k}" ${ui.linkKind === k ? 'selected' : ''}>${v.l}</option>`).join('')}</select>
          <select class="tb-input sm" id="lk-src" aria-label="Sumber"><option value="all">Semua sumber</option>${S().sources.map((s) => `<option value="${s.id}" ${ui.linkSrc === s.id ? 'selected' : ''}>${esc(s.name)}</option>`).join('')}</select>
        </div>
        <div id="lk-table"></div>
      </div>`;
      this.table(el);
      el.querySelector('#lk-q').addEventListener('input', (e) => { ui.linkQ = e.target.value; this.table(el); });
      el.querySelector('#lk-kind').addEventListener('change', (e) => { ui.linkKind = e.target.value; this.table(el); });
      el.querySelector('#lk-src').addEventListener('change', (e) => { ui.linkSrc = e.target.value; this.table(el); });
    },
    rows() {
      const ui = S().ui, q = ui.linkQ.toLowerCase();
      return S().links.filter((l) => (ui.linkStatus === 'all' || l.status === ui.linkStatus) && (ui.linkKind === 'all' || l.kind === ui.linkKind) && (ui.linkSrc === 'all' || l.source_id === ui.linkSrc) && (!q || (l.url + ' ' + l.title).toLowerCase().includes(q)));
    },
    table(el) {
      const ui = S().ui, rows = this.rows().slice(0, 200), sel = ui.linkSel;
      const box = el.querySelector('#lk-table');
      if (!rows.length) { box.innerHTML = TB.empty('scan', 'Tidak ada link', 'Tidak ada tautan yang cocok dengan filter ini. Coba ubah filter atau pindai sekarang.', `<button class="tb-btn sm" data-action="link-reset">Reset filter</button>`); return; }
      const allOn = rows.every((r) => sel.has(r.id));
      box.innerHTML = `${sel.size ? `<div class="tb-sel-bar"><b>${sel.size} dipilih</b><span class="tb-sp"></span><button class="tb-btn xs" data-action="link-bulk" data-v="queue">${icon('user-plus')}Kirim ke antrean join</button><button class="tb-btn xs" data-action="link-bulk" data-v="skip">${icon('skip-forward')}Lewati</button><button class="tb-btn xs ghost" data-action="link-bulk" data-v="clear">Batal pilih</button></div>` : ''}
        <div class="tb-table-wrap scroll" style="max-height:520px"><table class="tb-table" data-source="detected_links" data-row-key="id">
        <thead><tr><th style="width:36px"><span class="tb-check ${allOn ? 'is-checked' : ''}" data-action="link-selall">${icon('check')}</span></th><th>Tautan</th><th>Jenis</th><th class="tb-hide-sm">Entitas</th><th class="tb-hide-sm" data-field="source">Sumber</th><th class="tb-hide-sm">Ditemukan</th><th class="r tb-hide-sm" data-field="seen">Terlihat</th><th>Status</th><th class="r"></th></tr></thead>
        <tbody>${rows.map((l) => `<tr data-key="${esc(l.id)}">
          <td><span class="tb-check ${sel.has(l.id) ? 'is-checked' : ''}" data-action="link-sel" data-id="${l.id}">${icon('check')}</span></td>
          <td><div class="tb-url ${l.kind === 'invalid' ? 'bad' : ''}">${esc(l.url)}</div><div class="t-sub tb-ellipsis" style="max-width:260px">${esc(l.title)}${l.members ? ` · ${c(l.members)} anggota` : ''}${l.reason ? ` · <span style="color:${l.status === 'failed' ? 'var(--color-bad)' : 'var(--color-fg-muted)'}">${esc(l.reason)}</span>` : ''}</div></td>
          <td>${TB.badge(TB.LK, l.kind, 'plain')}</td>
          <td class="tb-hide-sm"><span class="tb-tag">${icon(entityIcon(l.entity))}${entityLabel(l.entity)}</span></td>
          <td class="tb-hide-sm"><span class="tb-ellipsis" style="display:block;max-width:170px">${esc(l.source)}</span></td>
          <td class="tb-hide-sm"><span class="t-sub" data-tip="${TB.dt(l.found_at)}">${TB.ago(l.found_at)}</span></td>
          <td class="r num tb-hide-sm">${l.seen}×</td>
          <td>${TB.badge(TB.LS, S().join.current === l.id ? 'joining' : l.status)}</td>
          <td class="r" style="white-space:nowrap">${l.status === 'detected' ? `<button class="tb-btn xs" data-action="link-queue" data-id="${l.id}" data-tip="Kirim ke antrean join">${icon('user-plus')}</button> <button class="tb-btn xs ghost icon" data-action="link-skip" data-id="${l.id}" data-tip="Lewati">${icon('skip-forward')}</button>`
            : l.status === 'pending' ? `<button class="tb-btn xs ghost" data-action="link-unqueue" data-id="${l.id}">Batalkan</button>`
              : l.status === 'failed' ? `<button class="tb-btn xs" data-action="link-retry" data-id="${l.id}">${icon('refresh')}Coba lagi</button>` : ''}
            <button class="tb-btn xs ghost icon" data-action="link-copy" data-id="${l.id}" data-tip="Salin tautan">${icon('copy')}</button></td></tr>`).join('')}</tbody></table></div>
        <div class="tb-card-f"><span class="muted" style="font-size:12.5px">Menampilkan ${rows.length} dari ${S().links.length} tautan</span><span class="muted" style="font-size:12px">Tautan duplikat otomatis digabung ke entri yang sudah ada</span></div>`;
    },
  };

  TB.addSourceFlow = () => {
    if (TB.atLimit(S().sources.length, TB.lim().sources)) return TB.upsell('Batas sumber deteksi tercapai', `Paket ${TB.lim().plan} mendukung ${TB.lim().sources} sumber deteksi. Upgrade untuk memantau lebih banyak chat.`);
    const accs = S().accounts.filter((a) => a.status === 'connected' && a.enabled);
    const used = new Set(S().sources.map((s) => s.name));
    const chats = [{ name: 'Saved Messages', type: 'chat' }, ...S().targets.filter((t) => t.status === 'active').map((t) => ({ name: t.title, type: t.type }))].filter((x) => !used.has(x.name));
    let acc = accs[0] && accs[0].id, pick = null;
    TB.modal({
      icon: 'scan', title: 'Tambah sumber pemantauan', sub: 'Pilih chat yang sudah diikuti akun Anda. Hanya pesan baru yang bisa diakses akun tersebut yang dipindai.',
      body: accs.length ? `<div class="tb-stack"><div class="tb-field"><label>Akun pemantau</label><select class="tb-input" id="as-acc">${accs.map((a) => `<option value="${a.id}">@${esc(a.username)} — ${esc(a.display_name)}</option>`).join('')}</select></div>
        <div class="tb-field"><label>Chat sumber</label><div class="tb-input-icon">${icon('search')}<input class="tb-input sm" id="as-q" placeholder="Cari grup/channel yang diikuti…"></div><div class="tb-target-list" id="as-list" style="max-height:240px;margin-top:8px"></div><div class="err" id="as-err" style="display:none;color:var(--color-bad);font-size:12px">Pilih satu chat.</div></div>
        <div class="tb-set-row"><div><div class="t">Pindai 24 jam terakhir</div><div class="d">Ambil tautan dari riwayat pesan yang masih dapat diakses.</div></div>${TB.sw('as_hist', true)}</div></div>`
        : TB.empty('smartphone', 'Tidak ada akun aktif', 'Hubungkan atau aktifkan akun Telegram terlebih dahulu.'),
      foot: `<button class="tb-btn" data-close>Batal</button>${accs.length ? `<button class="tb-btn primary" id="as-go">${icon('plus')}Tambah sumber</button>` : ''}`,
      onMount: (box) => {
        if (!accs.length) return;
        const list = box.querySelector('#as-list');
        const draw = (q = '') => { list.innerHTML = chats.filter((x) => x.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40).map((x) => `<button class="tb-target ${pick === x.name ? 'is-checked' : ''}" data-n="${esc(x.name)}"><span class="tb-check" style="border-radius:50%">${icon('check')}</span><span class="tav" style="background:${TB.grad(x.name)}">${esc(TB.initials(x.name))}</span><span style="flex:1;min-width:0;font-weight:600;font-size:13px" class="tb-ellipsis">${esc(x.name)}</span><span class="tb-tag">${x.type === 'chat' ? 'Chat' : x.type === 'channel' ? 'Channel' : 'Grup'}</span></button>`).join('') || '<div class="muted" style="padding:20px;text-align:center;font-size:13px">Tidak ditemukan</div>'; };
        draw();
        box.querySelector('#as-q').addEventListener('input', (e) => draw(e.target.value));
        box.querySelector('#as-acc').addEventListener('change', (e) => (acc = e.target.value));
        list.addEventListener('click', (e) => { const b = e.target.closest('[data-n]'); if (!b) return; pick = b.dataset.n; draw(box.querySelector('#as-q').value); box.querySelector('#as-err').style.display = 'none'; });
        box.querySelector('#as-go').addEventListener('click', (e) => {
          if (!pick) { box.querySelector('#as-err').style.display = 'block'; return; }
          const ch = chats.find((x) => x.name === pick);
          TB.busy(e.currentTarget, 800, () => { TB.act.addSource(ch, acc); TB.closeModal(); }, 'Menghubungkan…');
        });
      },
    });
  };

  /* ======================= AUTO-JOIN ======================= */
  const JH = [['all', 'Semua'], ['joined', 'Joined'], ['approval', 'Menunggu persetujuan'], ['failed', 'Failed'], ['skipped', 'Skipped']];
  P.join = {
    title: 'Auto-Join', section: 'Automation',
    render(el) {
      const J = S().join, p = S().profile, ui = S().ui;
      const pend = S().links.filter((l) => l.status === 'pending');
      const st = J.state;
      const accs = S().accounts.filter((a) => a.roles.includes('join'));
      const done = S().links.filter((l) => ['joined', 'failed', 'approval', 'skipped'].includes(l.status) && l.processed_at && l.kind !== 'invalid');
      const q = ui.joinQ === 'channel' ? pend.filter((l) => l.entity === 'channel') : pend.filter((l) => l.entity !== 'channel');
      const hist = done.filter((l) => ui.joinHist === 'all' || l.status === ui.joinHist).sort((a, b) => (a.processed_at < b.processed_at ? 1 : -1));
      el.innerHTML = `
      <div class="tb-head"><div><h1>Auto-Join Grup & Channel</h1><p>Memproses tautan dari Auto-Detect secara bertahap, sesuai kriteria dan batas aman Telegram.</p></div>
        <div class="actions"><button class="tb-btn" data-nav="detect">${icon('scan')}Lihat link terdeteksi</button></div></div>
      <div class="tb-engine ${st === 'running' ? '' : st === 'paused' ? 'paused' : 'idle'}">
        <div class="e-ico">${icon(st === 'running' ? 'user-plus' : st === 'paused' ? 'pause' : 'power')}</div>
        <div style="min-width:0"><div class="e-t"><span class="tb-pulse ${st === 'running' ? '' : st === 'paused' ? 'paused' : 'off'}"></span>${st === 'running' ? 'Auto-Join berjalan' : st === 'paused' ? 'Auto-Join dijeda' : 'Auto-Join berhenti'}</div>
          <div class="e-s">${st === 'running' ? `<span data-bind="join-next">—</span> · ${pend.length} link di antrean` : st === 'paused' ? `${pend.length} link menunggu. Lanjutkan kapan saja.` : 'Tekan Start untuk mulai memproses antrean.'}</div></div>
        <div class="e-actions">
          ${st === 'stopped' ? `<button class="tb-btn primary" data-action="join-start" ${!pend.length ? 'disabled' : ''}>${icon('play')}Start</button>` : ''}
          ${st === 'running' ? `<button class="tb-btn warn" data-action="join-pause">${icon('pause')}Pause</button>` : ''}
          ${st === 'paused' ? `<button class="tb-btn primary" data-action="join-resume">${icon('play')}Resume</button>` : ''}
          <button class="tb-btn danger" data-action="join-stop" ${st === 'stopped' ? 'disabled' : ''}>${icon('circle-stop')}Stop</button>
        </div></div>
      <div class="tb-alert warn mt-16"><div class="a-ico">${icon('shield-alert')}</div><div class="a-b"><div class="a-t">Mengikuti batas Telegram</div><div class="a-s">Maksimal <b>${p.join_per_hour} join/jam</b> per akun dengan jeda acak ${p.join_delay_min}–${p.join_delay_max} menit. Join massal dalam waktu singkat dapat membuat akun dibatasi. ${TB.lim().joins_day !== -1 ? `<b>Paket ${TB.lim().plan}: maks ${TB.lim().joins_day} join/hari.</b> ` : ''}<span class="muted">(Simulasi demo dipercepat.)</span></div></div></div>
      <div class="tb-grid k4 mt-16" data-source="detected_links">
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Antrean</span><span class="k-ico">${icon('list')}</span></div><div class="k-val">${n(pend.length)}</div><div class="k-foot">${pend.filter((l) => l.entity !== 'channel').length} grup · ${pend.filter((l) => l.entity === 'channel').length} channel</div></div>
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Join jam ini</span><span class="k-ico ok">${icon('gauge')}</span></div><div class="k-val"><span data-bind="join-hour">—</span><small>/ ${p.join_per_hour}</small></div><div style="margin-top:10px">${TB.prog(Math.min(1, TB.joinsThisHour() / p.join_per_hour), TB.joinsThisHour() >= p.join_per_hour ? 'warn' : 'ok')}</div></div>
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Berhasil diikuti</span><span class="k-ico ok">${icon('check-circle')}</span></div><div class="k-val">${n(S().links.filter((l) => l.status === 'joined').length)}</div><div class="k-foot">${n(S().links.filter((l) => l.status === 'approval').length)} menunggu persetujuan</div></div>
        <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Gagal / dilewati</span><span class="k-ico warn">${icon('x-circle')}</span></div><div class="k-val">${n(S().links.filter((l) => l.status === 'failed').length)}<small>/ ${n(S().links.filter((l) => l.status === 'skipped').length)}</small></div><div class="k-foot">gagal · dilewati</div></div>
      </div>
      <div class="tb-grid main-side mt-16">
        <div class="tb-card"><div class="tb-card-h"><div><h3>Antrean join</h3><p>Diproses berurutan dari yang terlama</p></div>
            <div class="tb-btn-group"><button class="tb-seg ${ui.joinQ !== 'channel' ? 'is-on' : ''}" data-action="join-q" data-v="group">Grup (${pend.filter((l) => l.entity !== 'channel').length})</button><button class="tb-seg ${ui.joinQ === 'channel' ? 'is-on' : ''}" data-action="join-q" data-v="channel">Channel (${pend.filter((l) => l.entity === 'channel').length})</button></div></div>
          <div class="tb-card-b" style="padding-top:8px" data-source="detected_links">${q.length ? `<div class="tb-list">${q.slice(0, 12).map((l, i) => `<div class="tb-queue-item ${J.current === l.id ? 'is-now' : ''}"><span class="pos">${J.current === l.id ? icon('loader') : i + 1}</span>
              <span class="tb-avatar sm round" style="background:${TB.grad(l.url)}">${esc(TB.initials(l.title))}</span>
              <div style="min-width:0;flex:1"><div class="tb-ellipsis" style="font-weight:600;font-size:13px">${esc(l.title)}</div><div class="tb-url tb-ellipsis">${esc(l.url)}</div></div>
              ${TB.badge(TB.LK, l.kind, 'plain')}${J.current === l.id ? '<span class="tb-badge info live">Memproses</span>' : `<button class="tb-btn xs ghost icon" data-action="link-top" data-id="${l.id}" data-tip="Prioritaskan">${icon('arrow-up')}</button><button class="tb-btn xs ghost icon" data-action="link-unqueue" data-id="${l.id}" data-tip="Keluarkan dari antrean">${icon('x')}</button>`}</div>`).join('')}</div>${q.length > 12 ? `<div class="muted" style="font-size:12.5px;padding-top:10px">+${q.length - 12} lainnya di antrean</div>` : ''}`
            : TB.empty('list', 'Antrean kosong', 'Kirim link dari Auto-Detect ke antrean, atau aktifkan pengiriman otomatis ke antrean.', `<button class="tb-btn sm" data-nav="detect">Buka Auto-Detect</button>`)}</div></div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>${icon('sliders')}Kriteria & batas</h3><p>Link yang tidak memenuhi kriteria otomatis dilewati</p></div></div>
          <div class="tb-card-b" id="join-crit" data-source="profile">
            <div class="tb-set-row" style="padding-top:0"><div><div class="t">Tautan publik</div><div class="d">t.me/username · telegram.me/username</div></div>${TB.sw('join_public', p.join_public)}</div>
            <div class="tb-set-row"><div><div class="t">Undangan privat</div><div class="d">t.me/+kode — bisa memerlukan persetujuan admin</div></div>${TB.sw('join_invite', p.join_invite)}</div>
            <div class="tb-set-row"><div><div class="t">Lewati jika sudah anggota</div><div class="d">Cek status keanggotaan sebelum join</div></div>${TB.sw('join_skip_member', p.join_skip_member)}</div>
            <div class="tb-field mt-16"><label for="jc-min">Minimal anggota</label><input class="tb-input sm" type="number" id="jc-min" name="join_min_members" min="0" step="100" value="${p.join_min_members}"></div>
            <div class="tb-field mt-16"><div class="tb-row between"><label for="jc-ph">Maks join per jam</label><b class="num" id="jc-ph-v">${p.join_per_hour}</b></div><input type="range" class="tb-range" id="jc-ph" name="join_per_hour" min="1" max="20" value="${p.join_per_hour}"><div class="hint" id="jc-ph-w" style="color:var(--color-warn);font-size:12px" ${p.join_per_hour > 10 ? '' : 'hidden'}>Di atas 10/jam berisiko memicu pembatasan akun.</div></div>
            <div class="tb-field mt-16"><label for="jc-bl">Kata kunci diblokir</label><input class="tb-input sm" id="jc-bl" name="join_blocklist" value="${esc(p.join_blocklist)}"><div class="hint" style="font-size:12px;color:var(--muted)">Pisahkan dengan koma. Grup dengan nama mengandung kata ini dilewati.</div></div>
            <div class="tb-field mt-16"><label>Akun untuk join</label><div class="tb-row wrap" style="gap:6px">${S().accounts.map((a) => `<button class="tb-chip ${a.roles.includes('join') ? 'is-on' : ''}" data-action="role-toggle" data-id="${a.id}" data-v="join" ${a.status === 'disconnected' ? 'disabled' : ''}>@${esc(a.username)}</button>`).join('')}</div>${accs.length ? '' : '<div class="hint" style="color:var(--color-bad);font-size:12px">Pilih minimal satu akun.</div>'}</div>
            <button class="tb-btn primary mt-16" style="width:100%" data-action="join-save">${icon('check')}Simpan kriteria</button>
          </div></div>
      </div>
      <div class="tb-card mt-16"><div class="tb-card-h"><div><h3>Riwayat hasil</h3><p>Grup & channel yang diproses beserta alasannya</p></div></div>
        <div class="tb-row wrap" style="padding:14px 20px 4px;gap:6px">${JH.map(([k, l]) => `<button class="tb-chip ${ui.joinHist === k ? 'is-on' : ''}" data-action="join-hist" data-v="${k}">${l}<span class="tb-count">${k === 'all' ? done.length : done.filter((x) => x.status === k).length}</span></button>`).join('')}</div>
        <div style="padding-top:8px">${hist.length ? `<div class="tb-table-wrap scroll"><table class="tb-table" data-source="detected_links" data-row-key="id"><thead><tr><th>Grup / channel</th><th class="tb-hide-sm">Tipe</th><th class="tb-hide-sm">Akun</th><th class="tb-hide-sm">Waktu</th><th>Hasil</th><th>Alasan</th><th class="r"></th></tr></thead>
          <tbody>${hist.map((l) => `<tr data-key="${esc(l.id)}"><td><div class="t-main tb-ellipsis" style="max-width:240px">${esc(l.title)}</div><div class="tb-url">${esc(l.url)}</div></td><td class="tb-hide-sm"><span class="tb-tag">${icon(entityIcon(l.entity))}${entityLabel(l.entity)}</span></td><td class="tb-hide-sm muted">${esc(TB.accLabel(l.account_id))}</td><td class="tb-hide-sm"><span class="t-sub">${TB.dt(l.processed_at)}</span></td><td>${TB.badge(TB.LS, l.status)}</td><td><span class="t-sub">${esc(l.reason || (l.status === 'joined' ? 'Berhasil bergabung · ditambahkan ke target' : l.status === 'approval' ? 'Permintaan join terkirim, menunggu admin' : '—'))}</span></td>
            <td class="r">${l.status === 'approval' ? `<button class="tb-btn xs" data-action="join-recheck" data-id="${l.id}">${icon('refresh')}Cek ulang</button>` : l.status === 'failed' ? `<button class="tb-btn xs" data-action="link-retry" data-id="${l.id}">Coba lagi</button>` : ''}</td></tr>`).join('')}</tbody></table></div>` : TB.empty('history', 'Belum ada riwayat', 'Hasil join akan tercatat di sini.')}</div></div>`;
      const ph = el.querySelector('#jc-ph');
      ph.addEventListener('input', () => { el.querySelector('#jc-ph-v').textContent = ph.value; el.querySelector('#jc-ph-w').hidden = +ph.value <= 10; });
    },
  };
  TB.bind('join-hour', () => n(TB.joinsThisHour()));
  TB.bind('join-next', () => {
    const J = S().join;
    if (J.current) return 'Sedang memproses ' + ((S().links.find((l) => l.id === J.current) || {}).title || 'tautan');
    if (TB.lim().joins_day !== -1 && TB.joinsToday() >= TB.lim().joins_day) return `Batas ${TB.lim().joins_day} join/hari paket ${TB.lim().plan} tercapai — lanjut besok`;
    if (TB.joinsThisHour() >= S().profile.join_per_hour) return `Batas per jam tercapai — lanjut dalam ${TB.dur((TB.joinWindowFree() - Date.now()) / 1000)}`;
    return `Join berikutnya dalam ${Math.max(0, Math.ceil((J.nextAt - Date.now()) / 1000))} dtk`;
  });

  /* ======================= AUTO-REPLY ======================= */
  const RTABS = [['rules', 'Aturan balasan', 'list'], ['hours', 'Jam aktif & fallback', 'clock'], ['history', 'Riwayat respons', 'history'], ['failed', 'Gagal diproses', 'alert']];
  TB.matchRule = (text, accId, first) => {
    const rules = S().rules.filter((r) => r.active && r.accounts.split(',').includes(accId));
    if (first) { const w = rules.find((r) => r.type === 'welcome'); if (w) return w; }
    const t = text.toLowerCase();
    const k = rules.find((r) => (r.type === 'keyword' || r.type === 'faq') && r.keywords.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean).some((kw) => t.includes(kw)));
    return k || rules.find((r) => r.type === 'fallback') || null;
  };
  P.reply = {
    title: 'Auto-Reply', section: 'Automation',
    render(el) {
      const ui = S().ui, p = S().profile, R = S().reply;
      const ad = S().adaily.filter((d) => d.day > TB.dayKey(-7));
      const rep = ad.reduce((a, d) => a + d.replies, 0), rf = ad.reduce((a, d) => a + d.replies_failed, 0);
      const lat = S().rlog.filter((x) => x.latency_s != null);
      const avgLat = lat.reduce((a, x) => a + x.latency_s, 0) / (lat.length || 1);
      const failed = S().rlog.filter((x) => x.status === 'failed');
      let body = '';
      if (ui.replyTab === 'rules') body = `<div class="tb-grid main-side"><div class="tb-grid" style="grid-template-columns:repeat(auto-fill,minmax(min(100%,300px),1fr));align-content:start" data-source="autoreply_rules">${S().rules.map((r) => `
          <div class="tb-card tb-rule ${r.active ? '' : 'off'}"><div class="tb-row between">${TB.badge(TB.RT, r.type, 'plain')}<div class="tb-row" style="gap:4px">${TB.sw('rule_' + r.id, r.active, `data-action="rule-toggle" data-id="${r.id}"`)}<button class="tb-btn xs ghost icon" data-action="rule-menu" data-id="${r.id}" aria-label="Aksi aturan">${icon('more')}</button></div></div>
            <div><div style="font-weight:620">${esc(r.name)}</div><div class="tb-row wrap mt-8" style="gap:4px">${r.type === 'welcome' ? '<span class="muted" style="font-size:12px">Dikirim ke kontak baru yang pertama kali menghubungi</span>' : r.type === 'fallback' ? '<span class="muted" style="font-size:12px">Saat tidak ada kata kunci yang cocok</span>' : r.keywords.split(',').map((k) => `<span class="tb-kw">${esc(k.trim())}</span>`).join('')}</div></div>
            <div class="r-reply">${esc(r.reply)}</div>
            <div class="tb-row between muted" style="font-size:12px"><span>${icon('smartphone')} ${r.accounts.split(',').map((a) => esc(TB.accLabel(a))).join(', ')}</span><span class="num">${n(r.hits_7d)} respons · 7 hr</span></div></div>`).join('')}
          <button class="tb-acc-add" style="min-height:200px" data-action="rule-add"><span class="plus">${icon('plus')}</span><b style="color:var(--color-fg)">Tambah aturan</b><span style="font-size:12.5px">Kata kunci, FAQ, sambutan, atau fallback</span></button></div>
        <div class="tb-stack tb-sticky" style="align-self:start">
          <div class="tb-card"><div class="tb-card-h"><div><h3>${icon('message')}Uji balasan</h3><p>Simulasikan pesan masuk dari pelanggan</p></div></div>
            <div class="tb-card-b"><div class="tb-stack" style="gap:10px"><select class="tb-input sm" id="rt-acc">${S().accounts.filter((a) => a.roles.includes('reply')).map((a) => `<option value="${a.id}">@${esc(a.username)}</option>`).join('')}</select>
              <div class="tb-row" style="gap:8px"><input class="tb-input sm" id="rt-q" placeholder="mis. kak harga cold brew berapa?"><button class="tb-btn sm primary" data-action="reply-test">Uji</button></div>
              <label class="tb-row" style="gap:8px;font-size:12.5px;cursor:pointer"><input type="checkbox" id="rt-first"> Kontak baru (pertama kali chat)</label>
              <div id="rt-out" class="tb-tg-prev" style="min-height:150px"><div class="muted" style="font-size:12.5px;text-align:center;margin:auto">Ketik pesan lalu tekan Uji</div></div></div></div></div>
          <div class="tb-card"><div class="tb-card-h"><div><h3>Template FAQ</h3><p>Tambahkan jawaban umum dengan sekali klik</p></div></div><div class="tb-card-b"><div class="tb-stack" style="gap:6px">${TB.FAQ.map((f, i) => `<button class="tb-target" style="border:1px solid var(--line);border-radius:10px" data-action="faq-add" data-v="${i}"><span class="tb-badge ok plain">FAQ</span><span style="flex:1;font-weight:600;font-size:13px">${esc(f.name)}</span>${icon('plus')}</button>`).join('')}</div></div></div>
        </div></div>`;
      if (ui.replyTab === 'hours') body = `<div class="tb-card" style="max-width:820px" data-source="profile"><div class="tb-card-h"><div><h3>Jam aktif & balasan fallback</h3><p>Di luar jam aktif, pelanggan menerima pesan fallback.</p></div></div>
        <div class="tb-card-b" id="reply-hours"><div class="tb-form-grid">
          <div class="tb-field"><label for="rh-s">Mulai</label><input type="time" class="tb-input" id="rh-s" name="reply_start" value="${p.reply_start}"></div>
          <div class="tb-field"><label for="rh-e">Selesai</label><input type="time" class="tb-input" id="rh-e" name="reply_end" value="${p.reply_end}"></div>
          <div class="tb-field"><label for="rh-d">Jeda sebelum membalas</label><select class="tb-input" id="rh-d" name="reply_delay_s">${[0, 2, 4, 8, 15].map((v) => `<option value="${v}" ${p.reply_delay_s === v ? 'selected' : ''}>${v ? v + ' detik (terlihat natural)' : 'Langsung'}</option>`).join('')}</select></div>
          <div class="tb-field"><label>Hari aktif</label><div class="tb-days">${['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d, i) => `<button class="tb-chip ${S().prefs.replyDays.includes(i) ? 'is-on' : ''}" data-action="reply-day" data-v="${i}">${d}</button>`).join('')}</div></div>
          <div class="tb-field full"><label for="rh-f">Pesan fallback di luar jam aktif</label><textarea class="tb-input" id="rh-f" name="reply_fallback" rows="4">${esc(p.reply_fallback)}</textarea></div>
        </div>
        <div class="tb-set-row mt-8"><div><div class="t">Kirim fallback di luar jam aktif</div><div class="d">Satu kali per kontak per 12 jam agar tidak berulang.</div></div>${TB.sw('fallback_on', S().prefs.fallbackOn)}</div>
        <button class="tb-btn primary mt-16" data-action="reply-hours-save">${icon('check')}Simpan pengaturan</button></div></div>`;
      if (ui.replyTab === 'history' || ui.replyTab === 'failed') {
        const rows = S().rlog.filter((x) => (ui.replyTab === 'failed' ? x.status === 'failed' : true) && (ui.replyAcc === 'all' || x.account_id === ui.replyAcc));
        body = `<div class="tb-card"><div class="tb-filters" style="padding:14px 16px"><select class="tb-input sm" id="rh-acc"><option value="all">Semua akun</option>${S().accounts.filter((a) => a.roles.includes('reply') || S().rlog.some((x) => x.account_id === a.id)).map((a) => `<option value="${a.id}" ${ui.replyAcc === a.id ? 'selected' : ''}>@${esc(a.username)}</option>`).join('')}</select><span class="tb-sp"></span><span class="muted" style="font-size:12.5px">${rows.length} pesan</span></div>
          ${rows.length ? `<div class="tb-table-wrap scroll"><table class="tb-table" data-source="autoreply_log" data-row-key="id"><thead><tr><th>Waktu</th><th class="tb-hide-sm">Akun</th><th>Dari</th><th>Pesan masuk</th><th>${ui.replyTab === 'failed' ? 'Alasan' : 'Aturan'}</th><th>Status</th><th class="r tb-hide-sm">${ui.replyTab === 'failed' ? '' : 'Respons'}</th>${ui.replyTab === 'failed' ? '<th class="r"></th>' : ''}</tr></thead>
            <tbody>${rows.map((x) => { const r = S().rules.find((k) => k.id === x.rule_id); return `<tr data-key="${esc(x.id)}"><td><span class="t-sub">${TB.dt(x.ts)}</span></td><td class="tb-hide-sm muted">${esc(TB.accLabel(x.account_id))}</td><td>${esc(x.from)}</td><td><span class="tb-ellipsis" style="display:block;max-width:240px">${esc(x.incoming)}</span></td><td>${ui.replyTab === 'failed' ? `<span class="t-sub">${esc(x.reason)}</span>` : r ? TB.badge(TB.RT, r.type, 'plain') + ' <span class="t-sub">' + esc(r.name) + '</span>' : '<span class="t-sub">—</span>'}</td><td>${TB.badge(TB.RS, x.status)}</td>${ui.replyTab === 'failed' ? `<td class="r tb-hide-sm"></td><td class="r" style="white-space:nowrap">${x.status === 'failed' ? `<button class="tb-btn xs" data-action="reply-manual" data-id="${x.id}">${icon('reply')}Balas manual</button> <button class="tb-btn xs ghost" data-action="reply-resolve" data-id="${x.id}">Selesai</button>` : ''}</td>` : `<td class="r num tb-hide-sm">${x.latency_s != null ? x.latency_s.toLocaleString('id-ID') + ' dtk' : '—'}</td>`}</tr>`; }).join('')}</tbody></table></div>`
            : TB.empty(ui.replyTab === 'failed' ? 'check-circle' : 'inbox', ui.replyTab === 'failed' ? 'Tidak ada pesan gagal' : 'Belum ada riwayat', ui.replyTab === 'failed' ? 'Semua pesan masuk berhasil diproses. 🎉' : 'Respons otomatis akan tercatat di sini.')}</div>`;
      }
      el.innerHTML = `
      <div class="tb-head"><div><h1>Auto-Reply</h1><p>Balas otomatis pesan masuk dari calon pembeli — sambutan, kata kunci, FAQ, dan fallback.</p></div>
        <div class="actions"><button class="tb-btn primary" data-action="rule-add">${icon('plus')}Aturan baru</button></div></div>
      <div class="tb-alert info" style="margin-bottom:16px"><div class="a-ico">${icon('shield')}</div><div class="a-b"><div class="a-t">Hanya membalas yang menghubungi lebih dulu</div><div class="a-s">Auto-Reply merespons orang yang mengirim pesan ke akun Anda terlebih dahulu. TeleBlast tidak mengirim DM promosi ke pengguna tanpa persetujuan.</div></div></div>
      <div class="tb-grid main-side">
        <div class="tb-grid k4" style="grid-template-columns:repeat(auto-fit,minmax(min(100%,170px),1fr))" data-source="account_daily">
          <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Pesan masuk</span><span class="k-ico">${icon('inbox')}</span></div><div class="k-val">${n(rep + rf)}</div><div class="k-foot">7 hari terakhir</div></div>
          <div class="tb-card tb-kpi"><div class="k-top"><span class="k-lbl">Dibalas otomatis</span><span class="k-ico ok">${icon('reply')}</span></div><div class="k-val">${n(rep)}</div><div class="k-foot">${pct(rep / (rep + rf || 1))} berhasil</div></div>
          <div class="tb-card tb-kpi" data-source="autoreply_log"><div class="k-top"><span class="k-lbl">Rata-rata respons</span><span class="k-ico violet">${icon('clock')}</span></div><div class="k-val">${avgLat.toLocaleString('id-ID', { maximumFractionDigits: 1 })}<small>dtk</small></div><div class="k-foot">termasuk jeda natural</div></div>
          <div class="tb-card tb-kpi" data-source="autoreply_log"><div class="k-top"><span class="k-lbl">Gagal diproses</span><span class="k-ico warn">${icon('alert')}</span></div><div class="k-val">${n(failed.length)}</div><div class="k-foot">${failed.length ? '<button class="tb-btn xs" data-action="reply-tab" data-v="failed">Tinjau</button>' : 'semua beres'}</div></div>
        </div>
        <div class="tb-card"><div class="tb-card-h"><div><h3>Status per akun</h3><p>Aktifkan atau nonaktifkan Auto-Reply</p></div>${TB.sw('reply_on', R.on, 'data-action="reply-global"')}</div>
          <div class="tb-card-b" style="padding-top:6px"><div class="tb-list">${S().accounts.map((a) => { const on = a.roles.includes('reply'); const ok = a.status === 'connected' && a.enabled; return `<div class="tb-li"><span class="tb-avatar sm round" style="background:${TB.grad(a.username)}">${esc(TB.initials(a.display_name))}</span><div class="body"><div class="t">@${esc(a.username)}</div><div class="s">${!ok ? 'Akun tidak aktif' : on && R.on ? `Aktif · ${p.reply_start}–${p.reply_end}` : 'Nonaktif'}</div></div>${TB.sw('rr_' + a.id, on, `data-action="role-toggle" data-id="${a.id}" data-v="reply" ${a.status === 'disconnected' ? 'disabled' : ''}`)}</div>`; }).join('')}</div></div></div>
      </div>
      <div class="tb-tabs mt-24">${RTABS.map(([k, l, ic]) => `<button class="tb-tab ${ui.replyTab === k ? 'is-on' : ''}" data-action="reply-tab" data-v="${k}">${icon(ic)}${l}${k === 'failed' && failed.length ? `<span class="tb-count is-bad">${failed.length}</span>` : ''}</button>`).join('')}</div>
      ${body}`;
      const acc = el.querySelector('#rh-acc');
      if (acc) acc.addEventListener('change', (e) => { ui.replyAcc = e.target.value; this.render(el); });
      const q = el.querySelector('#rt-q');
      if (q) q.addEventListener('keydown', (e) => { if (e.key === 'Enter') TB.replyTest(el); });
    },
  };
  TB.FAQ = [
    { name: 'Metode pembayaran', keywords: 'bayar, transfer, pembayaran, qris', reply: 'Pembayaran bisa via transfer BCA/Mandiri, QRIS, GoPay, dan OVO. Konfirmasi otomatis setelah pembayaran diterima ✅' },
    { name: 'Lokasi toko', keywords: 'alamat, lokasi, toko, offline', reply: 'Toko offline kami: Jl. Kemang Raya No. 18, Jakarta Selatan. Buka 08.00–21.00 WIB 📍' },
    { name: 'Garansi & retur', keywords: 'retur, rusak, garansi, tukar', reply: 'Produk rusak saat diterima bisa ditukar maksimal 2×24 jam dengan video unboxing. Hubungi admin dengan menyertakan nomor pesanan 🙏' },
  ];
  TB.replyTest = (el) => {
    const q = el.querySelector('#rt-q').value.trim(), acc = el.querySelector('#rt-acc').value, first = el.querySelector('#rt-first').checked, out = el.querySelector('#rt-out');
    if (!q) { el.querySelector('#rt-q').focus(); return; }
    const r = TB.matchRule(q, acc, first);
    const a = TB.acc(acc);
    out.innerHTML = `<div class="tb-bubble" style="align-self:flex-end;border-radius:14px 14px 4px 14px;background:color-mix(in srgb,#2AABEE 16%,var(--color-panel))">${esc(q)}<div class="meta">${TB.time(TB.now())}</div></div>
      ${r ? `<div class="tb-bubble"><div class="from">${esc(a ? a.display_name : '')} · <span style="font-weight:500">${esc(r.name)}</span></div>${esc(r.reply.replace('{nama}', 'Kak'))}<div class="meta">${TB.time(TB.now())}${icon('check-check')}</div></div>` : '<div class="muted" style="font-size:12.5px">Tidak ada aturan aktif untuk akun ini.</div>'}`;
  };
  TB.ruleModal = (id, preset) => {
    const r = id ? S().rules.find((x) => x.id === id) : { type: 'keyword', name: '', keywords: '', reply: '', accounts: S().accounts.filter((a) => a.roles.includes('reply')).map((a) => a.id).join(','), active: true, ...(preset || {}) };
    let type = r.type;
    const accSel = new Set(r.accounts.split(',').filter(Boolean));
    TB.modal({
      icon: 'reply', title: id ? 'Edit aturan balasan' : 'Aturan balasan baru', sub: 'Balasan dikirim saat pelanggan menghubungi akun Anda.', wide: true,
      body: `<div class="tb-stack">
        <div class="tb-field"><label>Jenis aturan</label><div class="tb-btn-group" id="rm-type" style="flex-wrap:wrap">${Object.entries(TB.RT).map(([k, v]) => `<button class="tb-seg ${type === k ? 'is-on' : ''}" data-t="${k}">${v.l}</button>`).join('')}</div></div>
        <div class="tb-form-grid"><div class="tb-field" data-f="rname"><label for="rm-name">Nama aturan</label><input class="tb-input" id="rm-name" value="${esc(r.name)}" placeholder="mis. Info pricelist"><div class="err">Isi nama aturan.</div></div>
          <div class="tb-field" id="rm-kw-f" data-f="rkw"><label for="rm-kw">Kata kunci (pisahkan koma)</label><input class="tb-input" id="rm-kw" value="${esc(r.keywords)}" placeholder="harga, pricelist, berapa"><div class="err">Isi minimal satu kata kunci.</div></div></div>
        <div class="tb-field" data-f="rreply"><label for="rm-reply">Isi balasan</label><textarea class="tb-input" id="rm-reply" rows="5" placeholder="Tulis balasan… gunakan {nama} untuk nama pengirim">${esc(r.reply)}</textarea><div class="err">Balasan minimal 5 karakter.</div></div>
        <div class="tb-field"><label>Berlaku untuk akun</label><div class="tb-row wrap" style="gap:6px" id="rm-acc">${S().accounts.map((a) => `<button class="tb-chip ${accSel.has(a.id) ? 'is-on' : ''}" data-a="${a.id}">@${esc(a.username)}</button>`).join('')}</div></div>
      </div>`,
      foot: `<button class="tb-btn" data-close>Batal</button><button class="tb-btn primary" id="rm-save">${icon('check')}${id ? 'Simpan' : 'Tambah aturan'}</button>`,
      onMount: (box) => {
        const kwf = box.querySelector('#rm-kw-f');
        const sync = () => { kwf.style.display = type === 'keyword' || type === 'faq' ? '' : 'none'; };
        sync();
        box.querySelector('#rm-type').addEventListener('click', (e) => { const b = e.target.closest('[data-t]'); if (!b) return; type = b.dataset.t; box.querySelectorAll('[data-t]').forEach((x) => x.classList.toggle('is-on', x === b)); sync(); });
        box.querySelector('#rm-acc').addEventListener('click', (e) => { const b = e.target.closest('[data-a]'); if (!b) return; accSel.has(b.dataset.a) ? accSel.delete(b.dataset.a) : accSel.add(b.dataset.a); b.classList.toggle('is-on'); });
        box.querySelector('#rm-save').addEventListener('click', () => {
          const name = box.querySelector('#rm-name').value.trim(), kw = box.querySelector('#rm-kw').value.trim(), reply = box.querySelector('#rm-reply').value.trim();
          let ok = true;
          const err = (f) => { box.querySelector(`[data-f="${f}"]`).classList.add('has-err'); ok = false; };
          box.querySelectorAll('.has-err').forEach((x) => x.classList.remove('has-err'));
          if (!name) err('rname'); if ((type === 'keyword' || type === 'faq') && !kw) err('rkw'); if (reply.length < 5) err('rreply');
          if (!ok) return;
          TB.act.saveRule(id, { type, name, keywords: type === 'keyword' || type === 'faq' ? kw : '', reply, accounts: [...accSel].join(','), match: type === 'welcome' ? 'first' : type === 'fallback' ? 'none' : 'contains' });
          TB.closeModal();
        });
      },
    });
  };
})();
