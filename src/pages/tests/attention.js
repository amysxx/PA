/**
 * 注意过程测试模块
 * 子测试1: 选择性注意 — 在干扰项中快速识别目标
 * 子测试2: 持续性注意 — 监控连续刺激，对特定目标反应
 * 子测试3: 注意转换 — 在两种规则间快速切换
 */
import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';

let currentTimer = null;

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
        case 0: renderSelectiveAttention(app); break;
        case 1: renderSustainedAttention(app); break;
        case 2: renderAttentionSwitching(app); break;
        default: router.navigate('/test-select');
    }
}

/* ===== 子测试1: 选择性注意 ===== */
function renderSelectiveAttention(app) {
    const diff = getDifficulty(store.get('user.ageGroup'));
    const totalRounds = diff.selectiveRounds;
    const timeLimit = diff.selectiveTime;

    let round = 0;
    let correct = 0;
    let wrong = 0;
    const reactionTimer = new ReactionTimer();

    function nextTrial() {
        if (round >= totalRounds) {
            currentTimer.stop();
            finishSubTest(0, '选择性注意', correct, totalRounds, wrong, reactionTimer, 1);
            return;
        }

        // 生成一道选择性注意题目
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

        // 点击字母
        contentEl.querySelectorAll('.number-cell').forEach(cell => {
            cell.addEventListener('click', () => {
                const idx = parseInt(cell.dataset.idx);
                if (gridItems[idx] === targetLetter) {
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
            if (!isTargetPresent) correct++;
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
              <div class="test-header-title">注意过程 · 选择性注意</div>
              <div class="test-header-subtitle">在众多字母中快速找到指定字母</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
        <div class="test-footer">
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
        () => finishSubTest(0, '选择性注意', correct, round || 1, wrong, reactionTimer, 1)
    );
    currentTimer.start();
    nextTrial();

    document.getElementById('btn-skip')?.addEventListener('click', () => {
        currentTimer.stop();
        finishSubTest(0, '选择性注意', correct, round || 1, wrong, reactionTimer, 1);
    });
}

/* ===== 子测试2: 持续性注意 ===== */
function renderSustainedAttention(app) {
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

    // 预生成所有刺激（约30%为目标）
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
            finishSubTest(1, '持续性注意', hits, total, falseAlarms, reactionTimer, 2);
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

        // 自动下一个
        setTimeout(() => {
            if (!responded && stim.isTarget) {
                misses++;
            }
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
              <div class="test-header-title">注意过程 · 持续性注意</div>
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
            finishSubTest(1, '持续性注意', hits, total, falseAlarms, reactionTimer, 2);
        }
    );
    currentTimer.start();

    // 3秒后开始
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
        finishSubTest(1, '持续性注意', hits, total || 1, falseAlarms, reactionTimer, 2);
    });
}

/* ===== 子测试3: 注意转换 ===== */
function renderAttentionSwitching(app) {
    const diff = getDifficulty(store.get('user.ageGroup'));
    const totalRounds = diff.switchRounds;
    const timeLimit = diff.switchTime;

    let round = 0;
    let correct = 0;
    let wrong = 0;
    const reactionTimer = new ReactionTimer();

    // 两种规则
    const rules = ['大小判断', '奇偶判断'];

    function nextTrial() {
        if (round >= totalRounds) {
            currentTimer.stop();
            finishSubTest(2, '注意转换', correct, totalRounds, wrong, reactionTimer, -1);
            return;
        }

        const currentRule = rules[round % 2 === 0 ? 0 : 1]; // 交替切换规则
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
                if (answer === correctAnswer) {
                    correct++;
                    opt.classList.add('correct');
                } else {
                    wrong++;
                    opt.classList.add('wrong');
                    // 高亮正确答案
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
              <div class="test-header-title">注意过程 · 注意转换</div>
              <div class="test-header-subtitle">根据不同规则做出快速判断</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>
        <div class="test-content" id="test-inner-content"></div>
        <div class="test-footer">
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
        () => finishSubTest(2, '注意转换', correct, round || 1, wrong, reactionTimer, -1)
    );
    currentTimer.start();
    nextTrial();

    document.getElementById('btn-skip')?.addEventListener('click', () => {
        currentTimer.stop();
        finishSubTest(2, '注意转换', correct, round || 1, wrong, reactionTimer, -1);
    });
}

/* ===== 通用完成处理 ===== */
function finishSubTest(subIndex, name, correct, total, wrong, reactionTimer, nextSub) {
    const correctRate = correct / Math.max(total, 1);
    const avgRT = reactionTimer.getAverage() || 3000;
    const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'attention');

    store.setTestResult('attention', subIndex, score, {
        name, correct, total, wrong,
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
        '幼儿组': { selectiveRounds: 8, selectiveTime: 60, selectiveItems: 9, sustainedCount: 20, sustainedTime: 45, sustainedInterval: 2000, switchRounds: 8, switchTime: 60 },
        '小学低年级组': { selectiveRounds: 10, selectiveTime: 55, selectiveItems: 12, sustainedCount: 25, sustainedTime: 50, sustainedInterval: 1800, switchRounds: 10, switchTime: 55 },
        '小学高年级组': { selectiveRounds: 12, selectiveTime: 50, selectiveItems: 16, sustainedCount: 30, sustainedTime: 55, sustainedInterval: 1500, switchRounds: 12, switchTime: 50 },
        '初中组': { selectiveRounds: 14, selectiveTime: 45, selectiveItems: 20, sustainedCount: 35, sustainedTime: 55, sustainedInterval: 1300, switchRounds: 14, switchTime: 45 },
        '高中组': { selectiveRounds: 16, selectiveTime: 40, selectiveItems: 25, sustainedCount: 40, sustainedTime: 55, sustainedInterval: 1200, switchRounds: 16, switchTime: 40 }
    };
    return configs[ageGroup] || configs['小学高年级组'];
}

function getQuickLevel(score) {
    if (score >= 28) return { level: '优秀', color: '#00B894', emoji: '🌟' };
    if (score >= 22) return { level: '良好', color: '#6C5CE7', emoji: '👍' };
    if (score >= 15) return { level: '中等', color: '#FDCB6E', emoji: '💪' };
    return { level: '继续加油', color: '#E17055', emoji: '📚' };
}
