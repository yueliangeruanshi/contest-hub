/* Contest Hub - 中英双语词典 (zh / en) */
(function (w) {
  'use strict';

  var D = {
    zh: {
      'doc.title':    'Contest Hub · Codeforces / AtCoder / 洛谷 / 代码源 比赛一览',
      'doc.title.demo': 'Contest Hub · Demo（Codeforces / AtCoder / 洛谷 / 代码源 比赛一览）',
      'brand.sub':    'Codeforces · AtCoder · 洛谷 · 代码源 比赛集中看板',
      'updated':      '更新于',
      'snapshot':     '数据快照',
      'refresh':      '刷新',
      'refresh.t':    '强制刷新',
      'source':       '源码',
      'lang.switch':  'EN',
      'lang.t':       '切换为英文',
      'search.ph':    '搜索比赛名称 / 编号…',
      'tab.all':      '全部',
      'tab.running':  '进行中',
      'tab.upcoming': '即将开始',
      'tab.finished': '已结束',
      'st.running':   '进行中',
      'st.upcoming':  '即将开始',
      'st.finished':  '已结束',
      'grp.running':  '正在进行',
      'grp.upcoming': '即将开始',
      'grp.finished': '已结束',
      'cd.ended':     '已结束',
      'cd.left':      '剩余时间',
      'cd.starts':    '距离开始',
      'stat.running': '正在进行',
      'stat.7d':      '未来 7 天',
      'stat.30d':     '未来 30 天',
      'stat.src':     '数据源',
      'stat.src.u':   '正常',
      'stat.next':    '最近',
      'stat.none':    '暂无',
      'loading':      '正在拉取四个平台的比赛…',
      'loading.snap': '正在读取比赛数据快照…',
      'empty':        '没有符合条件的比赛',
      'empty.sub':    '换个筛选条件，或点右上角刷新试试',
      'err':          '数据加载失败：',
      'err.hint':     '请确认后端已启动（在 contest-hub 目录运行 <code>python server.py</code>，或双击 start.command）。',
      'err.snap':     '快照加载失败：',
      'err.snap.hint':'GitHub Pages 需要通过 http(s) 访问，请勿直接用 file:// 打开 index.html。',
      'src.none':     '未加载',
      'foot.tip':     '数据来自各平台公开接口，缓存 5 分钟 · 点击卡片跳转原站',
      'foot.tip.demo':'数据源：Codeforces API · AtCoder 官方列表 / AtCoder Problems · 洛谷比赛页 · 代码源',
      'notice.demo':  '<strong>静态演示版</strong> · 数据为由 GitHub Actions 定时抓取的快照，<b>每 6 小时自动更新</b>，倒计时仍然实时。' +
                      '想要实时拉取数据，请把仓库 clone 到本地运行 <code>python server.py</code>。',
      'plat.luogu':   '洛谷',
      'plat.daimayuan': '代码源'
    },
    en: {
      'doc.title':    'Contest Hub · Codeforces / AtCoder / Luogu / Daimayuan',
      'doc.title.demo': 'Contest Hub · Demo (Codeforces / AtCoder / Luogu / Daimayuan)',
      'brand.sub':    'Codeforces · AtCoder · Luogu · Daimayuan contests in one board',
      'updated':      'Updated',
      'snapshot':     'Snapshot',
      'refresh':      'Refresh',
      'refresh.t':    'Force refresh',
      'source':       'Source',
      'lang.switch':  '中文',
      'lang.t':       'Switch to Chinese',
      'search.ph':    'Search contest name / ID…',
      'tab.all':      'All',
      'tab.running':  'Running',
      'tab.upcoming': 'Upcoming',
      'tab.finished': 'Finished',
      'st.running':   'Running',
      'st.upcoming':  'Upcoming',
      'st.finished':  'Finished',
      'grp.running':  'Running now',
      'grp.upcoming': 'Upcoming',
      'grp.finished': 'Finished',
      'cd.ended':     'Ended',
      'cd.left':      'Time left',
      'cd.starts':    'Starts in',
      'stat.running': 'Running',
      'stat.7d':      'Next 7 days',
      'stat.30d':     'Next 30 days',
      'stat.src':     'Sources',
      'stat.src.u':   'healthy',
      'stat.next':    'Next',
      'stat.none':    'None',
      'loading':      'Fetching contests from all 4 platforms…',
      'loading.snap': 'Loading the contest snapshot…',
      'empty':        'No contests match the current filters',
      'empty.sub':    'Try other filters, or hit refresh in the top right',
      'err':          'Failed to load data: ',
      'err.hint':     'Make sure the backend is running — run <code>python server.py</code> inside the contest-hub folder, or double-click start.command.',
      'err.snap':     'Failed to load the snapshot: ',
      'err.snap.hint':'GitHub Pages must be served over http(s) — do not open index.html directly with file://.',
      'src.none':     'not loaded',
      'foot.tip':     'Data from public APIs of each platform · cached 5 min · click a card to open the original site',
      'foot.tip.demo':'Sources: Codeforces API · AtCoder contest list / AtCoder Problems · Luogu contests page · Daimayuan',
      'notice.demo':  '<strong>Static demo</strong> — the data is a snapshot refreshed by GitHub Actions <b>every 6 hours</b>, while the countdowns stay live. ' +
                      'For real-time data, clone the repo and run <code>python server.py</code> locally.',
      'plat.luogu':   'Luogu',
      'plat.daimayuan': 'Daimayuan'
    }
  };

  var KEY = 'ch-lang';
  var lang = 'zh';

  try {
    var saved = w.localStorage && w.localStorage.getItem(KEY);
    if (saved === 'en' || saved === 'zh') {
      lang = saved;
    } else if (w.navigator && w.navigator.language && /^en/i.test(w.navigator.language)) {
      lang = 'en';
    }
  } catch (e) { /* localStorage / navigator 不可用时忽略 */ }

  function getLang() { return lang; }

  function t(k) {
    var v = D[lang] && D[lang][k];
    if (v === undefined || v === null) v = D.zh[k];
    return v === undefined || v === null ? k : v;
  }

  /* 英文需要处理单数/复数，中文统一为「场」 */
  function plural(n) {
    if (lang !== 'en') return '场';
    return n === 1 ? ' contest' : ' contests';
  }

  function setLang(l) {
    if (l !== 'zh' && l !== 'en') return;
    lang = l;
    try { w.localStorage.setItem(KEY, l); } catch (e) {}
    try { document.documentElement.lang = (l === 'zh' ? 'zh-CN' : 'en'); } catch (e) {}
  }

  function toggle() {
    setLang(lang === 'zh' ? 'en' : 'zh');
    return lang;
  }

  /* 扫描 data-i18n / data-i18n-html / data-i18n-ph / data-i18n-title 并刷新文案 */
  function apply(root) {
    var scope = root || document;
    each(scope.querySelectorAll('[data-i18n]'), function (el) {
      el.textContent = t(el.getAttribute('data-i18n'));
    });
    each(scope.querySelectorAll('[data-i18n-html]'), function (el) {
      el.innerHTML = t(el.getAttribute('data-i18n-html'));
    });
    each(scope.querySelectorAll('[data-i18n-ph]'), function (el) {
      el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph')));
    });
    each(scope.querySelectorAll('[data-i18n-title]'), function (el) {
      el.setAttribute('title', t(el.getAttribute('data-i18n-title')));
    });
  }

  function each(list, fn) {
    Array.prototype.forEach.call(list, fn);
  }

  w.CH_I18N = {
    getLang: getLang,
    t: t,
    plural: plural,
    setLang: setLang,
    toggle: toggle,
    apply: apply
  };
})(window);
