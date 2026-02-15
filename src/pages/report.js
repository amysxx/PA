/**
 * 测评报告页
 * 雷达图四维度展示 + 详细分析 + 建议
 */
import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';
import { drawRadarChart } from '../utils/charts.js';
import { getScoreLevel, getSuggestions } from '../utils/scoring.js';

export function renderReport(app) {
  const user = store.get('user');
  if (!user.name || !userManager.isLoggedIn()) { router.navigate('/login'); return; }

  const results = store.get('testResults');
  const scores = store.getOverallScores();
  const [planScore, attnScore, simScore, sucScore] = scores;

  const dims = [
    { key: 'planning', name: '计划能力', score: planScore, icon: '🎯', color: '#6C5CE7', gradient: 'linear-gradient(135deg, #6C5CE7, #A29BFE)' },
    { key: 'attention', name: '注意过程', score: attnScore, icon: '👁️', color: '#E17055', gradient: 'linear-gradient(135deg, #E17055, #FDCB6E)' },
    { key: 'simultaneous', name: '同时性加工', score: simScore, icon: '🧩', color: '#00CEC9', gradient: 'linear-gradient(135deg, #00CEC9, #55EFC4)' },
    { key: 'successive', name: '继时性加工', score: sucScore, icon: '🔗', color: '#FD79A8', gradient: 'linear-gradient(135deg, #FD79A8, #E84393)' }
  ];

  const avgScore = Math.round((planScore + attnScore + simScore + sucScore) / 4);
  const overallLevel = getScoreLevel(avgScore);

  app.innerHTML = `
    <div class="navbar">
      <a class="navbar-brand" href="#/test-select">
        <span class="navbar-brand-icon">🧠</span>
        <span>智趣认知乐园</span>
      </a>
      <div class="navbar-actions" style="display:flex; align-items:center; gap:8px;">
        <button class="btn btn-secondary" id="btn-print" style="padding:8px 16px; font-size:0.85rem;">🖨️ 打印报告</button>
        <button id="btn-switch-user" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;">🔄 切换</button>
        <button id="btn-logout" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;">🚪 退出</button>
      </div>
    </div>

    <div class="page has-navbar">
      <div class="container" style="max-width:800px;">
        
        <!-- 报告头部 -->
        <div class="report-header">
          <div style="font-size:4rem; margin-bottom:8px; animation: bounceIn 0.6s ease;">${overallLevel.emoji}</div>
          <h1 class="report-title">认知力测评报告</h1>
          <p class="report-subtitle">
            ${user.name} · ${user.age}岁 · ${user.ageGroup} · ${user.gender === '男' ? '👦' : '👧'}
          </p>
          <div style="
            margin-top:20px;
            display: inline-flex;
            align-items: center;
            gap: 12px;
            background: var(--bg-card);
            padding: 16px 32px;
            border-radius: var(--radius-full);
            box-shadow: var(--shadow-md);
          ">
            <span style="font-size:0.9rem; color:var(--text-secondary);">综合评分</span>
            <span style="font-family:var(--font-display); font-size:2.5rem; font-weight:900; color:${overallLevel.color};">${avgScore}</span>
            <span style="font-size:0.9rem; color:${overallLevel.color}; font-weight:700;">${overallLevel.level}</span>
          </div>
        </div>

        <!-- 雷达图 -->
        <div class="card" style="margin-bottom:24px;">
          <h2 style="font-family:var(--font-display); font-size:1.2rem; font-weight:800; margin-bottom:16px; text-align:center;">
            📊 四维度认知评估
          </h2>
          <div class="radar-container">
            <canvas id="radar-chart"></canvas>
          </div>
        </div>

        <!-- 各维度得分卡片 -->
        <div class="score-cards">
          ${dims.map((dim, i) => {
    const level = getScoreLevel(dim.score);
    return `
              <div class="score-card" style="background:${dim.gradient}; animation: bounceIn 0.5s ease forwards; animation-delay:${0.2 + i * 0.1}s; opacity:0;">
                <div style="display:flex; align-items:center; gap:8px;">
                  <span style="font-size:1.5rem;">${dim.icon}</span>
                  <span class="score-label">${dim.name}</span>
                </div>
                <div class="score-value">${dim.score}</div>
                <div class="score-desc">${level.desc}</div>
                <div class="score-bar">
                  <div class="score-bar-inner" style="width:${dim.score}%;"></div>
                </div>
              </div>
            `;
  }).join('')}
        </div>

        <!-- 各维度详细分析 -->
        <div class="card" style="margin-top:24px; padding:32px;">
          <h2 style="font-family:var(--font-display); font-size:1.2rem; font-weight:800; margin-bottom:20px;">
            📋 详细分析
          </h2>
          ${dims.map(dim => {
    const details = results[dim.key].details.filter(Boolean);
    return `
              <div style="margin-bottom:24px; padding-bottom:24px; border-bottom:1px solid #F0EDF7;">
                <div style="display:flex; align-items:center; gap:10px; margin-bottom:12px;">
                  <span style="
                    display:inline-flex; align-items:center; justify-content:center;
                    width:36px; height:36px; border-radius:50%;
                    background:${dim.gradient}; font-size:1.1rem;
                  ">${dim.icon}</span>
                  <span style="font-weight:800; font-size:1.05rem;">${dim.name}</span>
                  <span style="
                    margin-left:auto;
                    font-weight:800;
                    color:${dim.color};
                    font-family:var(--font-display);
                    font-size:1.2rem;
                  ">${dim.score}分</span>
                </div>
                ${details.length > 0 ? `
                  <table style="width:100%; font-size:0.9rem; border-collapse:collapse;">
                    <tr style="border-bottom:1px solid #F0EDF7;">
                      <th style="text-align:left; padding:8px 0; color:var(--text-secondary); font-weight:600;">子测试</th>
                      <th style="text-align:center; padding:8px 0; color:var(--text-secondary); font-weight:600;">正确率</th>
                      <th style="text-align:center; padding:8px 0; color:var(--text-secondary); font-weight:600;">反应时间</th>
                    </tr>
                    ${details.map(d => `
                      <tr>
                        <td style="padding:8px 0; font-weight:600;">${d.name}</td>
                        <td style="text-align:center; color:${(d.correctRate || 0) >= 70 ? 'var(--accent-green)' : 'var(--accent-orange)'}; font-weight:700;">
                          ${d.correctRate || 0}%
                        </td>
                        <td style="text-align:center; color:var(--text-secondary);">
                          ${d.avgReactionTime ? (d.avgReactionTime / 1000).toFixed(1) + 's' : '-'}
                        </td>
                      </tr>
                    `).join('')}
                  </table>
                ` : '<p style="color:var(--text-light); font-size:0.9rem;">暂无数据</p>'}
              </div>
            `;
  }).join('')}
        </div>

        <!-- 建议与指导 -->
        <div class="suggestions" style="margin-top:24px;">
          <h3>💡 个性化指导建议</h3>
          ${dims.map(dim => {
    const suggestions = getSuggestions(dim.key, dim.score);
    if (suggestions.length === 0) return '';
    return `
              <div style="margin-bottom:20px;">
                <div style="font-weight:700; margin-bottom:8px; display:flex; align-items:center; gap:8px;">
                  <span>${dim.icon}</span> ${dim.name}
                </div>
                ${suggestions.map(s => `
                  <div class="suggestion-item">
                    <div class="suggestion-icon" style="background:${dim.color}20; color:${dim.color};">✦</div>
                    <div class="suggestion-text">${s}</div>
                  </div>
                `).join('')}
              </div>
            `;
  }).join('')}
        </div>

        <!-- 操作按钮 -->
        <div style="text-align:center; margin:40px 0; display:flex; gap:16px; justify-content:center; flex-wrap:wrap;">
          <button class="btn btn-primary" id="btn-restart">🔄 重新测评</button>
          <button class="btn btn-secondary" id="btn-back-select">← 返回选择</button>
        </div>

        <!-- 底部声明 -->
        <div style="text-align:center; padding:20px 0; font-size:0.8rem; color:var(--text-light); line-height:1.6;">
          📌 本测评基于 PASS 认知理论，结果仅供参考<br/>
          如有进一步需求，建议咨询专业心理咨询师
        </div>
      </div>
    </div>
  `;

  // 绘制雷达图
  setTimeout(() => {
    const canvas = document.getElementById('radar-chart');
    if (canvas) {
      drawRadarChart(canvas, scores, {
        colors: ['#6C5CE7', '#E17055', '#00CEC9', '#FD79A8'],
        size: 320
      });
    }
  }, 100);

  // 打印
  document.getElementById('btn-print').addEventListener('click', () => {
    window.print();
  });

  // 重新测评
  document.getElementById('btn-restart').addEventListener('click', () => {
    if (confirm('确定要重新开始测评吗？当前数据将被清除。')) {
      store.reset();
      router.navigate('/');
    }
  });

  // 返回选择
  document.getElementById('btn-back-select').addEventListener('click', () => {
    router.navigate('/test-select');
  });

  // 切换用户
  document.getElementById('btn-switch-user').addEventListener('click', () => {
    router.navigate('/login');
  });

  // 退出登录
  document.getElementById('btn-logout').addEventListener('click', () => {
    store.logout();
    router.navigate('/login');
  });
}
