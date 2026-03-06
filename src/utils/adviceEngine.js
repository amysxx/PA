/**
 * 个性化建议引擎
 * 基于分数、维度平衡性和历史数据生成动态建议
 * 已更新为精细化6维度框架：attention/memory/comprehension/execution/spatial/processing
 */
import { DIMENSION_NAMES } from '../domain/dimensions.ts';
import { getStandardRating, analyzeBalance } from './standardScoring.js';

// 从 dimensions.ts 获取维度名称，DIMENSION_NAMES 已包含所有6个维度
const DIM_NAMES = DIMENSION_NAMES;

/**
 * 基于标准化评分生成个性化建议
 */
export function generatePersonalizedAdvice(standardizedScores, ageGroup) {
    const advice = [];
    const dims = ['attention', 'memory', 'comprehension', 'execution', 'spatial', 'processing'];

    dims.forEach(dim => {
        const s = standardizedScores[dim];
        if (!s) return;

        const p = s.percentile;
        const name = DIM_NAMES[dim] || dim;

        if (p >= 85) {
            advice.push({
                dimension: dim,
                type: 'strength',
                icon: '🌟',
                title: `${name} — 优势领域`,
                content: getStrengthAdvice(dim, ageGroup)
            });
        } else if (p < 30) {
            advice.push({
                dimension: dim,
                type: 'weakness',
                icon: '📚',
                title: `${name} — 重点提升`,
                content: getWeaknessAdvice(dim, ageGroup)
            });
        } else if (p < 50) {
            advice.push({
                dimension: dim,
                type: 'improvement',
                icon: '💪',
                title: `${name} — 可以更好`,
                content: getImprovementAdvice(dim, ageGroup)
            });
        }
    });

    // 均衡性建议
    const balance = analyzeBalance(standardizedScores);
    if (balance.range > 25) {
        advice.push({
            dimension: 'balance',
            type: 'balance',
            icon: '⚖️',
            title: '认知均衡性建议',
            content: `${DIM_NAMES[balance.strongest] || balance.strongest}明显强于${DIM_NAMES[balance.weakest] || balance.weakest}。建议在发挥优势的同时，有针对性地加强${DIM_NAMES[balance.weakest] || balance.weakest}的训练。`
        });
    }

    return advice;
}

/**
 * 基于进步情况生成激励建议
 */
export function generateMotivationalAdvice(improvements) {
    const advice = [];

    if (!improvements) return advice;

    const dims = ['attention', 'memory', 'comprehension', 'execution', 'spatial', 'processing'];
    let hasImproved = false;
    let hasDeclined = false;

    dims.forEach(dim => {
        const imp = improvements[dim];
        if (!imp) return;

        if (imp.change > 10) {
            hasImproved = true;
            advice.push({
                icon: '🎉',
                type: 'positive',
                content: `${DIM_NAMES[dim] || dim}进步了${Math.round(imp.change)}个百分位，继续保持！`
            });
        } else if (imp.change < -10) {
            hasDeclined = true;
            advice.push({
                icon: '💡',
                type: 'attention',
                content: `${DIM_NAMES[dim] || dim}有所下降，可能是测试状态影响，建议再次测试确认。`
            });
        }
    });

    if (hasImproved && !hasDeclined) {
        advice.unshift({
            icon: '🏆',
            type: 'overall',
            content: '整体表现持续进步，训练方法有效，请继续坚持！'
        });
    }

    return advice;
}

/**
 * 生成家长指导建议
 */
export function generateParentGuidance(standardizedScores, ageGroup) {
    const guidance = [];
    const dims = ['attention', 'memory', 'comprehension', 'execution', 'spatial', 'processing'];

    // 总体概述
    const avgP = standardizedScores.overall?.avgPercentile || 50;
    if (avgP >= 70) {
        guidance.push({
            icon: '✨',
            title: '总体评价',
            content: '孩子的认知能力发展良好，建议继续提供丰富多样的学习机会，保持当前良好的发展势头。'
        });
    } else if (avgP >= 40) {
        guidance.push({
            icon: '💪',
            title: '总体评价',
            content: '孩子的认知能力处于正常发展水平，通过有针对性的训练和支持，还有很大的提升空间。'
        });
    } else {
        guidance.push({
            icon: '❤️',
            title: '总体评价',
            content: '建议关注孩子的认知发展，可以通过游戏化的方式进行训练。如有需要，建议咨询专业人士。'
        });
    }

    // 年龄组特定建议
    const ageAdvice = getAgeSpecificAdvice(ageGroup);
    if (ageAdvice) {
        guidance.push({
            icon: '📋',
            title: `${ageGroup}家长指南`,
            content: ageAdvice
        });
    }

    // 日常训练建议（针对最弱维度）
    const weakest = dims.reduce((weak, dim) => {
        const p = standardizedScores[dim]?.percentile || 0;
        return p < (standardizedScores[weak]?.percentile || 100) ? dim : weak;
    }, dims[0]);

    guidance.push({
        icon: '🎮',
        title: '日常训练建议',
        content: getDailyTrainingAdvice(weakest, ageGroup)
    });

    return guidance;
}

// ---- 内部建议数据 ----

function getStrengthAdvice(dim, ageGroup) {
    const adviceMap = {
        attention: '注意力集中能力很强。可以利用这一优势来学习需要高度专注的技能，如乐器演奏、书法或精细手工。',
        memory: '记忆力表现出色！可以尝试挑战更复杂的记忆任务，如学习外语词汇、诗歌背诵或多步骤数学运算。',
        comprehension: '逻辑推理能力突出。鼓励孩子探索数学竞赛、编程思维或哲学讨论，进一步发展这一优势。',
        execution: '执行功能出色，计划能力和抑制控制均表现良好。可参与学生会、项目活动等需要自我管理的挑战。',
        spatial: '空间和整体性认知能力突出。鼓励孩子发展数学几何、科学实验、艺术创作等需要空间思维的领域。',
        processing: '信息处理速度快。可以在时间限制类任务中发挥优势，尝试竞技类体育运动进一步提升反应速度。',
        // 兼容旧 PASS 键名
        planning: '孩子展现出了出色的策划和组织能力，可以尝试更复杂的挑战，如编程、棋类竞赛等。',
        simultaneous: '空间和整体性认知能力突出，鼓励学习几何和绘画，参加科学实验活动。',
        successive: '序列记忆和逻辑推理能力很强，适合学习语言、编程、音乐等需要顺序性思维的技能。',
    };
    return adviceMap[dim] || '';
}

function getWeaknessAdvice(dim, ageGroup) {
    const adviceMap = {
        attention: '建议创造安静的学习环境，使用计时器进行短时专注训练（从5分钟开始），减少电子屏幕时间，增加户外运动。',
        memory: '建议每天进行数字顺背/倒背练习，利用故事联想法记忆新知识，规律作息以促进记忆巩固。',
        comprehension: '建议从简单的数字找规律开始，多进行图形推理游戏，引导孩子观察后总结规律，培养归纳推理习惯。',
        execution: '建议从简单的日程安排训练计划能力，练习在干扰环境中保持专注，家长示范"先停下来想一想再行动"的思维方式。',
        spatial: '建议每天观察并描述物体的摆放位置，通过折纸、积木和搭建模型循序渐进提升空间感知能力。',
        processing: '建议每天进行简单的视觉搜索或符号匹配练习，多参与体育运动提升神经-肌肉协调能力，保证充足睡眠。',
        // 兼容旧 PASS 键名
        planning: '建议通过简单的日程安排、拼图游戏、搭积木等活动逐步培养计划能力。',
        simultaneous: '建议多做拼图、图形配对、积木搭建等游戏，用图表和思维导图帮助理解学习内容。',
        successive: '建议通过讲故事复述、数字记忆游戏、节奏拍打等方式训练序列记忆。',
    };
    return adviceMap[dim] || '';
}

function getImprovementAdvice(dim, ageGroup) {
    const adviceMap = {
        attention: '注意力有一定基础。建议使用番茄钟方法训练专注力，从15分钟逐步增加到25分钟。',
        memory: '记忆能力有提升空间。建议通过思维导图结合联想法记忆，定期复习已学内容巩固长期记忆。',
        comprehension: '推理能力有提升空间。建议多做"找规律"和类比推理练习，鼓励孩子用"如果…那么…"分析问题。',
        execution: '执行功能有一定基础。建议增加策略类桌游（如象棋、迷宫），让孩子参与家庭活动的计划安排。',
        spatial: '空间认知有提升空间。建议多做"找不同"游戏、图形推理练习，利用实物模型辅助学习。',
        processing: '处理速度有提升空间。建议进行定时符号搜索练习，尝试反应游戏逐步缩短反应时间。',
        // 兼容旧 PASS 键名
        planning: '有一定的计划能力基础，建议增加策略类桌游，让孩子参与家庭活动的计划安排。',
        simultaneous: '空间认知有提升空间，建议多做图形推理练习。',
        successive: '序列能力有提升空间，建议多复述故事、背诵诗歌、进行节奏训练等。',
    };
    return adviceMap[dim] || '';
}

function getAgeSpecificAdvice(ageGroup) {
    const adviceMap = {
        '幼儿组': '5-6岁是认知能力发展的关键期。建议以游戏化方式进行训练，每次不超过15分钟，注重趣味性。多进行户外活动和同伴互动。',
        '小学低年级组': '7-9岁的孩子开始形成学习习惯。建议结合学校课程进行认知训练，培养自主学习能力，注意劳逸结合。',
        '小学高年级组': '10-12岁可以进行更有目标性的训练。鼓励参加思维竞赛、科学探索活动，培养独立思考和解决问题的能力。',
        '初中组': '13-15岁的青少年可以进行系统性的认知训练。建议结合学科学习，培养批判性思维和创新能力。',
        '高中组': '16-17岁的认知能力接近成人水平。建议通过项目式学习、研究性学习来综合提升认知能力。',
        '5-7岁组': '5-7岁是认知基础奠定的关键期，建议游戏化训练，每次10-15分钟，注重趣味性和正向激励。',
        '8-14岁组': '8-14岁认知能力快速发展，可进行更系统的训练，结合学科学习，每次20-30分钟。'
    };
    return adviceMap[ageGroup] || null;
}

function getDailyTrainingAdvice(weakDim, ageGroup) {
    const adviceMap = {
        attention: '每天进行10分钟的"安静时间"练习；减少碎片化信息输入；鼓励阅读和拼图类活动。',
        memory: '每天练习数字顺序复述，从3位开始逐步增加；睡前回顾当天有趣的事情，锻炼情景记忆。',
        comprehension: '每天做一组数字或图形规律推理练习；鼓励孩子预测故事结局，培养推断能力。',
        execution: '每天花10分钟和孩子一起规划第二天的事项；周末完成一个需要多步骤的手工或烹饪项目。',
        spatial: '每天做一组图形推理或"找不同"练习；鼓励画画和搭建模型；观察地图培养方位感。',
        processing: '每天进行2分钟的符号搜索或数字消除练习；参加需要快速反应的体育活动（如乒乓球）。',
        // 兼容旧 PASS 键名
        planning: '每天花10分钟和孩子一起规划第二天的事项；周末一起完成一个需要多步骤的手工或烹饪项目。',
        simultaneous: '每天做一组图形推理或"找不同"练习；鼓励画画和搭建模型；用思维导图整理所学知识。',
        successive: '每天复述一个小故事或一段学习内容；做数字接龙游戏；定期背诵短诗或歌曲。',
    };
    return adviceMap[weakDim] || '每天进行15-20分钟的认知训练游戏，保持规律性。';
}
