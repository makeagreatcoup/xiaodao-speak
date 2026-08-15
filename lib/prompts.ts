// 分类 key 已是开放字符串：内置分类（真实源主题）+ 个人自定义命名（如 法律 / 自命题）
export type CategoryKey = string;

export interface Prompt {
  id: string;
  /** 单个词 / 概念：抽到一个，去查它、解释它 */
  term: string;
  /** 领域：内置用 CategoryKey，个人词库用自定义名称（如 心理学 / 法律 / 自命题） */
  category: string;
  /** 小导支招：一个查资料角度 + 一个开讲角度（种子库暂无，仅个人词库可扩展） */
  note?: string;
}

export interface Category {
  key: CategoryKey;
  name: string;
  tag: string;
  blurb: string;
}

// 从真实源提取、经筛选保留的「深奥 / 非日常」主题与话题，见 lib/seed-topics.ts
import { seedTopics } from "./seed-topics";

// 展示用分类（不含 custom，custom 由本地存储动态驱动）
// 全部来自真实源：交谈话题.html（unprompted.cool 中文克隆）、Buster Benson 认知偏误清单、
// awesome-mental-models / 查理·芒格思维模型、正统学科标准概念集。
export const categories: Category[] = [
  {
    key: "deep-research",
    name: "深度研究",
    tag: "认知偏误",
    blurb: "认知偏误、社会心理、博弈悖论——先把资料查透，再开口做一场有东西的演讲。",
  },
  {
    key: "literature",
    name: "文学",
    tag: "读进去",
    blurb: "小说、诗歌、意象，把文字里的东西讲给人听。",
  },
  {
    key: "mental-models",
    name: "思维模型",
    tag: "想清楚",
    blurb: "第一性原理、二阶思维、奥卡姆剃刀……用多学科框架把世界想明白。",
  },
  {
    key: "philosophy",
    name: "哲学概念",
    tag: "烧脑两难",
    blurb: "存在主义、自由意志、缸中之脑——没有标准答案，最适合练「把道理讲圆」。",
  },
  {
    key: "science-frontier",
    name: "科学前沿",
    tag: "硬核概念",
    blurb: "从熵到量子纠缠，挑一个你半懂不懂的，查明白再开口。",
  },

  {
    key: "all",
    name: "随机全场",
    tag: "全池混抽",
    blurb: "几块场子混在一起，抽到谁算谁，主打一个大量随机。",
  },
];

// 全部话题来自真实源（lib/seed-topics.ts），不再包含任何人工编造的主题或支招。
export const prompts: Prompt[] = [
  // ===== 从真实源提取、经筛选保留的深奥话题 =====
  ...seedTopics,
];

export function promptsFor(key: string): Prompt[] {
  if (key === "all") return prompts;
  if (key === "custom") return [];
  return prompts.filter((p) => p.category === key);
}

export function categoryMeta(key: string): Category {
  const byKey = categories.find((c) => c.key === key);
  if (byKey) return byKey;
  const byName = categories.find((c) => c.name === key);
  if (byName) return byName;
  // 个人词库的自定义领域名（如「法律」「职场」），或回退到自命题
  return {
    key: "custom",
    name: key || "自命题",
    tag: key || "自命题",
    blurb: "你自己往里加的词。",
  };
}

// ===== 个人词库 =====
// 个人词库的每个词可带一个领域标签（深度研究 / 文学 / 思维模型 / 哲学概念 / 科学前沿 / 自命题），
// 导入时指定；抽「随机全场」会混进所有上传词，抽具体领域只会混入该领域的上传词。
// id 由词本身推导，保证跨会话去重稳定。
const CUSTOM_PREFIX = "custom::";

export function customPromptId(term: string): string {
  return CUSTOM_PREFIX + term.trim();
}

export interface CustomPrompt {
  term: string;
  /** 领域名（如 哲学概念 / 法律 / 自命题） */
  category: string;
}

export function makeCustomPrompt(
  term: string,
  category: string = "自命题",
): Prompt {
  return { id: customPromptId(term), term: term.trim(), category };
}

/**
 * 解析批量导入的词库文本：
 * - 支持「一行一个词」
 * - 支持「逗号 / 中文逗号 / 顿号 / 分号 / 制表符」分隔
 * - 自动去空白、去空行、去重（大小写不敏感）
 * - 跳过常见的表头（term / word / 词语 / 关键词 等）
 */
export function parseWordList(raw: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const HEADER = /^(term|word|keyword|keywords|词语|词目|关键词|subject|topic|name|词条)$/i;
  for (const part of raw.split(/[\r\n,，、;；\t]+/)) {
    const t = part.trim();
    if (!t) continue;
    if (HEADER.test(t)) continue;
    const key = t.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(t);
  }
  return out;
}
