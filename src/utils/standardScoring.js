/**
 * 标准化评分引擎
 */
import { NORMATIVE_DATA, Z_TO_PERCENTILE, STANDARD_RATINGS } from './normativeData.js';

const STANDARD_DIMENSIONS = ['attention', 'memory', 'comprehension', 'execution'];

export function calculateZScore(rawScore, ageGroup, dimension) {
  const norm = NORMATIVE_DATA[ageGroup]?.[dimension];
  if (!norm) return 0;
  return (rawScore - norm.mean) / norm.sd;
}

export function calculateTScore(zScore) {
  const t = 50 + 10 * zScore;
  return Math.max(20, Math.min(80, Math.round(t * 10) / 10));
}

export function calculatePercentile(rawScore, ageGroup, dimension) {
  const z = calculateZScore(rawScore, ageGroup, dimension);
  return zToPercentile(z);
}

function zToPercentile(z) {
  const table = Z_TO_PERCENTILE;
  if (z <= table[0].z) return table[0].p;
  if (z >= table[table.length - 1].z) return table[table.length - 1].p;

  for (let i = 0; i < table.length - 1; i++) {
    if (z >= table[i].z && z < table[i + 1].z) {
      const ratio = (z - table[i].z) / (table[i + 1].z - table[i].z);
      return Math.round((table[i].p + ratio * (table[i + 1].p - table[i].p)) * 10) / 10;
    }
  }

  return 50;
}

export function getStandardRating(percentile) {
  for (const rating of STANDARD_RATINGS) {
    if (percentile >= rating.min) {
      return { ...rating, percentile };
    }
  }
  return { ...STANDARD_RATINGS[STANDARD_RATINGS.length - 1], percentile };
}

/**
 * rawScores 顺序：
 * [attention, memory, comprehension, execution]
 */
export function calculateStandardizedScores(rawScores, ageGroup) {
  const result = {};

  STANDARD_DIMENSIONS.forEach((dimension, index) => {
    const raw = rawScores[index] || 0;
    const z = calculateZScore(raw, ageGroup, dimension);
    const t = calculateTScore(z);
    const percentile = zToPercentile(z);
    const rating = getStandardRating(percentile);

    result[dimension] = {
      raw,
      z: Math.round(z * 100) / 100,
      t,
      percentile,
      rating,
    };
  });

  const avgPercentile =
    STANDARD_DIMENSIONS.reduce((sum, dimension) => sum + result[dimension].percentile, 0) /
    STANDARD_DIMENSIONS.length;

  result.overall = {
    avgPercentile: Math.round(avgPercentile * 10) / 10,
    rating: getStandardRating(avgPercentile),
  };

  return result;
}

export function analyzeBalance(standardizedScores) {
  const percentiles = STANDARD_DIMENSIONS.map(dimension => standardizedScores[dimension].percentile);
  const max = Math.max(...percentiles);
  const min = Math.min(...percentiles);
  const range = max - min;

  let balanceLevel = '均衡';
  let desc = '各项能力发展相对均衡。';

  if (range > 15 && range <= 30) {
    balanceLevel = '轻度不均衡';
    desc = '部分能力存在差异，建议有针对性训练。';
  } else if (range > 30) {
    balanceLevel = '明显不均衡';
    desc = '能力差异较大，建议重点关注弱项。';
  }

  const strongest = STANDARD_DIMENSIONS[percentiles.indexOf(max)];
  const weakest = STANDARD_DIMENSIONS[percentiles.indexOf(min)];

  return {
    balanceLevel,
    desc,
    range,
    strongest,
    weakest,
    percentiles,
  };
}
