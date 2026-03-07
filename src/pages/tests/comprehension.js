/**
 * 理解力测试模块
 * 子测试1: 语言理解 — 词语关系理解
 * 子测试2: 逻辑推理 — 图形规律推理
 * 子测试3: 空间理解 — 图形空间关系判断
 */
import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';
import { TestSession, showPauseOverlay } from '../../utils/testSession.js';
import { questionManager } from '../../utils/questionManager.js';
import { builtinQuestions } from '../../data/questionPool.js';

let currentTimer = null;
let currentSession = null;

export function renderComprehension(app) {
  const user = store.get('user');
  if (!user.name) { router.navigate('/user-info'); return; }

  const progress = store.get('testProgress.comprehension');
  let currentSub = progress.subTests.findIndex(s => !s);
  if (currentSub === -1) currentSub = 0;
  renderSubTest(app, currentSub);
}

function renderSubTest(app, subIndex) {
  if (currentTimer) { currentTimer.stop(); currentTimer = null; }
  switch (subIndex) {
    case 0: renderLanguageComprehension(app); break;
    case 1: renderLogicalReasoning(app); break;
    case 2: renderSpatialComprehension(app); break;
    case 3: renderAnalogicalReasoning(app); break;
    case 4: renderRelationalReasoning(app); break;
    default: router.navigate('/test-select');
  }
}

/* ===== 子测试1: 语言理解 ===== */
async function renderLanguageComprehension(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const questionsDB = await questionManager.getQuestionsByCategory('comprehension', '语言理解');

  if (questionsDB.length > 0) {
    renderImageBasedTest(app, questionsDB, diff, '语言理解', 0, 1);
    return;
  }

  // 内置题库（按中国学段4档分级）
  const langPoolMap = builtinQuestions.langPoolMap;
  const questionsPool = langPoolMap[diff.ageGroup] || langPoolMap['8-11岁组'];

  const totalRounds = Math.min(diff.rounds, questionsPool.length);
  const questions = questionsPool.slice(0, totalRounds);
  const timeLimit = diff.timeLimit;
  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  function nextTrial() {
    if (round >= questions.length) {
      currentTimer.stop();
      finishSubTest(0, '语言理解', correct, questions.length, wrong, reactionTimer, 1, questionLogs);
      return;
    }

    const q = questions[round];
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${questions.length} 题</span><br/>
        <span style="font-size:1.2rem;">${q.q}</span>
      </div>
      <div class="test-options" style="max-width:500px;">
        ${q.options.map((opt, i) => `
          <div class="test-option" data-answer="${i}">${opt}</div>
        `).join('')}
      </div>
    `;

    reactionTimer.start();
    contentEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const answer = parseInt(opt.dataset.answer);
        const isCorrect = answer === q.answer;
        questionLogs.push({
          prompt: q.q,
          userAnswer: q.options[answer],
          correctAnswer: q.options[q.answer],
          isCorrect
        });
        if (isCorrect) {
          correct++;
          opt.classList.add('correct');
        } else {
          wrong++;
          opt.classList.add('wrong');
          contentEl.querySelectorAll('.test-option').forEach(o => {
            if (parseInt(o.dataset.answer) === q.answer) o.classList.add('correct');
          });
        }
        reactionTimer.record();
        round++;
        setTimeout(nextTrial, 500);
      });
    });
  }

  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/test-select">
        <span class="navbar-brand-icon">🧠</span>
        <span>智趣认知乐园</span>
      </a>
    </div>
    <div class="page has-navbar">
      <div class="container">
        <div class="test-header">
          <div class="test-header-left">
            <div class="test-header-icon" style="background:linear-gradient(135deg, #A29BFE, #6C5CE7);">📖</div>
            <div>
              <div class="test-header-title">理解力 · 语言理解</div>
              <div class="test-header-subtitle">理解词语之间的关系</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (rem) => { timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`; },
    () => finishSubTest(0, '语言理解', correct, round || 1, wrong, reactionTimer, 1, questionLogs)
  );
  currentTimer.start();
  nextTrial();
}

/* ===== 子测试2: 逻辑推理 ===== */
async function renderLogicalReasoning(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const questionsDB = await questionManager.getQuestionsByCategory('comprehension', '逻辑推理');

  if (questionsDB.length > 0) {
    renderImageBasedTest(app, questionsDB, diff, '逻辑推理', 1, 2);
    return;
  }


  const logicPoolMap = builtinQuestions.logicPoolMap;
  const questionsPool = logicPoolMap[diff.ageGroup] || logicPoolMap['8-11岁组'];

  const totalRounds = Math.min(diff.rounds, questionsPool.length);
  const questions = questionsPool.slice(0, totalRounds);
  const timeLimit = diff.timeLimit;
  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  function nextTrial() {
    if (round >= questions.length) {
      currentTimer.stop();
      finishSubTest(1, '逻辑推理', correct, questions.length, wrong, reactionTimer, 2, questionLogs);
      return;
    }

    const q = questions[round];
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${questions.length} 题</span><br/>
        <span style="font-size:1.4rem; font-weight:700;">找出规律，填入下一个</span>
      </div>
      <div style="font-size:2rem; font-weight:900; color:var(--primary); margin:20px 0; font-family:var(--font-display);">
        ${q.q}
      </div>
      <div class="test-options" style="max-width:500px;">
        ${q.options.map((opt, i) => `
          <div class="test-option" data-answer="${i}">${opt}</div>
        `).join('')}
      </div>
    `;

    reactionTimer.start();
    contentEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const answer = parseInt(opt.dataset.answer);
        const isCorrect = answer === q.answer;
        questionLogs.push({
          prompt: q.q,
          userAnswer: q.options[answer],
          correctAnswer: q.options[q.answer],
          isCorrect
        });
        if (isCorrect) {
          correct++;
          opt.classList.add('correct');
        } else {
          wrong++;
          opt.classList.add('wrong');
        }
        reactionTimer.record();
        round++;
        setTimeout(nextTrial, 500);
      });
    });
  }

  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/test-select">
        <span class="navbar-brand-icon">🧠</span>
        <span>智趣认知乐园</span>
      </a>
    </div>
    <div class="page has-navbar">
      <div class="container">
        <div class="test-header">
          <div class="test-header-left">
            <div class="test-header-icon" style="background:linear-gradient(135deg, #A29BFE, #6C5CE7);">🔢</div>
            <div>
              <div class="test-header-title">理解力 · 逻辑推理</div>
              <div class="test-header-subtitle">发现规律，找出下一个</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (rem) => { timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`; },
    () => finishSubTest(1, '逻辑推理', correct, round || 1, wrong, reactionTimer, 2, questionLogs)
  );
  currentTimer.start();
  nextTrial();
}

/* ===== 子测试3: 空间理解 ===== */
async function renderSpatialComprehension(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const questionsDB = await questionManager.getQuestionsByCategory('comprehension', '空间理解');

  if (questionsDB.length > 0) {
    renderImageBasedTest(app, questionsDB, diff, '空间理解', 2, -1);
    return;
  }

  const timeLimit = diff.timeLimit;
  const totalRounds = diff.rounds;
  const shapes = ['▲', '◆', '●', '■', '★'];
  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  function nextTrial() {
    if (round >= totalRounds) {
      currentTimer.stop();
      finishSubTest(2, '空间理解', correct, totalRounds, wrong, reactionTimer, 3, questionLogs);
      return;
    }

    const shape = shapes[Math.floor(Math.random() * shapes.length)];
    const rotations = [0, 90, 180, 270];
    const targetRot = rotations[Math.floor(Math.random() * rotations.length)];
    const isSame = Math.random() > 0.4;
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;
    const displayRot = isSame ? targetRot : rotations.find(r => r !== targetRot);

    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${totalRounds} 题</span><br/>
        <span style="font-size:1rem;">这两个图形的方向一样吗？</span>
      </div>
      <div style="display:flex; gap:48px; justify-content:center; align-items:center; margin:24px 0;">
        <div style="font-size:4rem; transform:rotate(${targetRot}deg); transition:none;">${shape}</div>
        <div style="font-size:1.5rem; color:var(--text-light);">VS</div>
        <div style="font-size:4rem; transform:rotate(${displayRot}deg); transition:none;">${shape}</div>
      </div>
      <div class="test-options" style="max-width:400px;">
        <div class="test-option" data-answer="same">✅ 一样</div>
        <div class="test-option" data-answer="diff">❌ 不一样</div>
      </div>
    `;

    reactionTimer.start();
    contentEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const answer = opt.dataset.answer;
        const isCorrectAnswer = (answer === 'same' && isSame) || (answer === 'diff' && !isSame);
        questionLogs.push({
          prompt: '这两个图形的方向一样吗？',
          shown: `${shape}(${targetRot}°) vs ${shape}(${displayRot}°)`,
          userAnswer: answer === 'same' ? '一样' : '不一样',
          correctAnswer: isSame ? '一样' : '不一样',
          isCorrect: isCorrectAnswer
        });

        if (isCorrectAnswer) { correct++; opt.classList.add('correct'); }
        else { wrong++; opt.classList.add('wrong'); }
        reactionTimer.record();
        round++;
        setTimeout(nextTrial, 400);
      });
    });
  }

  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/test-select">
        <span class="navbar-brand-icon">🧠</span>
        <span>智趣认知乐园</span>
      </a>
    </div>
    <div class="page has-navbar">
      <div class="container">
        <div class="test-header">
          <div class="test-header-left">
            <div class="test-header-icon" style="background:linear-gradient(135deg, #A29BFE, #6C5CE7);">🧩</div>
            <div>
              <div class="test-header-title">理解力 · 空间理解</div>
              <div class="test-header-subtitle">判断图形的空间关系</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (rem) => { timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`; },
    () => finishSubTest(2, '空间理解', correct, round || 1, wrong, reactionTimer, 3, questionLogs)
  );
  currentTimer.start();
  nextTrial();
}

/* ===== 图片题目形式测试（通用） ===== */
async function renderImageBasedTest(app, questions, diff, testName, subIndex, nextSub) {
  const totalRounds = Math.min(questions.length, diff.rounds);
  const timeLimit = diff.timeLimit;
  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  app.innerHTML = `
    <div class="page has-navbar">
      <div class="container">
        <div class="test-header">
          <div class="test-header-left">
            <div class="test-header-title">理解力 · ${testName}</div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${timeLimit}</div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (rem) => { timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`; },
    () => finishSubTest(subIndex, testName, correct, round || 1, wrong, reactionTimer, nextSub, questionLogs)
  );
  currentTimer.start();

  async function nextTrial() {
    if (round >= totalRounds) {
      currentTimer.stop();
      finishSubTest(subIndex, testName, correct, totalRounds, wrong, reactionTimer, nextSub, questionLogs);
      return;
    }

    const q = questions[round];
    const imageData = await questionManager.getImage(q.imageId);
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    const optionCount = q.options || 4;
    const optionBtns = [];

    // 如果题目有选项图片，并且正确加载了这些图片
    const optImages = [];
    if (q.optionImageIds && q.optionImageIds.length > 0) {
      for (const optId of q.optionImageIds) {
        if (optId) {
          optImages.push(await questionManager.getImage(optId));
        } else {
          optImages.push(null);
        }
      }
    }

    for (let i = 1; i <= optionCount; i++) {
      const letter = String.fromCharCode(65 + i - 1); // 65 对应 'A'
      if (optImages[i - 1]) {
        optionBtns.push(`
          <div class="test-option flex-center" data-answer="${i}" style="padding:8px; position:relative;">
           <div style="position:absolute; top:4px; left:6px; font-weight:bold; font-size:0.8rem; color:var(--text-light);">${letter}</div>
           <img src="${optImages[i - 1]}" style="max-width:100px; max-height:100px; object-fit:contain;" />
          </div>
        `);
      } else {
        optionBtns.push(`<div class="test-option" data-answer="${i}">${letter}</div>`);
      }
    }

    contentEl.innerHTML = `
      <div class="test-question">第 ${round + 1}/${totalRounds} 题</div>
      <div style="margin:16px auto; max-width:500px;">
        ${imageData ? `<img src="${imageData}" alt="题目图片" style="max-width:100%; border-radius:var(--radius-md);" />` : ''}
      </div>
      <div class="test-options" style="max-width:500px;">
        ${optionBtns.join('')}
      </div>
    `;

    reactionTimer.start();
    contentEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const answer = parseInt(opt.dataset.answer);
        const isCorrect = answer === q.correctAnswer;
        questionLogs.push({
          questionId: q.id || null,
          prompt: q.title || `第${round + 1}题`,
          subCategory: q.subCategory || '',
          userAnswer: `选项${String.fromCharCode(64 + answer)}`,
          correctAnswer: `选项${String.fromCharCode(64 + q.correctAnswer)}`,
          isCorrect
        });
        if (isCorrect) { correct++; opt.classList.add('correct'); }
        else { wrong++; opt.classList.add('wrong'); }
        reactionTimer.record();
        round++;
        setTimeout(nextTrial, 500);
      });
    });
  }

  nextTrial();
}

function finishSubTest(subIndex, name, correct, total, wrong, reactionTimer, nextSub, questionLogs = []) {
  const correctRate = correct / Math.max(total, 1);
  const avgRT = reactionTimer.getAverage() || 3000;
  const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'comprehension');
  store.setTestResult('comprehension', subIndex, score, { name, correct, total, wrong, correctRate: Math.round(correctRate * 100), avgReactionTime: Math.round(avgRT), questionLogs });
  showResult(score, name, correct, total, nextSub);
}

function showResult(score, testName, achieved, total, nextSubIndex) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page page-center" style="min-height:100vh;">
      <div class="modal">
        <div class="modal-title">${testName} 完成！得分：${Math.round(score)}</div>
        <div class="modal-actions">
          ${nextSubIndex >= 0 && nextSubIndex <= 4 ? `<button class="btn btn-primary" id="btn-next">继续下一项</button>` : `<button class="btn btn-primary" id="btn-back">返回选择</button>`}
        </div>
      </div>
    </div>
  `;
  if (nextSubIndex >= 0 && nextSubIndex <= 4) {
    document.getElementById('btn-next').addEventListener('click', () => renderSubTest(app, nextSubIndex));
  } else {
    document.getElementById('btn-back').addEventListener('click', () => router.navigate('/test-select'));
  }
}

function getDifficulty(ageGroup) {
  const configs = {
    '5-7岁组': { ageGroup: '5-7岁组', rounds: 4, timeLimit: 70 },  // 幼小园: 4题, 宽松时限
    '8-11岁组': { ageGroup: '8-11岁组', rounds: 6, timeLimit: 90 },  // 小学中年级: 6题
    '12-14岁组': { ageGroup: '12-14岁组', rounds: 8, timeLimit: 90 },  // 初中: 8题
    '15-18岁组': { ageGroup: '15-18岁组', rounds: 10, timeLimit: 90 },  // 高中: 10题, 激版
  };
  return configs[ageGroup] || configs['8-11岁组'];
}

/* ===== 子测试3: 类比推理 — A:B=C:? ===== */
function renderAnalogicalReasoning(app) {
  const ageGroup = store.get('user.ageGroup');
  if (ageGroup === '5-7岁组') {
    store.setTestResult('comprehension', 3, 33, {
      name: '类比推理', correct: 0, total: 0, wrong: 0,
      correctRate: 100, avgReactionTime: 0, questionLogs: [],
      skipped: true, skipReason: '年龄不足（6岁+），跳过'
    });
    renderSubTest(app, 4);
    return;
  }

  // 每道题结构: { a, b, c, options, answer(0-based) }
  // 题面渲染：A : B = C : ?
  const questions = builtinQuestions.analogyPool.slice(0); // 复制一份防污染
  questions.sort(() => Math.random() - 0.5); // 打乱出题顺序

  const timeLimit = 90;
  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  function nextTrial() {
    if (round >= questions.length) {
      currentTimer.stop();
      finishSubTest(3, '类比推理', correct, questions.length, wrong, reactionTimer, 4, questionLogs);
      return;
    }
    const q = questions[round];
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;
    reactionTimer.start();

    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${questions.length} 题</span><br/>
        <div style="margin-top:14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:center;"
             aria-label="类比推理题目">
          <div style="background:var(--bg-card); border-radius:12px; padding:12px 20px; font-size:1.3rem; font-weight:700; box-shadow:var(--shadow-sm);">${q.a}</div>
          <span style="font-size:1.6rem; color:var(--primary); font-weight:900;">:</span>
          <div style="background:var(--bg-card); border-radius:12px; padding:12px 20px; font-size:1.3rem; font-weight:700; box-shadow:var(--shadow-sm);">${q.b}</div>
          <span style="font-size:1.3rem; color:var(--text-secondary); font-weight:700;">=</span>
          <div style="background:var(--bg-card); border-radius:12px; padding:12px 20px; font-size:1.3rem; font-weight:700; box-shadow:var(--shadow-sm);">${q.c}</div>
          <span style="font-size:1.6rem; color:var(--primary); font-weight:900;">:</span>
          <div style="background:linear-gradient(135deg,rgba(108,92,231,0.15),rgba(162,155,254,0.15)); border:2px dashed var(--primary); border-radius:12px; padding:12px 28px; font-size:1.5rem; font-weight:900; color:var(--primary); letter-spacing:4px;">？</div>
        </div>
      </div>
      <div class="test-options" style="max-width:480px;">
        ${q.options.map((opt, i) => `<div class="test-option" data-idx="${i}">${String.fromCharCode(65 + i)}. ${opt}</div>`).join('')}
      </div>
    `;

    contentEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        reactionTimer.record();
        const idx = parseInt(opt.dataset.idx);
        const isCorrect = idx === q.answer;
        questionLogs.push({
          prompt: `${q.a}:${q.b} = ${q.c}:?`,
          userAnswer: q.options[idx],
          correctAnswer: q.options[q.answer],
          isCorrect
        });
        if (isCorrect) { correct++; opt.classList.add('correct'); }
        else {
          wrong++; opt.classList.add('wrong');
          contentEl.querySelectorAll('.test-option').forEach(o => {
            if (parseInt(o.dataset.idx) === q.answer) o.classList.add('correct');
          });
        }
        round++;
        setTimeout(nextTrial, 600);
      });
    });
  }

  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/test-select"><span class="navbar-brand-icon">🧠</span><span>智趣认知乐园</span></a>
    </div>
    <div class="page has-navbar">
      <div class="container">
        <div class="test-header">
          <div class="test-header-left">
            <div class="test-header-icon" style="background:linear-gradient(135deg, #A29BFE, #6C5CE7);">🔗</div>
            <div>
              <div class="test-header-title">理解力 · 类比推理</div>
              <div class="test-header-subtitle">A:B 等于 C:?，找出对应关系</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
        <div class="test-footer">
          <button class="btn btn-secondary" id="btn-pause" style="margin-right:8px;">⏸️ 暂停</button>
          <button class="btn btn-secondary" id="btn-skip">跳过此项 →</button>
        </div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (rem) => { timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`; if (rem <= 10) timerEl.classList.add('warning'); },
    () => finishSubTest(3, '类比推理', correct, round || 1, wrong, reactionTimer, 4, questionLogs)
  );
  currentTimer.start();
  currentSession = new TestSession('comprehension', 3, { total: questions.length });
  currentSession.startAutoSave();
  currentSession.onPause(() => { currentTimer.stop(); showPauseOverlay(currentSession, () => currentTimer.start()); });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());
  nextTrial();
  document.getElementById('btn-skip')?.addEventListener('click', () => { currentTimer.stop(); finishSubTest(3, '类比推理', correct, round || 1, wrong, reactionTimer, 4, questionLogs); });
}

/* ===== 子测试4: 关系推理/序列化 ===== */
function renderRelationalReasoning(app) {
  const ageGroup = store.get('user.ageGroup');
  if (ageGroup === '8-14岁组') {
    store.setTestResult('comprehension', 4, 33, {
      name: '关系推理', correct: 0, total: 0, wrong: 0,
      correctRate: 100, avgReactionTime: 0, questionLogs: [],
      skipped: true, skipReason: '年龄超过12岁，不在适用范围（5-12岁），跳过'
    });
    renderSubTest(app, -99);
    return;
  }
  const questions = builtinQuestions.relationPool.slice(0);
  questions.sort(() => Math.random() - 0.5);
  const timeLimit = 90;
  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  function nextTrial() {
    if (round >= questions.length) {
      currentTimer.stop();
      finishSubTest(4, '关系推理', correct, questions.length, wrong, reactionTimer, -1, questionLogs);
      return;
    }
    const q = questions[round];
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;
    reactionTimer.start();
    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${questions.length} 题</span><br/>
        <span style="font-size:1.1rem;">${q.q}</span>
      </div>
      <div class="test-options" style="max-width:400px;">
        ${q.options.map((opt, i) => `<div class="test-option" data-idx="${i}">${String.fromCharCode(65 + i)}. ${opt}</div>`).join('')}
      </div>
    `;
    contentEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        reactionTimer.record();
        const idx = parseInt(opt.dataset.idx);
        const isCorrect = idx === q.answer;
        questionLogs.push({ prompt: q.q, userAnswer: q.options[idx], correctAnswer: q.options[q.answer], isCorrect });
        if (isCorrect) { correct++; opt.classList.add('correct'); }
        else { wrong++; opt.classList.add('wrong'); contentEl.querySelectorAll('.test-option').forEach(o => { if (parseInt(o.dataset.idx) === q.answer) o.classList.add('correct'); }); }
        round++;
        setTimeout(nextTrial, 500);
      });
    });
  }

  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/test-select"><span class="navbar-brand-icon">🧠</span><span>智趣认知乐园</span></a>
    </div>
    <div class="page has-navbar">
      <div class="container">
        <div class="test-header">
          <div class="test-header-left">
            <div class="test-header-icon" style="background:linear-gradient(135deg, #A29BFE, #6C5CE7);">↔️</div>
            <div>
              <div class="test-header-title">理解力 · 关系推理</div>
              <div class="test-header-subtitle">根据关系，判断谁最大/最小/第几名</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
        <div class="test-footer">
          <button class="btn btn-secondary" id="btn-pause" style="margin-right:8px;">⏸️ 暂停</button>
          <button class="btn btn-secondary" id="btn-skip">跳过此项 →</button>
        </div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (rem) => { timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`; if (rem <= 10) timerEl.classList.add('warning'); },
    () => finishSubTest(4, '关系推理', correct, round || 1, wrong, reactionTimer, -1, questionLogs)
  );
  currentTimer.start();
  currentSession = new TestSession('comprehension', 4, { total: questions.length });
  currentSession.startAutoSave();
  currentSession.onPause(() => { currentTimer.stop(); showPauseOverlay(currentSession, () => currentTimer.start()); });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());
  nextTrial();
  document.getElementById('btn-skip')?.addEventListener('click', () => { currentTimer.stop(); finishSubTest(4, '关系推理', correct, round || 1, wrong, reactionTimer, -1, questionLogs); });
}
