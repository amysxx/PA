import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';

let currentTimer = null;

const TESTS = [
  { name: '空间知觉', next: 1, timeLimit: 70 },
  { name: '心理旋转', next: 2, timeLimit: 70 },
  { name: '空间可视化', next: -1, timeLimit: 70 },
];

export function renderSpatial(app) {
  const user = store.get('user');
  if (!user.name) {
    router.navigate('/user-info');
    return;
  }
  const progress = store.get('testProgress.spatial');
  let currentSub = progress.subTests.findIndex(item => !item);
  if (currentSub === -1) currentSub = 0;
  renderSubTest(app, currentSub);
}

function renderShell(app, icon, title, subtitle, timeLimit) {
  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/test-select"><span class="navbar-brand-icon">🧠</span><span>智趣认知乐园</span></a>
    </div>
    <div class="page has-navbar">
      <div class="container">
        <div class="test-header">
          <div class="test-header-left">
            <div class="test-header-icon" style="background:linear-gradient(135deg, #0984E3, #74B9FF);">${icon}</div>
            <div>
              <div class="test-header-title">空间智能 · ${title}</div>
              <div class="test-header-subtitle">${subtitle}</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
        <div class="test-footer"><button class="btn btn-secondary" id="btn-skip">跳过此项 →</button></div>
      </div>
    </div>
  `;
}

function finishSubTest(subIndex, correct, total, wrong, reactionTimer, questionLogs) {
  const correctRate = correct / Math.max(total, 1);
  const avgRT = reactionTimer.getAverage() || 3000;
  const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'spatial');
  const meta = TESTS[subIndex];
  store.setTestResult('spatial', subIndex, score, {
    name: meta.name,
    correct,
    total,
    wrong,
    correctRate: Math.round(correctRate * 100),
    avgReactionTime: Math.round(avgRT),
    questionLogs,
  });
  showResult(score, meta.name, correct, total, meta.next);
}

function showResult(score, testName, correct, total, nextSub) {
  const app = document.getElementById('app');
  app.innerHTML = `
    <div class="page page-center" style="min-height:100vh;">
      <div class="modal" style="max-width:480px;">
        <div class="modal-icon">🧭</div>
        <div class="modal-title">${testName} 完成</div>
        <div style="font-family:var(--font-display); font-size:3rem; font-weight:900; color:#0984E3; margin:12px 0;">${Math.round(score)}分</div>
        <div class="modal-text">正确: ${correct}/${total}</div>
        <div class="modal-actions">
          ${nextSub >= 0
      ? '<button class="btn btn-primary" id="btn-next">继续下一项 →</button>'
      : '<button class="btn btn-primary" id="btn-back">返回选择</button>'
    }
        </div>
      </div>
    </div>
  `;
  if (nextSub >= 0) {
    document.getElementById('btn-next').addEventListener('click', () => renderSubTest(app, nextSub));
  } else {
    document.getElementById('btn-back').addEventListener('click', () => router.navigate('/test-select'));
  }
}

function renderSubTest(app, subIndex) {
  if (currentTimer) {
    currentTimer.stop();
    currentTimer = null;
  }
  if (subIndex === 0) return renderSpatialPerception(app);
  if (subIndex === 1) return renderMentalRotation(app);
  return renderSpatialVisualization(app);
}

function renderSpatialPerception(app) {
  const questions = Array.from({ length: 10 }, (_, i) => {
    const target = String.fromCharCode(65 + (i % 9));
    const pool = 'ABCDEFGHI'.split('').filter(c => c !== target);
    const options = [target, ...pool.sort(() => Math.random() - 0.5).slice(0, 3)].sort(() => Math.random() - 0.5);
    return { target, options, answer: options.indexOf(target) };
  });
  renderShell(app, '🧭', '空间知觉', '判断高亮位置对应的坐标', TESTS[0].timeLimit);

  const timerEl = document.getElementById('timer');
  let index = 0;
  let correct = 0;
  let wrong = 0;
  const rt = new ReactionTimer();
  const questionLogs = [];

  const showQ = () => {
    if (index >= questions.length) {
      currentTimer.stop();
      finishSubTest(0, correct, questions.length, wrong, rt, questionLogs);
      return;
    }
    const q = questions[index];
    const content = document.getElementById('test-inner-content');
    content.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:10px;">第 ${index + 1}/${questions.length} 题</div>
      <div class="test-question">观察高亮方格，选择其坐标</div>
      <div style="display:grid; grid-template-columns:repeat(3, 64px); gap:8px; justify-content:center; margin:12px 0 20px;">
        ${'ABCDEFGHI'
        .split('')
        .map(
          c => `<div style="height:64px; border-radius:8px; display:flex; align-items:center; justify-content:center; background:${c === q.target ? '#74B9FF' : '#EEF6FF'
            }; border:2px solid ${c === q.target ? '#0984E3' : '#D8E9FF'}; font-weight:700;">${c}</div>`,
        )
        .join('')}
      </div>
      <div class="test-options">
        ${q.options.map((opt, i) => `<div class="test-option" data-idx="${i}">${opt}</div>`).join('')}
      </div>
    `;

    rt.start();
    content.querySelectorAll('.test-option').forEach(el => {
      el.addEventListener('click', () => {
        const answerIdx = Number(el.dataset.idx);
        const ok = answerIdx === q.answer;
        rt.record();
        if (ok) {
          correct++;
          el.classList.add('correct');
        } else {
          wrong++;
          el.classList.add('wrong');
        }
        questionLogs.push({
          prompt: '空间知觉：选择高亮方格坐标',
          shown: q.target,
          userAnswer: q.options[answerIdx],
          correctAnswer: q.options[q.answer],
          isCorrect: ok,
        });
        index++;
        setTimeout(showQ, 350);
      });
    });
  };

  currentTimer = new Timer(
    TESTS[0].timeLimit,
    rem => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (rem <= 10) timerEl.classList.add('warning');
    },
    () => finishSubTest(0, correct, index || 1, wrong, rt, questionLogs),
  );
  currentTimer.start();
  document.getElementById('btn-skip').addEventListener('click', () => finishSubTest(0, correct, index || 1, wrong, rt, questionLogs));
  showQ();
}

function renderMentalRotation(app) {
  const questions = [
    { prompt: '选择与目标同形（非镜像）', target: '↱', options: ['↱', '↰', '↲', '↳'], answer: 0 },
    { prompt: '选择旋转后与目标相同图形', target: '┐', options: ['┐', '┌', '┘', '└'], answer: 0 },
    { prompt: '选择与目标同方向', target: '⬈', options: ['⬈', '⬉', '⬋', '⬊'], answer: 0 },
    { prompt: '选择旋转匹配项', target: '◢', options: ['◢', '◣', '◤', '◥'], answer: 0 },
    { prompt: '选择非镜像图形', target: '⟟', options: ['⟟', '⧖', '⧗', '⧘'], answer: 0 },
  ];
  renderShell(app, '🧩', '心理旋转', '识别旋转等价图形', TESTS[1].timeLimit);

  const timerEl = document.getElementById('timer');
  let index = 0;
  let correct = 0;
  let wrong = 0;
  const rt = new ReactionTimer();
  const questionLogs = [];

  const showQ = () => {
    if (index >= questions.length) {
      currentTimer.stop();
      finishSubTest(1, correct, questions.length, wrong, rt, questionLogs);
      return;
    }
    const q = questions[index];
    const content = document.getElementById('test-inner-content');
    content.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:10px;">第 ${index + 1}/${questions.length} 题</div>
      <div class="test-question">${q.prompt}</div>
      <div style="font-size:3rem; text-align:center; margin:14px 0 18px; color:#0984E3;">${q.target}</div>
      <div class="test-options">
        ${q.options.map((opt, i) => `<div class="test-option" data-idx="${i}" style="font-size:2rem;">${opt}</div>`).join('')}
      </div>
    `;

    rt.start();
    content.querySelectorAll('.test-option').forEach(el => {
      el.addEventListener('click', () => {
        const answerIdx = Number(el.dataset.idx);
        const ok = answerIdx === q.answer;
        rt.record();
        if (ok) {
          correct++;
          el.classList.add('correct');
        } else {
          wrong++;
          el.classList.add('wrong');
        }
        questionLogs.push({
          prompt: q.prompt,
          shown: q.target,
          userAnswer: q.options[answerIdx],
          correctAnswer: q.options[q.answer],
          isCorrect: ok,
        });
        index++;
        setTimeout(showQ, 350);
      });
    });
  };

  currentTimer = new Timer(
    TESTS[1].timeLimit,
    rem => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (rem <= 10) timerEl.classList.add('warning');
    },
    () => finishSubTest(1, correct, index || 1, wrong, rt, questionLogs),
  );
  currentTimer.start();
  document.getElementById('btn-skip').addEventListener('click', () => finishSubTest(1, correct, index || 1, wrong, rt, questionLogs));
  showQ();
}

function renderSpatialVisualization(app) {
  // 每道题带 SVG 辅助图
  const questions = [
    {
      prompt: '下图展开后，哪个面和 A 面相对？',
      svg: `<svg width="200" height="160" viewBox="0 0 200 160" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:12px auto;">
        <rect x="60" y="10" width="50" height="50" fill="#a9cce3" stroke="#555" stroke-width="2"/>
        <text x="85" y="42" text-anchor="middle" font-size="14" font-weight="bold" fill="#333">A</text>
        <rect x="10" y="60" width="50" height="50" fill="#f9e79f" stroke="#555" stroke-width="2"/>
        <text x="35" y="92" text-anchor="middle" font-size="14" fill="#333">B</text>
        <rect x="60" y="60" width="50" height="50" fill="#a9dfbf" stroke="#555" stroke-width="2"/>
        <text x="85" y="92" text-anchor="middle" font-size="14" fill="#333">C</text>
        <rect x="110" y="60" width="50" height="50" fill="#f0b27a" stroke="#555" stroke-width="2"/>
        <text x="135" y="92" text-anchor="middle" font-size="14" fill="#333">D</text>
        <rect x="60" y="110" width="50" height="50" fill="#d2b4de" stroke="#555" stroke-width="2"/>
        <text x="85" y="142" text-anchor="middle" font-size="14" fill="#333">E</text>
      </svg>`,
      options: ['B', 'C', 'D', 'E'], answer: 1
    },
    {
      prompt: '将图形顺时针旋转 90°，箭头将指向哪个方向？',
      svg: `<svg width="160" height="120" viewBox="0 0 160 120" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:12px auto;">
        <rect x="20" y="30" width="120" height="60" rx="10" fill="#d6eaf8" stroke="#5dade2" stroke-width="2"/>
        <text x="80" y="55" text-anchor="middle" font-size="13" fill="#555">旋转前</text>
        <polygon points="70,75 90,75 80,58" fill="#2e86c1"/>
        <text x="80" y="100" text-anchor="middle" font-size="12" fill="#333">↑（朝上）</text>
      </svg>`,
      options: ['朝右', '朝下', '朝左', '朝上'], answer: 0
    },
    {
      prompt: '如图，正方体顶部标星号(★)，面朝右侧的是哪面？',
      svg: `<svg width="160" height="140" viewBox="0 0 160 140" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:12px auto;">
        <polygon points="30,90 80,60 130,90 80,120" fill="#d5f5e3" stroke="#444" stroke-width="1.5"/>
        <polygon points="30,90 80,60 80,20 30,50" fill="#aed6f1" stroke="#444" stroke-width="1.5"/>
        <polygon points="130,90 80,60 80,20 130,50" fill="#fdebd0" stroke="#444" stroke-width="1.5"/>
        <text x="80" y="42" text-anchor="middle" font-size="16">★</text>
        <text x="50" y="80" text-anchor="middle" font-size="11" fill="#555">左</text>
        <text x="110" y="80" text-anchor="middle" font-size="11" fill="#555">右</text>
      </svg>`,
      options: ['橙色面', '蓝色面', '绿色面', '无法判断'], answer: 0
    },
    {
      prompt: '沿虚线折叠，哪两个面会相互重叠？',
      svg: `<svg width="200" height="100" viewBox="0 0 200 100" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:12px auto;">
        <rect x="10" y="20" width="50" height="60" fill="#f9e79f" stroke="#555" stroke-width="2"/>
        <text x="35" y="57" text-anchor="middle" font-size="13" fill="#555">1</text>
        <line x1="60" y1="20" x2="60" y2="80" stroke="#888" stroke-width="1.5" stroke-dasharray="6,3"/>
        <rect x="60" y="20" width="60" height="60" fill="#a9dfbf" stroke="#555" stroke-width="2"/>
        <text x="90" y="57" text-anchor="middle" font-size="13" fill="#555">2</text>
        <line x1="120" y1="20" x2="120" y2="80" stroke="#888" stroke-width="1.5" stroke-dasharray="6,3"/>
        <rect x="120" y="20" width="50" height="60" fill="#a9cce3" stroke="#555" stroke-width="2"/>
        <text x="145" y="57" text-anchor="middle" font-size="13" fill="#555">3</text>
      </svg>`,
      options: ['1和3', '1和2', '2和3', '不会重叠'], answer: 0
    },
    {
      prompt: '路径：出发→向右走2步→向上走2步→向左走2步，终点相对出发点在？',
      svg: `<svg width="180" height="160" viewBox="0 0 180 160" xmlns="http://www.w3.org/2000/svg" style="display:block;margin:12px auto;">
        <defs><marker id="ar" markerWidth="6" markerHeight="6" refX="3" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#e74c3c"/></marker></defs>
        <circle cx="30" cy="130" r="8" fill="#2ecc71"/>
        <text x="30" y="155" text-anchor="middle" font-size="11" fill="#2ecc71">出发</text>
        <line x1="38" y1="130" x2="110" y2="130" stroke="#e74c3c" stroke-width="2" marker-end="url(#ar)"/>
        <text x="74" y="122" text-anchor="middle" font-size="11" fill="#c0392b">→右2步</text>
        <line x1="110" y1="122" x2="110" y2="60" stroke="#e74c3c" stroke-width="2" marker-end="url(#ar)"/>
        <text x="127" y="95" text-anchor="middle" font-size="11" fill="#c0392b">↑上2步</text>
        <line x1="102" y1="60" x2="38" y2="60" stroke="#e74c3c" stroke-width="2" marker-end="url(#ar)"/>
        <text x="70" y="52" text-anchor="middle" font-size="11" fill="#c0392b">←左2步</text>
        <circle cx="30" cy="60" r="8" fill="#e74c3c"/>
        <text x="30" y="42" text-anchor="middle" font-size="11" fill="#e74c3c">终点</text>
      </svg>`,
      options: ['正上方', '左前方', '右上方', '正右方'], answer: 0
    },
  ];

  renderShell(app, '📦', '空间可视化', '观察图形，作出空间判断', TESTS[2].timeLimit);

  const timerEl = document.getElementById('timer');
  let index = 0;
  let correct = 0;
  let wrong = 0;
  const rt = new ReactionTimer();
  const questionLogs = [];

  const showQ = () => {
    if (index >= questions.length) {
      currentTimer.stop();
      finishSubTest(2, correct, questions.length, wrong, rt, questionLogs);
      return;
    }
    const q = questions[index];
    const content = document.getElementById('test-inner-content');
    content.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:10px;">第 ${index + 1}/${questions.length} 题</div>
      <div class="test-question">${q.prompt}</div>
      ${q.svg}
      <div class="test-options">${q.options.map((opt, i) => `<div class="test-option" data-idx="${i}">${String.fromCharCode(65 + i)}. ${opt}</div>`).join('')}</div>
    `;
    rt.start();
    content.querySelectorAll('.test-option').forEach(el => {
      el.addEventListener('click', () => {
        const answerIdx = Number(el.dataset.idx);
        const ok = answerIdx === q.answer;
        rt.record();
        if (ok) { correct++; el.classList.add('correct'); }
        else {
          wrong++; el.classList.add('wrong');
          content.querySelectorAll('.test-option').forEach(o => {
            if (Number(o.dataset.idx) === q.answer) o.classList.add('correct');
          });
        }
        questionLogs.push({
          prompt: q.prompt,
          shown: 'SVG图形',
          userAnswer: q.options[answerIdx],
          correctAnswer: q.options[q.answer],
          isCorrect: ok,
        });
        index++;
        setTimeout(showQ, 400);
      });
    });
  };

  currentTimer = new Timer(
    TESTS[2].timeLimit,
    rem => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (rem <= 10) timerEl.classList.add('warning');
    },
    () => finishSubTest(2, correct, index || 1, wrong, rt, questionLogs),
  );
  currentTimer.start();
  document.getElementById('btn-skip').addEventListener('click', () => finishSubTest(2, correct, index || 1, wrong, rt, questionLogs));
  showQ();
}


