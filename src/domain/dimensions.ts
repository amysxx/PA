import { getAllFineGrainedIndicators } from './fineGrainedFramework.ts';

export const DIMENSION_KEYS = ['attention', 'memory', 'comprehension', 'execution', 'spatial', 'processing'] as const;

export type DimensionKey = (typeof DIMENSION_KEYS)[number];

export type SubTestMeta = {
  key: string;
  name: string;
  indicatorKey: string;
  indicatorName: string;
  categoryAliases?: string[];
  ageMin?: number;
  ageMax?: number;
};

export type DimensionMeta = {
  key: DimensionKey;
  name: string;
  icon: string;
  cardClass: string;
  desc: string;
  frameworkRefs: string[];
  subTests: SubTestMeta[];
};

export const DIMENSION_NAMES: Record<DimensionKey, string> = {
  attention: '注意力',
  memory: '记忆力',
  comprehension: '理解与推理',
  execution: '执行功能',
  spatial: '空间智能',
  processing: '处理速度',
};

export const DIMENSIONS: DimensionMeta[] = [
  {
    key: 'attention',
    name: DIMENSION_NAMES.attention,
    icon: '👁️',
    cardClass: 'card-attention',
    desc: '评估持续注意、选择注意、注意转移和注意广度能力',
    frameworkRefs: ['attention'],
    subTests: [
      {
        key: 'sustained',
        name: '持续性注意',
        indicatorKey: 'sustained-attention',
        indicatorName: '持续性注意',
        categoryAliases: ['视觉注意', '听觉注意'],
      },
      {
        key: 'selective',
        name: '选择性注意',
        indicatorKey: 'selective-attention',
        indicatorName: '选择性注意',
      },
      {
        key: 'switching',
        name: '注意转移',
        indicatorKey: 'attention-switching',
        indicatorName: '注意转移',
        categoryAliases: ['选择性注意'],
      },
      {
        key: 'attention-span',
        name: '注意广度',
        indicatorKey: 'attention-span',
        indicatorName: '注意广度',
        ageMin: 5,
        ageMax: 12,
      },
    ],
  },
  {
    key: 'memory',
    name: DIMENSION_NAMES.memory,
    icon: '🧠',
    cardClass: 'card-memory',
    desc: '评估短时记忆、工作记忆、情景记忆、视觉记忆与长时提取',
    frameworkRefs: ['memory'],
    subTests: [
      {
        key: 'short-term',
        name: '短时记忆',
        indicatorKey: 'short-term-memory',
        indicatorName: '短时记忆',
      },
      {
        key: 'working',
        name: '工作记忆',
        indicatorKey: 'working-memory',
        indicatorName: '工作记忆',
      },
      {
        key: 'episodic',
        name: '情景记忆',
        indicatorKey: 'episodic-memory',
        indicatorName: '情景记忆',
        ageMin: 5,
        ageMax: 12,
      },
      {
        key: 'visual-memory',
        name: '视觉记忆',
        indicatorKey: 'visual-memory',
        indicatorName: '视觉记忆',
        ageMin: 7,
        ageMax: 18,
      },
      {
        key: 'long-term-retrieval',
        name: '长时记忆提取',
        indicatorKey: 'long-term-retrieval',
        indicatorName: '长时记忆提取',
        categoryAliases: ['长时记忆'],
      },
    ],
  },
  {
    key: 'comprehension',
    name: DIMENSION_NAMES.comprehension,
    icon: '🧩',
    cardClass: 'card-comprehension',
    desc: '评估归纳推理、演绎推理、类比推理与关系推理能力',
    frameworkRefs: ['logic'],
    subTests: [
      {
        key: 'inductive',
        name: '归纳推理',
        indicatorKey: 'inductive-reasoning',
        indicatorName: '归纳推理',
        categoryAliases: ['语言理解'],
      },
      {
        key: 'deductive',
        name: '演绎推理',
        indicatorKey: 'deductive-reasoning',
        indicatorName: '演绎推理',
        categoryAliases: ['逻辑推理'],
        ageMin: 10,
        ageMax: 18,
      },
      {
        key: 'analogical',
        name: '类比推理',
        indicatorKey: 'analogical-reasoning',
        indicatorName: '类比推理',
        ageMin: 6,
        ageMax: 18,
      },
      {
        key: 'relational',
        name: '关系推理/序列化',
        indicatorKey: 'relational-sequencing',
        indicatorName: '关系推理/序列化',
        ageMin: 5,
        ageMax: 12,
      },
    ],
  },
  {
    key: 'execution',
    name: DIMENSION_NAMES.execution,
    icon: '⚡',
    cardClass: 'card-execution',
    desc: '评估抑制控制、认知灵活性和计划监控',
    frameworkRefs: ['execution'],
    subTests: [
      {
        key: 'planning-monitoring',
        name: '计划与监控',
        indicatorKey: 'planning-monitoring',
        indicatorName: '计划与监控',
        categoryAliases: ['行动计划'],
      },
      {
        key: 'inhibitory-control',
        name: '抑制控制',
        indicatorKey: 'inhibitory-control',
        indicatorName: '抑制控制',
        categoryAliases: ['冲动控制'],
      },
      {
        key: 'cognitive-flexibility',
        name: '认知灵活性',
        indicatorKey: 'cognitive-flexibility',
        indicatorName: '认知灵活性',
        ageMin: 8,
        ageMax: 18,
      },
    ],
  },
  {
    key: 'spatial',
    name: DIMENSION_NAMES.spatial,
    icon: '🧭',
    cardClass: 'card-spatial',
    desc: '评估空间知觉、心理旋转和空间可视化',
    frameworkRefs: ['spatial'],
    subTests: [
      {
        key: 'spatial-perception',
        name: '空间知觉',
        indicatorKey: 'spatial-perception',
        indicatorName: '空间知觉',
        ageMin: 5,
        ageMax: 10,
      },
      {
        key: 'mental-rotation',
        name: '心理旋转',
        indicatorKey: 'mental-rotation',
        indicatorName: '心理旋转',
        ageMin: 7,
        ageMax: 18,
      },
      {
        key: 'spatial-visualization',
        name: '空间可视化',
        indicatorKey: 'spatial-visualization',
        indicatorName: '空间可视化',
        categoryAliases: ['空间理解'],
        ageMin: 10,
        ageMax: 18,
      },
    ],
  },
  {
    key: 'processing',
    name: DIMENSION_NAMES.processing,
    icon: '⏱️',
    cardClass: 'card-processing',
    desc: '评估知觉速度与心理运动速度',
    frameworkRefs: ['processing'],
    subTests: [
      {
        key: 'perceptual-speed',
        name: '知觉速度',
        indicatorKey: 'perceptual-speed',
        indicatorName: '知觉速度',
        ageMin: 6,
        ageMax: 18,
      },
      {
        key: 'psychomotor-speed',
        name: '心理运动速度',
        indicatorKey: 'psychomotor-speed',
        indicatorName: '心理运动速度',
      },
    ],
  },
];

export const DIMENSION_MAP = Object.fromEntries(DIMENSIONS.map(item => [item.key, item])) as Record<
  DimensionKey,
  DimensionMeta
>;

export const DIMENSION_IMPLEMENTED_INDICATOR_KEYS = Array.from(
  new Set(DIMENSIONS.flatMap(item => item.subTests.map(sub => sub.indicatorKey))),
);

export const FINE_GRAINED_TOTAL_INDICATORS = getAllFineGrainedIndicators().length;

export const FINE_GRAINED_IMPLEMENTED_INDICATORS = DIMENSION_IMPLEMENTED_INDICATOR_KEYS.length;

export function getDimensionMeta(key: string): DimensionMeta | undefined {
  return DIMENSIONS.find(dimension => dimension.key === key);
}

export function getDimensionSubTestNames(key: DimensionKey): string[] {
  return DIMENSION_MAP[key].subTests.map(item => item.name);
}

/** 根据年龄（岁）过滤出当前用户应当完成的子测试 */
export function getApplicableSubTests(dimensionKey: DimensionKey, ageYears: number): SubTestMeta[] {
  const dimension = DIMENSION_MAP[dimensionKey];
  if (!dimension) return [];
  return dimension.subTests.filter(sub => {
    const minOk = sub.ageMin == null || ageYears >= sub.ageMin;
    const maxOk = sub.ageMax == null || ageYears <= sub.ageMax;
    return minOk && maxOk;
  });
}
