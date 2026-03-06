import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';

let currentTimer = null;

const TESTS = [
  { name: '知觉速度', next: 1, timeLimit: 60 },
  { name: '心理运动速度', next: -1, timeLimit: 70 },
];

export function renderProcessing(app) {
  const user = store.get('user');
  if (!user.name) {
    router.navigate('/user-info');
    return;
  }
  const progress = store.get('testProgress.processing');
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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #F39C12, #FDCB6E);">${icon}</div>
            <div>
              <div class="test-header-title">处理速度 · ${title}</div>
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
  const avgRT = reactionTimer.getAverage() || 2000;
  const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'processing');
  const meta = TESTS[subIndex];
  store.setTestResult('processing', subIndex, score, {
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
        <div class="modal-icon">⏱️</div>
        <div class="modal-title">${testName} 完成</div>
        <div style="font-family:var(--font-display); font-size:3rem; font-weight:900; color:#F39C12; margin:12px 0;">${Math.round(score)}分</div>
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
  if (subIndex === 0) return renderPerceptualSpeed(app);
  return renderPsychomotorSpeed(app);
}

function renderPerceptualSpeed(app) {
  renderShell(app, '🔎', '知觉速度', '快速判断符号是否一致', TESTS[0].timeLimit);
  const symbols = ['▲', '■', '●', '◆', '★', '◼', '⬢', '⬣'];
  const rounds = 18;
  let index = 0;
  let correct = 0;
  let wrong = 0;
  const rt = new ReactionTimer();
  const questionLogs = [];

  const timerEl = document.getElementById('timer');
  const content = document.getElementById('test-inner-content');

  const showQ = () => {
    if (index >= rounds) {
      currentTimer.stop();
      finishSubTest(0, correct, rounds, wrong, rt, questionLogs);
      return;
    }
    const left = symbols[Math.floor(Math.random() * symbols.length)];
    const same = Math.random() > 0.45;
    const right = same ? left : symbols.filter(item => item !== left)[Math.floor(Math.random() * (symbols.length - 1))];
    const answer = same ? 'same' : 'diff';

    content.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:10px;">第 ${index + 1}/${rounds} 题</div>
      <div class="test-question">这两个符号是否一致？</div>
      <div style="display:flex; justify-content:center; gap:30px; font-size:4rem; margin:18px 0;">
        <div>${left}</div><div>${right}</div>
      </div>
      <div class="test-options">
        <div class="test-option" data-a="same">一致</div>
        <div class="test-option" data-a="diff">不一致</div>
      </div>
    `;

    rt.start();
    content.querySelectorAll('.test-option').forEach(el => {
      el.addEventListener('click', () => {
        const ua = el.dataset.a;
        const ok = ua === answer;
        rt.record();
        if (ok) {
          correct++;
          el.classList.add('correct');
        } else {
          wrong++;
          el.classList.add('wrong');
        }
        questionLogs.push({
          prompt: '判断两个符号是否一致',
          shown: `${left} ${right}`,
          userAnswer: ua === 'same' ? '一致' : '不一致',
          correctAnswer: answer === 'same' ? '一致' : '不一致',
          isCorrect: ok,
        });
        index++;
        setTimeout(showQ, 220);
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

function renderPsychomotorSpeed(app) {
  renderShell(app, '⚡', '心理运动速度', '看到“现在点击”后立刻按下按钮', TESTS[1].timeLimit);
  const totalTrials = 15;
  let trial = 0;
  let correct = 0;
  let wrong = 0;
  let signalTimeoutId = null;
  let subtestFinished = false;
  const rt = new ReactionTimer();
  const questionLogs = [];

  const timerEl = document.getElementById('timer');
  const content = document.getElementById('test-inner-content');

  const clearPendingTimeouts = () => {
    if (signalTimeoutId) {
      clearTimeout(signalTimeoutId);
      signalTimeoutId = null;
    }
  };

  const finishCurrentSubtest = () => {
    if (subtestFinished) return;
    subtestFinished = true;
    clearPendingTimeouts();
    finishSubTest(1, correct, trial || 1, wrong, rt, questionLogs);
  };

  const nextTrial = () => {
    clearPendingTimeouts();
    if (subtestFinished) return;
    if (trial >= totalTrials) {
      currentTimer.stop();
      finishCurrentSubtest();
      return;
    }
    content.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:10px;">第 ${trial + 1}/${totalTrials} 轮</div>
      <div class="test-question">等待信号出现后点击</div>
      <button class="btn btn-secondary" id="react-btn" style="font-size:1.05rem; min-width:220px;" disabled>准备中...</button>
    `;

    const reactBtn = document.getElementById('react-btn');
    reactBtn.dataset.ready = 'false';
    const delay = 800 + Math.floor(Math.random() * 1500);
    signalTimeoutId = setTimeout(() => {
      if (subtestFinished || !reactBtn.isConnected) return;
      signalTimeoutId = null;
      reactBtn.disabled = false;
      reactBtn.className = 'btn btn-primary';
      reactBtn.textContent = '现在点击';
      reactBtn.dataset.ready = 'true';
      rt.start();
    }, delay);

    let hasHandled = false;
    const handleResponse = event => {
      if (hasHandled || subtestFinished) return;
      if (reactBtn.dataset.ready !== 'true') return;

      hasHandled = true;
      event.preventDefault();
      reactBtn.dataset.ready = 'locked';
      reactBtn.disabled = true;
      reactBtn.className = 'btn btn-secondary';
      reactBtn.textContent = '已记录...';

      let reactionMs = 0;
      try {
        rt.record();
        reactionMs = Math.round(rt.getLast() || 0);
      } catch {
        reactionMs = 0;
      }
      correct++;
      questionLogs.push({
        prompt: '简单反应时任务',
        shown: '现在点击',
        userAnswer: `${reactionMs}ms`,
        correctAnswer: '越快越好',
        isCorrect: true,
      });
      trial++;
      setTimeout(() => {
        if (!subtestFinished) nextTrial();
      }, 220);
    };

    reactBtn.addEventListener('pointerdown', handleResponse);
    reactBtn.addEventListener('click', handleResponse);
  };

  currentTimer = new Timer(
    TESTS[1].timeLimit,
    rem => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (rem <= 10) timerEl.classList.add('warning');
    },
    finishCurrentSubtest,
  );
  currentTimer.start();
  document.getElementById('btn-skip').addEventListener('click', finishCurrentSubtest);
  nextTrial();
}
