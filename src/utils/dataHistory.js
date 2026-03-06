/**
 * 历史数据管理器
 */
import { calculateStandardizedScores, analyzeBalance } from './standardScoring.js';

const HISTORY_DIMENSIONS = ['attention', 'memory', 'comprehension', 'execution'];

/**
 * 保存测评历史记录
 */
export function saveTestHistory(userId, testResults, ageGroup, duration) {
  const history = getTestHistory(userId);

  const rawScores = HISTORY_DIMENSIONS.map(dimension => testResults[dimension]?.totalScore || 0);
  const standardized = calculateStandardizedScores(rawScores, ageGroup);
  const balance = analyzeBalance(standardized);

  const record = {
    id: `test_${Date.now()}`,
    timestamp: Date.now(),
    duration: duration || 0,
    ageGroup,
    results: JSON.parse(JSON.stringify(testResults)),
    scores: {
      raw: rawScores,
      standardized: {
        z: HISTORY_DIMENSIONS.map(dimension => standardized[dimension].z),
        t: HISTORY_DIMENSIONS.map(dimension => standardized[dimension].t),
        percentile: HISTORY_DIMENSIONS.map(dimension => standardized[dimension].percentile),
      },
      overall: standardized.overall,
      balance,
    },
  };

  history.push(record);
  saveHistory(userId, history);
  updateStatistics(userId, history);
  return record;
}

/**
 * 获取用户测评历史
 */
export function getTestHistory(userId, limit) {
  try {
    const key = `pass_history_${userId}`;
    const data = localStorage.getItem(key);
    const history = data ? JSON.parse(data) : [];
    return limit ? history.slice(-limit) : history;
  } catch (error) {
    console.warn('读取历史数据失败:', error);
    return [];
  }
}

/**
 * 计算某个维度的进步幅度
 */
export function calculateImprovement(userId, dimension) {
  const history = getTestHistory(userId);
  if (history.length < 2) return null;

  const dimIndex = HISTORY_DIMENSIONS.indexOf(dimension);
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
    testCount: history.length,
  };
}

/**
 * 获取趋势数据
 */
export function getTrendData(userId, dimension) {
  const history = getTestHistory(userId);
  if (history.length === 0) return { labels: [], data: [] };

  const dimIndex = HISTORY_DIMENSIONS.indexOf(dimension);
  const labels = history.map(item => {
    const date = new Date(item.timestamp);
    return `${date.getMonth() + 1}/${date.getDate()}`;
  });

  if (dimension === 'overall') {
    return {
      labels,
      data: history.map(item => item.scores.overall?.avgPercentile || 0),
      count: history.length,
    };
  }

  return {
    labels,
    data: dimIndex === -1 ? [] : history.map(item => item.scores.standardized.percentile[dimIndex] || 0),
    count: history.length,
  };
}

/**
 * 对比两次测评
 */
export function compareTests(userId, testId1, testId2) {
  const history = getTestHistory(userId);
  const test1 = history.find(item => item.id === testId1);
  const test2 = history.find(item => item.id === testId2);

  if (!test1 || !test2) return null;

  return {
    test1: { ...test1, date: new Date(test1.timestamp).toLocaleDateString() },
    test2: { ...test2, date: new Date(test2.timestamp).toLocaleDateString() },
    comparison: HISTORY_DIMENSIONS.map((dimension, index) => ({
      dimension,
      rawChange: test2.scores.raw[index] - test1.scores.raw[index],
      percentileChange: test2.scores.standardized.percentile[index] - test1.scores.standardized.percentile[index],
    })),
  };
}

/**
 * 获取用户统计摘要
 */
export function getUserStatistics(userId) {
  try {
    const key = `pass_stats_${userId}`;
    const data = localStorage.getItem(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveHistory(userId, history) {
  try {
    const key = `pass_history_${userId}`;
    localStorage.setItem(key, JSON.stringify(history));
  } catch (error) {
    console.warn('保存历史数据失败:', error);
  }
}

function updateStatistics(userId, history) {
  if (history.length === 0) return;

  const totals = history.map(item => item.scores.raw.reduce((sum, value) => sum + value, 0));
  const stats = {
    totalTests: history.length,
    averageScore: Math.round(totals.reduce((sum, value) => sum + value, 0) / history.length),
    bestScore: Math.max(...totals),
    worstScore: Math.min(...totals),
    firstTestDate: history[0].timestamp,
    lastTestDate: history[history.length - 1].timestamp,
    lastUpdated: Date.now(),
  };

  if (history.length >= 2) {
    const firstTotal = totals[0];
    const lastTotal = totals[totals.length - 1];
    stats.improvementRate = firstTotal > 0 ? Math.round(((lastTotal - firstTotal) / firstTotal) * 100) / 100 : 0;
  }

  try {
    localStorage.setItem(`pass_stats_${userId}`, JSON.stringify(stats));
  } catch (error) {
    console.warn('保存统计数据失败:', error);
  }
}

/**
 * 删除用户历史记录
 */
export function deleteUserHistory(userId) {
  try {
    localStorage.removeItem(`pass_history_${userId}`);
    localStorage.removeItem(`pass_stats_${userId}`);
  } catch (error) {
    console.warn('删除历史数据失败:', error);
  }
}
