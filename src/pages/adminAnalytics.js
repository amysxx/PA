/**
 * 管理员分析仪表板
 * 统计概览、维度分析、分组对比、异常值检测
 */
import { router } from '../router.js';
import { userManager } from '../userManager.js';
import { DIMENSION_NAMES } from '../utils/normativeData.js';
import {
    calculateDescriptiveStats,
    compareByGender,
    compareByAgeGroup,
    analyzeDimensionCorrelation,
    detectOutliers,
    getCompletionStats
} from '../utils/statisticsEngine.js';
import { drawBarChart, drawPieChart, drawLineChart } from '../utils/charts.js';

const DIMS = ['planning', 'attention', 'simultaneous', 'successive'];
const DIM_COLORS = ['#6C5CE7', '#E17055', '#00CEC9', '#FD79A8'];
const DIM_ICONS = ['🎯', '👁️', '🧩', '🔗'];

export function renderAdminAnalytics(app) {
    const users = userManager.getUsers();
    const allData = users.map(u => {
        const data = userManager.getUserData(u.id) || {};
        return { user: u, ...data };
    });

    const stats = calculateDescriptiveStats(allData);
    const completion = getCompletionStats(allData);
    const genderComp = compareByGender(allData);
    const ageComp = compareByAgeGroup(allData);
    const correlations = analyzeDimensionCorrelation(allData);
    const outliers = detectOutliers(allData);

    app.innerHTML = `
        <div class="navbar">
            <a class="navbar-brand" href="#/admin">
                <span class="navbar-brand-icon">🧠</span>
                <span>智趣认知乐园</span>
            </a>
            <div class="navbar-actions" style="display:flex; align-items:center; gap:8px;">
                <span style="font-size:0.9rem; color:var(--text-secondary);">📊 数据分析</span>
                <button id="btn-back-admin" class="btn btn-secondary" style="padding:6px 16px; font-size:0.8rem;">← 返回管理</button>
            </div>
        </div>

        <div class="page has-navbar">
            <div class="container" style="max-width:1000px;">
                <h1 style="font-family:var(--font-display); font-size:1.8rem; font-weight:900; text-align:center; margin-bottom:32px;">
                    📊 数据分析仪表板
                </h1>

                <!-- 概览卡片 -->
                ${renderOverviewCards(stats, completion)}

                <!-- 完成率饼图 -->
                ${renderCompletionSection(completion)}

                <!-- 维度统计详情 -->
                ${renderDimensionStats(stats)}

                <!-- 性别对比 -->
                ${renderGenderComparison(genderComp)}

                <!-- 年龄组对比 -->
                ${renderAgeGroupComparison(ageComp)}

                <!-- 维度相关性 -->
                ${correlations ? renderCorrelations(correlations) : ''}

                <!-- 异常值 -->
                ${outliers.length > 0 ? renderOutliers(outliers) : ''}

                <div style="text-align:center; margin:32px 0;">
                    <button class="btn btn-secondary" id="btn-back-admin-bottom">← 返回用户管理</button>
                </div>
            </div>
        </div>
    `;

    // 事件绑定
    document.getElementById('btn-back-admin').addEventListener('click', () => router.navigate('/admin'));
    document.getElementById('btn-back-admin-bottom').addEventListener('click', () => router.navigate('/admin'));

    // 绘制图表
    setTimeout(() => drawAllCharts(stats, completion, genderComp), 100);
}

function renderOverviewCards(stats, completion) {
    return `
        <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(140px, 1fr)); gap:16px; margin-bottom:24px;">
            <div class="card" style="padding:20px; text-align:center;">
                <div style="font-size:2rem; font-weight:900; color:#6C5CE7; font-family:var(--font-display);">${completion.total}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">总用户数</div>
            </div>
            <div class="card" style="padding:20px; text-align:center;">
                <div style="font-size:2rem; font-weight:900; color:#00B894; font-family:var(--font-display);">${completion.completed}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">已完成</div>
            </div>
            <div class="card" style="padding:20px; text-align:center;">
                <div style="font-size:2rem; font-weight:900; color:#FDCB6E; font-family:var(--font-display);">${completion.rate}%</div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">完成率</div>
            </div>
            <div class="card" style="padding:20px; text-align:center;">
                <div style="font-size:2rem; font-weight:900; color:#E17055; font-family:var(--font-display);">${stats.total?.mean || '-'}</div>
                <div style="font-size:0.8rem; color:var(--text-secondary);">平均总分</div>
            </div>
        </div>
    `;
}

function renderCompletionSection(completion) {
    return `
        <div class="card" style="margin-bottom:24px; padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">📈 测评完成情况</h2>
            <div style="display:flex; align-items:center; gap:32px; flex-wrap:wrap;">
                <canvas id="chart-completion" style="max-width:200px;"></canvas>
                <div style="display:flex; flex-direction:column; gap:8px;">
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:12px; height:12px; border-radius:50%; background:#00B894;"></span>
                        <span style="font-size:0.85rem;">已完成: ${completion.completed}人</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:12px; height:12px; border-radius:50%; background:#FDCB6E;"></span>
                        <span style="font-size:0.85rem;">进行中: ${completion.inProgress}人</span>
                    </div>
                    <div style="display:flex; align-items:center; gap:8px;">
                        <span style="width:12px; height:12px; border-radius:50%; background:#B2BEC3;"></span>
                        <span style="font-size:0.85rem;">未开始: ${completion.notStarted}人</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderDimensionStats(stats) {
    if (stats.count === 0) return '<div class="card" style="padding:32px; text-align:center; color:var(--text-secondary);">暂无有效数据</div>';

    return `
        <div class="card" style="margin-bottom:24px; padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">📊 各维度统计</h2>
            <div style="display:flex; justify-content:center; margin-bottom:20px;">
                <canvas id="chart-dims" style="max-width:500px;"></canvas>
            </div>
            <table style="width:100%; font-size:0.85rem; border-collapse:collapse;">
                <tr style="border-bottom:2px solid #E8E5F3;">
                    <th style="text-align:left; padding:8px;">维度</th>
                    <th style="text-align:center; padding:8px;">均值</th>
                    <th style="text-align:center; padding:8px;">标准差</th>
                    <th style="text-align:center; padding:8px;">中位数</th>
                    <th style="text-align:center; padding:8px;">最小</th>
                    <th style="text-align:center; padding:8px;">最大</th>
                </tr>
                ${DIMS.map((dim, i) => {
        const s = stats.dims[dim];
        return `
                    <tr style="border-bottom:1px solid #F0EDF7;">
                        <td style="padding:8px; font-weight:700;">${DIM_ICONS[i]} ${DIMENSION_NAMES[dim]}</td>
                        <td style="text-align:center; padding:8px; font-weight:700; color:${DIM_COLORS[i]};">${s.mean}</td>
                        <td style="text-align:center; padding:8px; color:var(--text-secondary);">${s.sd}</td>
                        <td style="text-align:center; padding:8px;">${s.median}</td>
                        <td style="text-align:center; padding:8px; color:#E17055;">${s.min}</td>
                        <td style="text-align:center; padding:8px; color:#00B894;">${s.max}</td>
                    </tr>
                    `;
    }).join('')}
            </table>
        </div>
    `;
}

function renderGenderComparison(genderComp) {
    const maleCount = genderComp['男']?.count || 0;
    const femaleCount = genderComp['女']?.count || 0;
    if (maleCount === 0 && femaleCount === 0) return '';

    return `
        <div class="card" style="margin-bottom:24px; padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">👦👧 性别对比分析</h2>
            <div style="display:flex; justify-content:center; margin-bottom:16px;">
                <canvas id="chart-gender" style="max-width:500px;"></canvas>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
                <div style="padding:16px; background:#6C5CE710; border-radius:var(--radius-lg); text-align:center;">
                    <div style="font-size:1.5rem; margin-bottom:4px;">👦</div>
                    <div style="font-weight:700;">男生 (${maleCount}人)</div>
                    ${DIMS.map((d, i) => `
                        <div style="font-size:0.8rem; margin-top:4px; color:${DIM_COLORS[i]};">
                            ${DIM_ICONS[i]} ${genderComp['男']?.dims?.[d] || 0}
                        </div>
                    `).join('')}
                </div>
                <div style="padding:16px; background:#FD79A810; border-radius:var(--radius-lg); text-align:center;">
                    <div style="font-size:1.5rem; margin-bottom:4px;">👧</div>
                    <div style="font-weight:700;">女生 (${femaleCount}人)</div>
                    ${DIMS.map((d, i) => `
                        <div style="font-size:0.8rem; margin-top:4px; color:${DIM_COLORS[i]};">
                            ${DIM_ICONS[i]} ${genderComp['女']?.dims?.[d] || 0}
                        </div>
                    `).join('')}
                </div>
            </div>
        </div>
    `;
}

function renderAgeGroupComparison(ageComp) {
    const groups = Object.keys(ageComp);
    if (groups.length === 0) return '';

    return `
        <div class="card" style="margin-bottom:24px; padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">📅 年龄组对比</h2>
            <table style="width:100%; font-size:0.85rem; border-collapse:collapse;">
                <tr style="border-bottom:2px solid #E8E5F3;">
                    <th style="text-align:left; padding:8px;">年龄组</th>
                    <th style="text-align:center; padding:8px;">人数</th>
                    ${DIMS.map((d, i) => `<th style="text-align:center; padding:8px; color:${DIM_COLORS[i]};">${DIM_ICONS[i]}</th>`).join('')}
                </tr>
                ${groups.map(group => `
                    <tr style="border-bottom:1px solid #F0EDF7;">
                        <td style="padding:8px; font-weight:700;">${group}</td>
                        <td style="text-align:center; padding:8px;">${ageComp[group].count}</td>
                        ${DIMS.map((d, i) => `
                            <td style="text-align:center; padding:8px; font-weight:700; color:${DIM_COLORS[i]};">
                                ${ageComp[group].dims[d]}
                            </td>
                        `).join('')}
                    </tr>
                `).join('')}
            </table>
        </div>
    `;
}

function renderCorrelations(correlations) {
    return `
        <div class="card" style="margin-bottom:24px; padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">🔬 维度间相关性</h2>
            <div style="display:grid; grid-template-columns:repeat(auto-fit, minmax(180px, 1fr)); gap:12px;">
                ${Object.values(correlations).map(c => {
        const color = Math.abs(c.r) >= 0.4 ? '#6C5CE7' : c.r > 0 ? '#00CEC9' : '#E17055';
        return `
                    <div style="padding:12px; background:var(--bg-main); border-radius:var(--radius-lg); text-align:center;">
                        <div style="font-size:0.8rem; color:var(--text-secondary); margin-bottom:4px;">${c.dim1} ↔ ${c.dim2}</div>
                        <div style="font-size:1.3rem; font-weight:900; color:${color}; font-family:var(--font-display);">r = ${c.r}</div>
                        <div style="font-size:0.75rem; color:var(--text-secondary);">${c.strength}</div>
                    </div>
                    `;
    }).join('')}
            </div>
        </div>
    `;
}

function renderOutliers(outliers) {
    return `
        <div class="card" style="margin-bottom:24px; padding:24px;">
            <h2 style="font-family:var(--font-display); font-size:1.1rem; font-weight:800; margin-bottom:16px;">⚠️ 异常值提醒</h2>
            <div style="display:flex; flex-direction:column; gap:8px;">
                ${outliers.map(o => `
                    <div style="display:flex; align-items:center; gap:12px; padding:10px 16px; background:${o.type === '偏低' ? '#E1705510' : '#00B89410'}; border-radius:var(--radius-lg); border-left:3px solid ${o.type === '偏低' ? '#E17055' : '#00B894'};">
                        <span style="font-size:1.1rem;">${o.type === '偏低' ? '📉' : '📈'}</span>
                        <div style="flex:1;">
                            <span style="font-weight:700;">${o.name}</span>
                            <span style="color:var(--text-secondary); font-size:0.85rem;">
                                · ${o.dimension} ${o.score}分 (${o.type})
                            </span>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function drawAllCharts(stats, completion, genderComp) {
    // 完成率饼图
    const completionCanvas = document.getElementById('chart-completion');
    if (completionCanvas && completion.total > 0) {
        drawPieChart(completionCanvas,
            [completion.completed, completion.inProgress, completion.notStarted],
            ['已完成', '进行中', '未开始'],
            { size: 180, colors: ['#00B894', '#FDCB6E', '#B2BEC3'] }
        );
    }

    // 维度均值柱状图
    const dimsCanvas = document.getElementById('chart-dims');
    if (dimsCanvas && stats.count > 0) {
        const means = DIMS.map(d => stats.dims[d].mean);
        drawBarChart(dimsCanvas, means, ['计划', '注意', '同时', '继时'], {
            width: 450,
            height: 200,
            colors: DIM_COLORS
        });
    }

    // 性别对比柱状图（双组）
    const genderCanvas = document.getElementById('chart-gender');
    if (genderCanvas) {
        const maleScores = DIMS.map(d => genderComp['男']?.dims?.[d] || 0);
        const femaleScores = DIMS.map(d => genderComp['女']?.dims?.[d] || 0);
        // 用折线图展示性别对比
        drawLineChart(genderCanvas, [
            { data: maleScores, color: '#6C5CE7', labels: ['计划', '注意', '同时', '继时'] },
            { data: femaleScores, color: '#FD79A8', labels: ['计划', '注意', '同时', '继时'] }
        ], { width: 400, height: 200 });
    }
}
