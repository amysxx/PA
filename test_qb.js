import { builtinQuestions } from './src/data/questionPool.js';

function getBuiltInQuestions() {
    const list = [];

    // 1. 理解力 - 语言理解
    const langPoolMap = builtinQuestions.langPoolMap;
    Object.entries(langPoolMap).forEach(([ageGroup, questions]) => {
        questions.forEach(q => {
            list.push({ ...q, category: 'comprehension', subCategory: '语言理解', ageGroup, isBuiltIn: true });
        });
    });

    // 2. 理解力 - 逻辑推理
    const logicPoolMap = builtinQuestions.logicPoolMap;
    Object.entries(logicPoolMap).forEach(([ageGroup, questions]) => {
        questions.forEach(q => {
            list.push({ ...q, category: 'comprehension', subCategory: '逻辑推理', ageGroup, isBuiltIn: true });
        });
    });

    // 3. 理解力 - 类比推理
    const analogyPool = builtinQuestions.analogyPool;
    analogyPool.forEach(q => {
        list.push({ prompt: `${q.a} : ${q.b} = ${q.c} : ?`, options: q.options, answer: q.answer, category: 'comprehension', subCategory: '类比推理', ageGroup: 'all', isBuiltIn: true });
    });

    // 4. 理解力 - 关系推理
    const relationPool = builtinQuestions.relationPool;
    relationPool.forEach(q => {
        list.push({ ...q, category: 'comprehension', subCategory: '关系推理', ageGroup: 'all', isBuiltIn: true });
    });

    // 读取刚才在 questionPool.js 里统一生成的各类非理解/推理维度的题库
    if (builtinQuestions.spatialPool) {
        builtinQuestions.spatialPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
    }
    if (builtinQuestions.memoryPool) {
        builtinQuestions.memoryPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
    }
    if (builtinQuestions.attentionPool) {
        builtinQuestions.attentionPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
    }
    if (builtinQuestions.executionPool) {
        builtinQuestions.executionPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
    }
    if (builtinQuestions.processingPool) {
        builtinQuestions.processingPool.forEach(q => list.push({ ...q, isBuiltIn: true }));
    }

    return list;
}

try {
    const list = getBuiltInQuestions();
    console.log("Success! Items:", list.length);
} catch (e) {
    console.error("Error executing getBuiltInQuestions:");
    console.error(e);
}
