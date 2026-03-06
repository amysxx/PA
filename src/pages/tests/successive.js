/**
 * 继时性加工测试模块
 * 子测试1: 数字序列记忆 — 按顺序复述数字序列
 * 子测试2: 词序记忆 — 按顺序回忆词语列表
 * 子测试3: 句子理解 — 理解包含顺序的句子
 */
import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';
import { TestSession, showPauseOverlay } from '../../utils/testSession.js';

let currentTimer = null;
let currentSession = null;

export function renderSuccessive(app) {
  const user = store.get('user');
  if (!user.name) { router.navigate('/user-info'); return; }

  const progress = store.get('testProgress.successive');
  let currentSub = progress.subTests.findIndex(s => !s);
  if (currentSub === -1) currentSub = 0;
  renderSubTest(app, currentSub);
}

function renderSubTest(app, subIndex) {
  if (currentTimer) { currentTimer.stop(); currentTimer = null; }
  switch (subIndex) {
    case 0: renderDigitSpan(app); break;
    case 1: renderWordOrder(app); break;
    case 2: renderSentenceOrder(app); break;
    default: router.navigate('/test-select');
  }
}

/* ===== 子测试1: 数字序列记忆 ===== */
function renderDigitSpan(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const rounds = diff.digitRounds;
  let startLen = diff.digitStartLen;

  let round = 0;
  let totalCorrect = 0;
  let totalAttempts = 0;
  let maxSpan = 0;
  const reactionTimer = new ReactionTimer();

  function nextRound() {
    if (round >= rounds) {
      finishSubTest(0, '数字序列记忆', totalCorrect, totalAttempts, reactionTimer, 1);
      return;
    }

    const len = startLen + Math.floor(round / 2);
    const sequence = [];
    for (let i = 0; i < len; i++) {
      sequence.push(Math.floor(Math.random() * 9) + 1);
    }

    // 阶段1: 展示数字
    showDigitDisplay(sequence, len, round, rounds, () => {
      // 阶段2: 输入
      showDigitInput(sequence, len, round, rounds, (isCorrect) => {
        totalAttempts++;
        if (isCorrect) {
          totalCorrect++;
          maxSpan = Math.max(maxSpan, len);
        }
        round++;
        setTimeout(nextRound, 800);
      });
    });
  }

  function showDigitDisplay(seq, len, rnd, total, onDone) {
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:16px;">第 ${rnd + 1}/${total} 轮 · 记住 ${len} 个数字</div>
      <div class="test-question">请仔细记住下面出现的数字序列</div>
      <div class="sequence-display" id="seq-display"></div>
      <div style="margin-top:20px; font-size:0.9rem; color:var(--text-light);">
        <span id="countdown-text">正在显示...</span>
      </div>
    `;

    const displayEl = document.getElementById('seq-display');
    let showIdx = 0;

    // 逐个显示数字
    const showInterval = setInterval(() => {
      if (showIdx >= seq.length) {
        clearInterval(showInterval);
        // 短暂停留后隐藏
        setTimeout(() => {
          document.getElementById('countdown-text').textContent = '请复现序列！';
          onDone();
        }, 1000);
        return;
      }
      const item = document.createElement('div');
      item.className = 'sequence-item';
      item.style.animationDelay = '0s';
      item.textContent = seq[showIdx];
      displayEl.appendChild(item);
      showIdx++;
    }, 800);
  }

  function showDigitInput(seq, len, rnd, total, onResult) {
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    let userInput = [];

    contentEl.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:16px;">第 ${rnd + 1}/${total} 轮</div>
      <div class="test-question">按顺序输入刚才看到的 ${len} 个数字</div>
      <div class="sequence-input-area" id="input-slots">
        ${seq.map(() => `<div class="sequence-input-slot"></div>`).join('')}
      </div>
      <div class="numpad" id="numpad">
        ${[1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => `
          <button class="numpad-key" data-num="${n}">${n}</button>
        `).join('')}
        <div></div>
        <button class="numpad-key" data-num="0">0</button>
        <button class="numpad-key delete" data-action="delete">⌫</button>
      </div>
      <button class="btn btn-primary" id="btn-confirm" style="margin-top:12px;" disabled>确认</button>
    `;

    reactionTimer.start();

    const slots = document.querySelectorAll('.sequence-input-slot');
    const confirmBtn = document.getElementById('btn-confirm');

    document.getElementById('numpad').addEventListener('click', (e) => {
      const key = e.target.closest('.numpad-key');
      if (!key) return;

      if (key.dataset.action === 'delete') {
        if (userInput.length > 0) {
          userInput.pop();
          updateSlots();
        }
        return;
      }

      const num = parseInt(key.dataset.num);
      if (userInput.length < seq.length) {
        userInput.push(num);
        updateSlots();
      }
    });

    function updateSlots() {
      slots.forEach((slot, i) => {
        if (i < userInput.length) {
          slot.textContent = userInput[i];
          slot.classList.add('filled');
        } else {
          slot.textContent = '';
          slot.classList.remove('filled');
        }
      });
      confirmBtn.disabled = userInput.length !== seq.length;
    }

    confirmBtn.addEventListener('click', () => {
      reactionTimer.record();
      const isCorrect = userInput.every((v, i) => v === seq[i]);

      // 显示结果
      slots.forEach((slot, i) => {
        if (userInput[i] === seq[i]) {
          slot.style.background = 'var(--accent-green)';
          slot.style.borderColor = 'var(--accent-green)';
        } else {
          slot.style.background = 'var(--accent-red)';
          slot.style.borderColor = 'var(--accent-red)';
        }
      });

      setTimeout(() => onResult(isCorrect), 800);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #FD79A8, #E84393);">🔢</div>
            <div>
              <div class="test-header-title">继时性加工 · 数字序列记忆</div>
              <div class="test-header-subtitle">记住并按顺序复述数字序列</div>
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

  currentSession = new TestSession('successive', 0, { total: rounds });
  currentSession.startAutoSave();
  document.getElementById('btn-pause')?.addEventListener('click', () => {
    currentSession.pause();
    showPauseOverlay(currentSession, () => { });
  });

  nextRound();

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    finishSubTest(0, '数字序列记忆', totalCorrect, totalAttempts || 1, reactionTimer, 1);
  });
}

/* ===== 子测试2: 词序记忆 ===== */
function renderWordOrder(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const ageGroup = store.get('user.ageGroup');
  const rounds = diff.wordRounds;

  const wordPools = {
    '幼儿组': ['猫', '狗', '鱼', '鸟', '花', '球', '星', '月', '树', '云'],
    '小学低年级组': ['苹果', '香蕉', '西瓜', '葡萄', '草莓', '书包', '铅笔', '橡皮', '尺子', '剪刀'],
    '小学高年级组': ['电脑', '手机', '相机', '钢琴', '篮球', '地图', '字典', '眼镜', '雨伞', '闹钟'],
    '初中组': ['知识', '勇气', '智慧', '友谊', '真理', '创造', '梦想', '希望', '自由', '和平'],
    '高中组': ['哲学', '逻辑', '科学', '文明', '理想', '探索', '规律', '思维', '创新', '发展']
  };

  const pool = wordPools[ageGroup] || wordPools['小学高年级组'];
  let round = 0;
  let totalCorrect = 0;
  let totalAttempts = 0;
  const reactionTimer = new ReactionTimer();

  function nextRound() {
    if (round >= rounds) {
      finishSubTest(1, '词序记忆', totalCorrect, totalAttempts, reactionTimer, 2);
      return;
    }

    const wordCount = diff.wordStartLen + Math.floor(round / 2);
    const shuffledPool = [...pool].sort(() => Math.random() - 0.5);
    const words = shuffledPool.slice(0, wordCount);

    // 展示阶段
    showWordsDisplay(words, round, rounds, () => {
      // 排序阶段
      showWordSorting(words, round, rounds, (isCorrect) => {
        totalAttempts++;
        if (isCorrect) totalCorrect++;
        round++;
        setTimeout(nextRound, 800);
      });
    });
  }

  function showWordsDisplay(words, rnd, total, onDone) {
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:16px;">第 ${rnd + 1}/${total} 轮 · 记住 ${words.length} 个词语的顺序</div>
      <div class="test-question">请记住这些词语的出现顺序</div>
      <div class="sequence-display" id="word-display"></div>
    `;

    const displayEl = document.getElementById('word-display');
    let idx = 0;

    const interval = setInterval(() => {
      if (idx >= words.length) {
        clearInterval(interval);
        setTimeout(onDone, 1200);
        return;
      }
      const item = document.createElement('div');
      item.className = 'sequence-item';
      item.style.width = 'auto';
      item.style.padding = '12px 20px';
      item.style.fontSize = '1.1rem';
      item.textContent = words[idx];
      displayEl.appendChild(item);
      idx++;
    }, 1000);
  }

  function showWordSorting(words, rnd, total, onResult) {
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    const shuffled = [...words].sort(() => Math.random() - 0.5);
    let selectedOrder = [];

    contentEl.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:12px;">第 ${rnd + 1}/${total} 轮</div>
      <div class="test-question">按刚才的顺序，依次点击词语</div>
      <div id="selected-area" style="
        display:flex; gap:8px; flex-wrap:wrap; justify-content:center;
        min-height:56px; margin:12px 0; padding:12px;
        border:2px dashed var(--primary-light); border-radius:var(--radius-md);
      "></div>
      <div id="word-choices" style="display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin:16px 0;">
        ${shuffled.map((w, i) => `
          <button class="btn btn-secondary word-choice" data-word="${w}" data-idx="${i}" style="font-size:1rem; padding:10px 20px;">
            ${w}
          </button>
        `).join('')}
      </div>
      <div style="display:flex; gap:12px; justify-content:center; margin-top:16px;">
        <button class="btn btn-secondary" id="btn-reset-words">🔄 重选</button>
        <button class="btn btn-primary" id="btn-confirm-words" disabled>确认</button>
      </div>
    `;

    reactionTimer.start();

    const selectedArea = document.getElementById('selected-area');
    const confirmBtn = document.getElementById('btn-confirm-words');

    document.getElementById('word-choices').addEventListener('click', (e) => {
      const btn = e.target.closest('.word-choice');
      if (!btn || btn.disabled) return;

      const word = btn.dataset.word;
      selectedOrder.push(word);
      btn.disabled = true;
      btn.style.opacity = '0.3';

      const tag = document.createElement('span');
      tag.style.cssText = 'background:var(--primary); color:white; padding:8px 16px; border-radius:var(--radius-full); font-weight:700; animation: popIn 0.3s ease;';
      tag.textContent = `${selectedOrder.length}. ${word}`;
      selectedArea.appendChild(tag);

      confirmBtn.disabled = selectedOrder.length !== words.length;
    });

    document.getElementById('btn-reset-words').addEventListener('click', () => {
      selectedOrder = [];
      selectedArea.innerHTML = '';
      document.querySelectorAll('.word-choice').forEach(btn => {
        btn.disabled = false;
        btn.style.opacity = '1';
      });
      confirmBtn.disabled = true;
    });

    confirmBtn.addEventListener('click', () => {
      reactionTimer.record();
      const isCorrect = selectedOrder.every((w, i) => w === words[i]);

      // 显示结果
      [...selectedArea.children].forEach((tag, i) => {
        tag.style.background = selectedOrder[i] === words[i] ? 'var(--accent-green)' : 'var(--accent-red)';
      });

      setTimeout(() => onResult(isCorrect), 800);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #FD79A8, #E84393);">📚</div>
            <div>
              <div class="test-header-title">继时性加工 · 词序记忆</div>
              <div class="test-header-subtitle">记住并按顺序选择词语</div>
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

  currentSession = new TestSession('successive', 1, { total: rounds });
  currentSession.startAutoSave();
  document.getElementById('btn-pause')?.addEventListener('click', () => {
    currentSession.pause();
    showPauseOverlay(currentSession, () => { });
  });

  nextRound();

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    finishSubTest(1, '词序记忆', totalCorrect, totalAttempts || 1, reactionTimer, 2);
  });
}

/* ===== 子测试3: 句子理解 ===== */
function renderSentenceOrder(app) {
  const diff = getDifficulty(store.get('user.ageGroup'));
  const ageGroup = store.get('user.ageGroup');
  const questions = generateSentenceQuestions(diff.sentenceCount, ageGroup);
  let currentQ = 0;
  let correct = 0;
  const reactionTimer = new ReactionTimer();

  function showQuestion() {
    if (currentQ >= questions.length) {
      finishSubTest(2, '句子理解', correct, questions.length, reactionTimer, -1);
      return;
    }
    const q = questions[currentQ];
    const contentEl = document.getElementById('test-inner-content');
    if (!contentEl) return;

    contentEl.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:12px;">第 ${currentQ + 1}/${questions.length} 题</div>
      <div class="test-question" style="
        background:#F8F6FF;
        padding:20px 28px;
        border-radius:var(--radius-md);
        border-left:4px solid var(--accent-pink);
        text-align:left;
        line-height:1.8;
        margin-bottom:24px;
        max-width:550px;
      ">${q.sentence}</div>
      <div class="test-question" style="font-weight:800; color:var(--primary);">${q.question}</div>
      <div class="test-options" style="max-width:500px;">
        ${q.options.map((opt, i) => `
          <div class="test-option" data-idx="${i}">${opt}</div>
        `).join('')}
      </div>
    `;

    reactionTimer.start();

    contentEl.querySelectorAll('.test-option').forEach(opt => {
      opt.addEventListener('click', () => {
        const idx = parseInt(opt.dataset.idx);
        if (idx === q.correctIndex) {
          correct++;
          opt.classList.add('correct');
        } else {
          opt.classList.add('wrong');
          contentEl.querySelectorAll('.test-option').forEach(o => {
            if (parseInt(o.dataset.idx) === q.correctIndex) o.classList.add('correct');
          });
        }
        reactionTimer.record();
        currentQ++;
        setTimeout(showQuestion, 700);
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #FD79A8, #E84393);">📖</div>
            <div>
              <div class="test-header-title">继时性加工 · 句子理解</div>
              <div class="test-header-subtitle">理解句子含义并回答问题</div>
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

  currentSession = new TestSession('successive', 2, { total: questions.length });
  currentSession.startAutoSave();
  document.getElementById('btn-pause')?.addEventListener('click', () => {
    currentSession.pause();
    showPauseOverlay(currentSession, () => { });
  });

  showQuestion();

  document.getElementById('btn-skip')?.addEventListener('click', () => {
    finishSubTest(2, '句子理解', correct, currentQ || 1, reactionTimer, -1);
  });
}

/* ===== 通用完成处理 ===== */
function finishSubTest(subIndex, name, correct, total, reactionTimer, nextSub) {
  const correctRate = correct / Math.max(total, 1);
  const avgRT = reactionTimer.getAverage() || 4000;
  const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'successive');

  store.setTestResult('successive', subIndex, score, {
    name, correct, total,
    correctRate: Math.round(correctRate * 100),
    avgReactionTime: Math.round(avgRT)
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
        <div style="font-family:var(--font-display); font-size:3rem; font-weight:900; color:${levelInfo.color}; margin:12px 0;">${Math.round(score)}分</div>
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

/* ===== 题目生成器 ===== */
function generateSentenceQuestions(count, ageGroup) {
  const easyQs = [
    {
      sentence: '小明先吃了早饭，然后去上学。',
      question: '小明先做了什么？',
      options: ['吃早饭', '去上学', '做作业', '玩游戏'],
      correctIndex: 0
    },
    {
      sentence: '妈妈买完菜之后，回家做饭。',
      question: '妈妈先做了什么？',
      options: ['买菜', '做饭', '吃饭', '洗碗'],
      correctIndex: 0
    },
    {
      sentence: '下雨之前，小白把衣服收了进来。',
      question: '哪个先发生？',
      options: ['收衣服', '下雨', '同时', '都没发生'],
      correctIndex: 0
    },
    {
      sentence: '因为天冷了，所以小红穿上了外套。',
      question: '小红为什么穿外套？',
      options: ['天冷了', '天热了', '要上学', '要出去玩'],
      correctIndex: 0
    },
    {
      sentence: '爸爸说："吃完饭才能看电视。"',
      question: '应该先做什么？',
      options: ['吃饭', '看电视', '做作业', '睡觉'],
      correctIndex: 0
    },
    {
      sentence: '弟弟比姐姐先到家，姐姐比哥哥先到家。',
      question: '谁最后到家？',
      options: ['哥哥', '姐姐', '弟弟', '不确定'],
      correctIndex: 0
    },
    {
      sentence: '小花先画了一朵花，再涂上颜色，最后写上名字。',
      question: '小花第二步做了什么？',
      options: ['涂颜色', '画花', '写名字', '交作业'],
      correctIndex: 0
    },
    {
      sentence: '老师说明天要考试，今天要好好复习。',
      question: '什么时候考试？',
      options: ['明天', '今天', '后天', '下周'],
      correctIndex: 0
    },
    {
      sentence: '小猫跳上了桌子，叼走了一条鱼。',
      question: '小猫先做了什么？',
      options: ['跳上桌子', '叼鱼', '吃鱼', '跳下来'],
      correctIndex: 0
    },
    {
      sentence: '洗手之后才能吃饭，吃完饭以后要刷牙。',
      question: '三件事的顺序是什么？',
      options: ['洗手→吃饭→刷牙', '吃饭→洗手→刷牙', '刷牙→洗手→吃饭', '吃饭→刷牙→洗手'],
      correctIndex: 0
    }
  ];

  const hardQs = [
    {
      sentence: '在完成科学实验之前，学生们需要先阅读实验手册，然后准备实验材料。',
      question: '正确的顺序是什么？',
      options: ['阅读→准备→实验', '准备→阅读→实验', '实验→阅读→准备', '准备→实验→阅读'],
      correctIndex: 0
    },
    {
      sentence: '如果明天不下雨，我们就去公园；否则，我们将在家看电影。',
      question: '什么情况下去公园？',
      options: ['不下雨', '下雨', '任何时候', '周末'],
      correctIndex: 0
    },
    {
      sentence: '虽然小李跑得比小张快，但小张比小王跑得快。',
      question: '谁跑得最慢？',
      options: ['小王', '小张', '小李', '一样快'],
      correctIndex: 0
    },
    {
      sentence: '甲队先赢了乙队，然后输给了丙队，最后丙队也输给了乙队。',
      question: '下面哪个说法正确？',
      options: ['乙队赢了丙队', '甲队最强', '丙队最强', '甲队赢了丙队'],
      correctIndex: 0
    },
    {
      sentence: '只有先完成作业，才能出去玩；只有出去玩了，才能和朋友见面。',
      question: '要和朋友见面，首先要做什么？',
      options: ['完成作业', '出去玩', '给朋友打电话', '问妈妈'],
      correctIndex: 0
    },
    {
      sentence: '图书馆在学校的北面，公园在图书馆的北面，超市在公园的南面但在图书馆的北面。',
      question: '从南到北的顺序是？',
      options: ['学校→图书馆→超市→公园', '公园→超市→图书馆→学校', '学校→超市→图书馆→公园', '学校→图书馆→公园→超市'],
      correctIndex: 0
    },
    {
      sentence: '如果A大于B，B大于C，C大于D，那么A和D的关系是？',
      question: 'A和D的大小关系是？',
      options: ['A大于D', 'D大于A', '相等', '无法确定'],
      correctIndex: 0
    },
    {
      sentence: '做蛋糕的步骤：首先打蛋，其次加糖搅拌，再加入面粉，最后放入烤箱。',
      question: '第三步是什么？',
      options: ['加面粉', '打蛋', '加糖搅拌', '放入烤箱'],
      correctIndex: 0
    },
    {
      sentence: '小红的成绩比小华好，小华的成绩比小明好，但小明的成绩比小刚好。',
      question: '成绩从高到低排列正确的是？',
      options: ['小红→小华→小明→小刚', '小华→小红→小明→小刚', '小红→小明→小华→小刚', '小刚→小明→小华→小红'],
      correctIndex: 0
    },
    {
      sentence: '每当闹钟响起，小李就开始锻炼；锻炼完毕后，他总是先洗澡再吃早餐。',
      question: '小李日常的正确顺序是？',
      options: ['闹钟→锻炼→洗澡→早餐', '锻炼→闹钟→早餐→洗澡', '洗澡→锻炼→早餐→闹钟', '闹钟→洗澡→锻炼→早餐'],
      correctIndex: 0
    },
    {
      sentence: '除非你通过了笔试，否则不能参加面试；除非通过面试，否则不予录用。',
      question: '被录用至少需要做到什么？',
      options: ['通过笔试和面试', '只通过笔试', '只通过面试', '以上都不需要'],
      correctIndex: 0
    },
    {
      sentence: '第一个到达的选手获得金牌，第二个获得银牌。甲比乙先到，丙比甲先到。',
      question: '谁获得金牌？',
      options: ['丙', '甲', '乙', '不确定'],
      correctIndex: 0
    },
    {
      sentence: '植物生长需要先发芽，然后长叶，接着开花，最后结果。',
      question: '开花之前的步骤有几个？',
      options: ['2个', '1个', '3个', '0个'],
      correctIndex: 0
    },
    {
      sentence: '如果今天是周三，那么后天的前一天是什么？',
      question: '答案是星期几？',
      options: ['星期四', '星期五', '星期三', '星期六'],
      correctIndex: 0
    }
  ];

  const isYoung = ['幼儿组', '小学低年级组'].includes(ageGroup);
  const pool = isYoung ? easyQs : [...easyQs, ...hardQs];

  const questions = [];
  const shuffled = [...pool].sort(() => Math.random() - 0.5);
  for (let i = 0; i < count; i++) {
    questions.push(shuffled[i % shuffled.length]);
  }
  return questions;
}

function getDifficulty(ageGroup) {
  const configs = {
    '幼儿组': { digitRounds: 4, digitStartLen: 3, wordRounds: 3, wordStartLen: 3, sentenceCount: 4 },
    '小学低年级组': { digitRounds: 5, digitStartLen: 3, wordRounds: 4, wordStartLen: 3, sentenceCount: 5 },
    '小学高年级组': { digitRounds: 6, digitStartLen: 4, wordRounds: 5, wordStartLen: 4, sentenceCount: 6 },
    '初中组': { digitRounds: 7, digitStartLen: 4, wordRounds: 5, wordStartLen: 4, sentenceCount: 7 },
    '高中组': { digitRounds: 8, digitStartLen: 5, wordRounds: 6, wordStartLen: 5, sentenceCount: 8 }
  };
  return configs[ageGroup] || configs['小学高年级组'];
}

function getQuickLevel(score) {
  if (score >= 28) return { level: '优秀', color: '#00B894', emoji: '🌟' };
  if (score >= 22) return { level: '良好', color: '#6C5CE7', emoji: '👍' };
  if (score >= 15) return { level: '中等', color: '#FDCB6E', emoji: '💪' };
  return { level: '继续加油', color: '#E17055', emoji: '📚' };
}
