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
          ${
            nextSub >= 0
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
            c => `<div style="height:64px; border-radius:8px; display:flex; align-items:center; justify-content:center; background:${
              c === q.target ? '#74B9FF' : '#EEF6FF'
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
  const questions = [
    { prompt: '展开图折成立方体后，A面相对的是？', options: ['B', 'C', 'D', 'E'], answer: 1 },
    { prompt: '若正方体顶部是红色，底部一定是？', options: ['蓝色', '与顶面不同色', '黄色', '未知'], answer: 1 },
    { prompt: '将图形顺时针旋转90°，朝向将变为？', options: ['上', '右', '下', '左'], answer: 1 },
    { prompt: '折叠后相邻的两个面不可能是？', options: ['前和右', '上和下', '前和上', '左和后'], answer: 1 },
    { prompt: '空间路径“前-右-前”，终点相对起点？', options: ['左前', '右前', '正前', '右后'], answer: 1 },
  ];
  renderShell(app, '📦', '空间可视化', '根据空间规则做判断', TESTS[2].timeLimit);

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
      <div class="test-options">${q.options.map((opt, i) => `<div class="test-option" data-idx="${i}">${opt}</div>`).join('')}</div>
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
          shown: '-',
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

