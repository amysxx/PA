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

  // 内置题库
  const questionsPool = diff.ageGroup === '5-7岁组' ? [
    { q: '猫 → 动物，苹果 → ？', options: ['水果', '蔬菜', '动物', '植物'], answer: 0 },
    { q: '白天 → 太阳，晚上 → ？', options: ['月亮', '太阳', '星星', '云朵'], answer: 0 },
    { q: '笔 → 写字，剪刀 → ？', options: ['剪纸', '画画', '写字', '折纸'], answer: 0 },
    { q: '大 → 小，长 → ？', options: ['短', '高', '粗', '细'], answer: 0 }
  ] : [
    { q: '摄影 → 相机，绘画 → ？', options: ['画笔', '钢笔', '铅笔', '粉笔'], answer: 0 },
    { q: '蚕 → 丝绸，蜜蜂 → ？', options: ['蜂蜜', '花粉', '蜂蜡', '蜂巢'], answer: 0 },
    { q: '勇敢 → 怯懦，慷慨 → ？', options: ['吝啬', '大方', '善良', '小气'], answer: 0 },
    { q: '水 → 液体，冰 → ？', options: ['固体', '液体', '气体', '等离子'], answer: 0 }
  ];

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

  const questionsPool = diff.ageGroup === '5-7岁组' ? [
    { q: '2, 4, 6, 8, ？', options: ['9', '10', '11', '12'], answer: 1 },
    { q: '1, 3, 5, 7, ？', options: ['8', '9', '10', '11'], answer: 1 },
    { q: '🔴🔵🔴🔵🔴？', options: ['🔴', '🔵', '🟢', '🟡'], answer: 1 },
    { q: '△○△○△？', options: ['△', '○', '□', '☆'], answer: 1 }
  ] : [
    { q: '3, 6, 12, 24, ？', options: ['36', '48', '30', '42'], answer: 1 },
    { q: '1, 4, 9, 16, ？', options: ['20', '25', '24', '36'], answer: 1 },
    { q: '100, 81, 64, 49, ？', options: ['25', '36', '30', '40'], answer: 1 },
    { q: '1, 8, 27, 64, ？', options: ['100', '125', '81', '216'], answer: 1 }
  ];

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
    '5-7岁组': { ageGroup: '5-7岁组', rounds: 4, timeLimit: 60 },
    '8-14岁组': { ageGroup: '8-14岁组', rounds: 8, timeLimit: 90 }
  };
  return configs[ageGroup] || configs['8-14岁组'];
}

/* ===== 子测试3: 类比推理 — A:B=C:? ===== */
function renderAnalogicalReasoning(app) {
  const ageGroup = store.get('user.ageGroup');
  // 少于6岁跳过
  if (ageGroup === '5-7岁组') {
    store.setTestResult('comprehension', 3, 33, {
      name: '类比推理', correct: 0, total: 0, wrong: 0,
      correctRate: 100, avgReactionTime: 0, questionLogs: [],
      skipped: true, skipReason: '年龄不足5-6岁不在适用范围（6岁+），跳过'
    });
    renderSubTest(app, 4);
    return;
  }
  const questions = [
    { q: '手:手套 = 脚:?', options: ['鞋子', '帽子', '袖子', '裤子'], answer: 0 },
    { q: '医生:医院 = 老师:?', options: ['学校', '公司', '工厂', '商店'], answer: 0 },
    { q: '鸟:羽毛 = 鱼:?', options: ['鳞片', '内脏', '骨骼', '腾'], answer: 0 },
    { q: '原子:分子 = 华文:汉字', options: ['字母', '单词', '词语', '句子'], answer: 0 },
    { q: '身高:米 = 温度:?', options: ['摄氏度', '公尺', '味道', '天气'], answer: 0 },
    { q: '钢琴:好了一句:? = 笔:记录', options: ['英文', '音乐', '汉字', '题目'], answer: 1 },
    { q: '呆瓜:智慧 = 黑暗:光明', options: ['光明', '黑暗', '呆瓜', '智慧'], answer: 0 },
    { q: '海洋:深弹 = 山帕:平坦', options: ['平坦', '山帕', '驱氐', '混浊'], answer: 0 },
    { q: '友谊:敢意 = 坡度:敬业', options: ['唆恶', '敬业', '胆多了', '善良'], answer: 1 },
    { q: '每天:日 = 每年:?', options: ['年', '周', '月', '时'], answer: 2 },
  ];
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
        <span style="font-size:1.3rem; font-weight:700;">${q.q}</span>
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #A29BFE, #6C5CE7);">🔗</div>
            <div>
              <div class="test-header-title">理解力 · 类比推理</div>
              <div class="test-header-subtitle">A:对B就像C:对？</div>
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
  const questions = [
    { q: 'A比B高，B比C高，谁最矮？', options: ['A', 'B', 'C', '一样高'], answer: 2 },
    { q: '苹果比茹莓甜，荣谁比茹莓淫，荣谁比苹果如何？', options: ['甜', '淫', '一样', '无法判断'], answer: 0 },
    { q: '5个小朋友排一排，小明在第3个，小红在小明前面，小红是第几个？', options: ['第1个', '第2个', '第3个', '第4个'], answer: 1 },
    { q: 'A比B重，B和C一样重，C比D重。谁最轻？', options: ['A', 'B', 'C', 'D'], answer: 3 },
    { q: '同学赛跾，小明比小红跑得快，小灬比小明跑得慢。谁跑得最快？', options: ['小灬', '小明', '小红', '无法判断'], answer: 2 },
    { q: '台上有红、黄、蓝3颗吃糖。小红吃了红和黄的，小明吃了黄和蓝的，谁吃过黄色吃糖？', options: ['小红', '小明', '都吃过', '都没吃'], answer: 2 },
    { q: '【A>B, C>B】，A和C谁大？', options: ['A大', 'C大', '一样大', '无法判断'], answer: 3 },
    { q: '大树和小树之间的距离是5米，小树和中树之间的距离是3米。大树和中树之间的距离可能是？', options: ['2米', '8米', '2或8米', '不确定'], answer: 2 },
  ];
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
