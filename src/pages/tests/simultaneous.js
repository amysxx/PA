/**
 * 同时性加工测试模块
 * 子测试1: 图形矩阵推理 — 根据图形关系完成矩阵
 * 子测试2: 空间关系 — 判断图形的空间位置关系
 * 子测试3: 词语关系 — 理解词语间的语义关系
 */
import { router } from '../../router.js';
import { store } from '../../store.js';
import { Timer, ReactionTimer } from '../../utils/timer.js';
import { calculateScore } from '../../utils/scoring.js';
import { TestSession, showPauseOverlay } from '../../utils/testSession.js';

let currentTimer = null;
let currentSession = null;

export function renderSimultaneous(app) {
    const user = store.get('user');
    if (!user.name) { router.navigate('/user-info'); return; }

    const progress = store.get('testProgress.simultaneous');
    let currentSub = progress.subTests.findIndex(s => !s);
    if (currentSub === -1) currentSub = 0;
    renderSubTest(app, currentSub);
}

function renderSubTest(app, subIndex) {
    if (currentTimer) { currentTimer.stop(); currentTimer = null; }
    switch (subIndex) {
        case 0: renderMatrixReasoning(app); break;
        case 1: renderSpatialRelation(app); break;
        case 2: renderWordRelation(app); break;
        default: router.navigate('/test-select');
    }
}

/* ===== 子测试1: 图形矩阵推理 ===== */
function renderMatrixReasoning(app) {
    const diff = getDifficulty(store.get('user.ageGroup'));
    const questions = generateMatrixQuestions(diff.matrixCount);
    let currentQ = 0;
    let correct = 0;
    const reactionTimer = new ReactionTimer();
    const timeLimit = diff.matrixTime;

    function showQuestion() {
        if (currentQ >= questions.length) {
            currentTimer.stop();
            finishSubTest(0, '图形矩阵推理', correct, questions.length, reactionTimer, 1);
            return;
        }
        const q = questions[currentQ];
        const contentEl = document.getElementById('test-inner-content');
        if (!contentEl) return;

        contentEl.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:12px;">第 ${currentQ + 1}/${questions.length} 题</div>
      <div class="test-question">找出规律，选择缺少的图形</div>
      <div style="
        display: grid;
        grid-template-columns: repeat(3, 1fr);
        gap: 8px;
        max-width: 240px;
        margin: 0 auto 24px;
      ">
        ${q.matrix.map((cell, i) => `
          <div style="
            width: 72px; height: 72px;
            border: 2px solid ${i === q.missingIndex ? 'var(--accent-pink)' : '#E8E5F3'};
            border-radius: var(--radius-sm);
            display: flex; align-items: center; justify-content: center;
            font-size: 2rem;
            background: ${i === q.missingIndex ? '#FFF0F5' : 'var(--bg-card)'};
            ${i === q.missingIndex ? 'border-style: dashed;' : ''}
          ">
            ${i === q.missingIndex ? '❓' : cell}
          </div>
        `).join('')}
      </div>
      <div class="test-options" style="max-width:500px;">
        ${q.options.map((opt, i) => `
          <div class="test-option" data-idx="${i}" style="font-size:1.8rem; padding:14px;">${opt}</div>
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
                setTimeout(showQuestion, 600);
            });
        });
    }

    renderTestShell(app, '同时性加工', '图形矩阵推理', '🧩', '根据规律推导缺失的图形',
        'linear-gradient(135deg, #00CEC9, #55EFC4)', timeLimit,
        (timerEl) => {
            currentTimer = new Timer(timeLimit,
                (rem) => {
                    timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
                    if (rem <= 10) timerEl.classList.add('warning');
                },
                () => finishSubTest(0, '图形矩阵推理', correct, currentQ || 1, reactionTimer, 1)
            );
            currentTimer.start();

            currentSession = new TestSession('simultaneous', 0, { total: questions.length });
            currentSession.startAutoSave();
            document.getElementById('btn-pause')?.addEventListener('click', () => {
                currentTimer.stop();
                currentSession.pause();
                showPauseOverlay(currentSession, () => currentTimer.start());
            });

            showQuestion();
        },
        () => {
            currentTimer.stop();
            finishSubTest(0, '图形矩阵推理', correct, currentQ || 1, reactionTimer, 1);
        }
    );
}

/* ===== 子测试2: 空间关系 ===== */
function renderSpatialRelation(app) {
    const diff = getDifficulty(store.get('user.ageGroup'));
    const questions = generateSpatialQuestions(diff.spatialCount);
    let currentQ = 0;
    let correct = 0;
    const reactionTimer = new ReactionTimer();
    const timeLimit = diff.spatialTime;

    function showQuestion() {
        if (currentQ >= questions.length) {
            currentTimer.stop();
            finishSubTest(1, '空间关系', correct, questions.length, reactionTimer, 2);
            return;
        }
        const q = questions[currentQ];
        const contentEl = document.getElementById('test-inner-content');
        if (!contentEl) return;

        contentEl.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:12px;">第 ${currentQ + 1}/${questions.length} 题</div>
      <div class="test-question">${q.question}</div>
      <div style="font-size:3rem; margin:16px 0; animation: popIn 0.3s ease;">${q.display}</div>
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
                setTimeout(showQuestion, 600);
            });
        });
    }

    renderTestShell(app, '同时性加工', '空间关系', '📐', '判断图形之间的空间位置关系',
        'linear-gradient(135deg, #00CEC9, #55EFC4)', timeLimit,
        (timerEl) => {
            currentTimer = new Timer(timeLimit,
                (rem) => {
                    timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
                    if (rem <= 10) timerEl.classList.add('warning');
                },
                () => finishSubTest(1, '空间关系', correct, currentQ || 1, reactionTimer, 2)
            );
            currentTimer.start();

            currentSession = new TestSession('simultaneous', 1, { total: questions.length });
            currentSession.startAutoSave();
            document.getElementById('btn-pause')?.addEventListener('click', () => {
                currentTimer.stop();
                currentSession.pause();
                showPauseOverlay(currentSession, () => currentTimer.start());
            });

            showQuestion();
        },
        () => {
            currentTimer.stop();
            finishSubTest(1, '空间关系', correct, currentQ || 1, reactionTimer, 2);
        }
    );
}

/* ===== 子测试3: 词语关系 ===== */
function renderWordRelation(app) {
    const diff = getDifficulty(store.get('user.ageGroup'));
    const questions = generateWordQuestions(diff.wordCount, store.get('user.ageGroup'));
    let currentQ = 0;
    let correct = 0;
    const reactionTimer = new ReactionTimer();
    const timeLimit = diff.wordTime;

    function showQuestion() {
        if (currentQ >= questions.length) {
            currentTimer.stop();
            finishSubTest(2, '词语关系', correct, questions.length, reactionTimer, -1);
            return;
        }
        const q = questions[currentQ];
        const contentEl = document.getElementById('test-inner-content');
        if (!contentEl) return;

        contentEl.innerHTML = `
      <div style="font-size:0.85rem; color:var(--text-light); margin-bottom:12px;">第 ${currentQ + 1}/${questions.length} 题</div>
      <div class="test-question" style="line-height:1.8;">
        ${q.question}
      </div>
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
                setTimeout(showQuestion, 600);
            });
        });
    }

    renderTestShell(app, '同时性加工', '词语关系', '📝', '理解词语之间的语义关系',
        'linear-gradient(135deg, #00CEC9, #55EFC4)', timeLimit,
        (timerEl) => {
            currentTimer = new Timer(timeLimit,
                (rem) => {
                    timerEl.innerHTML = `⏱️ ${currentTimer.getFormatted()}`;
                    if (rem <= 10) timerEl.classList.add('warning');
                },
                () => finishSubTest(2, '词语关系', correct, currentQ || 1, reactionTimer, -1)
            );
            currentTimer.start();

            currentSession = new TestSession('simultaneous', 2, { total: questions.length });
            currentSession.startAutoSave();
            document.getElementById('btn-pause')?.addEventListener('click', () => {
                currentTimer.stop();
                currentSession.pause();
                showPauseOverlay(currentSession, () => currentTimer.start());
            });

            showQuestion();
        },
        () => {
            currentTimer.stop();
            finishSubTest(2, '词语关系', correct, currentQ || 1, reactionTimer, -1);
        }
    );
}

/* ===== 通用测试外壳 ===== */
function renderTestShell(app, dimension, subName, icon, subtitle, bgGrad, timeLimit, onReady, onSkip) {
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
            <div class="test-header-icon" style="background:${bgGrad};">${icon}</div>
            <div>
              <div class="test-header-title">${dimension} · ${subName}</div>
              <div class="test-header-subtitle">${subtitle}</div>
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
    onReady(timerEl);
    document.getElementById('btn-skip')?.addEventListener('click', onSkip);
}

/* ===== 通用完成处理 ===== */
function finishSubTest(subIndex, name, correct, total, reactionTimer, nextSub) {
    const correctRate = correct / Math.max(total, 1);
    const avgRT = reactionTimer.getAverage() || 5000;
    const score = calculateScore(correctRate, avgRT, store.get('user.ageGroup'), 'simultaneous');

    store.setTestResult('simultaneous', subIndex, score, {
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
function generateMatrixQuestions(count) {
    // 图形模式推理 - 扩展题库
    const patterns = [
        { shapes: ['🔴', '🔵', '🟢'], rule: 'row-color' },
        { shapes: ['⬛', '⬜', '🟫'], rule: 'row-shade' },
        { shapes: ['▲', '■', '●'], rule: 'row-shape' },
        { shapes: ['🌙', '⭐', '☀️'], rule: 'row-sky' },
        { shapes: ['🍎', '🍊', '🍋'], rule: 'row-fruit' },
        { shapes: ['🐱', '🐶', '🐰'], rule: 'row-animal' },
        { shapes: ['❤️', '💛', '💙'], rule: 'row-heart' },
        { shapes: ['🌲', '🌻', '🍄'], rule: 'row-nature' },
        { shapes: ['🔶', '🔷', '🔸'], rule: 'row-diamond' },
        { shapes: ['🎀', '🎁', '🎈'], rule: 'row-party' },
        { shapes: ['🐟', '🐬', '🐙'], rule: 'row-sea' },
        { shapes: ['🚗', '🚌', '🚲'], rule: 'row-vehicle' },
        { shapes: ['🌈', '🌊', '🍃'], rule: 'row-element' },
        { shapes: ['🎵', '🎶', '🎼'], rule: 'row-music' },
        { shapes: ['🔑', '🔒', '🔔'], rule: 'row-metal' },
    ];

    const allShapes = ['🔴', '🔵', '🟢', '⬛', '⬜', '▲', '■', '●', '🌙', '⭐', '🔶', '🔷', '🎀', '🐟', '🚗'];

    const questions = [];
    // 打乱模式顺序，避免重复
    const shuffledPatterns = [...patterns].sort(() => Math.random() - 0.5);

    for (let q = 0; q < count; q++) {
        const pattern = shuffledPatterns[q % shuffledPatterns.length];
        const matrix = [];

        // 使用不同的排列方式增加多样性
        const ruleType = q % 3; // 0=行循环, 1=列循环, 2=对角线
        for (let r = 0; r < 3; r++) {
            for (let c = 0; c < 3; c++) {
                if (ruleType === 0) {
                    matrix.push(pattern.shapes[(r + c) % 3]);
                } else if (ruleType === 1) {
                    matrix.push(pattern.shapes[(c + r * 2) % 3]);
                } else {
                    matrix.push(pattern.shapes[(r + c + 1) % 3]);
                }
            }
        }

        // 随机选择缺失位置（后两行更具挑战性）
        const missingRow = q < count / 2 ? 2 : 1 + Math.floor(Math.random() * 2);
        const missingCol = Math.floor(Math.random() * 3);
        const missingIndex = missingRow * 3 + missingCol;
        const correctAnswer = matrix[missingIndex];

        // 生成干扰选项
        const options = [correctAnswer];
        // 添加同组其他形状
        pattern.shapes.forEach(s => { if (!options.includes(s)) options.push(s); });
        // 添加额外干扰
        while (options.length < 4) {
            const rand = allShapes[Math.floor(Math.random() * allShapes.length)];
            if (!options.includes(rand)) options.push(rand);
        }

        const shuffled = options.slice(0, 4).sort(() => Math.random() - 0.5);
        const correctIndex = shuffled.indexOf(correctAnswer);

        questions.push({ matrix, missingIndex, options: shuffled, correctIndex });
    }
    return questions;
}

function generateSpatialQuestions(count) {
    const templates = [
        { question: '下面哪个图形是旋转后的结果？', display: '🔺', options: ['🔻', '🔺', '◀️', '▶️'], correctIndex: 0 },
        { question: '哪个图形在左边？', display: '⬅️ 🔵 🔴', options: ['🔵', '🔴', '都不是', '一样远'], correctIndex: 0 },
        { question: '🟡在🔵的什么方向？', display: '🔵\n🟡', options: ['上面', '下面', '左边', '右边'], correctIndex: 1 },
        { question: '下列哪组是对称图形？', display: '🦋', options: ['🦋', '🐌', '🦀', '🐠'], correctIndex: 0 },
        { question: '🔺和 🔻 是什么关系？', display: '🔺 🔻', options: ['上下翻转', '左右翻转', '旋转90°', '完全相同'], correctIndex: 0 },
        { question: '哪个图形最大？', display: '● ⬤ •', options: ['第一个', '第二个', '第三个', '一样大'], correctIndex: 1 },
        { question: '下面哪个能拼组成正方形？', display: '◤ + ?', options: ['◢', '◣', '◥', '▲'], correctIndex: 0 },
        { question: '镜像翻转后，箭头指向哪？', display: '→', options: ['←', '→', '↑', '↓'], correctIndex: 0 },
        { question: '🟢在🔴和🔵之间属于什么位置？', display: '🔴 🟢 🔵', options: ['居中', '偏左', '偏右', '不确定'], correctIndex: 0 },
        { question: '下面哪个形状有4条边？', display: '❓', options: ['◆', '▲', '●', '⬟'], correctIndex: 0 },
        { question: '把 ◀️ 顺时针旋转90°，变成什么？', display: '◀️ → ?', options: ['🔼', '🔽', '▶️', '◀️'], correctIndex: 0 },
        { question: '等边三角形有几条对称轴？', display: '△（等边）', options: ['3条', '1条', '2条', '0条'], correctIndex: 0 },
        { question: '从正上方看圆柱体，看到什么形状？', display: '🔵 (俯视)', options: ['圆形', '长方形', '三角形', '梯形'], correctIndex: 0 },
        { question: '🔴在🔵的上方，🟢在🔵的右边，🟢在🔴的什么方向？', display: '🔴\n🔵 🟢', options: ['右下方', '左下方', '右上方', '正右方'], correctIndex: 0 },
        { question: '哪两个形状完全一样？', display: '🔷 🔶 🔷 🔸', options: ['第1和第3', '第1和第2', '第2和第4', '第3和第4'], correctIndex: 0 },
        { question: '下面哪个图形旋转180°后和原来一样？', display: '?', options: ['⬟', '▲', '◀️', '🔶'], correctIndex: 3 },
        { question: '🏠的左边是🌲，右边是🚗，中间是什么？', display: '🌲 🏠 🚗', options: ['🏠', '🌲', '🚗', '什么都没有'], correctIndex: 0 },
        { question: '将正方形对角线切开，得到什么形状？', display: '■ → ✂️', options: ['两个三角形', '两个长方形', '一个梯形', '四个三角形'], correctIndex: 0 },
    ];

    const questions = [];
    const shuffled = [...templates].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
        questions.push(shuffled[i % shuffled.length]);
    }
    return questions;
}

function generateWordQuestions(count, ageGroup) {
    const easyQuestions = [
        { question: '"猫" 和 "狗" 属于什么关系？', options: ['同类关系', '反义关系', '因果关系', '包含关系'], correctIndex: 0 },
        { question: '"苹果" 对 "水果"，就像 "玫瑰" 对 ___', options: ['花', '红色', '美丽', '树'], correctIndex: 0 },
        { question: '"高" 和 "矮" 是什么关系？', options: ['同义词', '反义词', '近义词', '同类词'], correctIndex: 1 },
        { question: '"眼睛" 对 "看"，就像 "耳朵" 对 ___', options: ['听', '说', '鼻子', '脸'], correctIndex: 0 },
        { question: '哪个词和 "快乐" 意思最接近？', options: ['高兴', '悲伤', '生气', '害怕'], correctIndex: 0 },
        { question: '"春天" 对 "温暖"，就像 "冬天" 对 ___', options: ['寒冷', '炎热', '凉爽', '温暖'], correctIndex: 0 },
        { question: '下面哪个不是动物？', options: ['桌子', '小猫', '小鸟', '金鱼'], correctIndex: 0 },
        { question: '"大" 的反义词是什么？', options: ['小', '多', '高', '长'], correctIndex: 0 },
        { question: '"铅笔" 对 "写"，就像 "剪刀" 对 ___', options: ['剪', '画', '量', '折'], correctIndex: 0 },
        { question: '下面哪个词表示颜色？', options: ['紫色', '圆形', '响亮', '柔软'], correctIndex: 0 },
    ];

    const hardQuestions = [
        { question: '"医生" 对 "医院"，就像 "老师" 对 ___', options: ['学校', '公司', '工厂', '商店'], correctIndex: 0 },
        { question: '以下哪组词的关系与 "画笔 : 画家" 最相似？', options: ['锤子 : 工人', '书本 : 学生', '食物 : 厨师', '歌曲 : 歌手'], correctIndex: 0 },
        { question: '"勇敢" 和 "胆怯" 的关系最像 ___', options: ['光明与黑暗', '聪明与智慧', '高大与强壮', '美丽与漂亮'], correctIndex: 0 },
        { question: '下面哪个词不属于同一类？', options: ['钢琴', '小提琴', '画笔', '吉他'], correctIndex: 2 },
        { question: '"因为…所以…" 表达的是什么关系？', options: ['因果关系', '转折关系', '并列关系', '递进关系'], correctIndex: 0 },
        { question: '"蜂蜜" 对 "甜"，就像 "柠檬" 对 ___', options: ['酸', '苦', '辣', '咸'], correctIndex: 0 },
        { question: '下列哪个是 "知识" 的上位概念？', options: ['信息', '书本', '学校', '考试'], correctIndex: 0 },
        { question: '"树干" 对 "树"，就像 "轮子" 对 ___', options: ['汽车', '道路', '速度', '橡胶'], correctIndex: 0 },
        { question: '"鱼" 对 "水"，就像 "鸟" 对 ___', options: ['天空', '树', '巢', '虫子'], correctIndex: 0 },
        { question: '下面哪个成语和 "画蛇添足" 意思相近？', options: ['多此一举', '锦上添花', '雪中送炭', '杯水车薪'], correctIndex: 0 },
        { question: '"整体" 和 "局部" 的关系类似于___', options: ['森林和树木', '苹果和香蕉', '红色和蓝色', '快速和缓慢'], correctIndex: 0 },
        { question: '"钟表" 对 "时间"，就像 "温度计" 对 ___', options: ['温度', '水银', '玻璃', '科学'], correctIndex: 0 },
        { question: '下面哪个词和其他三个不是一类？', options: ['跑步', '游泳', '阅读', '跳远'], correctIndex: 2 },
        { question: '"必要条件" 和 "充分条件" 是什么关系？', options: ['互为对比', '完全相同', '包含关系', '因果关系'], correctIndex: 0 },
    ];

    const isYoung = ['幼儿组', '小学低年级组'].includes(ageGroup);
    const pool = isYoung ? easyQuestions : [...easyQuestions, ...hardQuestions];

    const questions = [];
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    for (let i = 0; i < count; i++) {
        questions.push(shuffled[i % shuffled.length]);
    }
    return questions;
}

function getDifficulty(ageGroup) {
    const configs = {
        '幼儿组': { matrixCount: 5, matrixTime: 60, spatialCount: 5, spatialTime: 60, wordCount: 5, wordTime: 60 },
        '小学低年级组': { matrixCount: 6, matrixTime: 55, spatialCount: 6, spatialTime: 55, wordCount: 6, wordTime: 55 },
        '小学高年级组': { matrixCount: 8, matrixTime: 55, spatialCount: 7, spatialTime: 50, wordCount: 7, wordTime: 50 },
        '初中组': { matrixCount: 9, matrixTime: 50, spatialCount: 8, spatialTime: 48, wordCount: 8, wordTime: 48 },
        '高中组': { matrixCount: 10, matrixTime: 45, spatialCount: 10, spatialTime: 45, wordCount: 10, wordTime: 45 }
    };
    return configs[ageGroup] || configs['小学高年级组'];
}

function getQuickLevel(score) {
    if (score >= 28) return { level: '优秀', color: '#00B894', emoji: '🌟' };
    if (score >= 22) return { level: '良好', color: '#6C5CE7', emoji: '👍' };
    if (score >= 15) return { level: '中等', color: '#FDCB6E', emoji: '💪' };
    return { level: '继续加油', color: '#E17055', emoji: '📚' };
}
