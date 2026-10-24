/* Contest Hub - 静态演示版前端（读取 data/contests.json 快照，无需后端 · 中英双语） */
(function () {
  'use strict';

  var DATA = 'data/contests.json';
  var L = window.CH_I18N;
  var t = L.t;

  var PLATFORMS = {
    codeforces: { key: 'Codeforces', color: 'var(--cf)' },
    atcoder:    { key: 'AtCoder',    color: 'var(--ac)' },
    luogu:      { key: 'plat.luogu', color: 'var(--lg)' },
    daimayuan:  { key: 'plat.daimayuan', color: 'var(--dmy)' }
  };
  var TABS = [
    { k: 'all', key: 'tab.all' },
    { k: 'running', key: 'tab.running' },
    { k: 'upcoming', key: 'tab.upcoming' },
    { k: 'finished', key: 'tab.finished' }
  ];
  var GROUPS = [
    { k: 'running', key: 'grp.running', color: 'var(--run)' },
    { k: 'upcoming', key: 'grp.upcoming', color: 'var(--up)' },
    { k: 'finished', key: 'grp.finished', color: 'var(--tx3)' }
  ];

  var state = {
    data: [],
    plats: { codeforces: true, atcoder: true, luogu: true, daimayuan: true },
    tab: 'all',
    q: ''
  };

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };
  var en = function () { return L.getLang() === 'en'; };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  /* 平台名：Codeforces / AtCoder 在两种语言下相同，洛谷 / 代码源 需要翻译 */
  function platName(p) {
    var d = PLATFORMS[p];
    if (!d) return p;
    return d.key.indexOf('plat.') === 0 ? t(d.key) : d.key;
  }

  function fmtTime(ts) {
    var d = new Date(ts * 1000);
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtDur(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (en()) {
      var dd = Math.floor(h / 24);
      if (dd >= 1) return dd + 'd' + (h % 24 ? ' ' + (h % 24) + 'h' : '');
      return (h ? h + 'h' : '') + (h && m ? ' ' : '') + (m ? m + 'm' : (h ? '' : '0m'));
    }
    if (h >= 24) return Math.floor(h / 24) + '天' + (h % 24 ? (h % 24) + '小时' : '');
    return (h ? h + '小时' : '') + (m ? m + '分钟' : (h ? '' : '0分钟'));
  }

  function countdownText(c, now) {
    if (c.status === 'finished') return { lab: t('cd.ended'), val: fmtTime(c.end), cls: 'fin' };
    if (c.status === 'running') {
      var left = Math.floor(c.end - now);
      var d = Math.floor(left / 86400), h = Math.floor(left % 86400 / 3600),
          m = Math.floor(left % 3600 / 60), s = left % 60;
      return {
        lab: t('cd.left'),
        val: (d ? d + (en() ? 'd ' : '天 ') : '') + pad(h) + ':' + pad(m) + ':' + pad(s),
        cls: 'run'
      };
    }
    var tt = Math.floor(c.start - now);
    var dd = Math.floor(tt / 86400), hh = Math.floor(tt % 86400 / 3600),
        mm = Math.floor(tt % 3600 / 60), ss = tt % 60;
    return {
      lab: t('cd.starts'),
      val: dd > 0 ? dd + (en() ? 'd ' : '天 ') + pad(hh) + ':' + pad(mm) + ':' + pad(ss)
                  : pad(hh) + ':' + pad(mm) + ':' + pad(ss),
      cls: 'up'
    };
  }

  function statusBadge(c) {
    if (c.status === 'running') return '<span class="badge run"><span class="pulse"></span>' + t('st.running') + '</span>';
    if (c.status === 'upcoming') return '<span class="badge up">' + t('st.upcoming') + '</span>';
    return '<span class="badge fin">' + t('st.finished') + '</span>';
  }

  /* ---------------- 渲染 ---------------- */

  function renderStats() {
    var now = Date.now() / 1000;
    var run = state.data.filter(function (c) { return c.status === 'running'; }).length;
    var up = state.data.filter(function (c) { return c.status === 'upcoming'; });
    var w7 = up.filter(function (c) { return c.start - now <= 7 * 86400; }).length;
    var d30 = up.filter(function (c) { return c.start - now <= 30 * 86400; }).length;
    var nearest = up.length ? up[0] : null;

    var nearTxt = nearest ? (t('stat.next') + ' ' + fmtTime(nearest.start)) : t('stat.none');
    var srcOk = 0, srcTotal = 0;
    if (window.__sources) {
      for (var k in window.__sources) { srcTotal++; if (window.__sources[k].ok) srcOk++; }
    }
    var html = [
      card('c-run', t('stat.running'), run, L.plural(run)),
      card('c-cf', t('stat.7d'), w7, L.plural(w7) + ' · ' + nearTxt),
      card('c-ac', t('stat.30d'), d30, L.plural(d30)),
      card('c-lg', t('stat.src'), srcOk + '/' + srcTotal, t('stat.src.u'))
    ].join('');
    $('#stats').innerHTML = html;

    function card(cls, k, v, unit) {
      return '<div class="stat ' + cls + '"><div class="k">' + k + '</div>' +
             '<div class="v">' + v + '<small>' + (unit || '') + '</small></div></div>';
    }
  }

  function renderChips() {
    var html = '';
    Object.keys(PLATFORMS).forEach(function (p) {
      var n = state.data.filter(function (c) {
        return c.platform === p && (c.status === 'upcoming' || c.status === 'running');
      }).length;
      html += '<div class="chip ' + (state.plats[p] ? 'on' : '') + '" data-p="' + p + '">' +
              '<span class="sw"></span>' + platName(p) +
              '<span style="opacity:.6;font-size:11.5px">' + n + '</span></div>';
    });
    $('#platformChips').innerHTML = html;
    Array.prototype.forEach.call(document.querySelectorAll('.chip'), function (el) {
      el.onclick = function () {
        var p = el.getAttribute('data-p');
        state.plats[p] = !state.plats[p];
        renderChips(); renderList();
      };
    });
  }

  function renderTabs() {
    $('#statusTabs').innerHTML = TABS.map(function (tb) {
      return '<div class="tab ' + (state.tab === tb.k ? 'on' : '') + '" data-t="' + tb.k + '">' + t(tb.key) + '</div>';
    }).join('');
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (el) {
      el.onclick = function () {
        state.tab = el.getAttribute('data-t');
        renderTabs(); renderList();
      };
    });
  }

  function cardHTML(c) {
    var now = Date.now() / 1000;
    var cd = countdownText(c, now);
    var p = PLATFORMS[c.platform] || { key: c.platform, color: '#fff' };
    var color = p.color === '#fff' ? '#fff' : p.color;
    var nm = p.color === '#fff' ? p.key : platName(c.platform);
    return '<a class="card ' + c.status + '" style="--pc:' + color + '" href="' + esc(c.url) + '" target="_blank" rel="noopener">' +
      '<div class="plat"><div class="nm">' + nm + '</div><div class="ty">' + esc(c.type || '') + '</div></div>' +
      '<div class="mid"><div class="nm" title="' + esc(c.name) + '">' + esc(c.name) + '</div>' +
      '<div class="meta"><span class="t">' + fmtTime(c.start) + '</span>' +
      '<span>·</span><span>' + fmtDur(c.duration) + '</span>' +
      '<span class="tag">#' + esc(c.id) + '</span></div></div>' +
      '<div class="right">' +
      '<div class="countdown ' + cd.cls + '" data-start="' + c.start + '" data-end="' + c.end + '">' +
      '<div class="lab">' + cd.lab + '</div><div class="val">' + cd.val + '</div></div>' +
      statusBadge(c) +
      '<div class="go"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17L17 7"/><path d="M9 7h8v8"/></svg></div>' +
      '</div></a>';
  }

  function renderList() {
    var q = state.q.trim().toLowerCase();
    var items = state.data.filter(function (c) {
      if (!state.plats[c.platform]) return false;
      if (state.tab !== 'all' && c.status !== state.tab) return false;
      if (q) {
        var hay = (c.name + ' ' + c.id + ' ' + c.type + ' ' + platName(c.platform)).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });

    var groups = GROUPS.map(function (g) { return { k: g.k, key: g.key, color: g.color, arr: [] }; });
    items.forEach(function (c) {
      groups.forEach(function (g) { if (g.k === c.status) g.arr.push(c); });
    });
    groups[1].arr.sort(function (a, b) { return a.start - b.start; });
    groups[2].arr.sort(function (a, b) { return b.start - a.start; });

    var html = '';
    groups.forEach(function (g) {
      if (!g.arr.length) return;
      html += '<div class="group-title" style="color:' + g.color + '"><span class="bar"></span>' +
              t(g.key) + ' <span class="n">' + g.arr.length + L.plural(g.arr.length) + '</span></div>';
      g.arr.forEach(function (c) { html += cardHTML(c); });
    });

    if (!html) {
      html = '<div class="empty">' + t('empty') +
             '<br><span style="font-size:12.5px;opacity:.7">' + t('empty.sub') + '</span></div>';
    }
    $('#list').innerHTML = html;
  }

  function tickCountdown() {
    var now = Date.now() / 1000;
    Array.prototype.forEach.call(document.querySelectorAll('.countdown'), function (el) {
      var start = +el.getAttribute('data-start'), end = +el.getAttribute('data-end');
      var status = now < start ? 'upcoming' : (now < end ? 'running' : 'finished');
      var cd = countdownText({ start: start, end: end, status: status }, now);
      el.className = 'countdown ' + cd.cls;
      el.children[0].textContent = cd.lab;
      el.children[1].textContent = cd.val;
    });
  }

  function renderSources() {
    var s = window.__sources || {};
    var html = '<div class="src">';
    Object.keys(PLATFORMS).forEach(function (p) {
      var d = s[p], ok = d && d.ok, warn = ok && d.error;
      var cls = ok ? (warn ? 's-warn' : 's-ok') : 's-bad';
      var txt = ok ? ((warn ? '⚠ ' : '✓ ') + d.count + L.plural(d.count)) : ('✕ ' + (d ? d.error : t('src.none')));
      html += '<span class="' + cls + '"' + (warn ? ' title="' + esc(d.error) + '"' : '') + '>' +
              platName(p) + ' ' + txt + '</span>';
    });
    html += '</div>';
    $('#srcStatus').innerHTML = html;
  }

  /* ---------------- 语言 ---------------- */

  function setLang(l, reload) {
    L.setLang(l);
    L.apply(document);
    if (!reload) {
      renderSources(); renderStats(); renderChips(); renderTabs(); renderList(); tickCountdown();
    }
  }

  function bindLang() {
    var btn = $('#lang');
    if (!btn) return;
    btn.onclick = function () { setLang(L.toggle(), false); };
  }

  /* ---------------- 数据 ---------------- */

  function load() {
    $('#list').innerHTML = '<div class="loading"><div class="spinner"></div>' + esc(t('loading.snap')) + '</div>';
    fetch(DATA)
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (d.error) throw new Error(d.error);
        window.__sources = d.sources || {};
        state.data = d.contests || [];
        $('#updated').textContent = d.generated_at_str ||
          new Date(d.updated_at * 1000).toLocaleString(en() ? 'en-GB' : 'zh-CN', { hour12: false });
        renderSources(); renderStats(); renderChips(); renderTabs(); renderList(); tickCountdown();
      })
      .catch(function (e) {
        $('#list').innerHTML = '<div class="err">' + t('err.snap') + esc(e.message) +
          '<br>' + t('err.snap.hint') + '</div>';
      });
  }

  $('#search').oninput = function (e) { state.q = e.target.value; renderList(); };

  L.setLang(L.getLang());
  L.apply(document);
  bindLang();
  load();
  setInterval(tickCountdown, 1000);
})();
