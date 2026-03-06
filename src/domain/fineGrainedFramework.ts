export type FineGrainedDimensionKey =
  | 'attention'
  | 'memory'
  | 'logic'
  | 'spatial'
  | 'execution'
  | 'processing';

export type IndicatorMeta = {
  key: string;
  name: string;
  definition: string;
  assessment: string;
  ageRange: string;
  suggestedLoad: string;
};

export type FineGrainedDimensionMeta = {
  key: FineGrainedDimensionKey;
  name: string;
  icon: string;
  desc: string;
  indicators: IndicatorMeta[];
};

export const FINE_GRAINED_FRAMEWORK: FineGrainedDimensionMeta[] = [
  {
    key: 'attention',
    name: '注意力',
    icon: '👁️',
    desc: '将注意能力拆解为持续、选择、转移和广度四个子成分。',
    indicators: [
      {
        key: 'sustained-attention',
        name: '持续性注意',
        definition: '维持注意状态的时间长度，抵御疲劳的能力。',
        assessment: '视觉/听觉警戒测试，统计漏报率随时间变化。',
        ageRange: '8-18岁',
        suggestedLoad: '5-8分钟连续任务',
      },
      {
        key: 'selective-attention',
        name: '选择性注意',
        definition: '从干扰信息中聚焦目标的能力。',
        assessment: '视觉搜索任务，识别目标特征图形。',
        ageRange: '5-18岁',
        suggestedLoad: '2个Block × 15个目标',
      },
      {
        key: 'attention-switching',
        name: '注意转移',
        definition: '在不同任务规则间灵活切换的能力。',
        assessment: '任务切换范式，计算切换代价（切换RT-重复RT）。',
        ageRange: '8-18岁',
        suggestedLoad: '40-60个试次',
      },
      {
        key: 'attention-span',
        name: '注意广度',
        definition: '瞬时并行把握信息量的能力。',
        assessment: '速示点阵任务（50ms闪现），报告点数。',
        ageRange: '5-12岁',
        suggestedLoad: '12次闪现（3-8点组合）',
      },
    ],
  },
  {
    key: 'memory',
    name: '记忆力',
    icon: '🧠',
    desc: '将记忆能力拆解为短时、工作、情景、视觉、长时提取五个子成分。',
    indicators: [
      {
        key: 'short-term-memory',
        name: '短时记忆',
        definition: '信息短暂存储能力，不复述时易消失。',
        assessment: '顺背广度任务（数字顺序复述）。',
        ageRange: '5-18岁',
        suggestedLoad: '6组（3位到8位，每组2试次）',
      },
      {
        key: 'working-memory',
        name: '工作记忆',
        definition: '存储与加工同时进行的能力。',
        assessment: '倒背广度/运算广度。',
        ageRange: '5-18岁',
        suggestedLoad: '8组（2位到7位）',
      },
      {
        key: 'episodic-memory',
        name: '情景记忆',
        definition: '对具体时间地点事件的记忆能力。',
        assessment: '故事回忆任务，按细节点计分。',
        ageRange: '5-12岁',
        suggestedLoad: '1个故事（20细节）',
      },
      {
        key: 'visual-memory',
        name: '视觉记忆',
        definition: '对图形、面孔、位置等非言语材料的记忆能力。',
        assessment: '复杂图形临摹后延迟回忆。',
        ageRange: '7-18岁',
        suggestedLoad: '1张图（18单元计分）',
      },
      {
        key: 'long-term-retrieval',
        name: '长时记忆提取',
        definition: '从知识库调取信息的能力。',
        assessment: '语义流畅性任务（类别词汇生成）。',
        ageRange: '5-18岁',
        suggestedLoad: '2个类别（语义+语音）',
      },
    ],
  },
  {
    key: 'logic',
    name: '逻辑思维',
    icon: '🧩',
    desc: '将逻辑能力拆解为归纳、演绎、类比和关系推理四个子成分。',
    indicators: [
      {
        key: 'inductive-reasoning',
        name: '归纳推理',
        definition: '从具体事例中发现规律的能力。',
        assessment: '图形序列推理。',
        ageRange: '5-18岁',
        suggestedLoad: '10题',
      },
      {
        key: 'deductive-reasoning',
        name: '演绎推理',
        definition: '根据前提推出必然结论的能力。',
        assessment: '三段论判断任务。',
        ageRange: '10-18岁',
        suggestedLoad: '8题',
      },
      {
        key: 'analogical-reasoning',
        name: '类比推理',
        definition: '发现关系对等性的能力。',
        assessment: 'A:B=C:? 类比题。',
        ageRange: '6-18岁',
        suggestedLoad: '10题',
      },
      {
        key: 'relational-sequencing',
        name: '关系推理/序列化',
        definition: '理解传递性关系的能力。',
        assessment: '多实体关系比较任务。',
        ageRange: '5-12岁',
        suggestedLoad: '8题',
      },
    ],
  },
  {
    key: 'spatial',
    name: '空间智能',
    icon: '🧭',
    desc: '将空间能力拆解为空间知觉、心理旋转、空间可视化三个子成分。',
    indicators: [
      {
        key: 'spatial-perception',
        name: '空间知觉',
        definition: '理解物体空间方位关系的能力。',
        assessment: '左右辨别任务。',
        ageRange: '5-10岁',
        suggestedLoad: '6题',
      },
      {
        key: 'mental-rotation',
        name: '心理旋转',
        definition: '在脑海中旋转物体的能力。',
        assessment: '旋转匹配（排除镜像）。',
        ageRange: '7-18岁',
        suggestedLoad: '10题（二维+三维）',
      },
      {
        key: 'spatial-visualization',
        name: '空间可视化',
        definition: '理解物体内部结构与折叠展开关系的能力。',
        assessment: '立方体展开图折叠判断。',
        ageRange: '10-18岁',
        suggestedLoad: '8题',
      },
    ],
  },
  {
    key: 'execution',
    name: '执行功能',
    icon: '⚡',
    desc: '将执行能力拆解为抑制控制、认知灵活性、计划与监控三个子成分。',
    indicators: [
      {
        key: 'inhibitory-control',
        name: '抑制控制',
        definition: '抑制优势反应和冲动行为的能力。',
        assessment: '昼夜Stroop / Go-NoGo任务。',
        ageRange: '5-18岁',
        suggestedLoad: '30刺激（20%抑制试次）',
      },
      {
        key: 'cognitive-flexibility',
        name: '认知灵活性',
        definition: '转换规则与视角的能力。',
        assessment: '简化WCST规则切换任务。',
        ageRange: '8-18岁',
        suggestedLoad: '3次类别转换',
      },
      {
        key: 'planning-monitoring',
        name: '计划与监控',
        definition: '目标设定、路径规划与过程监控能力。',
        assessment: '迷宫任务 / 塔任务。',
        ageRange: '6-18岁',
        suggestedLoad: '3个难度层级',
      },
    ],
  },
  {
    key: 'processing',
    name: '处理速度',
    icon: '⏱️',
    desc: '将处理速度拆解为知觉速度与心理运动速度两个子成分。',
    indicators: [
      {
        key: 'perceptual-speed',
        name: '知觉速度',
        definition: '快速扫描与匹配简单信息的能力。',
        assessment: '符号搜索任务。',
        ageRange: '6-18岁',
        suggestedLoad: '限时2分钟，计正确数',
      },
      {
        key: 'psychomotor-speed',
        name: '心理运动速度',
        definition: '快速作出简单决策并执行动作的能力。',
        assessment: '简单反应时任务。',
        ageRange: '5-18岁',
        suggestedLoad: '15试次（剔除异常值）',
      },
    ],
  },
];

export const FINE_GRAINED_FRAMEWORK_MAP = Object.fromEntries(
  FINE_GRAINED_FRAMEWORK.map(item => [item.key, item]),
) as Record<FineGrainedDimensionKey, FineGrainedDimensionMeta>;

export const FINE_GRAINED_TOTAL_DIMENSIONS = FINE_GRAINED_FRAMEWORK.length;

export const FINE_GRAINED_TOTAL_INDICATORS = FINE_GRAINED_FRAMEWORK.reduce(
  (sum, dimension) => sum + dimension.indicators.length,
  0,
);

export function getFineGrainedDimension(key: FineGrainedDimensionKey): FineGrainedDimensionMeta {
  return FINE_GRAINED_FRAMEWORK_MAP[key];
}

export function getAllFineGrainedIndicators(): IndicatorMeta[] {
  return FINE_GRAINED_FRAMEWORK.flatMap(dimension => dimension.indicators);
}
