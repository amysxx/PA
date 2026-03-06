import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';
import { drawRadarChart } from '../utils/charts.js';
import { getScoreLevel } from '../utils/scoring.js';
import { generateUserReportPDF } from '../utils/pdfGenerator.js';
import { exportUserToCSV } from '../utils/dataExport.js';
import { DIMENSIONS, DIMENSION_IMPLEMENTED_INDICATOR_KEYS } from '../domain/dimensions.ts';
import { FINE_GRAINED_FRAMEWORK } from '../domain/fineGrainedFramework.ts';
import { generatePersonalizedAdvice } from '../utils/adviceEngine.js';

const DIMENSION_THEME = {
  attention: { color: '#6C5CE7', gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)' },
  memory: { color: '#00CEC9', gradient: 'linear-gradient(135deg, #00CEC9, #55EFC4)' },
  comprehension: { color: '#E17055', gradient: 'linear-gradient(135deg, #E17055, #FDCB6E)' },
  execution: { color: '#FD79A8', gradient: 'linear-gradient(135deg, #FD79A8, #E84393)' },
  spatial: { color: '#0984E3', gradient: 'linear-gradient(135deg, #0984E3, #74B9FF)' },
  processing: { color: '#F39C12', gradient: 'linear-gradient(135deg, #F39C12, #FDCB6E)' },
};

function getDimensionLevel(score) {
  if (score >= 85) return { label: '优势', color: '#00B894' };
  if (score >= 70) return { label: '良好', color: '#6C5CE7' };
  if (score >= 55) return { label: '中等', color: '#00CEC9' };
  if (score >= 40) return { label: '待提升', color: '#E17055' };
  return { label: '需重点关注', color: '#D63031' };
}

function buildAdviceRows(scores, results) {
  const sorted = [...scores].sort((a, b) => b.score - a.score);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  // 尝试调用 adviceEngine 生成个性化建议
  const standardizedScores = {};
  scores.forEach(item => {
    standardizedScores[item.key] = {
      percentile: item.score, // 直接用分数作百分位近似
      score: item.score
    };
  });

  // 生成个性化建议
  let personalizedAdvice = [];
  try {
    personalizedAdvice = generatePersonalizedAdvice(standardizedScores, store.get('user.ageGroup'));
  } catch (e) {
    console.warn('adviceEngine 失败:', e);
  }

  const baseRows = [
    `优势能力：${strongest.name}（${strongest.score}分），建议持续强化并迁移到学习任务中。`,
    `待提升能力：${weakest.name}（${weakest.score}分），建议优先安排针对性训练。`,
    '建议每2-4周复测一次，使用趋势变化评估训练效果。',
  ];

  return { baseRows, personalizedAdvice };
}

function resolveIndicatorName(dimension, detailName) {
  const name = (detailName || '').toString().trim();
  if (!name) return dimension.name;
  const found = (dimension.subTests || []).find(
    item => item.name === name || item.indicatorName === name || (item.categoryAliases || []).includes(name),
  );
  return found?.indicatorName || name;
}

function buildQuestionBlocks(results) {
  return DIMENSIONS.map(dimension => {
    const grouped = {};
    (results[dimension.key]?.details || [])
      .filter(Boolean)
      .forEach(detail => {
        const indicatorName = resolveIndicatorName(dimension, detail?.name);
        (detail?.questionLogs || []).forEach(log => {
          if (!grouped[indicatorName]) grouped[indicatorName] = [];
          grouped[indicatorName].push(log);
        });
      });
    return {
      dimension,
      groups: Object.entries(grouped).map(([indicatorName, logs]) => ({ indicatorName, logs })),
    };
  });
}

export function renderReport(app) {
  const user = store.get('user');
  if (!user.name || !userManager.isLoggedIn()) {
    router.navigate('/login');
    return;
  }

  const results = store.get('testResults') || {};
  const dimensionScores = DIMENSIONS.map(dimension => ({
    ...dimension,
    score: Math.min(100, Math.round(results[dimension.key]?.totalScore || 0)),
    details: (results[dimension.key]?.details || []).filter(Boolean),
    ...(DIMENSION_THEME[dimension.key] || { color: '#6C5CE7', gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)' }),
  }));
  const overallScore = Math.round(
    dimensionScores.reduce((sum, item) => sum + item.score, 0) / Math.max(dimensionScores.length, 1),
  );
  const overallLevel = getScoreLevel(overallScore);
  const { baseRows, personalizedAdvice } = buildAdviceRows(dimensionScores, results);

  if (store.isAllCompleted() && !store.get('historySaved')) {
    store.saveCurrentTestToHistory();
    store.set('historySaved', true);
  }

  app.innerHTML = `
    <div class="navbar" data-html2canvas-ignore="true">
      <a class="navbar-brand" href="#/test-select">
        <span class="navbar-brand-icon">🧠</span>
        <span>智趣认知乐园</span>
      </a>
      <div class="navbar-actions" style="display:flex; align-items:center; gap:8px;">
        <button class="btn btn-secondary" id="btn-export-pdf" style="padding:8px 16px; font-size:0.85rem;">导出PDF</button>
        <button class="btn btn-secondary" id="btn-export-csv" style="padding:8px 16px; font-size:0.85rem;">导出CSV</button>
        <button class="btn btn-secondary" id="btn-history" style="padding:8px 16px; font-size:0.85rem;">历史记录</button>
        <button class="btn btn-secondary" id="btn-print" style="padding:8px 16px; font-size:0.85rem;">打印</button>
        <button id="btn-switch-user" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;">切换</button>
        <button id="btn-logout" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;">退出</button>
      </div>
    </div>

    <div class="page has-navbar">
      <div class="container" id="report-container" style="max-width:860px; background:white; padding:36px;">
        <div class="report-header">
          <div style="font-size:4rem; margin-bottom:8px;">${overallLevel.emoji}</div>
          <h1 class="report-title">认知力测评报告</h1>
          <p class="report-subtitle">${user.name} · ${user.age}岁 · ${user.ageGroup}</p>
          <div style="margin-top:18px; display:inline-flex; align-items:center; gap:12px; background:var(--bg-card); padding:14px 24px; border-radius:var(--radius-full); box-shadow:var(--shadow-md);">
            <span style="font-size:0.9rem; color:var(--text-secondary);">综合评分</span>
            <span style="font-family:var(--font-display); font-size:2.3rem; font-weight:900; color:${overallLevel.color};">${overallScore}</span>
            <span style="font-size:0.85rem; color:${overallLevel.color}; font-weight:700;">${overallLevel.level}</span>
          </div>
        </div>

        <div class="card" style="margin-bottom:24px;">
          <h2 style="font-family:var(--font-display); font-size:1.2rem; font-weight:800; margin-bottom:16px; text-align:center;">认知画像</h2>
          <div class="radar-container"><canvas id="radar-chart"></canvas></div>
        </div>

        <div class="score-cards">
          ${dimensionScores
      .map((dimension, index) => {
        const level = getDimensionLevel(dimension.score);
        return `
                <div class="score-card" style="background:${dimension.gradient}; animation:bounceIn 0.5s ease forwards; animation-delay:${0.2 + index * 0.1}s; opacity:0;">
                  <div style="display:flex; align-items:center; gap:8px;">
                    <span style="font-size:1.5rem;">${dimension.icon}</span>
                    <span class="score-label">${dimension.name}</span>
                  </div>
                  <div class="score-value">${dimension.score}</div>
                  <div class="score-desc" style="font-weight:700; color:rgba(255,255,255,0.95);">${level.label}</div>
                  <div class="score-bar"><div class="score-bar-inner" style="width:${dimension.score}%;"></div></div>
                </div>
              `;
      })
      .join('')}
        </div>

        <div class="card" style="margin-top:24px; padding:24px;">
          <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:14px;">精细化框架覆盖</h2>
          <p style="font-size:0.85rem; color:var(--text-secondary); margin-bottom:10px;">6大维度共 ${FINE_GRAINED_FRAMEWORK.reduce((s, d) => s + d.indicators.length, 0)} 个子指标，已实现 ${DIMENSION_IMPLEMENTED_INDICATOR_KEYS.length} 个：</p>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${FINE_GRAINED_FRAMEWORK.flatMap(dim => dim.indicators.map(ind => {
        const implemented = DIMENSION_IMPLEMENTED_INDICATOR_KEYS.includes(ind.key);
        return `
                <span style="font-size:0.8rem; padding:5px 10px; border-radius:999px;
                  background:${implemented ? 'var(--primary)' : 'var(--bg-main)'};
                  color:${implemented ? 'white' : 'var(--text-secondary)'};
                  opacity:${implemented ? '1' : '0.7'};
                  border: 1px solid ${implemented ? 'transparent' : 'var(--border)'}">
                  ${implemented ? '✅' : '⬜'} ${dim.icon} ${ind.name}
                </span>`;
      })).join('')}
          </div>
        </div>

        <div class="card" style="margin-top:24px; padding:24px;">
          <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:14px;">结果解读与建议</h2>
          <ul style="margin:0 0 12px; padding-left:18px; color:var(--text-secondary); line-height:1.8; font-size:0.9rem;">
            ${baseRows.map(row => `<li>${row}</li>`).join('')}
          </ul>
          ${personalizedAdvice.length > 0 ? `
            <div style="margin-top:12px;">
              <div style="font-size:0.9rem; font-weight:700; margin-bottom:8px; color:var(--text-primary);">🔍 个性化建议</div>
              <div style="display:flex; flex-direction:column; gap:10px;">
                ${personalizedAdvice.map(advice => `
                  <div style="background:var(--bg-main); border-radius:var(--radius-md); padding:12px 14px; border-left:3px solid var(--primary);">
                    <div style="font-weight:700; font-size:0.88rem; margin-bottom:4px;">${advice.icon} ${advice.title}</div>
                    <div style="font-size:0.85rem; color:var(--text-secondary); line-height:1.6;">${advice.content}</div>
                  </div>
                `).join('')}
              </div>
            </div>` : ''}
        </div>

        <div class="card" style="margin-top:24px; padding:24px;">
          <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">子测评明细</h2>
          ${dimensionScores
      .map(dimension => {
        return `
                <div style="margin-bottom:20px; padding-bottom:20px; border-bottom:1px solid #F0EDF7;">
                  <div style="display:flex; align-items:center; gap:10px; margin-bottom:10px;">
                    <span style="font-size:1.1rem;">${dimension.icon}</span>
                    <span style="font-weight:800;">${dimension.name}</span>
                    <span style="margin-left:auto; font-weight:800; color:${dimension.color};">${dimension.score}分</span>
                  </div>
                  ${dimension.details.length > 0
            ? `
                    <table style="width:100%; font-size:0.88rem; border-collapse:collapse;">
                      <tr style="border-bottom:1px solid #F0EDF7;">
                        <th style="text-align:left; padding:8px 0; color:var(--text-secondary); font-weight:600;">子测评/指标</th>
                        <th style="text-align:center; padding:8px 0; color:var(--text-secondary); font-weight:600;">正确率</th>
                        <th style="text-align:center; padding:8px 0; color:var(--text-secondary); font-weight:600;">反应时</th>
                      </tr>
                      ${dimension.details
              .map(detail => {
                const indicatorName = resolveIndicatorName(dimension, detail.name);
                return `
                            <tr>
                              <td style="padding:8px 0; font-weight:600;">${indicatorName}</td>
                              <td style="text-align:center; font-weight:700;">${detail.correctRate || 0}%</td>
                              <td style="text-align:center; color:var(--text-secondary);">
                                ${detail.avgReactionTime ? `${(detail.avgReactionTime / 1000).toFixed(1)}s` : '-'}
                              </td>
                            </tr>
                          `;
              })
              .join('')}
                    </table>
                  `
            : '<div style="font-size:0.85rem; color:var(--text-light);">暂无子测评明细</div>'
          }
                </div>
              `;
      })
      .join('')}
        </div>

        <div class="card" style="margin-top:24px; padding:24px;">
          <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">题目清单（按精细化指标分组）</h2>
          <div id="report-question-section" style="font-size:0.88rem; color:var(--text-secondary);">正在加载题目清单...</div>
        </div>

        <div style="text-align:center; margin:36px 0; display:flex; gap:16px; justify-content:center; flex-wrap:wrap;" data-html2canvas-ignore="true">
          <button class="btn btn-primary" id="btn-restart">重新测评</button>
          <button class="btn btn-secondary" id="btn-back-select">返回选择</button>
          <button class="btn btn-secondary" id="btn-view-history">查看历史</button>
        </div>
      </div>
    </div>
  `;

  const questionSectionPromise = (async () => {
    const container = document.getElementById('report-question-section');
    if (!container) return;
    try {
      const blocks = buildQuestionBlocks(results);
      const hasAny = blocks.some(block => block.groups.length > 0);
      if (!hasAny) {
        container.innerHTML = '<div style="color:var(--text-light);">本次测评暂无可导出的作答题目记录。</div>';
        return;
      }

      container.innerHTML = blocks
        .map(block => {
          if (block.groups.length === 0) return '';
          return `
            <div style="margin-bottom:16px; border-bottom:1px solid #F0EDF7; padding-bottom:12px;">
              <div style="font-weight:800; margin-bottom:8px;">${block.dimension.icon} ${block.dimension.name}</div>
              ${block.groups
              .map(
                group => `
                    <div style="margin:10px 0 12px;">
                      <div style="font-weight:700; font-size:0.85rem; margin-bottom:6px;">${group.indicatorName}（${group.logs.length}题）</div>
                      <ol style="margin:0; padding-left:18px;">
                        ${group.logs
                    .map(
                      log => `<li style="margin-bottom:6px;">
                              <div>${log.prompt || log.shown || '未命名题目'}</div>
                              <div style="font-size:0.8rem; color:var(--text-light);">
                                你的答案：${log.userAnswer ?? '-'} · 正确答案：${log.correctAnswer ?? '-'} · 结果：${log.isCorrect ? '正确' : '错误'}
                              </div>
                            </li>`,
                    )
                    .join('')}
                      </ol>
                    </div>
                  `,
              )
              .join('')}
            </div>
          `;
        })
        .join('');
    } catch (error) {
      console.error(error);
      container.innerHTML = '<div style="color:#D63031;">作答题目记录加载失败，导出仍可继续。</div>';
    }
  })();

  setTimeout(() => {
    const canvas = document.getElementById('radar-chart');
    if (!canvas) return;
    drawRadarChart(canvas, dimensionScores.map(item => item.score), {
      labels: dimensionScores.map(item => item.name),
      colors: dimensionScores.map(item => item.color),
      size: 320,
    });
  }, 100);

  document.getElementById('btn-print').addEventListener('click', () => window.print());
  document.getElementById('btn-export-pdf').addEventListener('click', async () => {
    await questionSectionPromise;
    const element = document.getElementById('report-container');
    generateUserReportPDF(element, user.name);
  });
  document.getElementById('btn-export-csv').addEventListener('click', () => exportUserToCSV(user, results));
  document.getElementById('btn-history').addEventListener('click', () => router.navigate('/history'));
  document.getElementById('btn-view-history').addEventListener('click', () => router.navigate('/history'));
  document.getElementById('btn-restart').addEventListener('click', () => {
    if (confirm('确定要重新开始测评吗？当前数据将被清除。')) {
      store.reset();
      router.navigate('/');
    }
  });
  document.getElementById('btn-back-select').addEventListener('click', () => router.navigate('/test-select'));
  document.getElementById('btn-switch-user').addEventListener('click', () => router.navigate('/login'));
  document.getElementById('btn-logout').addEventListener('click', () => {
    store.logout();
    router.navigate('/login');
  });
}
