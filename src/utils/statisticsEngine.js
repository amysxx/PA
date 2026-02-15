/**
 * 统计分析引擎
 * 提供描述性统计、分组对比、相关性分析
 */
import { DIMENSION_NAMES } from './normativeData.js';

const DIMS = ['planning', 'attention', 'simultaneous', 'successive'];

/**
 * 计算描述性统计
 */
export function calculateDescriptiveStats(usersData) {
    const validUsers = usersData.filter(u => u.testResults);

    if (validUsers.length === 0) {
        return { count: 0, dims: {} };
    }

    const stats = { count: validUsers.length, dims: {} };

    DIMS.forEach(dim => {
        const scores = validUsers
            .map(u => u.testResults[dim]?.totalScore || 0)
            .filter(s => s > 0);

        if (scores.length === 0) {
            stats.dims[dim] = { mean: 0, sd: 0, min: 0, max: 0, median: 0, count: 0 };
            return;
        }

        const n = scores.length;
        const mean = scores.reduce((a, b) => a + b, 0) / n;
        const variance = scores.reduce((sum, s) => sum + Math.pow(s - mean, 2), 0) / n;
        const sd = Math.sqrt(variance);
        const sorted = [...scores].sort((a, b) => a - b);
        const median = n % 2 === 0
            ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
            : sorted[Math.floor(n / 2)];

        stats.dims[dim] = {
            mean: Math.round(mean * 10) / 10,
            sd: Math.round(sd * 10) / 10,
            min: sorted[0],
            max: sorted[n - 1],
            median: Math.round(median * 10) / 10,
            count: n
        };
    });

    // 总分统计
    const totals = validUsers.map(u =>
        DIMS.reduce((sum, d) => sum + (u.testResults[d]?.totalScore || 0), 0)
    ).filter(t => t > 0);

    if (totals.length > 0) {
        const mean = totals.reduce((a, b) => a + b, 0) / totals.length;
        const sorted = [...totals].sort((a, b) => a - b);
        stats.total = {
            mean: Math.round(mean * 10) / 10,
            min: sorted[0],
            max: sorted[sorted.length - 1],
            median: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10
        };
    }

    return stats;
}

/**
 * 性别对比分析
 */
export function compareByGender(usersData) {
    const groups = { '男': [], '女': [] };

    usersData.forEach(u => {
        const gender = u.user?.gender;
        if (gender && groups[gender] !== undefined) {
            groups[gender].push(u);
        }
    });

    const result = {};
    for (const [gender, users] of Object.entries(groups)) {
        result[gender] = {
            count: users.length,
            dims: {}
        };

        DIMS.forEach(dim => {
            const scores = users
                .map(u => u.testResults?.[dim]?.totalScore || 0)
                .filter(s => s > 0);

            result[gender].dims[dim] = scores.length > 0
                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                : 0;
        });
    }

    return result;
}

/**
 * 年龄组对比分析
 */
export function compareByAgeGroup(usersData) {
    const groups = {};

    usersData.forEach(u => {
        const group = u.user?.ageGroup;
        if (!group) return;
        if (!groups[group]) groups[group] = [];
        groups[group].push(u);
    });

    const result = {};
    for (const [group, users] of Object.entries(groups)) {
        result[group] = {
            count: users.length,
            dims: {}
        };

        DIMS.forEach(dim => {
            const scores = users
                .map(u => u.testResults?.[dim]?.totalScore || 0)
                .filter(s => s > 0);

            result[group].dims[dim] = scores.length > 0
                ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10
                : 0;
        });
    }

    return result;
}

/**
 * 维度间相关性分析（皮尔逊相关系数）
 */
export function analyzeDimensionCorrelation(usersData) {
    const validUsers = usersData.filter(u =>
        u.testResults && DIMS.every(d => (u.testResults[d]?.totalScore || 0) > 0)
    );

    if (validUsers.length < 3) return null;

    const correlations = {};

    for (let i = 0; i < DIMS.length; i++) {
        for (let j = i + 1; j < DIMS.length; j++) {
            const xs = validUsers.map(u => u.testResults[DIMS[i]].totalScore);
            const ys = validUsers.map(u => u.testResults[DIMS[j]].totalScore);
            const r = pearsonCorrelation(xs, ys);

            const key = `${DIMS[i]}-${DIMS[j]}`;
            correlations[key] = {
                dim1: DIMENSION_NAMES[DIMS[i]],
                dim2: DIMENSION_NAMES[DIMS[j]],
                r: Math.round(r * 100) / 100,
                strength: getCorrelationStrength(r)
            };
        }
    }

    return correlations;
}

/**
 * 异常值检测（基于 IQR 方法）
 */
export function detectOutliers(usersData) {
    const outliers = [];

    DIMS.forEach(dim => {
        const scores = usersData
            .map(u => ({
                name: u.user?.name || '未知',
                userId: u.user?.id,
                score: u.testResults?.[dim]?.totalScore || 0
            }))
            .filter(s => s.score > 0);

        if (scores.length < 4) return;

        const sorted = [...scores].sort((a, b) => a.score - b.score);
        const q1 = sorted[Math.floor(sorted.length * 0.25)].score;
        const q3 = sorted[Math.floor(sorted.length * 0.75)].score;
        const iqr = q3 - q1;
        const lowerBound = q1 - 1.5 * iqr;
        const upperBound = q3 + 1.5 * iqr;

        scores.forEach(s => {
            if (s.score < lowerBound || s.score > upperBound) {
                outliers.push({
                    name: s.name,
                    dimension: DIMENSION_NAMES[dim],
                    dimKey: dim,
                    score: s.score,
                    type: s.score < lowerBound ? '偏低' : '偏高',
                    bound: s.score < lowerBound ? Math.round(lowerBound) : Math.round(upperBound)
                });
            }
        });
    });

    return outliers;
}

/**
 * 获取完成率统计
 */
export function getCompletionStats(usersData) {
    const total = usersData.length;
    if (total === 0) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, rate: 0 };

    let completed = 0, inProgress = 0, notStarted = 0;

    usersData.forEach(u => {
        if (!u.testProgress) { notStarted++; return; }
        const count = Object.values(u.testProgress).filter(p => p.completed).length;
        if (count === 4) completed++;
        else if (count > 0) inProgress++;
        else notStarted++;
    });

    return {
        total,
        completed,
        inProgress,
        notStarted,
        rate: Math.round((completed / total) * 100)
    };
}

// ---- 辅助函数 ----

function pearsonCorrelation(xs, ys) {
    const n = xs.length;
    const meanX = xs.reduce((a, b) => a + b, 0) / n;
    const meanY = ys.reduce((a, b) => a + b, 0) / n;

    let sumXY = 0, sumX2 = 0, sumY2 = 0;
    for (let i = 0; i < n; i++) {
        const dx = xs[i] - meanX;
        const dy = ys[i] - meanY;
        sumXY += dx * dy;
        sumX2 += dx * dx;
        sumY2 += dy * dy;
    }

    const denom = Math.sqrt(sumX2 * sumY2);
    return denom === 0 ? 0 : sumXY / denom;
}

function getCorrelationStrength(r) {
    const abs = Math.abs(r);
    if (abs >= 0.7) return '强相关';
    if (abs >= 0.4) return '中等相关';
    if (abs >= 0.2) return '弱相关';
    return '无明显相关';
}
