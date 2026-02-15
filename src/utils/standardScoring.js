/**
 * 标准化评分引擎
 * 提供 Z分数、T分数、百分位数计算
 */
import { NORMATIVE_DATA, Z_TO_PERCENTILE, STANDARD_RATINGS } from './normativeData.js';

/**
 * 计算 Z 分数
 * Z = (原始分 - 平均分) / 标准差
 */
export function calculateZScore(rawScore, ageGroup, dimension) {
    const norm = NORMATIVE_DATA[ageGroup]?.[dimension];
    if (!norm) return 0;
    return (rawScore - norm.mean) / norm.sd;
}

/**
 * Z 分数转 T 分数
 * T = 50 + 10 × Z
 * T 分数的平均值为 50，标准差为 10
 */
export function calculateTScore(zScore) {
    const t = 50 + 10 * zScore;
    return Math.max(20, Math.min(80, Math.round(t * 10) / 10));
}

/**
 * 计算百分位数（基于 Z 分数查找表线性插值）
 * 表示在同龄人中超过了多少比例的人
 */
export function calculatePercentile(rawScore, ageGroup, dimension) {
    const z = calculateZScore(rawScore, ageGroup, dimension);
    return zToPercentile(z);
}

/**
 * Z 分数转百分位数（线性插值）
 */
function zToPercentile(z) {
    const table = Z_TO_PERCENTILE;

    // 超出范围
    if (z <= table[0].z) return table[0].p;
    if (z >= table[table.length - 1].z) return table[table.length - 1].p;

    // 线性插值
    for (let i = 0; i < table.length - 1; i++) {
        if (z >= table[i].z && z < table[i + 1].z) {
            const ratio = (z - table[i].z) / (table[i + 1].z - table[i].z);
            return Math.round((table[i].p + ratio * (table[i + 1].p - table[i].p)) * 10) / 10;
        }
    }
    return 50;
}

/**
 * 获取标准化评级
 * 根据百分位数返回等级信息
 */
export function getStandardRating(percentile) {
    for (const rating of STANDARD_RATINGS) {
        if (percentile >= rating.min) {
            return { ...rating, percentile };
        }
    }
    return { ...STANDARD_RATINGS[STANDARD_RATINGS.length - 1], percentile };
}

/**
 * 计算完整的标准化评分结果
 * 一次性返回所有标准化指标
 */
export function calculateStandardizedScores(rawScores, ageGroup) {
    const dimensions = ['planning', 'attention', 'simultaneous', 'successive'];
    const result = {};

    dimensions.forEach((dim, i) => {
        const raw = rawScores[i] || 0;
        const z = calculateZScore(raw, ageGroup, dim);
        const t = calculateTScore(z);
        const percentile = zToPercentile(z);
        const rating = getStandardRating(percentile);

        result[dim] = {
            raw,
            z: Math.round(z * 100) / 100,
            t,
            percentile,
            rating
        };
    });

    // 综合评估
    const avgPercentile = dimensions.reduce((sum, dim) => sum + result[dim].percentile, 0) / 4;
    result.overall = {
        avgPercentile: Math.round(avgPercentile * 10) / 10,
        rating: getStandardRating(avgPercentile)
    };

    return result;
}

/**
 * 获取维度间的平衡性分析
 * 检测认知能力的均衡程度
 */
export function analyzeBalance(standardizedScores) {
    const dims = ['planning', 'attention', 'simultaneous', 'successive'];
    const percentiles = dims.map(d => standardizedScores[d].percentile);

    const max = Math.max(...percentiles);
    const min = Math.min(...percentiles);
    const range = max - min;

    let balanceLevel, desc;
    if (range <= 15) {
        balanceLevel = '均衡';
        desc = '四项认知能力发展较为均衡';
    } else if (range <= 30) {
        balanceLevel = '轻度不均衡';
        desc = '部分认知能力存在差异，可针对性训练';
    } else {
        balanceLevel = '明显不均衡';
        desc = '认知能力发展差异较大，建议重点关注弱项';
    }

    const strongest = dims[percentiles.indexOf(max)];
    const weakest = dims[percentiles.indexOf(min)];

    return {
        balanceLevel,
        desc,
        range,
        strongest,
        weakest,
        percentiles
    };
}
