/**
 * 计划能力测试模块
 * 子测试1: 视觉搜索任务 — 在复杂图形中找出特定目标
 * 子测试2: 数字连接测试 — 按特定规则连接数字
 * 子测试3: 路径规划 — 在网格中找到最优路径
 */
import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';
import { TestSession, showPauseOverlay } from '../../utils/testSession.js';

let currentSession = null;

let currentTimer = null;

export function renderPlanning(app) {
  const user = store.get('user');
  if (!user.name) { router.navigate('/user-info'); return; }

  const progress = store.get('testProgress.planning');
  // 找到第一个未完成的子测试
  let currentSub = progress.subTests.findIndex(s => !s);
  if (currentSub === -1) currentSub = 0;

  renderSubTest(app, currentSub);
}

function renderSubTest(app, subIndex) {
  if (currentTimer) { currentTimer.stop(); currentTimer = null; }

  switch (subIndex) {
    case 0: renderVisualSearch(app); break;
    case 1: renderNumberConnect(app); break;
    case 2: renderPathPlanning(app); break;
    default: router.navigate('/test-select');
  }
}

/* ===== 子测试1: 视觉搜索 ===== */
function renderVisualSearch(app) {
  const ageGroup = store.get('user.ageGroup');
  const difficulty = getDifficulty(ageGroup);

  // 根据难度生成搜索网格
  const targetShape = '⭐';
  const distractors = ['🔵', '🔴', '🟢', '🟡', '🔶', '🟣', '🟤', '⬛'];
  const gridSize = difficulty.gridSize;
  const targetCount = difficulty.targetCount;
  const timeLimit = difficulty.timeLimit;

  let items = [];
  let targetPositions = new Set();

  // 放置目标
  while (targetPositions.size < targetCount) {
    targetPositions.add(Math.floor(Math.random() * gridSize * gridSize));
  }

  for (let i = 0; i < gridSize * gridSize; i++) {
    if (targetPositions.has(i)) {
      items.push({ shape: targetShape, isTarget: true, found: false });
    } else {
      items.push({ shape: distractors[Math.floor(Math.random() * distractors.length)], isTarget: false, found: false });
    }
  }

  let foundCount = 0;
  const reactionTimer = new ReactionTimer();

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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #6C5CE7, #A29BFE);">🎯</div>
            <div>
              <div class="test-header-title">计划能力 · 视觉搜索</div>
              <div class="test-header-subtitle">在图形中找出所有的 ${targetShape}（共${targetCount}个）</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>

        <div class="test-content">
          <div class="test-question">
            请找出下方所有的 <span style="font-size:1.5rem">${targetShape}</span>  
            <span id="found-counter" style="margin-left:12px; color:var(--primary); font-weight:800;">(${foundCount}/${targetCount})</span>
          </div>
          
          <div class="shape-area" id="search-grid" style="
            display: grid;
            grid-template-columns: repeat(${gridSize}, 1fr);
            gap: 6px;
            max-width: ${gridSize * 62}px;
          ">
            ${items.map((item, idx) => `
              <div class="shape-item" data-idx="${idx}" style="font-size:1.6rem;">
                ${item.shape}
              </div>
            `).join('')}
          </div>
        </div>

        <div class="test-footer">
          <button class="btn btn-secondary" id="btn-pause" style="margin-right:8px;">⏸️ 暂停</button>
          <button class="btn btn-secondary" id="btn-skip">跳过此题 →</button>
        </div>
      </div>
    </div>
  `;

  // 计时器
  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (remaining) => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (remaining <= 10) timerEl.classList.add('warning');
    },
    () => finishVisualSearch(foundCount, targetCount, reactionTimer)
  );

  reactionTimer.start();
  currentTimer.start();

  // 暂停/恢复
  currentSession = new TestSession('planning', 0, { total: targetCount });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  // 点击图形
  document.getElementById('search-grid').addEventListener('click', (e) => {
    const cell = e.target.closest('.shape-item');
    if (!cell) return;
    const idx = parseInt(cell.dataset.idx);

    if (items[idx].isTarget && !items[idx].found) {
      items[idx].found = true;
      cell.classList.add('found');
      foundCount++;
      reactionTimer.record();
      document.getElementById('found-counter').textContent = `(${foundCount}/${targetCount})`;

      if (foundCount >= targetCount) {
        currentTimer.stop();
        setTimeout(() => finishVisualSearch(foundCount, targetCount, reactionTimer), 500);
      }
    } else if (!items[idx].isTarget) {
      cell.style.animation = 'wiggle 0.3s ease';
      setTimeout(() => cell.style.animation = '', 300);
    }
  });

  document.getElementById('btn-skip').addEventListener('click', () => {
    currentTimer.stop();
    finishVisualSearch(foundCount, targetCount, reactionTimer);
  });
}

function finishVisualSearch(found, total, reactionTimer) {
  const correctRate = found / total;
  const avgRT = reactionTimer.getAverage() || 5000;
  const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'planning');

  store.setTestResult('planning', 0, score, {
    name: '视觉搜索',
    found, total, correctRate: Math.round(correctRate * 100),
    avgReactionTime: Math.round(avgRT)
  });

  showSubTestResult(score, '视觉搜索', found, total, 1);
}

/* ===== 子测试2: 数字连接 ===== */
function renderNumberConnect(app) {
  const ageGroup = store.get('user.ageGroup');
  const diff = getDifficulty(ageGroup);

  // 生成数字序列（交替连接奇偶数）
  const maxNum = diff.connectMax;
  const numbers = [];
  for (let i = 1; i <= maxNum; i++) numbers.push(i);

  // 随机排列位置
  const shuffled = [...numbers].sort(() => Math.random() - 0.5);

  let currentExpected = 1;
  let correctCount = 0;
  let wrongCount = 0;
  const reactionTimer = new ReactionTimer();
  const timeLimit = diff.connectTime;

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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #6C5CE7, #A29BFE);">🔢</div>
            <div>
              <div class="test-header-title">计划能力 · 数字连接</div>
              <div class="test-header-subtitle">按从小到大的顺序，依次点击数字 1 到 ${maxNum}</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>

        <div class="test-content">
          <div class="test-question">
            当前需要点击: <span id="expected-num" style="font-size:2rem; color:var(--primary); font-weight:900;">${currentExpected}</span>
          </div>
          
          <div class="number-grid" id="number-grid" style="
            grid-template-columns: repeat(${Math.ceil(Math.sqrt(maxNum)) + 1}, 1fr);
            max-width: ${(Math.ceil(Math.sqrt(maxNum)) + 1) * 64}px;
            margin: 0 auto;
          ">
            ${shuffled.map((num) => `
              <div class="number-cell" data-num="${num}">${num}</div>
            `).join('')}
          </div>
        </div>

        <div class="test-footer">
          <button class="btn btn-secondary" id="btn-pause" style="margin-right:8px;">⏸️ 暂停</button>
          <button class="btn btn-secondary" id="btn-skip">跳过此题 →</button>
        </div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (remaining) => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (remaining <= 10) timerEl.classList.add('warning');
    },
    () => finishNumberConnect(correctCount, maxNum, wrongCount, reactionTimer)
  );

  reactionTimer.start();
  currentTimer.start();

  currentSession = new TestSession('planning', 1, { total: maxNum });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  document.getElementById('number-grid').addEventListener('click', (e) => {
    const cell = e.target.closest('.number-cell');
    if (!cell || cell.classList.contains('correct')) return;

    const num = parseInt(cell.dataset.num);
    if (num === currentExpected) {
      cell.classList.add('correct', 'selected');
      correctCount++;
      currentExpected++;
      reactionTimer.record();
      document.getElementById('expected-num').textContent = currentExpected;

      if (correctCount >= maxNum) {
        currentTimer.stop();
        setTimeout(() => finishNumberConnect(correctCount, maxNum, wrongCount, reactionTimer), 500);
      }
    } else {
      wrongCount++;
      cell.classList.add('wrong');
      setTimeout(() => cell.classList.remove('wrong'), 500);
    }
  });

  document.getElementById('btn-skip').addEventListener('click', () => {
    currentTimer.stop();
    finishNumberConnect(correctCount, maxNum, wrongCount, reactionTimer);
  });
}

function finishNumberConnect(correct, total, wrong, reactionTimer) {
  const correctRate = correct / total;
  const avgRT = reactionTimer.getAverage() || 5000;
  const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'planning');

  store.setTestResult('planning', 1, score, {
    name: '数字连接',
    correct, total, wrong,
    correctRate: Math.round(correctRate * 100),
    avgReactionTime: Math.round(avgRT)
  });

  showSubTestResult(score, '数字连接', correct, total, 2);
}

/* ===== 子测试3: 路径规划 ===== */
function renderPathPlanning(app) {
  const ageGroup = store.get('user.ageGroup');
  const diff = getDifficulty(ageGroup);
  const rows = diff.mazeRows;
  const cols = diff.mazeCols;

  // 生成简单迷宫
  const maze = generateMaze(rows, cols);
  const start = { r: 0, c: 0 };
  const end = { r: rows - 1, c: cols - 1 };

  let path = [start];
  let steps = 0;
  let wrongSteps = 0;
  const reactionTimer = new ReactionTimer();
  const timeLimit = diff.mazeTime;

  // 最优路径长度
  const optimalPath = findShortestPath(maze, start, end);
  const optimalSteps = optimalPath ? optimalPath.length : rows + cols;

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
            <div class="test-header-icon" style="background:linear-gradient(135deg, #6C5CE7, #A29BFE);">🗺️</div>
            <div>
              <div class="test-header-title">计划能力 · 路径规划</div>
              <div class="test-header-subtitle">从 🟢 走到 🎯，寻找最短路径！</div>
            </div>
          </div>
          <div class="test-timer" id="timer">⏱️ ${Math.floor(timeLimit / 60)}:${(timeLimit % 60).toString().padStart(2, '0')}</div>
        </div>

        <div class="test-content">
          <div class="test-question">点击相邻格子来走路，尝试找到最短路径</div>
          <div class="maze-grid" id="maze-grid" style="grid-template-columns: repeat(${cols}, 40px);">
            ${renderMazeHTML(maze, rows, cols, start, end, path)}
          </div>
          <div style="margin-top:12px; font-size:0.9rem; color:var(--text-secondary);">
            当前步数: <span id="step-count" style="font-weight:800; color:var(--primary);">0</span>
          </div>
        </div>

        <div class="test-footer">
          <button class="btn btn-secondary" id="btn-pause" style="margin-right:8px;">⏸️ 暂停</button>
          <button class="btn btn-secondary" id="btn-reset">🔄 重走</button>
          <button class="btn btn-secondary" id="btn-skip">跳过此题 →</button>
        </div>
      </div>
    </div>
  `;

  const timerEl = document.getElementById('timer');
  currentTimer = new Timer(timeLimit,
    (remaining) => {
      timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
      if (remaining <= 10) timerEl.classList.add('warning');
    },
    () => finishPathPlanning(steps, optimalSteps, wrongSteps, reactionTimer)
  );

  reactionTimer.start();
  currentTimer.start();

  currentSession = new TestSession('planning', 2, { total: optimalSteps });
  currentSession.startAutoSave();
  currentSession.onPause(() => {
    currentTimer.stop();
    showPauseOverlay(currentSession, () => currentTimer.start());
  });
  document.getElementById('btn-pause').addEventListener('click', () => currentSession.pause());

  document.getElementById('maze-grid').addEventListener('click', (e) => {
    const cell = e.target.closest('.maze-cell');
    if (!cell) return;
    const r = parseInt(cell.dataset.r);
    const c = parseInt(cell.dataset.c);

    if (maze[r][c] === 1) return; // 墙

    const last = path[path.length - 1];
    const isAdjacent = (Math.abs(r - last.r) + Math.abs(c - last.c)) === 1;

    if (!isAdjacent) {
      wrongSteps++;
      return;
    }

    // 检查是否回退
    if (path.length > 1 && path[path.length - 2].r === r && path[path.length - 2].c === c) {
      path.pop();
      steps++;
    } else {
      path.push({ r, c });
      steps++;
    }

    reactionTimer.record();
    document.getElementById('step-count').textContent = steps;
    updateMazeDisplay(maze, rows, cols, start, end, path);

    // 检查是否到达终点
    if (r === end.r && c === end.c) {
      currentTimer.stop();
      setTimeout(() => finishPathPlanning(path.length - 1, optimalSteps, wrongSteps, reactionTimer), 500);
    }
  });

  document.getElementById('btn-reset').addEventListener('click', () => {
    path = [start];
    steps = 0;
    wrongSteps = 0;
    document.getElementById('step-count').textContent = '0';
    updateMazeDisplay(maze, rows, cols, start, end, path);
  });

  document.getElementById('btn-skip').addEventListener('click', () => {
    currentTimer.stop();
    finishPathPlanning(steps || optimalSteps * 2, optimalSteps, wrongSteps, reactionTimer);
  });
}

function finishPathPlanning(actualSteps, optimalSteps, wrongSteps, reactionTimer) {
  // 路径效率得分
  const efficiency = Math.max(0, Math.min(1, optimalSteps / Math.max(actualSteps, 1)));
  const avgRT = reactionTimer.getAverage() || 5000;
  const score = calculateScore(efficiency, avgRT, store.get('user.ageGroup'), 'planning');

  store.setTestResult('planning', 2, score, {
    name: '路径规划',
    actualSteps,
    optimalSteps,
    efficiency: Math.round(efficiency * 100),
    wrongSteps,
    avgReactionTime: Math.round(avgRT)
  });

  showSubTestResult(score, '路径规划', Math.round(efficiency * 100), 100, -1);
}

/* ===== 工具函数 ===== */
function getDifficulty(ageGroup) {
  const configs = {
    '幼儿组': { gridSize: 5, targetCount: 4, timeLimit: 45, connectMax: 10, connectTime: 60, mazeRows: 5, mazeCols: 5, mazeTime: 60 },
    '小学低年级组': { gridSize: 6, targetCount: 5, timeLimit: 40, connectMax: 14, connectTime: 55, mazeRows: 6, mazeCols: 6, mazeTime: 55 },
    '小学高年级组': { gridSize: 7, targetCount: 6, timeLimit: 35, connectMax: 18, connectTime: 50, mazeRows: 7, mazeCols: 7, mazeTime: 50 },
    '初中组': { gridSize: 8, targetCount: 8, timeLimit: 30, connectMax: 22, connectTime: 45, mazeRows: 8, mazeCols: 8, mazeTime: 50 },
    '高中组': { gridSize: 8, targetCount: 10, timeLimit: 25, connectMax: 25, connectTime: 40, mazeRows: 9, mazeCols: 9, mazeTime: 45 }
  };
  return configs[ageGroup] || configs['小学高年级组'];
}

function generateMaze(rows, cols) {
  // 简化迷宫生成：保证有路径
  const maze = Array.from({ length: rows }, () => Array(cols).fill(0));

  // 随机添加墙壁（约25%）
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if ((r === 0 && c === 0) || (r === rows - 1 && c === cols - 1)) continue;
      if (Math.random() < 0.25) maze[r][c] = 1;
    }
  }

  // 确保有路径
  const path = findShortestPath(maze, { r: 0, c: 0 }, { r: rows - 1, c: cols - 1 });
  if (!path) {
    // 清除部分墙壁确保可通行
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (r + c <= 2 || r + c >= rows + cols - 4) maze[r][c] = 0;
      }
    }
    // 创建一条对角线路径
    for (let i = 0; i < Math.min(rows, cols); i++) {
      maze[i][i] = 0;
      if (i + 1 < rows) maze[i + 1][i] = 0;
      if (i + 1 < cols) maze[i][i + 1] = 0;
    }
  }

  return maze;
}

function findShortestPath(maze, start, end) {
  const rows = maze.length, cols = maze[0].length;
  const visited = Array.from({ length: rows }, () => Array(cols).fill(false));
  const queue = [{ ...start, path: [start] }];
  visited[start.r][start.c] = true;
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]];

  while (queue.length > 0) {
    const { r, c, path } = queue.shift();
    if (r === end.r && c === end.c) return path;

    for (const [dr, dc] of dirs) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && !visited[nr][nc] && maze[nr][nc] === 0) {
        visited[nr][nc] = true;
        queue.push({ r: nr, c: nc, path: [...path, { r: nr, c: nc }] });
      }
    }
  }
  return null;
}

function renderMazeHTML(maze, rows, cols, start, end, path) {
  let html = '';
  const pathSet = new Set(path.map(p => `${p.r},${p.c}`));
  const lastPos = path[path.length - 1];

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      let cls = 'maze-cell';
      let content = '';

      if (maze[r][c] === 1) {
        cls += ' wall';
      } else if (r === start.r && c === start.c) {
        cls += ' start';
        content = '🟢';
      } else if (r === end.r && c === end.c) {
        cls += ' end';
        content = '🎯';
      } else if (r === lastPos.r && c === lastPos.c) {
        cls += ' current';
        content = '😊';
      } else if (pathSet.has(`${r},${c}`)) {
        cls += ' visited';
        content = '·';
      } else {
        cls += ' path';
      }

      html += `<div class="${cls}" data-r="${r}" data-c="${c}">${content}</div>`;
    }
  }
  return html;
}

function updateMazeDisplay(maze, rows, cols, start, end, path) {
  const grid = document.getElementById('maze-grid');
  if (grid) {
    grid.innerHTML = renderMazeHTML(maze, rows, cols, start, end, path);
  }
}

/* ===== 子测试结果展示 ===== */
function showSubTestResult(score, testName, achieved, total, nextSubIndex) {
  const app = document.getElementById('app');
  const levelInfo = getQuickLevel(score);

  app.innerHTML = `
    <div class="page page-center" style="min-height:100vh;">
      <div class="modal" style="max-width:480px; animation: scaleIn 0.5s cubic-bezier(0.68, -0.55, 0.265, 1.55);">
        <div class="modal-icon">${levelInfo.emoji}</div>
        <div class="modal-title">${testName} 完成！</div>
        <div style="
          font-family: var(--font-display);
          font-size: 3rem;
          font-weight: 900;
          color: ${levelInfo.color};
          margin: 12px 0;
        ">${Math.round(score)}分</div>
        <div class="modal-text">
          ${total > 0 ? `完成: ${achieved}/${total}` : `效率: ${achieved}%`}<br/>
          评级: <strong style="color:${levelInfo.color}">${levelInfo.level}</strong>
        </div>
        <div class="modal-actions">
          ${nextSubIndex > 0 && nextSubIndex <= 2 ? `
            <button class="btn btn-primary" id="btn-next">继续下一项 →</button>
          ` : `
            <button class="btn btn-primary" id="btn-back">返回选择 ✓</button>
          `}
        </div>
      </div>
    </div>
  `;

  if (nextSubIndex > 0 && nextSubIndex <= 2) {
    document.getElementById('btn-next').addEventListener('click', () => {
      renderSubTest(app, nextSubIndex);
    });
  } else {
    document.getElementById('btn-back').addEventListener('click', () => {
      router.navigate('/test-select');
    });
  }
}

function getQuickLevel(score) {
  if (score >= 28) return { level: '优秀', color: '#00B894', emoji: '🌟' };
  if (score >= 22) return { level: '良好', color: '#6C5CE7', emoji: '👍' };
  if (score >= 15) return { level: '中等', color: '#FDCB6E', emoji: '💪' };
  return { level: '继续加油', color: '#E17055', emoji: '📚' };
}
