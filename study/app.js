/* 智学消防：静态部署，不需要账号或后端。 */
(() => {
  'use strict';
  const REPO_BANK = 'https://2010153875qq.github.io/zhixue-fire/study/data/questions.json';
  const STORAGE = { progress: 'fire-study-v2-progress', imported: 'fire-study-v2-imported' };
  const $ = (s, p = document) => p.querySelector(s);
  const escape = value => String(value == null ? '' : value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const typeNames = { single: '单选题', multiple: '多选题', judge: '判断题' };
  const emptyProgress = () => ({ attempts: {}, wrong: {}, exams: [] });
  let progress = read(STORAGE.progress, emptyProgress());
  if (!progress || typeof progress !== 'object' || Array.isArray(progress)) progress = emptyProgress();
  progress.attempts = progress.attempts && typeof progress.attempts === 'object' ? progress.attempts : {};
  progress.wrong = progress.wrong && typeof progress.wrong === 'object' ? progress.wrong : {};
  progress.exams = Array.isArray(progress.exams) ? progress.exams : [];
  let db = { questions: [], videos: [] };
  let page = 'home', filter = 'all', chapter = 'all', position = 0, selected = [], feedback = null;
  let dataLabel = '正在加载题库', dataWarning = '', bankBase = new URL('.', location.href).href;
  let exam = null, examReview = null, timer = null;
  let toastTimer;

  function read(key, fallback) { try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (_) { return fallback; } }
  function write(key, value) { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { toast('本机保存失败，请检查 Safari 存储空间或隐私设置'); return false; } }
  function toast(message) { const box = $('#toast'); box.textContent = message; box.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => box.classList.remove('show'), 3200); }
  function counts() {
    const ids = new Set(db.questions.map(q => q.id));
    const answered = Object.keys(progress.attempts).filter(k => ids.has(k)).length;
    const wrong = Object.keys(progress.wrong).filter(k => ids.has(k)).length;
    let graded = 0, right = 0;
    for (const [id, a] of Object.entries(progress.attempts)) if (ids.has(id)) { graded += Number(a.graded || 0); right += Number(a.right || 0); }
    return { all: db.questions.length, answered, wrong, graded, right, recorded: db.questions.filter(q => q.answerStatus === 'recorded').length, verified: db.questions.filter(q => q.answerStatus === 'verified').length, pending: db.questions.filter(q => q.answerStatus === 'pending_review').length };
  }
  function normalizeAnswer(value) {
    if (value === true) return ['A'];
    if (value === false) return ['B'];
    if (Array.isArray(value)) return value.map(x => String(x).trim().toUpperCase()).filter(Boolean).sort();
    if (value == null || value === '') return [];
    let s = String(value).trim().toUpperCase();
    if (s === '正确' || s === '对') return ['A'];
    if (s === '错误' || s === '错') return ['B'];
    if (/^[A-Z]+$/.test(s)) return s.split('').sort();
    return s.split(/[、,，;；\s]+/).filter(Boolean).sort();
  }
  function parseBank(raw) {
    const src = Array.isArray(raw) ? { questions: raw, videos: [] } : raw;
    if (!src || typeof src !== 'object' || !Array.isArray(src.questions)) throw Error('JSON 必须包含 questions 数组，或直接使用题目数组。');
    if (src.videos != null && !Array.isArray(src.videos)) throw Error('videos 必须是数组。');
    const ids = new Set();
    const questions = src.questions.map((item, index) => {
      const n = index + 1;
      if (!item || typeof item !== 'object' || Array.isArray(item)) throw Error('第 ' + n + ' 题不是对象。');
      const id = String(item.id || '').trim();
      if (!id || ids.has(id) || ['__proto__','constructor','prototype'].includes(id)) throw Error('第 ' + n + ' 题的 id 缺失、重复或不可用。');
      ids.add(id);
      if (!typeNames[item.type]) throw Error('第 ' + n + ' 题的 type 必须是 single、multiple 或 judge。');
      if (!String(item.question || '').trim()) throw Error('第 ' + n + ' 题缺少题干。');
      let values;
      if (Array.isArray(item.options)) values = item.options.map(x => String(x));
      else if (item.options && typeof item.options === 'object') values = Object.entries(item.options).sort(([a],[b]) => a.localeCompare(b)).map(([k,v]) => k + '. ' + v);
      else if (item.type === 'judge') values = ['正确', '错误'];
      else throw Error('第 ' + n + ' 题缺少 options。');
      if (values.length < 2 || values.length > 26 || values.some(x => !x.trim())) throw Error('第 ' + n + ' 题选项必须为 2–26 个非空文本。');
      const options = values.map((v, i) => ({ key: String.fromCharCode(65 + i), text: v.replace(/^\s*[A-Z][.、:：)）]\s*/i, '') }));
      if (options.some(x => !x.text.trim())) throw Error('第 ' + n + ' 题的选项文字不能为空。');
      let status = item.answerStatus;
      if (!status) status = item.independentVerified === true ? 'verified' : item.scoreable === true && item.answer ? 'recorded' : 'pending_review';
      if (!['verified', 'recorded', 'pending_review'].includes(status)) throw Error('第 ' + n + ' 题的 answerStatus 不合法。');
      const answer = normalizeAnswer(item.answer);
      if (status !== 'pending_review') {
        if (!answer.length || new Set(answer).size !== answer.length || answer.some(x => !options.some(o => o.key === x))) throw Error('第 ' + n + ' 题参考答案无效。');
        if ((item.type === 'single' || item.type === 'judge') && answer.length !== 1) throw Error('第 ' + n + ' 题必须只有一个答案。');
      }
      return { id, type: item.type, question: String(item.question), options, answer, answerStatus: status,
        chapter: String(item.chapter || item.topic || item.category || '未分类'), explanation: String(item.explanation || ''),
        reviewNote: String(item.reviewNote || item.notes || ''), source: String(item.source || ''), answerEvidence: String(item.answerEvidence || ''), recordedAnswer: normalizeAnswer(item.recordedAnswer) };
    });
    const videos = (src.videos || []).map(v => ({ id: String(v.id || ''), title: String(v.title || '未命名课程'), path: String(v.path || v.url || ''), status: String(v.status || ''), description: String(v.description || '') }));
    return { questions, videos, title: String(src.title || '') };
  }
  async function getJSON(url) {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeout = setTimeout(() => controller && controller.abort(), 5000);
    try { const r = await fetch(url, { cache: 'no-store', ...(controller ? { signal: controller.signal } : {}) }); if (!r.ok) throw Error('HTTP ' + r.status); return parseBank(await r.json()); }
    finally { clearTimeout(timeout); }
  }
  async function loadBank() {
    const imported = read(STORAGE.imported, null);
    if (imported) {
      try { db = parseBank(imported); dataLabel = '本机导入题库'; bankBase = new URL('.', location.href).href; render(); return; }
      catch (_) { dataWarning = '本机导入的题库无法读取，已尝试加载在线题库。'; }
    }
    const atGitHub = location.hostname === '2010153875qq.github.io';
    if (!atGitHub && /^https?:$/.test(location.protocol)) {
      try { db = await getJSON(REPO_BANK); dataLabel = 'GitHub Pages 最新题库'; bankBase = REPO_BANK.replace(/data\/questions\.json$/, ''); render(); return; }
      catch (_) { dataWarning = '无法读取 GitHub 最新题库，当前显示网站内置快照。'; }
    }
    try { db = await getJSON('data/questions.json'); dataLabel = atGitHub ? 'GitHub Pages 题库' : '网站内置快照'; bankBase = new URL('.', location.href).href; }
    catch (e) { db = { questions: [], videos: [] }; dataLabel = '题库加载失败'; dataWarning = '无法加载题库文件：' + e.message + '。可在管理中导入 JSON。'; }
    render();
  }
  function save() { write(STORAGE.progress, progress); }
  function statusBadge(q) { return q.answerStatus === 'verified' ? '<span class="badge">已核验</span>' : q.answerStatus === 'recorded' ? '<span class="badge recorded">录屏参考 · 待独立复核</span>' : '<span class="badge pending">待复核 · 不计分</span>'; }
  function pageHead(kicker, title, description) { return `<div class="page-head"><div class="eyebrow">${escape(kicker)}</div><h1>${escape(title)}</h1><p>${escape(description)}</p></div>`; }
  function empty(title, copy, button) { return `<div class="empty-card"><div class="empty-icon">✧</div><h3>${escape(title)}</h3><p>${escape(copy)}</p>${button ? `<div class="actions" style="justify-content:center">${button}</div>` : ''}</div>`; }
  function home() {
    const c = counts(), pct = c.all ? Math.round(c.answered / c.all * 100) : 0;
    return `${pageHead('YOUR STUDY SPACE','今天，也向前一步。','把知识点练熟，把每一次进步都记下来。')}
      <div class="home-grid"><section class="hero"><span class="hero-label">FIREFIGHTING STUDY · 中级监控</span><h2>每一次练习，<br>都是底气。</h2><p>按题型、章节循序练习。错题自动记录，<br>让复习更有方向。</p><button class="button light" data-go="practice">开始练习 <span>↗</span></button></section>
      <section class="overview"><div class="over-top"><h3>学习概览</h3><small>保存在当前设备</small></div><div class="progress-area"><div class="ring" style="--pct:${pct}"><span>${pct}<small>%</small></span></div><div class="over-info"><strong>${c.answered} <small>/ ${c.all}</small></strong><br>已练习不同题目<br>进度随每次提交更新</div></div><div class="mini-stats"><div><strong>${c.all}</strong><span>当前题目</span></div><div><strong>${c.wrong}</strong><span>错题待复习</span></div><div><strong>${c.graded ? Math.round(c.right / c.graded * 100) + '%' : '—'}</strong><span>参考正确率</span></div></div></section></div>
      <div class="section-title"><h2>从这里开始</h2><span class="more">选择你的学习方式</span></div><div class="quick-grid">
      <button class="quick" data-go="practice"><span class="iconbox">▤</span><b>题型练习</b><small>单选、多选与判断</small></button>
      <button class="quick" data-action="chapters"><span class="iconbox">▥</span><b>章节练习</b><small>按知识点逐一掌握</small></button>
      <button class="quick" data-go="exam"><span class="iconbox">◷</span><b>模拟练习</b><small>限时训练答题节奏</small></button>
      <button class="quick" data-go="wrong"><span class="iconbox">♡</span><b>错题复习</b><small>回头看看易错点</small></button></div>
      <div class="section-title"><h2>学习提示</h2><small>真实数据 · 谨慎判分</small></div><div class="home-bottom">
      <div class="notice-card"><span class="notice-symbol">!</span><div><b>答案状态会清楚标注</b><p>现有 ${c.recorded} 道录屏参考答案尚未独立核对现行标准；${c.pending} 道待复核题不自动判分。${c.verified ? `另有 ${c.verified} 道已核验题。` : ''}</p></div></div>
      <div class="notice-card"><span class="notice-symbol">◌</span><div><b>学习记录留在本机</b><p>建议在「管理」中定期备份。更换浏览器、设备或清除网站数据后，记录不会自动同步。</p></div></div></div>
      <div class="source-line">${escape(dataLabel)}${dataWarning ? ' · ' + escape(dataWarning) : ''}<br><a href="https://2010153875qq.github.io/zhixue/">返回综合学习站 ↗</a></div>`;
  }
  function pool() { let arr = db.questions; if (filter !== 'all') arr = arr.filter(q => q.type === filter); if (chapter !== 'all') arr = arr.filter(q => q.chapter === chapter); return arr; }
  function optionsHtml(q, picked, disabled) { return `<div class="options">${q.options.map(o => `<label class="option ${picked.includes(o.key) ? 'selected' : ''}"><input ${q.type === 'multiple' ? 'type="checkbox"' : 'type="radio"'} name="answer" value="${escape(o.key)}" ${picked.includes(o.key) ? 'checked' : ''} ${disabled ? 'disabled' : ''}><span class="option-label">${escape(o.key)}</span><span>${escape(o.text)}</span></label>`).join('')}</div>`; }
  function explanation(q) { return q.explanation ? escape(q.explanation) : '原资料暂无解析，待补充。'; }
  function resultHtml(q, f) {
    if (!f) return '';
    if (q.answerStatus === 'pending_review') return `<div class="result pending"><b>已记录练习 · 本题暂不判分</b><p>${escape(q.reviewNote || '答案尚待核对。')}${q.recordedAnswer.length ? '<br>原资料记录选项：' + escape(q.recordedAnswer.join('、')) + '（不作为判分依据）' : ''}</p><p>解析：${explanation(q)}</p></div>`;
    return `<div class="result ${f.ok ? '' : 'bad'}"><b>${f.ok ? '回答正确' : '再复习一下'} · ${q.answerStatus === 'recorded' ? '按录屏参考答案' : '按已核验答案'}</b><p>你的答案：${escape(f.picked.join('、'))}　参考答案：${escape(q.answer.join('、'))}</p><p>解析：${explanation(q)}</p>${q.answerStatus === 'recorded' ? '<p>录屏整理答案尚未逐题独立核对现行标准。</p>' : ''}</div>`;
  }
  function practice() {
    const arr = pool(); position = Math.max(0, Math.min(position, Math.max(0, arr.length - 1)));
    const chapters = [...new Set(db.questions.map(q => q.chapter))].sort((a,b) => a.localeCompare(b, 'zh-CN'));
    const filters = [['all','全部'],['single','单选'],['multiple','多选'],['judge','判断']];
    let html = pageHead('PRACTICE','专注练习','选择题型或章节，每次掌握一个知识点。') + `<div class="filter-bar">${filters.map(([v,l]) => `<button class="chip ${filter === v ? 'active' : ''}" data-filter="${v}">${l} ${v === 'all' ? db.questions.length : db.questions.filter(q => q.type === v).length}</button>`).join('')}</div><div class="chapter-bar"><label for="chapter">练习章节</label><select id="chapter"><option value="all">全部章节</option>${chapters.map(c => `<option value="${escape(c)}" ${chapter === c ? 'selected' : ''}>${escape(c)}</option>`).join('')}</select></div>`;
    if (!arr.length) return html + empty('这里还没有题目','可切换题型或在管理中导入真实题库。','<button class="button soft" data-action="settings">管理题库</button>');
    const q = arr[position];
    return html + `<article class="card question"><div class="question-top"><div>${statusBadge(q)} <span class="badge">${escape(typeNames[q.type])}</span></div><span class="question-number">${position + 1} / ${arr.length}</span></div><h2>${escape(q.question)}</h2><p class="hint">${escape(q.chapter)} · ${q.type === 'multiple' ? '可选择多个答案' : '请选择一个答案'}</p>${optionsHtml(q,selected,!!feedback)}<div class="actions"><button class="button" data-action="submit-practice" ${feedback ? 'disabled' : ''}>提交答案</button><button class="button outline" data-action="speak">♫ 朗读</button>${feedback ? '<button class="button soft" data-action="retry">再做一次</button>' : ''}</div>${resultHtml(q,feedback)}</article><div class="qnav"><button data-action="prev" ${position === 0 ? 'disabled' : ''}>← 上一题</button><span class="fine">${escape(q.id)}</span><button data-action="next" ${position >= arr.length - 1 ? 'disabled' : ''}>下一题 →</button></div>`;
  }
  function chaptersView() {
    const chapters = [...new Set(db.questions.map(q => q.chapter))].sort((a,b) => a.localeCompare(b,'zh-CN'));
    return pageHead('CHAPTERS','章节练习','选择一个知识点，按自己的节奏学习。') + (chapters.length ? `<div class="chapter-list">${chapters.map(c => `<button class="chapter" data-chapter="${escape(c)}"><b>${escape(c)}</b><small>${db.questions.filter(q => q.chapter === c).length} 题　↗</small></button>`).join('')}</div>` : empty('暂无章节','导入题库后会按 chapter 自动分类。'));
  }
  function examView() {
    if (examReview) return examResult();
    if (!exam) {
      const c = counts(), available = c.verified + c.recorded;
      return pageHead('MOCK PRACTICE','模拟练习','用一次限时练习，检查自己的掌握情况。') + `<section class="exam-hero"><div class="iconbox">◷</div><h2>准备好了吗？</h2><p>仅抽取已核验题与原资料可计分的录屏参考题。待复核且不可判分的题目不会进入试卷；参考成绩不代表正式考试成绩。</p><div class="exam-stats"><div><b>${available}</b><span>可用题目</span></div><div><b>${c.pending}</b><span>待复核排除</span></div><div><b>60 分钟</b><span>练习时间</span></div></div><label class="exam-select" for="exam-size">抽取题数 <select id="exam-size"><option value="10">10 题</option><option value="20">20 题</option><option value="50" selected>最多 50 题</option><option value="9999">全部可用题</option></select></label><button class="button" data-action="start-exam" ${available ? '' : 'disabled'}>开始模拟练习 →</button></section>${available ? '' : '<p class="help">当前没有可用于判分的题目，请先导入已核验题目。</p>'}`;
    }
    const q = exam.questions[exam.index]; const chosen = exam.answers[q.id] || [];
    return pageHead('MOCK PRACTICE','模拟练习中','逐题作答，交卷后查看结果和解析。') + `<article class="card question"><div class="question-top"><div>${statusBadge(q)} <span class="badge">${escape(typeNames[q.type])}</span></div><span class="exam-clock" id="clock">${clock()}</span></div><h2>${escape(q.question)}</h2><p class="hint">第 ${exam.index + 1} / ${exam.questions.length} 题 · 已答 ${Object.keys(exam.answers).filter(k => exam.answers[k].length).length} 题</p>${optionsHtml(q,chosen,false)}<div class="actions"><button class="button outline" data-action="speak">♫ 朗读</button><button class="button orange" data-action="finish-exam">交卷并查看结果</button></div></article><div class="qnav"><button data-action="exam-prev" ${exam.index === 0 ? 'disabled' : ''}>← 上一题</button><button data-action="exam-next" ${exam.index >= exam.questions.length - 1 ? 'disabled' : ''}>下一题 →</button></div><p class="fine" style="text-align:center">离开本页面会结束未交卷的练习。</p>`;
  }
  function examResult() {
    const x = examReview; return pageHead('PRACTICE COMPLETE','练习完成','成绩按所选题目的参考答案计算，仅供复习。') + `<div class="card exam-panel"><div class="stat-grid"><div><b>${x.score}</b><span>参考分 / 100</span></div><div><b>${x.correct}</b><span>答对</span></div><div><b>${x.incorrect}</b><span>答错</span></div></div><p class="help">共 ${x.questions.length} 题，未作答 ${x.unanswered} 题。答错的题目已加入错题本；含录屏参考答案，未逐题独立复核。</p><button class="button soft" data-action="new-exam">再练一次</button></div><div class="section-title"><h2>逐题解析</h2><small>点击展开查看</small></div>${x.questions.map(q => { const picked = x.answers[q.id] || [], ok = picked.join() === q.answer.join(); return `<details class="card list-card"><summary>${!picked.length ? '未作答' : ok ? '答对' : '答错'} · ${escape(q.question)}</summary><p class="help">你的答案：${escape(picked.join('、') || '未作答')}　参考答案：${escape(q.answer.join('、'))}<br>答案状态：${q.answerStatus === 'recorded' ? '录屏参考，待独立复核' : '已核验'}<br>解析：${explanation(q)}</p></details>`; }).join('')}`;
  }
  function wrongView() {
    const groups = ['single','multiple','judge'];
    let body = groups.map(t => { const qs = db.questions.filter(q => q.type === t && progress.wrong[q.id]); return `<div class="section-title"><h2>${typeNames[t]}</h2><small>${qs.length} 题</small></div>${qs.map(q => `<div class="card list-card">${statusBadge(q)}<h3>${escape(q.question)}</h3><small>${escape(q.chapter)} · ${escape(q.id)}</small><div class="actions"><button class="button soft" data-review="${escape(q.id)}">复习本题</button><button class="button outline" data-remove="${escape(q.id)}">移出错题</button></div></div>`).join('')}`; }).join('');
    if (!counts().wrong) body = empty('还没有错题','答错可判分题后，会自动记录在这里。');
    return pageHead('REVIEW','错题本','把不确定的知识点，再认真看一遍。') + body;
  }
  function safeUrl(path) { try { const url = new URL(path, bankBase); return ['http:','https:'].includes(url.protocol) ? url.href : ''; } catch (_) { return ''; } }
  function videosView() {
    const vs = db.videos.filter(v => v.path && v.status !== 'not_uploaded');
    if (!vs.length) return pageHead('VIDEO LESSONS','视频课程','课程文件准备好后，可以在这里手动播放。') + empty('暂未添加课程视频','当前题库中没有可用的视频文件，上传后在 videos 数组填写实际路径。','<button class="button soft" data-action="settings">查看添加方法</button>');
    return pageHead('VIDEO LESSONS','视频课程','轻点播放按钮开始；iPhone 可能限制有声自动播放。') + vs.map(v => { const url = safeUrl(v.path); if (!url) return `<section class="card list-card"><h3>${escape(v.title)}</h3><p class="help error">视频地址无效，请检查 videos 配置。</p></section>`; return `<section class="card list-card"><h3>${escape(v.title)}</h3>${v.description ? `<p class="help">${escape(v.description)}</p>` : ''}<video class="video-player" controls playsinline webkit-playsinline preload="metadata" src="${escape(url)}"></video><p class="fine video-error hidden">视频加载失败：请检查链接是否能直接打开、文件是否上传、格式是否受支持；也可点下方链接尝试。</p><a class="button outline" href="${escape(url)}" target="_blank" rel="noopener noreferrer">在新页面打开视频 ↗</a><p class="fine">请手动点播放并检查音量和静音状态。</p></section>`; }).join('');
  }
  function settingsView() {
    const c = counts();
    return pageHead('MANAGE','题库与记录','导入题目，备份你的学习进度。') + `<section class="card settings-panel"><h2>当前题库</h2><p>${escape(dataLabel)} · ${c.all} 道题<br>${c.verified} 道已核验、${c.recorded} 道录屏参考、${c.pending} 道暂不判分。${dataWarning ? '<br><span class="error">' + escape(dataWarning) + '</span>' : ''}</p><div class="actions"><button class="button" data-action="import-bank">从文件导入 JSON</button><button class="button outline" data-action="reset-bank">使用在线题库</button></div><p class="fine">导入仅替换本机显示的题库，不会修改 GitHub。选择在线题库后，会重新尝试读取 GitHub Pages；失败时使用站点快照。</p></section>
    <section class="card settings-panel"><h2>备份学习记录</h2><p>已练习 ${c.answered} 道不同题目，错题 ${c.wrong} 道。记录存放在当前浏览器，建议定期导出到「文件」。</p><div class="actions"><button class="button soft" data-action="export-progress">导出备份</button><button class="button outline" data-action="import-progress">恢复备份</button></div><p class="fine">恢复备份会替换本机现有学习记录。切换题库后，仅展示当前题库中对应 ID 的记录。</p></section>
    <section class="card settings-panel"><h2>用 iPhone 更新题库</h2><p>在 Safari 打开 <a href="https://github.com/2010153875qq/zhixue-fire/blob/main/study/data/questions.json">GitHub 题库文件 ↗</a>，登录后点铅笔编辑。保持题目 ID 不变；修改并提交到 main 后等待 Pages 发布，再刷新网页。Sites 页面会尝试读取该 Pages 文件；读取失败时提示并显示快照。</p><p>题型用 <code>single</code>、<code>multiple</code>、<code>judge</code>；确实核验的答案用 <code>verified</code>；录屏参考用 <code>recorded</code>；无法确认或题干存疑用 <code>pending_review</code>。多选答案写成数组，如 <code>["A","C"]</code>。待复核题不参与判分。</p><p>在 <code>videos</code> 数组填写真实 MP4 路径或 HTTPS 直链；选择手动播放。<a href="https://github.com/2010153875qq/zhixue-fire/tree/main/study">查看完整维护说明 ↗</a></p></section>
    <section class="card settings-panel"><h2>声音与播放</h2><p>朗读需要手动点「朗读」，并使用 iPhone 系统可用的中文声音；若无声，请检查媒体音量、静音状态、蓝牙输出及 Safari 设置。课程不自动播放，点视频自带的播放按钮；失败时可尝试在新页面打开。</p></section>`;
  }
  function render() {
    const root = $('#main');
    let html = page === 'home' ? home() : page === 'practice' ? practice() : page === 'chapters' ? chaptersView() : page === 'exam' ? examView() : page === 'wrong' ? wrongView() : page === 'videos' ? videosView() : settingsView();
    root.innerHTML = html;
    document.querySelectorAll('.bottom-nav button').forEach(b => { const active = b.dataset.page === page || (page === 'chapters' && b.dataset.page === 'practice'); b.classList.toggle('active', active); if (active) b.setAttribute('aria-current','page'); else b.removeAttribute('aria-current'); });
    document.querySelectorAll('video').forEach(video => video.addEventListener('error', () => { const el = video.parentElement.querySelector('.video-error'); if (el) el.classList.remove('hidden'); }));
  }
  function switchPage(to) {
    if (exam && to !== 'exam') { if (!confirm('离开会结束未交卷的模拟练习，确定离开吗？')) return; exam = null; clearInterval(timer); }
    page = to; selected = []; feedback = null; position = 0; if (to !== 'exam') examReview = null; render(); window.scrollTo(0,0);
  }
  function practiceQuestion() { return pool()[position]; }
  function record(q, picked, ok) {
    const a = progress.attempts[q.id] || { submissions:0, graded:0, right:0 };
    a.submissions++; if (q.answerStatus !== 'pending_review') { a.graded++; if (ok) a.right++; else progress.wrong[q.id] = { at: Date.now(), type:q.type }; }
    a.updatedAt = Date.now(); progress.attempts[q.id] = a; save();
  }
  function speak(q) {
    if (!q || !('speechSynthesis' in window) || !('SpeechSynthesisUtterance' in window)) { toast('当前浏览器不支持朗读'); return; }
    try { window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(q.question + '。' + q.options.map(o => o.key + '，' + o.text).join('。')); utterance.lang = 'zh-CN'; utterance.rate = 0.9; const voices = window.speechSynthesis.getVoices(); const voice = voices.find(v => /^zh[-_]CN/i.test(v.lang)) || voices.find(v => /^zh/i.test(v.lang)); if (voice) utterance.voice = voice; utterance.onerror = () => toast('朗读失败，请检查系统声音后重试'); window.speechSynthesis.speak(utterance); toast('正在朗读，请检查媒体音量'); } catch (_) { toast('朗读失败，请检查系统声音后重试'); }
  }
  function clock() { if (!exam) return ''; const seconds = Math.max(0,Math.ceil((exam.deadline - Date.now()) / 1000)); return String(Math.floor(seconds / 60)).padStart(2,'0') + ':' + String(seconds % 60).padStart(2,'0'); }
  function finishExam() {
    if (!exam) return;
    clearInterval(timer); let correct=0, incorrect=0, unanswered=0;
    for (const q of exam.questions) { const picked = (exam.answers[q.id] || []).slice().sort(); if (!picked.length) { unanswered++; continue; } const ok = picked.join() === q.answer.join(); ok ? correct++ : incorrect++; record(q,picked,ok); }
    const score = Math.round(correct / exam.questions.length * 100); examReview = { ...exam, correct, incorrect, unanswered, score }; progress.exams.push({ date:new Date().toISOString(), total:exam.questions.length, correct, incorrect, unanswered, score }); progress.exams = progress.exams.slice(-100); save(); exam = null; render(); window.scrollTo(0,0);
  }
  function download(name, value) { const blob = new Blob([JSON.stringify(value,null,2)], {type:'application/json;charset=utf-8'}); const a = document.createElement('a'); const url = URL.createObjectURL(blob); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url),10000); }
  document.addEventListener('change', e => {
    if (e.target.matches('input[name="answer"]')) { const values = [...document.querySelectorAll('input[name="answer"]:checked')].map(i => i.value).sort(); if (exam && page === 'exam') exam.answers[exam.questions[exam.index].id] = values; else selected = values; document.querySelectorAll('.option').forEach(o => o.classList.toggle('selected', !!o.querySelector('input:checked'))); }
    if (e.target.id === 'chapter') { chapter = e.target.value; position=0; selected=[]; feedback=null; render(); }
  });
  document.addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.page || b.dataset.go) { switchPage(b.dataset.page || b.dataset.go); return; }
    if (b.dataset.filter) { filter=b.dataset.filter; position=0; selected=[]; feedback=null; render(); return; }
    if (b.dataset.chapter) { chapter=b.dataset.chapter; filter='all'; switchPage('practice'); return; }
    if (b.dataset.review) { const q=db.questions.find(x=>x.id===b.dataset.review); if (q) { filter=q.type; chapter='all'; page='practice'; position=pool().findIndex(x=>x.id===q.id); selected=[]; feedback=null; render(); window.scrollTo(0,0); } return; }
    if (b.dataset.remove) { delete progress.wrong[b.dataset.remove]; save(); render(); toast('已移出错题本'); return; }
    const action = b.dataset.action;
    if (action === 'settings') switchPage('settings');
    else if (action === 'chapters') switchPage('chapters');
    else if (action === 'speak') speak(exam && page === 'exam' ? exam.questions[exam.index] : practiceQuestion());
    else if (action === 'submit-practice') { const q=practiceQuestion(); if (!selected.length) { toast('请先选择答案'); return; } const ok = selected.join() === q.answer.join(); feedback={ picked:[...selected], ok }; record(q,selected,ok); render(); }
    else if (action === 'retry') { selected=[]; feedback=null; render(); }
    else if (action === 'prev' || action === 'next') { position += action === 'prev' ? -1 : 1; selected=[]; feedback=null; render(); window.scrollTo(0,0); }
    else if (action === 'start-exam') { const eligible=db.questions.filter(q=>q.answerStatus !== 'pending_review'); const max=Math.min(eligible.length, Number($('#exam-size').value)); for (let i=eligible.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1)); [eligible[i],eligible[j]]=[eligible[j],eligible[i]]; } exam={questions:eligible.slice(0,max), answers:{}, index:0, deadline:Date.now()+60*60*1000}; examReview=null; timer=setInterval(()=>{ if (!exam) return; const el=$('#clock'); if (el) el.textContent=clock(); if (Date.now() >= exam.deadline) { toast('时间到，已自动交卷'); finishExam(); } },1000); render(); }
    else if (action === 'exam-prev' || action === 'exam-next') { exam.index += action === 'exam-prev' ? -1 : 1; render(); window.scrollTo(0,0); }
    else if (action === 'finish-exam') { const remaining=exam.questions.length-Object.values(exam.answers).filter(v=>v.length).length; if (confirm(`确定交卷吗？还有 ${remaining} 题未作答。`)) finishExam(); }
    else if (action === 'new-exam') { examReview=null; render(); window.scrollTo(0,0); }
    else if (action === 'import-bank') $('#bank-file').click();
    else if (action === 'reset-bank') { try { localStorage.removeItem(STORAGE.imported); } catch (_) {} dataWarning=''; loadBank(); toast('正在重新加载在线题库'); }
    else if (action === 'export-progress') download('消防学习记录备份.json',{ format:'fire-study-progress-v1', exportedAt:new Date().toISOString(), progress });
    else if (action === 'import-progress') $('#backup-file').click();
  });
  $('#bank-file').addEventListener('change', async e => { const file=e.target.files && e.target.files[0]; if (!file) return; try { if (file.size > 5*1024*1024) throw Error('文件超过 5 MB。'); const raw=JSON.parse(await file.text()); const parsed=parseBank(raw); if (!write(STORAGE.imported,raw)) return; db=parsed; dataLabel='本机导入题库'; dataWarning=''; bankBase=new URL('.',location.href).href; filter='all'; chapter='all'; render(); toast('导入成功：' + db.questions.length + ' 道题'); } catch(err) { alert('题库导入失败：' + err.message + '\n原题库没有改变。'); } finally { e.target.value=''; } });
  $('#backup-file').addEventListener('change', async e => { const file=e.target.files && e.target.files[0]; if (!file) return; try { if (file.size > 5*1024*1024) throw Error('文件超过 5 MB。'); const raw=JSON.parse(await file.text()); const p=raw.progress; if (raw.format !== 'fire-study-progress-v1' || !p || !p.attempts || Array.isArray(p.attempts) || typeof p.attempts !== 'object' || !p.wrong || Array.isArray(p.wrong) || typeof p.wrong !== 'object' || !Array.isArray(p.exams)) throw Error('不是有效的学习记录备份。'); if (!confirm('恢复备份会替换本机当前学习记录，确定继续吗？')) return; if (!write(STORAGE.progress,p)) return; progress=p; render(); toast('学习记录已恢复'); } catch(err) { alert('恢复失败：' + err.message); } finally { e.target.value=''; } });
  render(); loadBank();
})();
