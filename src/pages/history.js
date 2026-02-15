/**
 * 历史记录页面
 * 展示用户的测评历史、趋势图表、进步分析
 */
import { router } from '../router.js';
import { store } from '../store.js';
import { userManager } from '../userManager.js';
import { getTestHistory, getUserStatistics, calculateImprovement, getTrendData } from '../utils/dataHistory.js';
import { DIMENSION_NAMES } from '../utils/normativeData.js';
import { drawBarChart } from '../utils/charts.js';

const DIMS = ['planning', 'attention', 'simultaneous', 'successive'];
const DIM_COLORS = ['#6C5CE7', '#E17055', '#00CEC9', '#FD79A8'];
const DIM_ICONS = ['🎯', '👁️', '🧩', '🔗'];

export function renderHistory(app) {
    const user = store.get('user');
    if (!user.name || !userManager.isLoggedIn()) { router.navigate('/login'); return; }

    const userId = userManager.getCurrentUserId();
    const history = getTestHistory(userId);
    const stats = getUserStatistics(userId);

    app.innerHTML = `
        <div class="navbar">
            <a class="navbar-brand" href="#/test-select">
                <span class="navbar-brand-icon">🧠</span>
                <span>智趣认知乐园</span>
            </a>
            <div class="navbar-actions" style="display:flex; align-items:center; gap:8px;">
                <button id="btn-back" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;">← 返回</button>
            </div>
        </div>

        <div class="page has-navbar">
            <div class="container" style="max-width:800px;">
                <h1 style="font-family:var(--font-display); font-size:1.8rem; font-weight:900; text-align:center; margin-bottom:8px;">
                    📊 测评历史
                </h1>
                <p style="text-align:center; color:var(--text-secondary); margin-bottom:32px;">
                    ${user.name} · 共完成 ${history.length} 次测评
                </p>

                ${history.length === 0 ? renderEmptyState() : renderHistoryContent(history, stats, userId)}
            </div>
        </div>
    `;

    // 事件绑定
    document.getElementById('btn-back').addEventListener('click', () => {
        router.navigate('/test-select');
    });

    // 绘制趋势图
    if (history.length >= 2) {
        setTimeout(() => drawTrendCharts(userId), 100);
    }
}

function renderEmptyState() {
    return `
        <div class="card" style="text-align:center; padding:60px 32px;">
            <div style="font-size:4rem; margin-bottom:16px;">📋</div>
            <h2 style="font-weight:800; margin-bottom:8px;">暂无测评记录</h2>
            <p style="color:var(--text-secondary); margin-bottom:24px;">完成一次测评后，这里将显示你的历史记录和进步趋势</p>
            <button class="btn btn-primary" onclick="window.location.hash='#/test-select'">开始测评</button>
        </div>
    `;
}

function renderHistoryContent(history, stats, userId) {
    return `
        ${stats ? renderStatsCard(stats) : ''}
        ${history.length >= 2 ? renderTrendSection() : ''}
        ${history.length >= 2 ? renderImprovementSection(userId) : ''}
        ${renderRecordsList(history)}
    `;
}

function renderStatsCard(stats) {
    return `
        <div class="card" style="margin-bottom:24px; padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">📈 统计汇总</h2>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(120px, 1fr)); gap:16px;">
                <div style="text-align:center; padding:12px; background:var(--bg-main); border-radius:var(--radius-lg);">
                    <div style="font-size:1.8rem; font-weight:900; color:#6C5CE7; font-family:var(--font-display);">${stats.totalTests}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">测评次数</div>
                </div>
                <div style="text-align:center; padding:12px; background:var(--bg-main); border-radius:var(--radius-lg);">
                    <div style="font-size:1.8rem; font-weight:900; color:#00CEC9; font-family:var(--font-display);">${stats.averageScore}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">平均总分</div>
                </div>
                <div style="text-align:center; padding:12px; background:var(--bg-main); border-radius:var(--radius-lg);">
                    <div style="font-size:1.8rem; font-weight:900; color:#00B894; font-family:var(--font-display);">${stats.bestScore}</div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">最高总分</div>
                </div>
                ${stats.improvementRate !== undefined ? `
                <div style="text-align:center; padding:12px; background:var(--bg-main); border-radius:var(--radius-lg);">
                    <div style="font-size:1.8rem; font-weight:900; color:${stats.improvementRate >= 0 ? '#00B894' : '#E17055'}; font-family:var(--font-display);">
                        ${stats.improvementRate >= 0 ? '+' : ''}${Math.round(stats.improvementRate * 100)}%
                    </div>
                    <div style="font-size:0.8rem; color:var(--text-secondary);">总体进步</div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function renderTrendSection() {
    return `
        <div class="card" style="margin-bottom:24px; padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">📉 百分位趋势</h2>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                ${DIMS.map((dim, i) => `
                    <div style="text-align:center;">
                        <div style="font-size:0.85rem; font-weight:700; margin-bottom:8px;">
                            ${DIM_ICONS[i]} ${DIMENSION_NAMES[dim]}
                        </div>
                        <canvas id="trend-${dim}" style="width:100%; max-width:300px;"></canvas>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderImprovementSection(userId) {
    const improvements = DIMS.map(dim => ({
        dim,
        data: calculateImprovement(userId, dim)
    })).filter(item => item.data !== null);

    if (improvements.length === 0) return '';

    return `
        <div class="card" style="margin-bottom:24px; padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">🏆 进步分析</h2>
            <div style="display:flex; flex-direction:column; gap:12px;">
                ${improvements.map(({ dim, data }, i) => `
                    <div style="display:flex; align-items:center; gap:12px; padding:12px; background:var(--bg-main); border-radius:var(--radius-lg);">
                        <span style="font-size:1.2rem;">${DIM_ICONS[DIMS.indexOf(dim)]}</span>
                        <div style="flex:1;">
                            <div style="font-weight:700; font-size:0.9rem;">${DIMENSION_NAMES[dim]}</div>
                            <div style="font-size:0.8rem; color:var(--text-secondary);">
                                首次 ${Math.round(data.first)}% → 最近 ${Math.round(data.last)}%
                            </div>
                        </div>
                        <div style="
                            font-weight:900; font-size:1.1rem; font-family:var(--font-display);
                            color: ${data.change >= 0 ? '#00B894' : '#E17055'};
                        ">
                            ${data.change >= 0 ? '↑' : '↓'} ${Math.abs(Math.round(data.change))}%
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function renderRecordsList(history) {
    const sorted = [...history].reverse(); // 最新的在前
    return `
        <div class="card" style="padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">📝 测评记录</h2>
            <div style="display:flex; flex-direction:column; gap:12px;">
                ${sorted.map((record, i) => {
        const date = new Date(record.timestamp);
        const dateStr = `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
        const totalRaw = record.scores.raw.reduce((a, b) => a + b, 0);
        const avgPercentile = record.scores.overall?.avgPercentile || 0;

        return `
                        <div style="
                            display:flex; align-items:center; gap:12px;
                            padding:16px; background:var(--bg-main); border-radius:var(--radius-lg);
                            border-left: 4px solid ${DIM_COLORS[i % 4]};
                        ">
                            <div style="
                                width:36px; height:36px; border-radius:50%;
                                background:${DIM_COLORS[i % 4]}20;
                                display:flex; align-items:center; justify-content:center;
                                font-weight:900; color:${DIM_COLORS[i % 4]};
                                font-family:var(--font-display);
                            ">#${sorted.length - i}</div>
                            <div style="flex:1;">
                                <div style="font-weight:700; font-size:0.9rem;">${dateStr}</div>
                                <div style="font-size:0.8rem; color:var(--text-secondary); margin-top:2px;">
                                    ${DIMS.map((d, j) => `${DIM_ICONS[j]}${record.scores.raw[j]}`).join(' ')}
                                </div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-weight:900; font-size:1.2rem; font-family:var(--font-display); color:#6C5CE7;">${totalRaw}</div>
                                <div style="font-size:0.75rem; color:var(--text-secondary);">百分位 ${Math.round(avgPercentile)}%</div>
                            </div>
                        </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

function drawTrendCharts(userId) {
    DIMS.forEach((dim, i) => {
        const canvas = document.getElementById(`trend-${dim}`);
        if (!canvas) return;

        const trend = getTrendData(userId, dim);
        if (trend.data.length < 2) return;

        drawBarChart(canvas, trend.data, trend.labels, {
            width: 280,
            height: 150,
            maxValue: 100,
            colors: [DIM_COLORS[i]]
        });
    });
}
