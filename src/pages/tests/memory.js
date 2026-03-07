/**
 * 记忆力测试模块
 * 子测试1: 短时记忆 — 数字序列复述
 * 子测试2: 工作记忆 — 倒序复述
 * 子测试3: 长时记忆 — 图片再认
 */
import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';
import { TestSession, showPauseOverlay } from '../../utils/testSession.js';
import { questionManager } from '../../utils/questionManager.js';

let currentTimer = null;
let currentSession = null;

export function renderMemory(app) {
  const user = store.get('user');
  if (!user.name) { router.navigate('/user-info'); return; }

  const progress = store.get('testProgress.memory');
  let currentSub = progress.subTests.findIndex(s => !s);
  if (currentSub === -1) currentSub = 0;
  renderSubTest(app, currentSub);
}

function renderSubTest(app, subIndex) {
  if (currentTimer) { currentTimer.stop(); currentTimer = null; }
  switch (subIndex) {
    case 0: renderShortTermMemory(app); break;
    case 1: renderWorkingMemory(app); break;
    case 2: renderLongTermMemory(app); break;
    case 3: renderEpisodicMemory(app); break;
    case 4: renderVisualMemory(app); break;
    default: router.navigate('/test-select');
  }
}

/* ===== 子测试1: 短时记忆 - 数字序列复述 ===== */
function renderShortTermMemory(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const timeLimit = diff.memoryTime;
  let level = diff.startLength;
  let correct = 0;
  let wrong = 0;
  let totalAttempts = 0;
  const maxLevel = diff.maxLength;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  function generateSequence(len) {
    const seq = [];
    for (let i = 0; i < len; i++) {
      seq.push(Math.floor(Math.random() * 10));
    }
    return seq;
  }

  function showSequence() {
    if (level > maxLevel || wrong >= 3) {
      currentTimer.stop();
      finishSubTest(0, '短时记忆', correct, totalAttempts || 1, wrong, reactionTimer, 1, questionLogs);
      return;
    }

    const sequence = generateSequence(level);
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    // 展示阶段
    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">记住以下数字序列 (${level}位)</span>
      </div>
      <div class="sequence-display">
        ${sequence.map(n => `
          <span class="sequence-item" style="font-size:2.5rem; font-weight:900; color:var(--text-white); font-family:var(--font-display);">${n}</span>
        `).join('')}
      </div>
      <div style="margin-top:16px; color:var(--text-light); font-size:0.9rem;">
        请记住这些数字...
      </div>
    `;

    // 展示一段时间后进入回忆阶段
    setTimeout(() => {
      contentEl.innerHTML = `
        <div class="test-question">
          <span style="font-size:0.85rem; color:var(--text-light);">请按顺序输入刚才看到的数字</span>
        </div>
        <div id="user-input" style="
          font-size:2.5rem; font-weight:900; color:var(--primary);
          font-family:var(--font-display);
          min-height:60px; display:flex; align-items:center; justify-content:center;
          gap:8px; margin-bottom:20px;
        "></div>
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:10px; max-width:300px; margin:0 auto;">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `
            <div class="number-cell" data-num="${n}" style="width:52px; height:52px; font-size:1.3rem; font-weight:700;">${n}</div>
          `).join('')}
        </div>
        <div style="margin-top:16px; display:flex; gap:12px; justify-content:center;">
          <button class="btn btn-secondary" id="btn-clear">清除</button>
          <button class="btn btn-primary" id="btn-confirm">确认</button>
        </div>
      `;

      reactionTimer.start();
      let userAnswer = [];

      contentEl.querySelectorAll('.number-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          if (userAnswer.length < level) {
            userAnswer.push(parseInt(cell.dataset.num));
            document.getElementById('user-input').innerHTML = userAnswer.map(n =>
              `<span style="background:var(--bg-card); padding:8px 14px; border-radius:var(--radius-md); box-shadow:var(--shadow-sm);">${n}</span>`
            ).join('');
          }
        });
      });

      document.getElementById('btn-clear')?.addEventListener('click', () => {
        userAnswer = [];
        document.getElementById('user-input').innerHTML = '';
      });

      document.getElementById('btn-confirm')?.addEventListener('click', () => {
        reactionTimer.record();
        totalAttempts++;
        const isCorrect = userAnswer.length === sequence.length &&
          userAnswer.every((n, i) => n === sequence[i]);
        questionLogs.push({
          prompt: `记住以下数字序列（${level}位）`,
          shown: sequence.join(''),
          userAnswer: userAnswer.join(''),
          correctAnswer: sequence.join(''),
          isCorrect
        });

        if (isCorrect) {
          correct++;
          level++;
        } else {
          wrong++;
        }
        setTimeout(showSequence, 500);
      });
    }, level * 800 + 500);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #00CEC9, #81ECEC);">🧠</div>
            <div>
              <div class="test-header-title">记忆力 · 短时记忆</div>
              <div class="test-header-subtitle">记住并复述出数字序列</div>
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
    () => finishSubTest(0, '短时记忆', correct, totalAttempts || 1, wrong, reactionTimer, 1, questionLogs)
  );
  currentTimer.start();

  currentSession = new TestSession('memory', 0, { total: maxLevel });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  showSequence();

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    currentTimer.stop();
    finishSubTest(0, '短时记忆', correct, totalAttempts || 1, wrong, reactionTimer, 1, questionLogs);
  });
}

/* ===== 子测试2: 工作记忆 - 倒序复述 ===== */
function renderWorkingMemory(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const timeLimit = diff.memoryTime;
  let level = diff.startLength;
  let correct = 0;
  let wrong = 0;
  let totalAttempts = 0;
  const maxLevel = diff.maxLength;
  const reactionTimer = new ReactionTimer();
  const questionLogs = [];

  function generateSequence(len) {
    const seq = [];
    for (let i = 0; i < len; i++) {
      seq.push(Math.floor(Math.random() * 10));
    }
    return seq;
  }

  function showSequence() {
    if (level > maxLevel || wrong >= 3) {
      currentTimer.stop();
      finishSubTest(1, '工作记忆', correct, totalAttempts || 1, wrong, reactionTimer, 2, questionLogs);
      return;
    }

    const sequence = generateSequence(level);
    const reversed = [...sequence].reverse();
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">记住以下数字，然后 <strong style="color:var(--accent-pink);">倒序</strong> 输入 (${level}位)</span>
      </div>
      <div class="sequence-display">
        ${sequence.map(n => `
          <span class="sequence-item" style="font-size:2.5rem; font-weight:900; color:var(--text-white); font-family:var(--font-display);">${n}</span>
        `).join('')}
      </div>
      <div style="margin-top:16px; color:var(--text-light); font-size:0.9rem;">
        请记住这些数字，稍后倒序输入...
      </div>
    `;

    setTimeout(() => {
      contentEl.innerHTML = `
        <div class="test-question">
          <span style="font-size:0.85rem; color:var(--text-light);">请 <strong style="color:var(--accent-pink);">倒序</strong> 输入刚才看到的数字</span>
        </div>
        <div id="user-input" style="
          font-size:2.5rem; font-weight:900; color:var(--accent-pink);
          font-family:var(--font-display);
          min-height:60px; display:flex; align-items:center; justify-content:center;
          gap:8px; margin-bottom:20px;
        "></div>
        <div style="display:grid; grid-template-columns: repeat(5, 1fr); gap:10px; max-width:300px; margin:0 auto;">
          ${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map(n => `
            <div class="number-cell" data-num="${n}" style="width:52px; height:52px; font-size:1.3rem; font-weight:700;">${n}</div>
          `).join('')}
        </div>
        <div style="margin-top:16px; display:flex; gap:12px; justify-content:center;">
          <button class="btn btn-secondary" id="btn-clear">清除</button>
          <button class="btn btn-primary" id="btn-confirm">确认</button>
        </div>
      `;

      reactionTimer.start();
      let userAnswer = [];

      contentEl.querySelectorAll('.number-cell').forEach(cell => {
        cell.addEventListener('click', () => {
          if (userAnswer.length < level) {
            userAnswer.push(parseInt(cell.dataset.num));
            document.getElementById('user-input').innerHTML = userAnswer.map(n =>
              `<span style="background:var(--bg-card); padding:8px 14px; border-radius:var(--radius-md); box-shadow:var(--shadow-sm);">${n}</span>`
            ).join('');
          }
        });
      });

      document.getElementById('btn-clear')?.addEventListener('click', () => {
        userAnswer = [];
        document.getElementById('user-input').innerHTML = '';
      });

      document.getElementById('btn-confirm')?.addEventListener('click', () => {
        reactionTimer.record();
        totalAttempts++;
        const isCorrect = userAnswer.length === reversed.length &&
          userAnswer.every((n, i) => n === reversed[i]);
        questionLogs.push({
          prompt: `倒序复述数字（${level}位）`,
          shown: sequence.join(''),
          userAnswer: userAnswer.join(''),
          correctAnswer: reversed.join(''),
          isCorrect
        });

        if (isCorrect) {
          correct++;
          level++;
        } else {
          wrong++;
        }
        setTimeout(showSequence, 500);
      });
    }, level * 800 + 500);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #00CEC9, #81ECEC);">🔄</div>
            <div>
              <div class="test-header-title">记忆力 · 工作记忆</div>
              <div class="test-header-subtitle">记住数字并倒序复述</div>
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
    () => finishSubTest(1, '工作记忆', correct, totalAttempts || 1, wrong, reactionTimer, 2, questionLogs)
  );
  currentTimer.start();

  currentSession = new TestSession('memory', 1, { total: maxLevel });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  showSequence();

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    currentTimer.stop();
    finishSubTest(1, '工作记忆', correct, totalAttempts || 1, wrong, reactionTimer, 2, questionLogs);
  });
}

/* ===== 子测试3: 长时记忆 - 图片再认 ===== */
async function renderLongTermMemory(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const timeLimit = diff.memoryTime;

  // 尝试从题库加载
  const questions = await questionManager.getQuestionsByCategory('memory', '长时记忆', store.get('user.ageGroup'));

  // 使用内置emoji记忆题
  const emojis = ['🍎', '🐱', '🌈', '🎈', '🏠', '🚗', '⭐', '🎵', '🌻', '🦋', '🎪', '🍕'];
  const targetCount = diff.memoryItems;
  const targets = emojis.slice(0, targetCount);
  const distractors = ['🔑', '📎', '🧲', '🔧', '📌', '🖊️', '📏', '🪄'];

  let phase = 'learn'; // learn → test
  let correct = 0;
  let wrong = 0;
  let totalAttempts = 0;
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #00CEC9, #81ECEC);">📸</div>
            <div>
              <div class="test-header-title">记忆力 · 长时记忆</div>
              <div class="test-header-subtitle">记住展示的图案，稍后辨认</div>
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
    () => finishSubTest(2, '长时记忆', correct, totalAttempts || 1, wrong, reactionTimer, 3, questionLogs)
  );
  currentTimer.start();

  currentSession = new TestSession('memory', 2, { total: targetCount });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  // 学习阶段
  const contentEl = document.getElementById('test-inner-content');
  contentEl.innerHTML = `
    <div class="test-question">
      <span style="font-size:1.1rem; font-weight:700;">请记住以下 ${targetCount} 个图案</span>
    </div>
    <div style="display:grid; grid-template-columns: repeat(${Math.min(targetCount, 4)}, 1fr); gap:16px; max-width:400px; margin:20px auto;">
      ${targets.map(e => `<div style="font-size:3rem; text-align:center; padding:16px; background:var(--bg-card); border-radius:var(--radius-md); box-shadow:var(--shadow-sm); animation:bounceIn 0.5s ease;">${e}</div>`).join('')}
    </div>
    <div style="margin-top:20px; color:var(--text-light); font-size:0.9rem;">
      倒计时结束后将进入辨认环节...
    </div>
  `;

  // 展示一段时间后进入测试阶段
  setTimeout(() => {
    // 混合目标和干扰项
    const allItems = [...targets, ...distractors.slice(0, targetCount)];
    const shuffled = allItems.sort(() => Math.random() - 0.5);

    let idx = 0;
    function nextItem() {
      if (idx >= shuffled.length) {
        currentTimer.stop();
        finishSubTest(2, '长时记忆', correct, totalAttempts, wrong, reactionTimer, 3, questionLogs);
        return;
      }

      const item = shuffled[idx];
      const isTarget = targets.includes(item);

      contentEl.innerHTML = `
        <div class="test-question">
          <span style="font-size:0.85rem; color:var(--text-light);">第 ${idx + 1}/${shuffled.length} 个</span><br/>
          <span style="font-size:1rem;">这个图案你之前见过吗？</span>
        </div>
        <div style="font-size:5rem; margin:24px 0; animation:popIn 0.3s ease;">${item}</div>
        <div class="test-options" style="max-width:400px;">
          <div class="test-option" data-answer="yes" style="font-size:1.1rem;">✅ 见过</div>
          <div class="test-option" data-answer="no" style="font-size:1.1rem;">❌ 没见过</div>
        </div>
      `;

      reactionTimer.start();

      contentEl.querySelectorAll('.test-option').forEach(opt => {
        opt.addEventListener('click', () => {
          totalAttempts++;
          const answered = opt.dataset.answer;
          const isCorrectAnswer = (answered === 'yes' && isTarget) || (answered === 'no' && !isTarget);
          questionLogs.push({
            prompt: '这个图案你之前见过吗？',
            shown: item,
            userAnswer: answered === 'yes' ? '见过' : '没见过',
            correctAnswer: isTarget ? '见过' : '没见过',
            isCorrect: isCorrectAnswer
          });

          if (isCorrectAnswer) {
            correct++;
            opt.classList.add('correct');
          } else {
            wrong++;
            opt.classList.add('wrong');
          }
          reactionTimer.record();
          idx++;
          setTimeout(nextItem, 400);
        });
      });
    }

    nextItem();
  }, targetCount * 1200 + 2000);

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    currentTimer.stop();
    finishSubTest(2, '长时记忆', correct, totalAttempts || 1, wrong, reactionTimer, 3, questionLogs);
  });
}

/* ===== 通用完成处理 ===== */
function finishSubTest(subIndex, name, correct, total, wrong, reactionTimer, nextSub, questionLogs = []) {
  const correctRate = correct / Math.max(total, 1);
  const avgRT = reactionTimer.getAverage() || 3000;
  const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'memory');

  store.setTestResult('memory', subIndex, score, {
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
          ${nextSubIndex >= 0 && nextSubIndex <= 4 ? `
            <button class="btn btn-primary" id="btn-next">继续下一项 →</button>
          ` : `
            <button class="btn btn-primary" id="btn-back">返回选择 ✓</button>
          `}
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
    '5-7岁组': { startLength: 2, maxLength: 5, memoryTime: 120, memoryItems: 5 },  // 幼小园: 短序列, 少项
    '8-11岁组': { startLength: 4, maxLength: 7, memoryTime: 120, memoryItems: 7 },  // 小学: 中等长度
    '12-14岁组': { startLength: 5, maxLength: 9, memoryTime: 120, memoryItems: 9 },  // 初中: 较长序列
    '15-18岁组': { startLength: 6, maxLength: 11, memoryTime: 120, memoryItems: 12 }, // 高中: 长序列
  };
  return configs[ageGroup] || configs['8-11岁组'];
}

function getQuickLevel(score) {
  if (score >= 28) return { level: '优秀', color: '#00B894', emoji: '🌟' };
  if (score >= 22) return { level: '良好', color: '#6C5CE7', emoji: '👍' };
  if (score >= 15) return { level: '中等', color: '#FDCB6E', emoji: '💪' };
  return { level: '继续加油', color: '#E17055', emoji: '📚' };
}

/* ===== 子测试3: 情景记忆 — 故事细节识别 ===== */
function renderEpisodicMemory(app) {
  const ageGroup = store.get('user.ageGroup');
  // 8-14岁组（年龄超过12）统一详细测，不跳过
  const timeLimit = 180; // 3分钟
  const STORY = {
    text: '一个晴朗的早晨，小明乘公共汽车去图书馆还书。公共汽车是蓝色的，车上有九个乘客。小明坐在靠窗的位置，怀里抑着三本书。到图书馆的路上要经过两个红竪灯和一个公园。图书馆工作人员叫李大婄，她帮小明办理了还书手续。小明册如期至了图书馆的开馆时间（9点）前5分钟到达。还书后，小明又借了两本新书。',
    questions: [
      { q: '公共汽车是什么颜色的？', options: ['红色', '蓝色', '黄色', '绿色'], correct: 1 },
      { q: '车上原来有多少个乘客？', options: ['7个', '8个', '9个', '10个'], correct: 2 },
      { q: '小明怀里抑着多少本书去还？', options: ['2本', '3本', '4本', '5本'], correct: 1 },
      { q: '路上经过了几个红竪灯？', options: ['1个', '2个', '3个', '4个'], correct: 1 },
      { q: '图书馆工作人员叫什么名字？', options: ['王小海', '李大婄', '张玉梅', '丁小连'], correct: 1 },
      { q: '图书馆的开馆时间是？', options: ['8点', '9点', '10点', '7点'], correct: 1 },
      { q: '小明几点到达图书馆？', options: ['8点51分', '8点55分', '9点5分前', '9点5分后'], correct: 1 },
      { q: '还书后小明又借了几本书？', options: ['1本', '2本', '3本', '4本'], correct: 1 },
    ]
  };

  let questionIndex = -1; // -1 表示正在阅读故事阶段
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #00CEC9, #81ECEC);">📚</div>
            <div>
              <div class="test-header-title">记忆力 · 情景记忆</div>
              <div class="test-header-subtitle">认真阅读以下故事，然后回答问题</div>
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
    () => finishSubTest(3, '情景记忆', correct, STORY.questions.length, wrong, reactionTimer, 4, questionLogs)
  );
  currentTimer.start();

  currentSession = new TestSession('memory', 3, { total: STORY.questions.length });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  // 展示故事
  const contentEl = document.getElementById('test-inner-content');
  contentEl.innerHTML = `
    <div style="background:var(--bg-card); border-radius:var(--radius-md); padding:20px; line-height:1.9; font-size:0.95rem; color:var(--text-primary); margin-bottom:16px; box-shadow:var(--shadow-sm);">
      ${STORY.text}
    </div>
    <button class="btn btn-primary" id="btn-start-questions" style="width:100%;">我记好了，开始回答 →</button>
  `;

  document.getElementById('btn-start-questions').addEventListener('click', () => {
    questionIndex = 0;
    nextQuestion();
  });

  function nextQuestion() {
    if (questionIndex >= STORY.questions.length) {
      currentTimer.stop();
      finishSubTest(3, '情景记忆', correct, STORY.questions.length, wrong, reactionTimer, 4, questionLogs);
      return;
    }
    const q = STORY.questions[questionIndex];
    const innerEl = document.getElementById('test-inner-content');
    if (!innerEl) return;
    reactionTimer.start();
    innerEl.innerHTML = `
      <div class="test-question">
        <span style="font-size:0.85rem; color:var(--text-light);">第 ${questionIndex + 1}/${STORY.questions.length} 题</span><br/>
        ${q.q}
      </div>
      <div class="test-options" style="max-width:480px;">
        ${q.options.map((opt, i) => `<div class="test-option" data-idx="${i}">${String.fromCharCode(65 + i)}. ${opt}</div>`).join('')}
      </div>
    `;
    innerEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        reactionTimer.record();
        const idx = parseInt(opt.dataset.idx);
        const isCorrect = idx === q.correct;
        questionLogs.push({ prompt: q.q, userAnswer: q.options[idx], correctAnswer: q.options[q.correct], isCorrect });
        if (isCorrect) { correct++; opt.classList.add('correct'); }
        else { wrong++; opt.classList.add('wrong'); innerEl.querySelectorAll('.test-option').forEach(o => { if (parseInt(o.dataset.idx) === q.correct) o.classList.add('correct'); }); }
        questionIndex++;
        setTimeout(nextQuestion, 500);
      });
    });
  }

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    currentTimer.stop();
    finishSubTest(3, '情景记忆', correct, STORY.questions.length, wrong, reactionTimer, 4, questionLogs);
  });
}

/* ===== 子测试4: 视觉记忆 — 图形延迟回忆 ===== */
function renderVisualMemory(app) {
  const timeLimit = 120;
  // 定义一套图形元素组合，展示目标图出题
  const SHAPES = [
    { id: 'A', svg: '<rect x="20" y="20" width="60" height="60" fill="#6C5CE7" rx="8"/><circle cx="100" cy="50" r="25" fill="#E17055"/><polygon points="140,20 170,80 110,80" fill="#00B894"/>', label: '方圆三角' },
    { id: 'B', svg: '<circle cx="50" cy="50" r="30" fill="#6C5CE7"/><rect x="80" y="30" width="50" height="50" fill="#E17055" rx="6"/><circle cx="160" cy="70" r="20" fill="#00B894"/>', label: '圆方圆' },
    { id: 'C', svg: '<polygon points="50,20 80,80 20,80" fill="#6C5CE7"/><circle cx="120" cy="50" r="30" fill="#E17055"/><rect x="155" y="25" width="40" height="55" fill="#00B894" rx="4"/>', label: '三角圆方' },
    { id: 'D', svg: '<rect x="20" y="35" width="55" height="35" fill="#6C5CE7" rx="4"/><polygon points="100,20 130,80 70,80" fill="#E17055"/><circle cx="165" cy="50" r="28" fill="#FDCB6E"/>', label: '方三角圆' },
  ];

  const targetIdx = Math.floor(Math.random() * SHAPES.length);
  const target = SHAPES[targetIdx];
  let phase = 'learn';
  let correct = 0;
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #00CEC9, #81ECEC);">🎨</div>
            <div>
              <div class="test-header-title">记忆力 · 视觉记忆</div>
              <div class="test-header-subtitle">记住图形，稍后在选项中找到它</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:00</div>
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
    () => finishSubTest(4, '视觉记忆', correct, 1, 1 - correct, reactionTimer, -1, questionLogs)
  );
  currentTimer.start();

  currentSession = new TestSession('memory', 4, { total: 1 });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  // 展示目标图
  const contentEl = document.getElementById('test-inner-content');
  contentEl.innerHTML = `
    <div class="test-question">请记住这张图形，30秒后自动隐藏</div>
    <div style="margin:20px auto; max-width:200px;">
      <svg viewBox="0 0 200 100" width="200" height="100" style="border:2px solid var(--border); border-radius:var(--radius-md); background:white;" id="target-svg">
        ${target.svg}
      </svg>
    </div>
    <div style="color:var(--text-light); font-size:0.9rem;">仔细观察图形的形状和颜色...</div>
  `;

  // 30秒后隐藏目标图，展示选项
  setTimeout(() => {
    const innerEl = document.getElementById('test-inner-content');
    if (!innerEl) return;
    reactionTimer.start();
    // 打乱选项顺序
    const shuffled = [...SHAPES].sort(() => Math.random() - 0.5);
    innerEl.innerHTML = `
      <div class="test-question">刚才展示的图形是哪一张？</div>
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; max-width:440px; margin:16px auto;">
        ${shuffled.map(s => `
          <div class="test-option" data-id="${s.id}" style="padding:10px; cursor:pointer;">
            <svg viewBox="0 0 200 100" width="100%" style="border:2px solid var(--border); border-radius:var(--radius-md); background:white;">
              ${s.svg}
            </svg>
          </div>
        `).join('')}
      </div>
    `;
    innerEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        reactionTimer.record();
        currentTimer.stop();
        const answerId = opt.dataset.id;
        const isCorrect = answerId === target.id;
        questionLogs.push({ prompt: '视觉记忆图形选择', userAnswer: answerId, correctAnswer: target.id, isCorrect });
        if (isCorrect) { correct = 1; opt.classList.add('correct'); }
        else { opt.classList.add('wrong'); innerEl.querySelectorAll('.test-option').forEach(o => { if (o.dataset.id === target.id) o.classList.add('correct'); }); }
        setTimeout(() => finishSubTest(4, '视觉记忆', correct, 1, 1 - correct, reactionTimer, -1, questionLogs), 600);
      });
    });
  }, 30000);

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    currentTimer.stop();
    finishSubTest(4, '视觉记忆', correct, 1, 1 - correct, reactionTimer, -1, questionLogs);
  });
}
