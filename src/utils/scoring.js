/**
 * 评分计算引擎
 * 根据年龄组、正确率、反应时间计算标准化得分
 */

// 年龄组难度系数（用于调整标准分）
const AGE_DIFFICULTY = {
    '幼儿组': 1.3,
    '小学低年级组': 1.15,
    '小学高年级组': 1.0,
    '初中组': 0.9,
    '高中组': 0.85
};

/**
 * 维度特异性权重
 * planning: 偏重策略（准确度60%，速度40%）
 * attention: 平衡型（各50%）
 * simultaneous: 偏重理解（准确度75%，速度25%）
 * successive: 偏重记忆（准确度70%，速度30%）
 */
const DIMENSION_WEIGHTS = {
    'planning': { accuracy: 0.6, speed: 0.4 },
    'attention': { accuracy: 0.5, speed: 0.5 },
    'simultaneous': { accuracy: 0.75, speed: 0.25 },
    'successive': { accuracy: 0.7, speed: 0.3 }
};

/**
 * 计算子测试得分（满分约33分，三个子测试加起来约100分）
 * @param {number} correctRate - 正确率 0-1
 * @param {number} avgReactionTime - 平均反应时间 ms
 * @param {string} ageGroup - 年龄组
 * @param {string} testType - 测试类型
 * @returns {number} 标准化得分
 */
export function calculateScore(correctRate, avgReactionTime, ageGroup, testType) {
    const difficultyFactor = AGE_DIFFICULTY[ageGroup] || 1.0;
    const weights = DIMENSION_WEIGHTS[testType] || { accuracy: 0.7, speed: 0.3 };

    // 满分33分按权重拆分
    const maxAccuracyScore = 33 * weights.accuracy;
    const maxSpeedScore = 33 * weights.speed;

    // 基础分：由正确率决定
    const accuracyScore = correctRate * maxAccuracyScore * difficultyFactor;

    // 速度分：由反应时间决定
    const baseRT = getBaseReactionTime(testType, ageGroup);
    const speedRatio = Math.max(0, Math.min(2, baseRT / Math.max(avgReactionTime, 200)));
    const speedScore = speedRatio * maxSpeedScore * difficultyFactor / 2;

    // 总分，上限33
    return Math.min(33, Math.round((accuracyScore + speedScore) * 10) / 10);
}

function getBaseReactionTime(testType, ageGroup) {
    const baseTimes = {
        'planning': 3000,
        'attention': 1500,
        'simultaneous': 4000,
        'successive': 2500
    };
    const ageFactor = {
        '幼儿组': 1.5,
        '小学低年级组': 1.3,
        '小学高年级组': 1.1,
        '初中组': 1.0,
        '高中组': 0.9
    };
    return (baseTimes[testType] || 2000) * (ageFactor[ageGroup] || 1.0);
}

/**
 * 获取得分等级和描述
 * 基于百分比计算等级（满分为100分 = 4个子维度各33分 × 3）
 */
export function getScoreLevel(score) {
    // 使用百分比来划分等级（满分100）
    const percentage = (score / 100) * 100;
    if (percentage >= 90) return { level: '优秀', color: '#00B894', emoji: '🌟', desc: '表现非常出色' };
    if (percentage >= 80) return { level: '良好', color: '#6C5CE7', emoji: '👍', desc: '表现良好' };
    if (percentage >= 70) return { level: '中等', color: '#00CEC9', emoji: '💪', desc: '表现不错，继续加油' };
    if (percentage >= 60) return { level: '待提高', color: '#FDCB6E', emoji: '📚', desc: '还有提升空间' };
    if (percentage >= 40) return { level: '需加强', color: '#E17055', emoji: '💡', desc: '需要更多练习和训练' };
    return { level: '需关注', color: '#FF7675', emoji: '❤️', desc: '建议寻求专业指导' };
}

/**
 * 获取单个维度的得分等级（满分33分）
 */
export function getDimensionLevel(score) {
    const percentage = (score / 33) * 100;
    if (percentage >= 90) return { level: '优秀', color: '#00B894', emoji: '🌟', desc: '表现非常出色' };
    if (percentage >= 80) return { level: '良好', color: '#6C5CE7', emoji: '👍', desc: '表现良好' };
    if (percentage >= 70) return { level: '中等', color: '#00CEC9', emoji: '💪', desc: '表现不错' };
    if (percentage >= 60) return { level: '待提高', color: '#FDCB6E', emoji: '📚', desc: '还有提升空间' };
    if (percentage >= 40) return { level: '需加强', color: '#E17055', emoji: '💡', desc: '需要更多练习' };
    return { level: '需关注', color: '#FF7675', emoji: '❤️', desc: '建议针对性训练' };
}

/**
 * 生成维度建议
 */
export function getSuggestions(dimension, score) {
    const suggestions = {
        planning: {
            high: [
                '继续培养孩子的规划意识，可以让TA参与家庭活动的计划安排',
                '尝试更具挑战性的策略类游戏，如国际象棋或编程入门'
            ],
            mid: [
                '通过拼图和积木游戏培养计划能力',
                '鼓励孩子在做事之前先想好步骤，养成"先想后做"的习惯',
                '适时引导孩子分析问题、制定方案'
            ],
            low: [
                '从简单的日常计划开始训练，如安排每天的学习任务',
                '多玩策略性桌游，如迷宫、七巧板等',
                '家长可以示范如何分步骤解决问题，让孩子跟着学习'
            ]
        },
        attention: {
            high: [
                '保持良好的注意力习惯，适当增加学习时间',
                '可以尝试需要高度专注的活动，如乐器学习或绘画'
            ],
            mid: [
                '通过"找不同"游戏和词语接龙训练注意力',
                '营造安静的学习环境，减少干扰',
                '使用番茄工作法，逐步延长专注时间'
            ],
            low: [
                '每天进行5-10分钟的专注力训练游戏',
                '减少电子屏幕时间，多进行户外运动',
                '尝试冥想或呼吸练习帮助集中注意力',
                '如持续困难，建议咨询专业的学习能力评估'
            ]
        },
        simultaneous: {
            high: [
                '发展空间想象能力，鼓励学习几何和绘画',
                '参加科学实验活动，培养整体思维能力'
            ],
            mid: [
                '多做拼图和图形推理游戏',
                '利用思维导图整理知识，培养整合信息能力',
                '鼓励孩子观察和描述事物之间的关系'
            ],
            low: [
                '从简单的图形配对开始练习',
                '多使用图形化的学习工具，如图表和流程图',
                '通过搭积木和折纸训练空间认知能力',
                '在日常生活中引导孩子理解整体与部分的关系'
            ]
        },
        successive: {
            high: [
                '继续鼓励阅读较长的故事和文章',
                '尝试学习编程，培养顺序逻辑思维'
            ],
            mid: [
                '通过复述故事训练序列记忆能力',
                '练习按步骤完成任务，如做菜谱上的菜',
                '多进行口头表达练习，按逻辑顺序说明事情'
            ],
            low: [
                '从短序列开始训练记忆，如记忆电话号码',
                '多听有声故事并复述主要情节',
                '利用卡片游戏训练排序能力',
                '在日常交流中引导孩子用"首先、然后、最后"表达'
            ]
        }
    };

    const level = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';
    return suggestions[dimension]?.[level] || [];
}
