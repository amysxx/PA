/**
 * 执行力测试模块
 * 子测试1: 行动计划 — 迷宫连线/路径规划
 * 子测试2: 冲动控制 — Go/No-Go 测试
 * 子测试3: 认知灵活性 — 规则交替
 */
import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';
import { TestSession, showPauseOverlay } from '../../utils/testSession.js';
import { questionManager } from '../../utils/questionManager.js';

let currentTimer = null;
let currentSession = null;

export function renderExecution(app) {
  const user = store.get('user');
  if (!user.name) { router.navigate('/user-info'); return; }

  const progress = store.get('testProgress.execution');
  let currentSub = progress.subTests.findIndex(s => !s);
  if (currentSub === -1) currentSub = 0;
  renderSubTest(app, currentSub);
}

function renderSubTest(app, subIndex) {
  if (currentTimer) { currentTimer.stop(); currentTimer = null; }
  switch (subIndex) {
    case 0: renderActionPlanning(app); break;
    case 1: renderImpulseControl(app); break;
    case 2: renderCognitiveFlexibility(app); break;
    default: router.navigate('/test-select');
  }
}

/* ===== 子测试1: 行动计划 (简化为迷宫/路径规划选择) ===== */
async function renderActionPlanning(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const questionsDB = await questionManager.getQuestionsByCategory('execution', '行动计划');

  if (questionsDB.length > 0) {
    renderImageBasedTest(app, questionsDB, diff, '行动计划', 0, 1);
    return;
  }

  // 内置测试：连线顺序选择（简化的寻路）
  const totalRounds = diff.rounds;
  const timeLimit = diff.timeLimit;
  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  function nextTrial() {
    if (round >= totalRounds) {
      currentTimer.stop();
      finishSubTest(0, '行动计划', correct, totalRounds, wrong, reactionTimer, 1, questionLogs);
      return;
    }

    const start = Math.floor(Math.random() * 5) + 1;
    const paths = [
      `${start} → ${start + 1} → ${start + 2} → ${start + 3}`,
      `${start} → ${start + 2} → ${start + 1} → ${start + 3}`,
      `${start} → ${start + 1} → ${start + 3} → ${start + 2}`
    ];
    const targetPath = paths[0]; // 正确按顺序连线

    // Shuffle options
    const options = [...paths].sort(() => Math.random() - 0.5);
    const answerIdx = options.indexOf(targetPath);

    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${totalRounds} 题</span><br/>
        <span style="font-size:1.2rem;">哪一条是正确的从小到大连线路径？</span>
      </div>
      <div class="test-options" style="max-width:500px; margin-top:20px;">
        ${options.map((opt, i) => `
          <div class="test-option" data-answer="${i}">${opt}</div>
        `).join('')}
      </div>
    `;

    reactionTimer.start();
    contentEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const answer = parseInt(opt.dataset.answer);
        const isCorrect = answer === answerIdx;
        questionLogs.push({
          prompt: '哪一条是正确的从小到大连线路径？',
          shown: options.join(' | '),
          userAnswer: options[answer],
          correctAnswer: options[answerIdx],
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #00CEC9, #81ECEC);">🗺️</div>
            <div>
              <div class="test-header-title">执行力 · 行动计划</div>
              <div class="test-header-subtitle">规划正确的行动路径</div>
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
    () => finishSubTest(0, '行动计划', correct, round || 1, wrong, reactionTimer, 1, questionLogs)
  );
  currentTimer.start();
  nextTrial();
}

/* ===== 子测试2: 冲动控制 (Go/No-Go) ===== */
function renderImpulseControl(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const totalStimuli = diff.goNoGoCount;
  const timeLimit = diff.timeLimit;

  // 绿灯行(Go) / 红灯停(No-Go)
  const goStimulus = '🟢';
  const noGoStimulus = '🔴';

  let stimulusIndex = 0;
  let hits = 0;        // 正确点击 Go
  let misses = 0;      // 漏点 Go
  let falseAlarms = 0; // 错误点击 No-Go (冲动)
  let correctRejections = 0; // 正确不点 No-Go
  let responded = false;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  // 70% Go, 30% No-Go
  const stimuli = [];
  for (let i = 0; i < totalStimuli; i++) {
    stimuli.push(Math.random() < 0.7 ? { type: 'go', icon: goStimulus } : { type: 'nogo', icon: noGoStimulus });
  }

  function showStimulus() {
    if (stimulusIndex >= totalStimuli) {
      currentTimer.stop();
      finishSubTest(1, '冲动控制', hits + correctRejections, totalStimuli, falseAlarms, reactionTimer, 2, questionLogs);
      return;
    }

    const stim = stimuli[stimulusIndex];
    responded = false;

    const displayEl = document.getElementById('stimulus-display');
    const counterEl = document.getElementById('stim-counter');
    if (!displayEl) return;

    displayEl.innerHTML = `<span style="font-size:6rem; animation: popIn 0.2s ease;">${stim.icon}</span>`;
    counterEl.textContent = `${stimulusIndex + 1}/${totalStimuli}`;

    if (stim.type === 'go') reactionTimer.start();

    setTimeout(() => {
      if (!responded) {
        if (stim.type === 'go') misses++;
        else correctRejections++;
      }
      questionLogs.push({
        prompt: `刺激 ${stim.icon}`,
        userAnswer: responded ? '点击' : '未点击',
        correctAnswer: stim.type === 'go' ? '点击' : '不点击',
        isCorrect: (responded && stim.type === 'go') || (!responded && stim.type !== 'go')
      });
      stimulusIndex++;
      displayEl.innerHTML = ''; // 消失一小段时间
      setTimeout(showStimulus, 400); // 刺激间隔
    }, diff.stimulusDuration);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #FF7675, #D63031);">🛑</div>
            <div>
              <div class="test-header-title">执行力 · 冲动控制</div>
              <div class="test-header-subtitle">看到 🟢 按下，看到 🔴 忍住不按！</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content" style="text-align:center;">
          <div id="stim-counter" style="font-size:0.85rem; color:var(--text-light); margin-bottom:16px;"></div>
          <div id="stimulus-display" style="height:150px; display:flex; align-items:center; justify-content:center;">
            准备开始...
          </div>
          <button id="btn-hit" class="btn btn-primary btn-large" style="margin-top:32px; min-width:200px; height:80px; font-size:1.5rem;">
            👆 点击 (仅绿灯)
          </button>
        </div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (rem) => { timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`; },
    () => finishSubTest(1, '冲动控制', hits + correctRejections, totalStimuli, falseAlarms, reactionTimer, 2, questionLogs)
  );
  currentTimer.start();

  setTimeout(showStimulus, 1500);

  document.getElementById('btn-hit').addEventListener('click', () => {
    if (stimulusIndex >= totalStimuli || responded) return;
    responded = true;
    const stim = stimuli[stimulusIndex];
    if (stim.type === 'go') {
      hits++;
      reactionTimer.record();
    } else {
      falseAlarms++;
    }
  });
}

/* ===== 子测试3: 认知灵活性 (类似威斯康星卡片分类简化版) ===== */
function renderCognitiveFlexibility(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const totalRounds = diff.flexRounds;
  const timeLimit = diff.timeLimit;

  let round = 0;
  let correct = 0;
  let wrong = 0;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  const rules = ['颜色', '形状'];
  let currentRule = rules[0];
  let consecutiveCorrect = 0;

  function nextTrial() {
    if (round >= totalRounds) {
      currentTimer.stop();
      finishSubTest(2, '认知灵活性', correct, totalRounds, wrong, reactionTimer, -1, questionLogs);
      return;
    }

    // 动态规则切换（每对 N 次悄悄换规则）
    if (consecutiveCorrect >= diff.ruleSwitchAfter) {
      currentRule = currentRule === '颜色' ? '形状' : '颜色';
      consecutiveCorrect = 0;
    }

    const colors = ['#E17055', '#0984E3', '#00B894'];
    const shapes = ['■', '●', '▲'];

    // 目标卡片
    const targetColor = colors[Math.floor(Math.random() * colors.length)];
    const targetShape = shapes[Math.floor(Math.random() * shapes.length)];

    // 选项卡片 (至少有一个颜色匹配，一个形状匹配)
    const options = [
      { color: targetColor, shape: shapes[(shapes.indexOf(targetShape) + 1) % 3] }, // 颜色相符
      { color: colors[(colors.indexOf(targetColor) + 1) % 3], shape: targetShape }, // 形状相符
      { color: colors[(colors.indexOf(targetColor) + 2) % 3], shape: shapes[(shapes.indexOf(targetShape) + 2) % 3] } // 都不符合
    ].sort(() => Math.random() - 0.5);

    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${round + 1}/${totalRounds} 题</span><br/>
        <span style="font-size:1.1rem;">请根据未知的规则为上方卡片分类</span><br/>
        <span style="font-size:0.8rem; color:var(--accent-orange);">提示: 规则可能会中途改变！试探出正确规则</span>
      </div>
      
      <div style="font-size:4rem; color:${targetColor}; margin:20px 0; text-align:center;">
        ${targetShape}
      </div>
      
      <div style="display:flex; gap:20px; justify-content:center;">
        ${options.map((opt, i) => `
          <div class="test-option flex-card" data-idx="${i}" style="width:100px; height:120px; display:flex; align-items:center; justify-content:center; font-size:3rem; color:${opt.color}; cursor:pointer; background:var(--bg-card); border-radius:var(--radius-md); box-shadow:var(--shadow-sm);">
            ${opt.shape}
          </div>
        `).join('')}
      </div>
      
      <div id="feedback" style="height:30px; margin-top:16px; font-weight:700; font-size:1.2rem; text-align:center;"></div>
    `;

    reactionTimer.start();
    contentEl.querySelectorAll('.flex-card').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.idx);
        const chosen = options[idx];

        let isCorrect = false;
        if (currentRule === '颜色' && chosen.color === targetColor) isCorrect = true;
        if (currentRule === '形状' && chosen.shape === targetShape) isCorrect = true;
        questionLogs.push({
          prompt: `规则判断（${currentRule}）`,
          shown: `目标:${targetShape}/${targetColor} 选择:${chosen.shape}/${chosen.color}`,
          userAnswer: `${chosen.shape}/${chosen.color}`,
          correctAnswer: currentRule === '颜色' ? `颜色:${targetColor}` : `形状:${targetShape}`,
          isCorrect
        });

        const fb = document.getElementById('feedback');
        if (isCorrect) {
          correct++;
          consecutiveCorrect++;
          fb.textContent = '✅ 正确';
          fb.style.color = 'var(--accent-green)';
        } else {
          wrong++;
          consecutiveCorrect = 0; // 错误重置连对
          fb.textContent = '❌ 错误';
          fb.style.color = '#FF7675';
        }

        reactionTimer.record();
        round++;
        setTimeout(nextTrial, 800);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #0984E3, #74B9FF);">🔀</div>
            <div>
              <div class="test-header-title">执行力 · 认知灵活性</div>
              <div class="test-header-subtitle">根据反馈发现并适应新规则</div>
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
    () => finishSubTest(2, '认知灵活性', correct, round || 1, wrong, reactionTimer, -1, questionLogs)
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
            <div class="test-header-title">执行力 · ${testName}</div>
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
  const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'execution');
  store.setTestResult('execution', subIndex, score, { name, correct, total, wrong, correctRate: Math.round(correctRate * 100), avgReactionTime: Math.round(avgRT), questionLogs });
  showResult(score, name, correct, total, nextSub);
}

function showResult(score, testName, achieved, total, nextSubIndex) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page page-center" style="min-height:100vh;">
      <div class="modal">
        <div class="modal-title">${testName} 完成！得分：${Math.round(score)}</div>
        <div class="modal-actions">
          ${nextSubIndex >= 0 && nextSubIndex <= 2 ? `<button class="btn btn-primary" id="btn-next">继续下一项</button>` : `<button class="btn btn-primary" id="btn-back">返回选择</button>`}
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
    '5-7岁组': { rounds: 5, timeLimit: 60, goNoGoCount: 15, stimulusDuration: 1200, flexRounds: 10, ruleSwitchAfter: 3 },
    '8-14岁组': { rounds: 8, timeLimit: 90, goNoGoCount: 30, stimulusDuration: 800, flexRounds: 20, ruleSwitchAfter: 4 }
  };
  return configs[ageGroup] || configs['8-14岁组'];
}
