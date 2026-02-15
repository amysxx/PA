/**
 * 历史数据管理器
 * 管理多次测评记录、进度追踪、趋势分析
 */
import { userManager } from '../userManager.js';
import { calculateStandardizedScores, analyzeBalance } from './standardScoring.js';

/**
 * 保存测评历史记录
 * @param {string} userId - 用户ID
 * @param {object} testResults - 测评结果 { planning, attention, simultaneous, successive }
 * @param {string} ageGroup - 年龄组
 * @param {number} duration - 测评耗时 ms
 */
export function saveTestHistory(userId, testResults, ageGroup, duration) {
    const history = getTestHistory(userId);

    // 提取原始分
    const rawScores = [
        testResults.planning?.totalScore || 0,
        testResults.attention?.totalScore || 0,
        testResults.simultaneous?.totalScore || 0,
        testResults.successive?.totalScore || 0
    ];

    // 计算标准化评分
    const standardized = calculateStandardizedScores(rawScores, ageGroup);
    const balance = analyzeBalance(standardized);

    const record = {
        id: 'test_' + Date.now(),
        timestamp: Date.now(),
        duration: duration || 0,
        ageGroup,
        results: JSON.parse(JSON.stringify(testResults)),
        scores: {
            raw: rawScores,
            standardized: {
                z: ['planning', 'attention', 'simultaneous', 'successive'].map(d => standardized[d].z),
                t: ['planning', 'attention', 'simultaneous', 'successive'].map(d => standardized[d].t),
                percentile: ['planning', 'attention', 'simultaneous', 'successive'].map(d => standardized[d].percentile)
            },
            overall: standardized.overall,
            balance
        }
    };

    history.push(record);
    saveHistory(userId, history);
    updateStatistics(userId, history);

    return record;
}

/**
 * 获取用户的测评历史
 * @param {string} userId
 * @param {number} [limit] - 返回最近几条，不传则返回全部
 */
export function getTestHistory(userId, limit) {
    try {
        const key = `pass_history_${userId}`;
        const data = localStorage.getItem(key);
        const history = data ? JSON.parse(data) : [];
        if (limit) {
            return history.slice(-limit);
        }
        return history;
    } catch (e) {
        console.warn('读取历史数据失败:', e);
        return [];
    }
}

/**
 * 计算某个维度的进步幅度
 * 对比最近一次和第一次的百分位数变化
 */
export function calculateImprovement(userId, dimension) {
    const history = getTestHistory(userId);
    if (history.length < 2) return null;

    const dimIndex = ['planning', 'attention', 'simultaneous', 'successive'].indexOf(dimension);
    if (dimIndex === -1) return null;

    const first = history[0].scores.standardized.percentile[dimIndex];
    const last = history[history.length - 1].scores.standardized.percentile[dimIndex];
    const change = last - first;

    return {
        first,
        last,
        change,
        percentage: first > 0 ? Math.round((change / first) * 100) : 0,
        improved: change > 0,
        testCount: history.length
    };
}

/**
 * 获取趋势数据（用于折线图）
 * @param {string} userId
 * @param {string} dimension - 'planning' | 'attention' | 'simultaneous' | 'successive' | 'overall'
 */
export function getTrendData(userId, dimension) {
    const history = getTestHistory(userId);
    if (history.length === 0) return { labels: [], data: [] };

    const dimIndex = ['planning', 'attention', 'simultaneous', 'successive'].indexOf(dimension);

    const labels = history.map(h => {
        const d = new Date(h.timestamp);
        return `${d.getMonth() + 1}/${d.getDate()}`;
    });

    let data;
    if (dimension === 'overall') {
        data = history.map(h => h.scores.overall?.avgPercentile || 0);
    } else if (dimIndex !== -1) {
        data = history.map(h => h.scores.standardized.percentile[dimIndex] || 0);
    } else {
        data = history.map(h => h.scores.raw[0] || 0);
    }

    return { labels, data, count: history.length };
}

/**
 * 获取两次测评的对比数据
 */
export function compareTests(userId, testId1, testId2) {
    const history = getTestHistory(userId);
    const test1 = history.find(h => h.id === testId1);
    const test2 = history.find(h => h.id === testId2);

    if (!test1 || !test2) return null;

    const dims = ['planning', 'attention', 'simultaneous', 'successive'];

    return {
        test1: { ...test1, date: new Date(test1.timestamp).toLocaleDateString() },
        test2: { ...test2, date: new Date(test2.timestamp).toLocaleDateString() },
        comparison: dims.map((dim, i) => ({
            dimension: dim,
            rawChange: test2.scores.raw[i] - test1.scores.raw[i],
            percentileChange: test2.scores.standardized.percentile[i] - test1.scores.standardized.percentile[i]
        }))
    };
}

/**
 * 获取用户统计汇总
 */
export function getUserStatistics(userId) {
    try {
        const key = `pass_stats_${userId}`;
        const data = localStorage.getItem(key);
        return data ? JSON.parse(data) : null;
    } catch (e) {
        return null;
    }
}

// ---- 内部函数 ----

function saveHistory(userId, history) {
    try {
        const key = `pass_history_${userId}`;
        localStorage.setItem(key, JSON.stringify(history));
    } catch (e) {
        console.warn('保存历史数据失败:', e);
    }
}

function updateStatistics(userId, history) {
    if (history.length === 0) return;

    const allRawTotals = history.map(h => h.scores.raw.reduce((a, b) => a + b, 0));
    const stats = {
        totalTests: history.length,
        averageScore: Math.round(allRawTotals.reduce((a, b) => a + b, 0) / history.length),
        bestScore: Math.max(...allRawTotals),
        worstScore: Math.min(...allRawTotals),
        firstTestDate: history[0].timestamp,
        lastTestDate: history[history.length - 1].timestamp,
        lastUpdated: Date.now()
    };

    // 计算进步率
    if (history.length >= 2) {
        const firstTotal = allRawTotals[0];
        const lastTotal = allRawTotals[allRawTotals.length - 1];
        stats.improvementRate = firstTotal > 0
            ? Math.round(((lastTotal - firstTotal) / firstTotal) * 100) / 100
            : 0;
    }

    try {
        const key = `pass_stats_${userId}`;
        localStorage.setItem(key, JSON.stringify(stats));
    } catch (e) {
        console.warn('保存统计数据失败:', e);
    }
}

/**
 * 删除用户的历史数据
 */
export function deleteUserHistory(userId) {
    try {
        localStorage.removeItem(`pass_history_${userId}`);
        localStorage.removeItem(`pass_stats_${userId}`);
    } catch (e) {
        console.warn('删除历史数据失败:', e);
    }
}
