/* Contest Hub - 前端逻辑 */
(function () {
  'use strict';

  var API = (location.protocol === 'file:') ? 'http://127.0.0.1:8777' : '';

  var PLATFORMS = {
    codeforces: { cn: 'Codeforces', color: 'var(--cf)' },
    atcoder:    { cn: 'AtCoder',    color: 'var(--ac)' },
    luogu:      { cn: '洛谷',       color: 'var(--lg)' },
    daimayuan:  { cn: '代码源',     color: 'var(--dmy)' }
  };
  var TABS = [
    { k: 'all', cn: '全部' },
    { k: 'running', cn: '进行中' },
    { k: 'upcoming', cn: '即将开始' },
    { k: 'finished', cn: '已结束' }
  ];

  var state = {
    data: [],
    plats: { codeforces: true, atcoder: true, luogu: true },
    tab: 'all',
    q: ''
  };

  var $ = function (s) { return document.querySelector(s); };
  var esc = function (s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  };

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function fmtTime(ts) {
    var d = new Date(ts * 1000);
    return pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + ' ' + pad(d.getHours()) + ':' + pad(d.getMinutes());
  }

  function fmtDur(sec) {
    var h = Math.floor(sec / 3600), m = Math.floor((sec % 3600) / 60);
    if (h >= 24) return Math.floor(h / 24) + '天' + (h % 24 ? (h % 24) + '小时' : '');
    return (h ? h + '小时' : '') + (m ? m + '分钟' : (h ? '' : '0分钟'));
  }

  function countdownText(c, now) {
    if (c.status === 'finished') return { lab: '已结束', val: fmtTime(c.end), cls: 'fin' };
    if (c.status === 'running') {
      var left = c.end - now;
      var d = Math.floor(left / 86400), h = Math.floor(left % 86400 / 3600),
          m = Math.floor(left % 3600 / 60), s = left % 60;
      return { lab: '剩余时间', val: (d ? d + '天' : '') + pad(h) + ':' + pad(m) + ':' + pad(s), cls: 'run' };
    }
    var t = c.start - now;
    var dd = Math.floor(t / 86400), hh = Math.floor(t % 86400 / 3600),
        mm = Math.floor(t % 3600 / 60), ss = t % 60;
    return {
      lab: '距离开始',
      val: dd > 0 ? dd + '天 ' + pad(hh) + ':' + pad(mm) + ':' + pad(ss) : pad(hh) + ':' + pad(mm) + ':' + pad(ss),
      cls: 'up'
    };
  }

  function statusBadge(c) {
    if (c.status === 'running') return '<span class="badge run"><span class="pulse"></span>进行中</span>';
    if (c.status === 'upcoming') return '<span class="badge up">即将开始</span>';
    return '<span class="badge fin">已结束</span>';
  }

  /* ---------------- 渲染 ---------------- */

  function renderStats() {
    var now = Date.now() / 1000;
    var run = state.data.filter(function (c) { return c.status === 'running'; }).length;
    var up = state.data.filter(function (c) { return c.status === 'upcoming'; });
    var w7 = up.filter(function (c) { return c.start - now <= 7 * 86400; }).length;
    var d30 = up.filter(function (c) { return c.start - now <= 30 * 86400; }).length;
    var nearest = up.length ? up[0] : null;

    var nearTxt = nearest ? ('最近 ' + fmtTime(nearest.start)) : '暂无';
    var srcOk = 0, srcTotal = 0;
    if (window.__sources) {
      for (var k in window.__sources) { srcTotal++; if (window.__sources[k].ok) srcOk++; }
    }
    var html = [
      card('c-run', '正在进行', run, '场'),
      card('c-cf', '未来 7 天', w7, '场 · ' + nearTxt),
      card('c-ac', '未来 30 天', d30, '场'),
      card('c-lg', '数据源', srcOk + '/' + srcTotal, '正常')
    ].join('');
    $('#stats').innerHTML = html;

    function card(cls, k, v, unit) {
      return '<div class="stat ' + cls + '"><div class="k">' + k + '</div>' +
             '<div class="v">' + v + '<small>' + (unit || '') + '</small></div></div>';
    }
  }

  function renderChips() {
    var now = Date.now() / 1000;
    var html = '';
    Object.keys(PLATFORMS).forEach(function (p) {
      var n = state.data.filter(function (c) {
        return c.platform === p && (c.status === 'upcoming' || c.status === 'running');
      }).length;
      html += '<div class="chip ' + (state.plats[p] ? 'on' : '') + '" data-p="' + p + '">' +
              '<span class="sw"></span>' + PLATFORMS[p].cn +
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
    $('#statusTabs').innerHTML = TABS.map(function (t) {
      return '<div class="tab ' + (state.tab === t.k ? 'on' : '') + '" data-t="' + t.k + '">' + t.cn + '</div>';
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
    var p = PLATFORMS[c.platform] || { cn: c.platform, color: '#fff' };
    return '<a class="card ' + c.status + '" style="--pc:' + p.color + '" href="' + esc(c.url) + '" target="_blank" rel="noopener">' +
      '<div class="plat"><div class="nm">' + p.cn + '</div><div class="ty">' + esc(c.type || '') + '</div></div>' +
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
    var now = Date.now() / 1000;
    var q = state.q.trim().toLowerCase();
    var items = state.data.filter(function (c) {
      if (!state.plats[c.platform]) return false;
      if (state.tab !== 'all' && c.status !== state.tab) return false;
      if (q) {
        var hay = (c.name + ' ' + c.id + ' ' + c.type + ' ' + PLATFORMS[c.platform].cn).toLowerCase();
        if (hay.indexOf(q) < 0) return false;
      }
      return true;
    });

    var groups = [
      { k: 'running', cn: '正在进行', color: 'var(--run)', arr: [] },
      { k: 'upcoming', cn: '即将开始', color: 'var(--up)', arr: [] },
      { k: 'finished', cn: '已结束', color: 'var(--tx3)', arr: [] }
    ];
    items.forEach(function (c) {
      groups.forEach(function (g) { if (g.k === c.status) g.arr.push(c); });
    });
    groups[1].arr.sort(function (a, b) { return a.start - b.start; });
    groups[2].arr.sort(function (a, b) { return b.start - a.start; });

    var html = '';
    groups.forEach(function (g) {
      if (!g.arr.length) return;
      html += '<div class="group-title" style="color:' + g.color + '"><span class="bar"></span>' +
              g.cn + '<span class="n">' + g.arr.length + ' 场</span></div>';
      g.arr.forEach(function (c) { html += cardHTML(c); });
    });

    if (!html) {
      html = '<div class="empty">没有符合条件的比赛<br><span style="font-size:12.5px;opacity:.7">换个筛选条件，或点右上角刷新试试</span></div>';
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
      var txt = ok ? ((warn ? '⚠ ' : '✓ ') + d.count + ' 场') : ('✕ ' + (d ? d.error : '未加载'));
      html += '<span class="' + cls + '"' + (warn ? ' title="' + esc(d.error) + '"' : '') + '>' +
              PLATFORMS[p].cn + ' ' + txt + '</span>';
    });
    html += '</div>';
    $('#srcStatus').innerHTML = html;
  }

  /* ---------------- 数据 ---------------- */

  function load(force) {
    var btn = $('#refresh');
    btn.classList.add('spin');
    $('#list').innerHTML = '<div class="loading"><div class="spinner"></div>正在拉取三个平台的比赛…</div>';
    fetch(API + '/api/contests' + (force ? '?refresh=1' : ''))
      .then(function (r) { return r.json(); })
      .then(function (d) {
        btn.classList.remove('spin');
        if (d.error) throw new Error(d.error);
        window.__sources = d.sources || {};
        state.data = d.contests || [];
        $('#updated').textContent = new Date(d.updated_at * 1000).toLocaleTimeString('zh-CN', { hour12: false });
        renderSources(); renderStats(); renderChips(); renderTabs(); renderList();
      })
      .catch(function (e) {
        btn.classList.remove('spin');
        $('#list').innerHTML = '<div class="err">数据加载失败：' + esc(e.message) +
          '<br>请确认后端已启动（在 contest-hub 目录运行 <code>python server.py</code>，或双击 start.command）。</div>';
      });
  }

  $('#refresh').onclick = function () { load(true); };
  $('#search').oninput = function (e) { state.q = e.target.value; renderList(); };

  load(false);
  setInterval(tickCountdown, 1000);
  setInterval(function () { if (!$('#refresh').classList.contains('spin')) load(false); }, 300000);
})();
