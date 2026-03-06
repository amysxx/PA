/**
 * 统计分析引擎
 */
import { DIMENSION_NAMES } from './normativeData.js';

const DIMS = ['attention', 'memory', 'comprehension', 'execution'];

export function calculateDescriptiveStats(usersData) {
  const validUsers = usersData.filter(user => user.testResults);
  if (validUsers.length === 0) {
    return { count: 0, dims: {} };
  }

  const stats = { count: validUsers.length, dims: {} };

  DIMS.forEach(dimension => {
    const scores = validUsers.map(user => user.testResults[dimension]?.totalScore || 0).filter(score => score > 0);
    if (scores.length === 0) {
      stats.dims[dimension] = { mean: 0, sd: 0, min: 0, max: 0, median: 0, count: 0 };
      return;
    }

    const n = scores.length;
    const mean = scores.reduce((sum, score) => sum + score, 0) / n;
    const variance = scores.reduce((sum, score) => sum + (score - mean) ** 2, 0) / n;
    const sd = Math.sqrt(variance);
    const sorted = [...scores].sort((a, b) => a - b);
    const median = n % 2 === 0 ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2 : sorted[Math.floor(n / 2)];

    stats.dims[dimension] = {
      mean: Math.round(mean * 10) / 10,
      sd: Math.round(sd * 10) / 10,
      min: sorted[0],
      max: sorted[n - 1],
      median: Math.round(median * 10) / 10,
      count: n,
    };
  });

  const totals = validUsers
    .map(user => DIMS.reduce((sum, dimension) => sum + (user.testResults[dimension]?.totalScore || 0), 0))
    .filter(total => total > 0);

  if (totals.length > 0) {
    const mean = totals.reduce((sum, value) => sum + value, 0) / totals.length;
    const sorted = [...totals].sort((a, b) => a - b);
    stats.total = {
      mean: Math.round(mean * 10) / 10,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: Math.round(sorted[Math.floor(sorted.length / 2)] * 10) / 10,
    };
  }

  return stats;
}

export function compareByGender(usersData) {
  const groups = { 男: [], 女: [] };

  usersData.forEach(user => {
    const gender = user.user?.gender;
    if (groups[gender]) groups[gender].push(user);
  });

  const result = {};
  Object.entries(groups).forEach(([gender, users]) => {
    result[gender] = { count: users.length, dims: {} };
    DIMS.forEach(dimension => {
      const scores = users.map(user => user.testResults?.[dimension]?.totalScore || 0).filter(score => score > 0);
      result[gender].dims[dimension] =
        scores.length > 0 ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : 0;
    });
  });

  return result;
}

export function compareByAgeGroup(usersData) {
  const groups = {};

  usersData.forEach(user => {
    const ageGroup = user.user?.ageGroup;
    if (!ageGroup) return;
    if (!groups[ageGroup]) groups[ageGroup] = [];
    groups[ageGroup].push(user);
  });

  const result = {};
  Object.entries(groups).forEach(([group, users]) => {
    result[group] = { count: users.length, dims: {} };
    DIMS.forEach(dimension => {
      const scores = users.map(user => user.testResults?.[dimension]?.totalScore || 0).filter(score => score > 0);
      result[group].dims[dimension] =
        scores.length > 0 ? Math.round((scores.reduce((sum, score) => sum + score, 0) / scores.length) * 10) / 10 : 0;
    });
  });

  return result;
}

export function analyzeDimensionCorrelation(usersData) {
  const validUsers = usersData.filter(
    user => user.testResults && DIMS.every(dimension => (user.testResults[dimension]?.totalScore || 0) > 0),
  );

  if (validUsers.length < 3) return null;

  const correlations = {};
  for (let i = 0; i < DIMS.length; i++) {
    for (let j = i + 1; j < DIMS.length; j++) {
      const xs = validUsers.map(user => user.testResults[DIMS[i]].totalScore);
      const ys = validUsers.map(user => user.testResults[DIMS[j]].totalScore);
      const r = pearsonCorrelation(xs, ys);

      correlations[`${DIMS[i]}-${DIMS[j]}`] = {
        dim1: DIMENSION_NAMES[DIMS[i]],
        dim2: DIMENSION_NAMES[DIMS[j]],
        r: Math.round(r * 100) / 100,
        strength: getCorrelationStrength(r),
      };
    }
  }

  return correlations;
}

export function detectOutliers(usersData) {
  const outliers = [];

  DIMS.forEach(dimension => {
    const scores = usersData
      .map(user => ({
        name: user.user?.name || '未知',
        userId: user.user?.id,
        score: user.testResults?.[dimension]?.totalScore || 0,
      }))
      .filter(item => item.score > 0);

    if (scores.length < 4) return;

    const sorted = [...scores].sort((a, b) => a.score - b.score);
    const q1 = sorted[Math.floor(sorted.length * 0.25)].score;
    const q3 = sorted[Math.floor(sorted.length * 0.75)].score;
    const iqr = q3 - q1;
    const lowerBound = q1 - 1.5 * iqr;
    const upperBound = q3 + 1.5 * iqr;

    scores.forEach(item => {
      if (item.score < lowerBound || item.score > upperBound) {
        outliers.push({
          name: item.name,
          dimension: DIMENSION_NAMES[dimension],
          dimKey: dimension,
          score: item.score,
          type: item.score < lowerBound ? '偏低' : '偏高',
          bound: Math.round(item.score < lowerBound ? lowerBound : upperBound),
        });
      }
    });
  });

  return outliers;
}

export function getCompletionStats(usersData) {
  const total = usersData.length;
  if (total === 0) return { total: 0, completed: 0, inProgress: 0, notStarted: 0, rate: 0 };

  let completed = 0;
  let inProgress = 0;
  let notStarted = 0;

  usersData.forEach(user => {
    if (!user.testProgress) {
      notStarted++;
      return;
    }
    const count = Object.values(user.testProgress).filter(progress => progress.completed).length;
    if (count === DIMS.length) completed++;
    else if (count > 0) inProgress++;
    else notStarted++;
  });

  return {
    total,
    completed,
    inProgress,
    notStarted,
    rate: Math.round((completed / total) * 100),
  };
}

function pearsonCorrelation(xs, ys) {
  const n = xs.length;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n;

  let sumXY = 0;
  let sumX2 = 0;
  let sumY2 = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    const dy = ys[i] - meanY;
    sumXY += dx * dy;
    sumX2 += dx ** 2;
    sumY2 += dy ** 2;
  }

  const denominator = Math.sqrt(sumX2 * sumY2);
  return denominator === 0 ? 0 : sumXY / denominator;
}

function getCorrelationStrength(r) {
  const abs = Math.abs(r);
  if (abs >= 0.7) return '强相关';
  if (abs >= 0.4) return '中等相关';
  if (abs >= 0.2) return '弱相关';
  return '无明显相关';
}
