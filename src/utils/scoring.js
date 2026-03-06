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
    '高中组': 0.85,
    '5-7岁组': 1.2,
    '8-14岁组': 1.0,
    '未知': 1.0
};

/**
 * 维度特异性权重（已更新为新的6维度框架）
 * attention: 平衡型（各50%）
 * memory: 偏重准确度（70%）
 * comprehension: 偏重理解（准确75%，速度25%）
 * execution: 偏重策略（准确60%，速度40%）
 * spatial: 偏重准确度（75%）
 * processing: 速度优先（准确40%，速度60%）
 * 旧 PASS 理论键名保留以向后兼容
 */
const DIMENSION_WEIGHTS = {
    // 新框架（精细化6维度）
    'attention': { accuracy: 0.5, speed: 0.5 },
    'memory': { accuracy: 0.7, speed: 0.3 },
    'comprehension': { accuracy: 0.75, speed: 0.25 },
    'execution': { accuracy: 0.6, speed: 0.4 },
    'spatial': { accuracy: 0.75, speed: 0.25 },
    'processing': { accuracy: 0.4, speed: 0.6 },
    // 旧 PASS 理论键名（向后兼容）
    'planning': { accuracy: 0.6, speed: 0.4 },
    'simultaneous': { accuracy: 0.75, speed: 0.25 },
    'successive': { accuracy: 0.7, speed: 0.3 },
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
        // 新框架
        'attention': 1500,
        'memory': 2500,
        'comprehension': 4000,
        'execution': 3000,
        'spatial': 3500,
        'processing': 800,
        // 旧 PASS 理论（向后兼容）
        'planning': 3000,
        'simultaneous': 4000,
        'successive': 2500,
    };
    const ageFactor = {
        '幼儿组': 1.5,
        '小学低年级组': 1.3,
        '小学高年级组': 1.1,
        '初中组': 1.0,
        '高中组': 0.9,
        '5-7岁组': 1.4,
        '8-14岁组': 1.1,
        '未知': 1.0
    };
    return (baseTimes[testType] || 2000) * (ageFactor[ageGroup] || 1.0);
}

/**
 * 获取得分等级和描述
 * 基于百分比计算等级（满分为100分）
 */
export function getScoreLevel(score) {
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
 * 生成维度建议（已更新为新的6维度框架）
 */
export function getSuggestions(dimension, score) {
    const suggestions = {
        attention: {
            high: [
                '注意力表现出色，可尝试更挑战性的专注任务，如乐器学习或编程',
                '利用强大的注意力优势，探索需要高度集中的学科领域'
            ],
            mid: [
                '通过"找不同"游戏和定时专注练习提升注意力',
                '营造安静的学习环境，减少干扰因素',
                '使用番茄工作法，逐步延长专注时间'
            ],
            low: [
                '每天进行5-10分钟的专注力训练游戏',
                '减少电子屏幕时间，多进行户外运动',
                '尝试冥想或呼吸练习帮助集中注意力',
                '如持续困难，建议咨询专业的学习能力评估'
            ]
        },
        memory: {
            high: [
                '记忆力优秀，可承担更复杂的学习任务，尝试学习多门语言',
                '发挥记忆优势，参加知识竞赛或探索百科类学习'
            ],
            mid: [
                '通过数字记忆游戏和复述故事提升记忆能力',
                '利用思维导图、联想法等记忆策略辅助学习',
                '定期复习已学内容，巩固长期记忆'
            ],
            low: [
                '每天进行数字顺背/倒背练习，从3位数开始',
                '多讲故事并复述，锻炼情景记忆能力',
                '借助图像和故事联想法记忆新知识',
                '规律作息，保证充足睡眠以增强记忆巩固'
            ]
        },
        comprehension: {
            high: [
                '逻辑推理能力突出，鼓励探索数学竞赛、编程或哲学思维',
                '可尝试辩论、批判性阅读等更复杂的推理挑战'
            ],
            mid: [
                '多做图形推理和数字找规律游戏',
                '鼓励孩子用"如果…那么…"的方式分析问题',
                '通过分类归纳日常事物来培养逻辑能力'
            ],
            low: [
                '从简单的规律找一找游戏开始练习',
                '多进行积木搭建、拼图等需要逻辑顺序的活动',
                '引导孩子先观察后总结，培养归纳推理习惯'
            ]
        },
        execution: {
            high: [
                '执行功能出色，可参与需要自我管理和时间规划的项目活动',
                '鼓励承担班级或学校的组织性职责，锻炼领导力'
            ],
            mid: [
                '通过策略类桌游（如国际象棋）培养计划与监控能力',
                '鼓励孩子在做事前先制定步骤计划',
                '练习在干扰环境中保持专注，提升抑制控制'
            ],
            low: [
                '从简单的日程安排开始训练计划能力',
                '使用计时器进行Go-NoGo类游戏（看到目标才动作）',
                '家长示范"先停下来想一想再行动"的思维方式'
            ]
        },
        spatial: {
            high: [
                '空间智能优秀，适合探索建筑设计、艺术创作或工程类活动',
                '鼓励参加科学实验和3D建模等高阶空间挑战'
            ],
            mid: [
                '多做拼图、积木搭建和折纸游戏',
                '使用地图、图表来培养空间方位感',
                '尝试乐高积木或建筑模型，理解三维结构'
            ],
            low: [
                '从简单二维图形开始，做图形配对和镜像练习',
                '每天观察并描述物体的摆放位置（上下左右）',
                '通过折纸和搭积木循序渐进地提升空间感知能力'
            ]
        },
        processing: {
            high: [
                '信息处理速度快，可在限时任务和竞技类学习中发挥优势',
                '尝试反应类体育运动（如乒乓球），进一步提升神经反应速度'
            ],
            mid: [
                '进行定时符号搜索练习，提升知觉速度',
                '尝试反应游戏，逐步缩短反应时间',
                '保证充足睡眠，避免疲劳影响处理速度'
            ],
            low: [
                '每天进行简单的视觉搜索或找数字练习',
                '多参与体育运动，提升神经-肌肉协调能力',
                '减少高糖高脂饮食，保持大脑最佳运转状态'
            ]
        },
        // 旧 PASS 键名向后兼容
        planning: {
            high: ['继续培养孩子的规划意识', '尝试更具挑战性的策略类游戏'],
            mid: ['通过拼图和积木游戏培养计划能力', '鼓励孩子在做事之前先想好步骤'],
            low: ['从简单的日常计划开始训练', '多玩策略性桌游，如迷宫、七巧板等']
        },
    };

    const level = score >= 75 ? 'high' : score >= 50 ? 'mid' : 'low';
    return suggestions[dimension]?.[level] || [];
}
