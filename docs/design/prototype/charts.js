/* TeleBlast — chart primitives (d3 v7) */
(() => {
  const TB = window.TB;
  const C = (TB.chart = {});
  TB.COL = { tg: '#2AABEE', tg2: '#1E88D6', violet: '#7C6CF2', ok: 'var(--color-ok)', bad: 'var(--color-bad)', warn: 'var(--color-warn)', muted: 'color-mix(in srgb, var(--color-fg-muted) 38%, transparent)' };

  const measure = (svg, texts) => {
    const t = svg.append('text').attr('class', 'lbl').style('font-size', '11px');
    let w = 0;
    texts.forEach((s) => { t.text(s); w = Math.max(w, t.node().getComputedTextLength()); });
    t.remove();
    return w;
  };
  const tipEl = (el) => {
    let t = el.querySelector(':scope > .tb-tip');
    if (!t) { t = document.createElement('div'); t.className = 'tb-tip'; el.appendChild(t); }
    return t;
  };
  const placeTip = (el, tip, x, y) => {
    const w = tip.offsetWidth, h = tip.offsetHeight, W = el.clientWidth;
    let left = x + 14; if (left + w > W) left = x - w - 14; if (left < 0) left = Math.max(0, Math.min(W - w, x - w / 2));
    tip.style.left = left + 'px';
    tip.style.top = Math.max(-8, y - h / 2) + 'px';
  };
  const tipHTML = (title, rows) => `<div class="tt-h">${TB.esc(title)}</div>` + rows.map(([lab, val, col]) =>
    `<div class="tt-r"><span>${col ? `<i class="sw" style="background:${col}"></i>` : ''}${TB.esc(lab)}</span><b>${TB.esc(val)}</b></div>`).join('');
  const roundTop = (x, y, w, h, r) => {
    if (h <= 0) return '';
    r = Math.min(r, w / 2, h);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  };

  /* Bars: counts per period, optionally stacked */
  C.bars = (el, o) => {
    const W = el.clientWidth; if (!W) return;
    const H = o.height || 240;
    el.style.minHeight = H + 'px';
    el.querySelectorAll('svg').forEach((s) => s.remove());
    const rows = o.rows || [];
    const svg = d3.select(el).insert('svg', ':first-child').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
    const tot = (r) => o.series.reduce((a, s) => a + (+r[s.key] || 0), 0);
    const max = d3.max(rows, (r) => (o.stacked ? tot(r) : d3.max(o.series, (s) => +r[s.key] || 0))) || 1;
    const y = d3.scaleLinear([0, max * 1.08], [H - 26, 8]).nice(4);
    const yt = y.ticks(4), yf = o.yFmt || TB.c;
    const ml = Math.ceil(measure(svg, yt.map(yf))) + 12, mr = 6;
    const x = d3.scaleBand(rows.map((_, i) => i), [ml, W - mr]).paddingInner(o.pad ?? 0.3).paddingOuter(0.15);
    svg.append('g').attr('class', 'grid').selectAll('line').data(yt).join('line')
      .attr('x1', ml).attr('x2', W - mr).attr('y1', (d) => y(d) + 0.5).attr('y2', (d) => y(d) + 0.5);
    svg.append('g').selectAll('text').data(yt).join('text').attr('class', 'lbl')
      .attr('x', ml - 10).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').text(yf);
    const band = svg.append('g');
    const hov = band.append('rect').attr('class', 'hov-band').attr('rx', 6).style('opacity', 0);
    const bw = Math.min(x.bandwidth(), o.maxBar || 30), off = (x.bandwidth() - bw) / 2;
    const g = svg.append('g');
    rows.forEach((r, i) => {
      const x0 = x(i) + off;
      if (o.stacked) {
        let acc = 0;
        const segs = o.series.filter((s) => (+r[s.key] || 0) > 0);
        segs.forEach((s, k) => {
          const v = +r[s.key] || 0, y1 = y(acc + v), y0 = y(acc);
          const isTop = k === segs.length - 1;
          g.append('path').attr('class', 'bar').attr('data-i', i)
            .attr('d', isTop ? roundTop(x0, y1, bw, y0 - y1, 4) : `M${x0},${y0}V${y1}H${x0 + bw}V${y0}Z`)
            .style('fill', s.color);
          acc += v;
        });
      } else {
        const n = o.series.length, sw = bw / n;
        o.series.forEach((s, k) => {
          const v = r[s.key];
          if (v == null) return;
          g.append('path').attr('class', 'bar').attr('data-i', i)
            .attr('d', roundTop(x0 + k * sw + (n > 1 ? 1 : 0), y(+v || 0), sw - (n > 1 ? 2 : 0), y(0) - y(+v || 0), 4))
            .style('fill', typeof s.color === 'function' ? s.color(r, i) : s.color);
        });
      }
    });
    // x labels: as many as fit
    const xf = o.xFmt || ((r) => r.label);
    const labels = rows.map(xf);
    const lw = measure(svg, labels) + 10;
    const every = Math.max(1, Math.ceil(lw / x.step()));
    svg.append('g').selectAll('text').data(rows.map((r, i) => i).filter((i) => (rows.length - 1 - i) % every === 0)).join('text')
      .attr('class', 'lbl').attr('x', (i) => x(i) + x.bandwidth() / 2).attr('y', H - 6).attr('text-anchor', 'middle').text((i) => labels[i]);
    // hover
    const tip = tipEl(el);
    svg.append('g').selectAll('rect').data(rows.map((_, i) => i)).join('rect')
      .attr('x', (i) => x(i) - (x.step() - x.bandwidth()) / 2).attr('width', x.step()).attr('y', 0).attr('height', H - 20).style('fill', 'transparent')
      .on('mousemove', (ev, i) => {
        const r = rows[i];
        hov.style('opacity', 1).attr('x', x(i) - 3).attr('width', x.bandwidth() + 6).attr('y', 4).attr('height', H - 28);
        g.selectAll('.bar').style('opacity', function () { return +this.dataset.i === i ? 1 : 0.45; });
        const lines = o.series.map((s) => [s.label, r[s.key] == null ? '—' : TB.n(r[s.key]), typeof s.color === 'function' ? s.color(r, i) : s.color]);
        tip.innerHTML = tipHTML(o.tipTitle ? o.tipTitle(r) : labels[i], lines.concat(o.tipExtra ? o.tipExtra(r) : []));
        tip.classList.add('on');
        const [mx, my] = d3.pointer(ev, el);
        placeTip(el, tip, mx, my);
      })
      .on('mouseleave', () => { hov.style('opacity', 0); g.selectAll('.bar').style('opacity', 1); tip.classList.remove('on'); });
  };

  /* Lines: rates or several series over time, drawn point to point */
  C.lines = (el, o) => {
    const W = el.clientWidth; if (!W) return;
    const H = o.height || 240;
    el.style.minHeight = H + 'px';
    el.querySelectorAll('svg').forEach((s) => s.remove());
    const rows = o.rows || [];
    const svg = d3.select(el).insert('svg', ':first-child').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`);
    const vals = rows.flatMap((r) => o.series.map((s) => +r[s.key])).filter(Number.isFinite);
    const dom = o.yDomain || [Math.min(0, d3.min(vals)), d3.max(vals) * 1.08 || 1];
    const y = d3.scaleLinear(dom, [H - 26, 10]).nice(4);
    const yt = y.ticks(4), yf = o.yFmt || TB.c;
    const endLab = o.series.map((s) => s.label + ' ' + yf(rows.length ? +rows[rows.length - 1][s.key] : 0));
    const ml = Math.ceil(measure(svg, yt.map(yf))) + 12;
    const mr = o.endLabels ? Math.min(W * 0.35, Math.ceil(measure(svg, endLab)) + 14) : 10;
    const xs = rows.map(o.x);
    const x = d3.scaleUtc(d3.extent(xs), [ml, W - mr]);
    svg.append('g').attr('class', 'grid').selectAll('line').data(yt).join('line')
      .attr('x1', ml).attr('x2', W - mr).attr('y1', (d) => y(d) + 0.5).attr('y2', (d) => y(d) + 0.5);
    svg.append('g').selectAll('text').data(yt).join('text').attr('class', 'lbl')
      .attr('x', ml - 10).attr('y', (d) => y(d)).attr('dy', '0.32em').attr('text-anchor', 'end').text(yf);
    const xfmt = o.xFmt || TB.dshort;
    const lw = measure(svg, xs.map(xfmt)) + 18;
    const nt = Math.max(2, Math.floor((W - ml - mr) / lw));
    svg.append('g').selectAll('text').data(x.ticks(Math.min(nt, rows.length))).join('text').attr('class', 'lbl')
      .attr('x', (d) => x(d)).attr('y', H - 6).attr('text-anchor', 'middle').text(xfmt);
    const uid = 'g' + Math.random().toString(36).slice(2, 8);
    const defs = svg.append('defs');
    o.series.forEach((s, k) => {
      const line = d3.line().defined((r) => Number.isFinite(+r[s.key])).x((r) => x(o.x(r))).y((r) => y(+r[s.key]));
      if (o.area && k === 0) {
        const gr = defs.append('linearGradient').attr('id', uid + k).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
        [[0, 0.26], [0.25, 0.16], [0.5, 0.08], [0.75, 0.03], [1, 0]].forEach(([of, op]) => gr.append('stop').attr('offset', of).style('stop-color', s.color).style('stop-opacity', op));
        const area = d3.area().defined((r) => Number.isFinite(+r[s.key])).x((r) => x(o.x(r))).y0(y(dom[0] < 0 ? 0 : y.domain()[0])).y1((r) => y(+r[s.key]));
        svg.append('path').datum(rows).attr('d', area).style('fill', `url(#${uid}${k})`);
      }
      svg.append('path').datum(rows).attr('d', line).style('fill', 'none').style('stroke', s.color).style('stroke-width', 2)
        .style('stroke-linecap', 'round').style('stroke-linejoin', 'round').style('stroke-dasharray', s.dash || null);
    });
    if (o.endLabels && rows.length) {
      const last = rows[rows.length - 1];
      const ys = o.series.map((s) => y(+last[s.key]));
      // keep end labels apart
      const order = ys.map((v, i) => i).sort((a, b) => ys[a] - ys[b]);
      for (let k = 1; k < order.length; k++) if (ys[order[k]] - ys[order[k - 1]] < 14) ys[order[k]] = ys[order[k - 1]] + 14;
      o.series.forEach((s, k) => svg.append('text').attr('class', 'lbl').attr('x', W - mr + 8).attr('y', ys[k]).attr('dy', '0.32em')
        .style('fill', s.color).style('font-weight', 600).text(endLab[k]));
    }
    const rule = svg.append('line').attr('y1', 8).attr('y2', H - 24).style('stroke', 'var(--color-border-line)').style('opacity', 0);
    const dots = o.series.map((s) => svg.append('circle').attr('r', 4).style('fill', s.color).style('stroke', 'var(--color-panel)').style('stroke-width', 2).style('opacity', 0));
    const tip = tipEl(el);
    const bis = d3.bisector((d) => d).center;
    svg.append('rect').attr('x', ml).attr('width', Math.max(0, W - ml - mr)).attr('y', 0).attr('height', H - 20).style('fill', 'transparent')
      .on('mousemove', (ev) => {
        const [mx] = d3.pointer(ev);
        const i = bis(xs, x.invert(mx)); const r = rows[i]; if (!r) return;
        const px = x(xs[i]);
        rule.attr('x1', px).attr('x2', px).style('opacity', 1);
        o.series.forEach((s, k) => dots[k].attr('cx', px).attr('cy', y(+r[s.key])).style('opacity', Number.isFinite(+r[s.key]) ? 1 : 0));
        tip.innerHTML = tipHTML(o.tipTitle ? o.tipTitle(r) : TB.date(xs[i], { weekday: 'short', day: 'numeric', month: 'short' }),
          o.series.map((s) => [s.label, yf(+r[s.key]), s.color]).concat(o.tipExtra ? o.tipExtra(r) : []));
        tip.classList.add('on');
        const [ex, ey] = d3.pointer(ev, el);
        placeTip(el, tip, ex, ey);
      })
      .on('mouseleave', () => { rule.style('opacity', 0); dots.forEach((d) => d.style('opacity', 0)); tip.classList.remove('on'); });
  };

  /* Sparkline */
  C.spark = (el, values, color = TB.COL.tg) => {
    const W = el.clientWidth, H = el.clientHeight || 36; if (!W || !values.length) return;
    el.innerHTML = '';
    const svg = d3.select(el).append('svg').attr('width', '100%').attr('height', H).attr('viewBox', `0 0 ${W} ${H}`).attr('preserveAspectRatio', 'none');
    const x = d3.scaleLinear([0, values.length - 1], [2, W - 2]);
    const y = d3.scaleLinear([d3.min(values) * 0.92, d3.max(values) * 1.04 || 1], [H - 2, 3]);
    const uid = 's' + Math.random().toString(36).slice(2, 8);
    const gr = svg.append('defs').append('linearGradient').attr('id', uid).attr('x1', 0).attr('x2', 0).attr('y1', 0).attr('y2', 1);
    [[0, 0.22], [0.5, 0.07], [1, 0]].forEach(([of, op]) => gr.append('stop').attr('offset', of).style('stop-color', color).style('stop-opacity', op));
    svg.append('path').attr('d', d3.area().x((_, i) => x(i)).y0(H).y1((v) => y(v))(values)).style('fill', `url(#${uid})`);
    svg.append('path').attr('d', d3.line().x((_, i) => x(i)).y((v) => y(v))(values)).style('fill', 'none').style('stroke', color).style('stroke-width', 1.75).style('stroke-linejoin', 'round').style('stroke-linecap', 'round');
    svg.append('circle').attr('cx', x(values.length - 1)).attr('cy', y(values[values.length - 1])).attr('r', 2.6).style('fill', color);
  };
})();
