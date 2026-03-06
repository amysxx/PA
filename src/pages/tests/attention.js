/**
 * 注意力测试模块
 * 子测试1: 视觉注意 — 在干扰项中快速识别目标（图片矩阵推理题）
 * 子测试2: 听觉注意 — 监控连续刺激，对特定目标反应
 * 子测试3: 选择性注意 — 在两种规则间快速切换
 */
import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';
import { TestSession, showPauseOverlay } from '../../utils/testSession.js';
import { questionManager } from '../../utils/questionManager.js';

let currentTimer = null;
let currentSession = null;

export function renderAttention(app) {
  const user = store.get('user');
  if (!user.name) { router.navigate('/user-info'); return; }

  const progress = store.get('testProgress.attention');
  let currentSub = progress.subTests.findIndex(s => !s);
  if (currentSub === -1) currentSub = 0;
  renderSubTest(app, currentSub);
}

function renderSubTest(app, subIndex) {
  if (currentTimer) { currentTimer.stop(); currentTimer = null; }
  switch (subIndex) {
    case 0: renderVisualAttention(app); break;
    case 1: renderAuditoryAttention(app); break;
    case 2: renderSelectiveAttention(app); break;
    case 3: renderAttentionSpan(app); break;
    default: router.navigate('/test-select');
  }
}

/* ===== 子测试1: 视觉注意 ===== */
async function renderVisualAttention(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));

  // 尝试从题库加载视觉注意题目
  const questions = await questionManager.getQuestionsByCategory('attention', '视觉注意', store.get('user.ageGroup'));

  if (questions.length === 0) {
    // 无题目时使用内置选择性注意测试
    renderBuiltinVisualAttention(app, diff);
    return;
  }

  // 使用题库中的图片题目
  const totalRounds = Math.min(questions.length, diff.selectiveRounds);
  const timeLimit = diff.selectiveTime;
  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #E17055, #FDCB6E);">👁️</div>
            <div>
              <div class="test-header-title">注意力 · 视觉注意</div>
              <div class="test-header-subtitle">观察图形，选择正确的答案</div>
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
    (rem) => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (rem <= 10) timerEl.classList.add('warning');
    },
    () => finishSubTest(0, '视觉注意', correct, round || 1, wrong, reactionTimer, 1, questionLogs)
  );
  currentTimer.start();

  currentSession = new TestSession('attention', 0, { total: totalRounds });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  async function nextTrial() {
    if (round >= totalRounds) {
      currentTimer.stop();
      finishSubTest(0, '视觉注意', correct, totalRounds, wrong, reactionTimer, 1, questionLogs);
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
        optionBtns.push(`<div class="test-option" data-answer="${i}" style="font-size:1.3rem; font-weight:700; padding:16px;">${letter}</div>`);
      }
    }

    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${totalRounds} 题</span><br/>
        ${q.title || '观察图形，选择缺失部分的正确答案'}
      </div>
      <div style="margin: 16px auto; max-width:500px;">
        ${imageData ? `<img src="${imageData}" alt="题目图片" style="max-width:100%; border-radius:var(--radius-md); box-shadow:var(--shadow-md);" />` : '<div style="color:var(--text-light);">图片加载失败</div>'}
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
        if (isCorrect) {
          correct++;
          opt.classList.add('correct');
        } else {
          wrong++;
          opt.classList.add('wrong');
          // 高亮正确答案
          contentEl.querySelectorAll('.test-option').forEach(o => {
            if (parseInt(o.dataset.answer) === q.correctAnswer) o.classList.add('correct');
          });
        }
        reactionTimer.record();
        round++;
        setTimeout(nextTrial, 500);
      });
    });
  }

  nextTrial();

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    currentTimer.stop();
    finishSubTest(0, '视觉注意', correct, round || 1, wrong, reactionTimer, 1, questionLogs);
  });
}

/* ===== 内置视觉注意测试（无图片题目时回退） ===== */
function renderBuiltinVisualAttention(app, diff) {
  const totalRounds = diff.selectiveRounds;
  const timeLimit = diff.selectiveTime;
  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  function nextTrial() {
    if (round >= totalRounds) {
      currentTimer.stop();
      finishSubTest(0, '视觉注意', correct, totalRounds, wrong, reactionTimer, 1, questionLogs);
      return;
    }

    const targetLetter = ['A', 'B', 'C', 'D', 'E', 'F'][Math.floor(Math.random() * 6)];
    const isTargetPresent = Math.random() > 0.3;
    const gridItems = [];
    const distractors = ['M', 'N', 'W', 'X', 'Z', 'K', 'H', 'V'];
    const count = diff.selectiveItems;

    let targetIdx = -1;
    if (isTargetPresent) {
      targetIdx = Math.floor(Math.random() * count);
    }

    for (let i = 0; i < count; i++) {
      if (i === targetIdx) {
        gridItems.push(targetLetter);
      } else {
        gridItems.push(distractors[Math.floor(Math.random() * distractors.length)]);
      }
    }

    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="test-question">
        找到字母 <span style="font-size:2rem; color:var(--accent-orange); font-weight:900;">${targetLetter}</span>
        <br/><span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${totalRounds} 题</span>
      </div>
      <div style="
        display: grid;
        grid-template-columns: repeat(${Math.ceil(Math.sqrt(count))}, 1fr);
        gap: 10px;
        max-width: 400px;
        margin: 0 auto;
      ">
        ${gridItems.map((letter, idx) => `
          <div class="number-cell" data-idx="${idx}" style="font-size:1.3rem; font-weight:700; width:52px; height:52px;">
            ${letter}
          </div>
        `).join('')}
      </div>
      <div style="margin-top:20px;">
        <button class="btn btn-secondary" id="btn-not-found" style="font-size:0.9rem;">
          🚫 没有找到
        </button>
      </div>
    `;

    reactionTimer.start();

    contentEl.querySelectorAll('.number-cell').forEach(cell => {
      cell.addEventListener('click', () => {
        const idx = parseInt(cell.dataset.idx);
        const isCorrect = gridItems[idx] === targetLetter;
        questionLogs.push({
          prompt: `在字母网格中找到 ${targetLetter}`,
          shown: gridItems.join(''),
          userAnswer: gridItems[idx],
          correctAnswer: targetLetter,
          isCorrect
        });
        if (isCorrect) {
          correct++;
          cell.classList.add('correct');
        } else {
          wrong++;
          cell.classList.add('wrong');
        }
        reactionTimer.record();
        round++;
        setTimeout(nextTrial, 400);
      });
    });

    document.getElementById('btn-not-found')?.addEventListener('click', () => {
      const isCorrect = !isTargetPresent;
      questionLogs.push({
        prompt: `在字母网格中找到 ${targetLetter}`,
        shown: gridItems.join(''),
        userAnswer: '没有找到',
        correctAnswer: isTargetPresent ? `有目标(${targetLetter})` : '没有目标',
        isCorrect
      });
      if (isCorrect) correct++;
      else wrong++;
      reactionTimer.record();
      round++;
      setTimeout(nextTrial, 200);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #E17055, #FDCB6E);">👁️</div>
            <div>
              <div class="test-header-title">注意力 · 视觉注意</div>
              <div class="test-header-subtitle">在众多字母中快速找到指定字母</div>
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
    (rem) => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (rem <= 10) timerEl.classList.add('warning');
    },
    () => finishSubTest(0, '视觉注意', correct, round || 1, wrong, reactionTimer, 1, questionLogs)
  );
  currentTimer.start();

  currentSession = new TestSession('attention', 0, { total: totalRounds });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  nextTrial();

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    currentTimer.stop();
    finishSubTest(0, '视觉注意', correct, round || 1, wrong, reactionTimer, 1, questionLogs);
  });
}

/* ===== 子测试2: 听觉注意 ===== */
function renderAuditoryAttention(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const totalStimuli = diff.sustainedCount;
  const timeLimit = diff.sustainedTime;
  const targetEmoji = '🌟';
  const nonTargets = ['🔵', '🟢', '🟡', '🔴', '🟣'];

  let stimulusIndex = 0;
  let hits = 0;
  let misses = 0;
  let falseAlarms = 0;
  let responded = false;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  const stimuli = [];
  for (let i = 0; i < totalStimuli; i++) {
    if (Math.random() < 0.3) {
      stimuli.push({ shape: targetEmoji, isTarget: true });
    } else {
      stimuli.push({ shape: nonTargets[Math.floor(Math.random() * nonTargets.length)], isTarget: false });
    }
  }

  function showStimulus() {
    if (stimulusIndex >= totalStimuli) {
      currentTimer.stop();
      const total = stimuli.filter(s => s.isTarget).length;
      finishSubTest(1, '听觉注意', hits, total, falseAlarms, reactionTimer, 2, questionLogs);
      return;
    }

    const stim = stimuli[stimulusIndex];
    responded = false;

    const displayEl = document.getElementById('stimulus-display');
    const counterEl = document.getElementById('stim-counter');
    if (!displayEl) return;

    displayEl.innerHTML = `<span style="font-size:5rem; animation: popIn 0.3s ease;">${stim.shape}</span>`;
    counterEl.textContent = `${stimulusIndex + 1}/${totalStimuli}`;

    reactionTimer.start();

    setTimeout(() => {
      if (!responded && stim.isTarget) {
        misses++;
      }
      questionLogs.push({
        prompt: '看到目标符号时点击',
        shown: stim.shape,
        userAnswer: responded ? '点击' : '未点击',
        correctAnswer: stim.isTarget ? '点击' : '不点击',
        isCorrect: (responded && stim.isTarget) || (!responded && !stim.isTarget)
      });
      stimulusIndex++;
      showStimulus();
    }, diff.sustainedInterval);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #E17055, #FDCB6E);">🎯</div>
            <div>
              <div class="test-header-title">注意力 · 听觉注意</div>
              <div class="test-header-subtitle">看到 ${targetEmoji} 时请快速点击按钮！</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content">
          <div id="stim-counter" style="font-size:0.85rem; color:var(--text-light); margin-bottom:16px;">0/${totalStimuli}</div>
          <div id="stimulus-display" style="min-height:100px; display:flex; align-items:center; justify-content:center;">
            <span style="color:var(--text-light);">准备开始...</span>
          </div>
          <button id="btn-hit" class="btn btn-primary btn-large" style="margin-top:32px; min-width:200px; font-size:1.3rem;">
            👆 点击！
          </button>
          <div style="margin-top:16px; font-size:0.85rem; color:var(--text-light);">
            命中: <span id="hit-count" style="color:var(--accent-green); font-weight:700;">0</span>
          </div>
        </div>
        <div class="test-footer">
          <button class="btn btn-secondary" id="btn-pause" style="margin-right:8px;">⏸️ 暂停</button>
          <button class="btn btn-secondary" id="btn-skip">跳过此项 →</button>
        </div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (rem) => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (rem <= 10) timerEl.classList.add('warning');
    },
    () => {
      const total = stimuli.filter(s => s.isTarget).length;
      finishSubTest(1, '听觉注意', hits, total, falseAlarms, reactionTimer, 2, questionLogs);
    }
  );
  currentTimer.start();

  currentSession = new TestSession('attention', 1, { total: totalStimuli });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  setTimeout(showStimulus, 1500);

  document.getElementById('btn-hit').addEventListener('click', () => {
    if (stimulusIndex >= totalStimuli) return;
    responded = true;
    const stim = stimuli[stimulusIndex];
    if (stim.isTarget) {
      hits++;
      reactionTimer.record();
      document.getElementById('hit-count').textContent = hits;
    } else {
      falseAlarms++;
    }
  });

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    currentTimer.stop();
    const total = stimuli.filter(s => s.isTarget).length;
    finishSubTest(1, '听觉注意', hits, total || 1, falseAlarms, reactionTimer, 2, questionLogs);
  });
}

/* ===== 子测试3: 选择性注意 ===== */
function renderSelectiveAttention(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const totalRounds = diff.switchRounds;
  const timeLimit = diff.switchTime;

  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  const rules = ['大小判断', '奇偶判断'];

  function nextTrial() {
    if (round >= totalRounds) {
      currentTimer.stop();
      finishSubTest(2, '选择性注意', correct, totalRounds, wrong, reactionTimer, -1, questionLogs);
      return;
    }

    const currentRule = rules[round % 2 === 0 ? 0 : 1];
    const number = Math.floor(Math.random() * 9) + 1;
    let correctAnswer;

    if (currentRule === '大小判断') {
      correctAnswer = number > 5 ? '大于5' : '小于等于5';
    } else {
      correctAnswer = number % 2 === 0 ? '偶数' : '奇数';
    }

    const options = currentRule === '大小判断'
      ? ['大于5', '小于等于5']
      : ['奇数', '偶数'];

    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div style="
        background: ${round % 2 === 0 ? 'linear-gradient(135deg, #6C5CE7, #A29BFE)' : 'linear-gradient(135deg, #E17055, #FDCB6E)'};
        color: white;
        padding: 12px 24px;
        border-radius: var(--radius-full);
        font-weight: 700;
        font-size: 0.9rem;
        margin-bottom: 16px;
        display: inline-block;
      ">
        当前规则：${currentRule}
      </div>
      
      <div class="test-question" style="margin-top:12px;">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${totalRounds} 题</span><br/>
        <span style="font-size:4rem; font-weight:900; color:var(--text-primary); font-family:var(--font-display);">${number}</span>
      </div>
      
      <div class="test-options" style="max-width:400px;">
        ${options.map(opt => `
          <div class="test-option" data-answer="${opt}">${opt}</div>
        `).join('')}
      </div>
    `;

    reactionTimer.start();

    contentEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const answer = opt.dataset.answer;
        const isCorrect = answer === correctAnswer;
        questionLogs.push({
          prompt: `${currentRule}：数字 ${number}`,
          userAnswer: answer,
          correctAnswer,
          isCorrect
        });
        if (isCorrect) {
          correct++;
          opt.classList.add('correct');
        } else {
          wrong++;
          opt.classList.add('wrong');
          contentEl.querySelectorAll('.test-option').forEach(o => {
            if (o.dataset.answer === correctAnswer) o.classList.add('correct');
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #E17055, #FDCB6E);">🔄</div>
            <div>
              <div class="test-header-title">注意力 · 选择性注意</div>
              <div class="test-header-subtitle">根据不同规则做出快速判断</div>
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
    (rem) => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (rem <= 10) timerEl.classList.add('warning');
    },
    () => finishSubTest(2, '选择性注意', correct, round || 1, wrong, reactionTimer, 3, questionLogs)
  );
  currentTimer.start();

  currentSession = new TestSession('attention', 2, { total: totalRounds });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  nextTrial();

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    currentTimer.stop();
    finishSubTest(2, '选择性注意', correct, round || 1, wrong, reactionTimer, -1, questionLogs);
  });
}

/* ===== 通用完成处理 ===== */
function finishSubTest(subIndex, name, correct, total, wrong, reactionTimer, nextSub, questionLogs = []) {
  const correctRate = correct / Math.max(total, 1);
  const avgRT = reactionTimer.getAverage() || 3000;
  const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'attention');

  store.setTestResult('attention', subIndex, score, {
    name, correct, total, wrong,
    correctRate: Math.round(correctRate * 100),
    avgReactionTime: Math.round(avgRT),
    questionLogs
  });

  showResult(score, name, correct, total, nextSub);
}

function showResult(score, testName, achieved, total, nextSubIndex) {
  const app = document.getElementById('app');
  const levelInfo = getQuickLevel(score);

  app.innerHTML = `
    <div class="page page-center" style="min-height:100vh;">
      <div class="modal" style="max-width:480px; animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);">
        <div class="modal-icon">${levelInfo.emoji}</div>
        <div class="modal-title">${testName} 完成！</div>
        <div style="font-family:var(--font-display); font-size:3rem; font-weight:900; color:${levelInfo.color}; margin:12px 0;">
          ${Math.round(score)}分
        </div>
        <div class="modal-text">正确: ${achieved}/${total} · 评级: <strong style="color:${levelInfo.color}">${levelInfo.level}</strong></div>
        <div class="modal-actions">
          ${nextSubIndex >= 0 && nextSubIndex <= 2 ? `
            <button class="btn btn-primary" id="btn-next">继续下一项 →</button>
          ` : `
            <button class="btn btn-primary" id="btn-back">返回选择 ✓</button>
          `}
        </div>
      </div>
    </div>
  `;

  if (nextSubIndex >= 0 && nextSubIndex <= 2) {
    document.getElementById('btn-next').addEventListener('click', () => renderSubTest(app, nextSubIndex));
  } else {
    document.getElementById('btn-back').addEventListener('click', () => router.navigate('/test-select'));
  }
}

function getDifficulty(ageGroup) {
  const configs = {
    '5-7岁组': { selectiveRounds: 8, selectiveTime: 60, selectiveItems: 9, sustainedCount: 20, sustainedTime: 45, sustainedInterval: 2000, switchRounds: 8, switchTime: 60 },
    '8-14岁组': { selectiveRounds: 12, selectiveTime: 50, selectiveItems: 16, sustainedCount: 30, sustainedTime: 55, sustainedInterval: 1500, switchRounds: 12, switchTime: 50 }
  };
  return configs[ageGroup] || configs['8-14岁组'];
}

function getQuickLevel(score) {
  if (score >= 28) return { level: '优秀', color: '#00B894', emoji: '🌟' };
  if (score >= 22) return { level: '良好', color: '#6C5CE7', emoji: '👍' };
  if (score >= 15) return { level: '中等', color: '#FDCB6E', emoji: '💪' };
  return { level: '继续加油', color: '#E17055', emoji: '📚' };
}

/* ===== 子测试4: 注意广度 — 速示点阵 ===== */
function renderAttentionSpan(app) {
  const ageGroup = store.get('user.ageGroup');
  // 8-14岁组（年龄超过12岁）跳过此子测试，给满分后结束
  if (ageGroup === '8-14岁组') {
    const reactionTimer = new ReactionTimer();
    store.setTestResult('attention', 3, 33, {
      name: '注意广度', correct: 12, total: 12, wrong: 0,
      correctRate: 100, avgReactionTime: 0,
      questionLogs: [],
      skipped: true, skipReason: '年龄超过适用范围（5-12岁），自动跳过'
    });
    showResult(33, '注意广度', 12, 12, -1);
    return;
  }

  const TOTAL_TRIALS = 12;
  const DOT_COUNTS = [3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8]; // 各试次点数
  const FLASH_DURATION = 80; // ms 展示时长
  let trialIndex = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  // 生成随机点阵坐标（在 200x200 区域内）
  function generateDots(count) {
    const dots = [];
    const minDist = 28;
    let attempts = 0;
    while (dots.length < count && attempts < 500) {
      attempts++;
      const x = Math.floor(Math.random() * 160) + 20;
      const y = Math.floor(Math.random() * 160) + 20;
      const tooClose = dots.some(d => Math.hypot(d.x - x, d.y - y) < minDist);
      if (!tooClose) dots.push({ x, y });
    }
    return dots;
  }

  function nextTrial() {
    if (trialIndex >= TOTAL_TRIALS) {
      finishSubTest(3, '注意广度', correct, TOTAL_TRIALS, wrong, reactionTimer, -1, questionLogs);
      return;
    }

    const dotCount = DOT_COUNTS[trialIndex];
    const dots = generateDots(dotCount);
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    // 展示闪现点阵
    const dotsSvg = dots.map(d =>
      `<circle cx="${d.x}" cy="${d.y}" r="10" fill="var(--primary)" opacity="0.9"/>`
    ).join('');

    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${trialIndex + 1}/${TOTAL_TRIALS} 次 — 注意看！</span>
      </div>
      <div style="width:200px; height:200px; margin:20px auto; border:2px solid var(--border); border-radius:var(--radius-md); position:relative; overflow:hidden; background:var(--bg-card);">
        <svg width="200" height="200" id="dot-svg">${dotsSvg}</svg>
      </div>
      <div style="color:var(--text-light); font-size:0.9rem;">请数清楚点的数量...</div>
    `;

    // FLASH_DURATION 后隐藏点阵，进入输入阶段
    setTimeout(() => {
      const svg = document.getElementById('dot-svg');
      if (svg) svg.innerHTML = ''; // 清空点阵

      const options = [2, 3, 4, 5, 6, 7, 8, 9].filter(n => Math.abs(n - dotCount) <= 3);
      const correctInOptions = options.includes(dotCount) ? options : [...options.slice(0, -1), dotCount];
      const shuffled = [...new Set(correctInOptions)].sort(() => Math.random() - 0.5).slice(0, 6);
      if (!shuffled.includes(dotCount)) shuffled[0] = dotCount;
      shuffled.sort((a, b) => a - b);

      const innerEl = document.getElementById('test-inner-content');
      if (!innerEl) return;

      reactionTimer.start();
      innerEl.innerHTML = `
        <div class="test-question">
          <span style="font-size:0.85rem; color:var(--text-light);">第 ${trialIndex + 1}/${TOTAL_TRIALS} 次</span><br/>
          你看到了几个点？
        </div>
        <div class="test-options" style="max-width:360px;">
          ${shuffled.map(n => `<div class="test-option" data-answer="${n}" style="font-size:1.5rem; font-weight:900; padding:16px;">${n}</div>`).join('')}
        </div>
      `;

      innerEl.querySelectorAll('.test-option').forEach(opt => {
        opt.addEventListener('click', () => {
          reactionTimer.record();
          const answered = parseInt(opt.dataset.answer);
          const isCorrect = answered === dotCount;
          questionLogs.push({
            prompt: `速示点阵：点数 ${dotCount}`,
            userAnswer: String(answered),
            correctAnswer: String(dotCount),
            isCorrect
          });
          if (isCorrect) {
            correct++;
            opt.classList.add('correct');
          } else {
            wrong++;
            opt.classList.add('wrong');
            innerEl.querySelectorAll('.test-option').forEach(o => {
              if (parseInt(o.dataset.answer) === dotCount) o.classList.add('correct');
            });
          }
          trialIndex++;
          setTimeout(nextTrial, 500);
        });
      });
    }, FLASH_DURATION);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #E17055, #FDCB6E);">🔢</div>
            <div>
              <div class="test-header-title">注意力 · 注意广度</div>
              <div class="test-header-subtitle">快速闪现后，说出你看到了几个点</div>
            </div>
          </div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
        <div class="test-footer">
          <button class="btn btn-secondary" id="btn-pause" style="margin-right:8px;">⏸️ 暂停</button>
          <button class="btn btn-secondary" id="btn-skip">跳过此项 →</button>
        </div>
      </div>
    </div>
  `;

  currentSession = new TestSession('attention', 3, { total: TOTAL_TRIALS });
  currentSession.startAutoSave();
  currentSession.onPause(() => showPauseOverlay(currentSession, () => { }));
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  nextTrial();

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    finishSubTest(3, '注意广度', correct, trialIndex || 1, wrong, reactionTimer, -1, questionLogs);
  });
}
