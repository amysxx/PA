/**
 * 个性化建议引擎
 * 基于分数、维度平衡性和历史数据生成动态建议
 */
import { DIMENSION_NAMES } from './normativeData.js';
import { getStandardRating, analyzeBalance } from './standardScoring.js';

/**
 * 基于标准化评分生成个性化建议
 */
export function generatePersonalizedAdvice(standardizedScores, ageGroup) {
    const advice = [];
    const dims = ['planning', 'attention', 'simultaneous', 'successive'];

    dims.forEach(dim => {
        const s = standardizedScores[dim];
        if (!s) return;

        const p = s.percentile;
        const name = DIMENSION_NAMES[dim];

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
            content: `${DIMENSION_NAMES[balance.strongest]}明显强于${DIMENSION_NAMES[balance.weakest]}。建议在发挥优势的同时，有针对性地加强${DIMENSION_NAMES[balance.weakest]}的训练。`
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

    const dims = ['planning', 'attention', 'simultaneous', 'successive'];
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
                content: `${DIMENSION_NAMES[dim]}进步了${Math.round(imp.change)}个百分位，继续保持！`
            });
        } else if (imp.change < -10) {
            hasDeclined = true;
            advice.push({
                icon: '💡',
                type: 'attention',
                content: `${DIMENSION_NAMES[dim]}有所下降，可能是测试状态影响，建议再次测试确认。`
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
    const dims = ['planning', 'attention', 'simultaneous', 'successive'];

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

    // 日常训练建议
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
        planning: '孩子展现出了出色的策划和组织能力。可以尝试更复杂的挑战，如编程、棋类竞赛等，进一步发展这一优势。',
        attention: '注意力集中能力很强。可以利用这一优势来学习需要高度专注的技能，如乐器演奏、书法或精细手工。',
        simultaneous: '空间和整体性认知能力突出。鼓励孩子发展数学几何、科学实验、艺术创作等需要空间思维的领域。',
        successive: '序列记忆和逻辑推理能力很强。适合学习语言、编程、音乐等需要顺序性思维的技能。'
    };
    return adviceMap[dim] || '';
}

function getWeaknessAdvice(dim, ageGroup) {
    const adviceMap = {
        planning: '建议通过简单的日程安排、拼图游戏、搭积木等活动来逐步培养计划能力。家长可以示范"先想后做"的思维方式。',
        attention: '建议创造安静的学习环境，使用计时器进行短时专注训练（从5分钟开始），减少电子屏幕时间，增加户外运动。',
        simultaneous: '建议多做拼图、图形配对、积木搭建等游戏。用图表和思维导图来帮助理解学习内容，培养整体观察能力。',
        successive: '建议通过讲故事复述、数字记忆游戏、节奏拍打等方式训练序列记忆。日常用"第一步、第二步"引导有序表达。'
    };
    return adviceMap[dim] || '';
}

function getImprovementAdvice(dim, ageGroup) {
    const adviceMap = {
        planning: '有一定的计划能力基础。建议增加策略类桌游（如象棋、拼图），让孩子参与家庭活动的计划安排。',
        attention: '注意力有一定基础。建议使用番茄钟方法训练专注力，从15分钟逐步增加到25分钟。',
        simultaneous: '空间认知有提升空间。建议多做"找不同"游戏、图形推理练习，利用实物模型辅助学习。',
        successive: '序列能力有提升空间。建议多复述故事、背诵诗歌、进行节奏训练等。'
    };
    return adviceMap[dim] || '';
}

function getAgeSpecificAdvice(ageGroup) {
    const adviceMap = {
        '幼儿组': '5-6岁是认知能力发展的关键期。建议以游戏化方式进行训练，每次不超过15分钟，注重趣味性。多进行户外活动和同伴互动。',
        '小学低年级组': '7-9岁的孩子开始形成学习习惯。建议结合学校课程进行认知训练，培养自主学习能力，注意劳逸结合。',
        '小学高年级组': '10-12岁可以进行更有目标性的训练。鼓励参加思维竞赛、科学探索活动，培养独立思考和解决问题的能力。',
        '初中组': '13-15岁的青少年可以进行系统性的认知训练。建议结合学科学习，培养批判性思维和创新能力。',
        '高中组': '16-17岁的认知能力接近成人水平。建议通过项目式学习、研究性学习来综合提升认知能力。'
    };
    return adviceMap[ageGroup] || null;
}

function getDailyTrainingAdvice(weakDim, ageGroup) {
    const adviceMap = {
        planning: '每天花10分钟和孩子一起规划第二天的事项；周末一起完成一个需要多步骤的手工或烹饪项目。',
        attention: '每天进行10分钟的"安静时间"练习；减少碎片化信息输入；鼓励阅读和拼图类活动。',
        simultaneous: '每天做一组图形推理或"找不同"练习；鼓励画画和搭建模型；用思维导图整理所学知识。',
        successive: '每天复述一个小故事或一段学习内容；做数字接龙游戏；定期背诵短诗或歌曲。'
    };
    return adviceMap[weakDim] || '每天进行15-20分钟的认知训练游戏，保持规律性。';
}
