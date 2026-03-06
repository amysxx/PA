/**
 * 常模数据（示例值）
 * 说明：当前项目为产品化演示，以下参数用于标准化计算演示，不代表临床常模。
 */
import { DIMENSION_NAMES as DOMAIN_DIMENSION_NAMES } from '../domain/dimensions.ts';

export const NORMATIVE_DATA = {
  '5-7岁组': {
    attention: { mean: 55, sd: 15, n: 500 },
    memory: { mean: 52, sd: 14, n: 500 },
    comprehension: { mean: 62, sd: 13, n: 500 },
    execution: { mean: 60, sd: 14, n: 500 },
  },
  '8-14岁组': {
    attention: { mean: 72, sd: 13, n: 1000 },
    memory: { mean: 70, sd: 12, n: 1000 },
    comprehension: { mean: 78, sd: 11, n: 1000 },
    execution: { mean: 75, sd: 12, n: 1000 },
  },
  '15-18岁组': {
    attention: { mean: 80, sd: 11, n: 600 },
    memory: { mean: 78, sd: 10, n: 600 },
    comprehension: { mean: 84, sd: 10, n: 600 },
    execution: { mean: 82, sd: 11, n: 600 },
  },
};

/**
 * Z分数 -> 百分位查表（线性插值）
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
  { z: 3.0, p: 99.9 },
];

/**
 * 百分位等级
 */
export const STANDARD_RATINGS = [
  { min: 95, label: '非常优秀', color: '#00B894', emoji: '🏆', desc: '远高于同龄水平' },
  { min: 85, label: '优秀', color: '#00CEC9', emoji: '🌟', desc: '明显高于同龄水平' },
  { min: 70, label: '中上', color: '#6C5CE7', emoji: '💪', desc: '高于同龄平均水平' },
  { min: 40, label: '中等', color: '#FDCB6E', emoji: '👍', desc: '处于同龄平均水平' },
  { min: 20, label: '中下', color: '#E17055', emoji: '📉', desc: '略低于同龄平均水平' },
  { min: 5, label: '待提高', color: '#FF7675', emoji: '❗', desc: '需要针对性训练提升' },
  { min: 0, label: '需关注', color: '#D63031', emoji: '🚨', desc: '建议进行进一步专业评估' },
];

export const DIMENSION_NAMES = {
  ...DOMAIN_DIMENSION_NAMES,
};
