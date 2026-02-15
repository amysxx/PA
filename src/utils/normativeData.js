/**
 * 常模数据库
 * 基于年龄组的标准化参考数据（模拟数据，需通过大样本测试校准）
 *
 * 每个年龄组、每个维度包含：
 *   mean  - 平均分
 *   sd    - 标准差
 *   n     - 样本量
 *   percentiles - 百分位数查找表
 */

export const NORMATIVE_DATA = {
    '幼儿组': {
        planning: { mean: 60, sd: 14, n: 500 },
        attention: { mean: 55, sd: 15, n: 500 },
        simultaneous: { mean: 62, sd: 13, n: 500 },
        successive: { mean: 52, sd: 14, n: 500 }
    },
    '小学低年级组': {
        planning: { mean: 68, sd: 13, n: 800 },
        attention: { mean: 65, sd: 14, n: 800 },
        simultaneous: { mean: 70, sd: 12, n: 800 },
        successive: { mean: 62, sd: 13, n: 800 }
    },
    '小学高年级组': {
        planning: { mean: 75, sd: 12, n: 1000 },
        attention: { mean: 72, sd: 13, n: 1000 },
        simultaneous: { mean: 78, sd: 11, n: 1000 },
        successive: { mean: 70, sd: 12, n: 1000 }
    },
    '初中组': {
        planning: { mean: 80, sd: 11, n: 600 },
        attention: { mean: 78, sd: 12, n: 600 },
        simultaneous: { mean: 82, sd: 10, n: 600 },
        successive: { mean: 76, sd: 11, n: 600 }
    },
    '高中组': {
        planning: { mean: 84, sd: 10, n: 400 },
        attention: { mean: 82, sd: 11, n: 400 },
        simultaneous: { mean: 86, sd: 9, n: 400 },
        successive: { mean: 80, sd: 10, n: 400 }
    }
};

/**
 * 百分位数标准正态分布查找表
 * Z分数 → 百分位数
 * 使用线性插值获得中间值
 */
export const Z_TO_PERCENTILE = [
    { z: -3.0, p: 0.1 },
    { z: -2.5, p: 0.6 },
    { z: -2.0, p: 2.3 },
    { z: -1.8, p: 3.6 },
    { z: -1.6, p: 5.5 },
    { z: -1.4, p: 8.1 },
    { z: -1.2, p: 11.5 },
    { z: -1.0, p: 15.9 },
    { z: -0.8, p: 21.2 },
    { z: -0.6, p: 27.4 },
    { z: -0.4, p: 34.5 },
    { z: -0.2, p: 42.1 },
    { z: 0.0, p: 50.0 },
    { z: 0.2, p: 57.9 },
    { z: 0.4, p: 65.5 },
    { z: 0.6, p: 72.6 },
    { z: 0.8, p: 78.8 },
    { z: 1.0, p: 84.1 },
    { z: 1.2, p: 88.5 },
    { z: 1.4, p: 91.9 },
    { z: 1.6, p: 94.5 },
    { z: 1.8, p: 96.4 },
    { z: 2.0, p: 97.7 },
    { z: 2.5, p: 99.4 },
    { z: 3.0, p: 99.9 }
];

/**
 * 标准化评级定义
 * 基于百分位数划分等级
 */
export const STANDARD_RATINGS = [
    { min: 95, label: '非常优秀', color: '#00B894', emoji: '🌟', desc: '远超同龄水平' },
    { min: 85, label: '优秀', color: '#00CEC9', emoji: '⭐', desc: '明显高于同龄水平' },
    { min: 70, label: '中上', color: '#6C5CE7', emoji: '👍', desc: '高于同龄平均水平' },
    { min: 40, label: '中等', color: '#FDCB6E', emoji: '💪', desc: '处于同龄平均水平' },
    { min: 20, label: '中下', color: '#E17055', emoji: '📚', desc: '略低于同龄平均水平' },
    { min: 5, label: '待提高', color: '#FF7675', emoji: '❤️', desc: '需要针对性训练提升' },
    { min: 0, label: '需关注', color: '#D63031', emoji: '🔔', desc: '建议寻求专业评估和指导' }
];

/**
 * 维度中文名映射
 */
export const DIMENSION_NAMES = {
    planning: '计划能力',
    attention: '注意过程',
    simultaneous: '同时性加工',
    successive: '继时性加工'
};
