export type CategoryKey =
  | "psychology"
  | "economy"
  | "science"
  | "philosophy"
  | "all"
  | "custom";

export interface Prompt {
  id: string;
  /** 单个词 / 概念：抽到一个，去查它、解释它 */
  term: string;
  category: CategoryKey;
  /** 小导支招：一个查资料角度 + 一个开讲角度 */
  note?: string;
}

export interface Category {
  key: CategoryKey;
  name: string;
  tag: string;
  blurb: string;
}

// 展示用分类（不含 custom，custom 由本地存储动态驱动）
export const categories: Category[] = [
  {
    key: "psychology",
    name: "心理学",
    tag: "读懂人心",
    blurb: "一个个名词，背后都是人性的小把戏。查清楚，再讲给没学过的人听。",
  },
  {
    key: "economy",
    name: "经济商业",
    tag: "看透钱事",
    blurb: "钱往哪流、人为啥这么选。把概念讲成你朋友能听懂的大白话。",
  },
  {
    key: "science",
    name: "科学科技",
    tag: "硬核概念",
    blurb: "从熵到量子纠缠，挑一个你半懂不懂的，查明白再开口。",
  },
  {
    key: "philosophy",
    name: "思维哲学",
    tag: "烧脑两难",
    blurb: "没有标准答案的词，最适合练「把道理讲圆」的本事。",
  },
  {
    key: "all",
    name: "随机全场",
    tag: "全池混抽",
    blurb: "四块场子混在一起，抽到谁算谁，主打一个大量随机。",
  },
];

export const prompts: Prompt[] = [
  // ===== 心理学 =====
  { id: "psy-1", term: "锚定效应", category: "psychology", note: "查它怎么悄悄影响你的出价和判断；开讲用砍价或商场标价举个例。" },
  { id: "psy-2", term: "证实偏差", category: "psychology", note: "人只看自己愿意信的；开讲说说为啥刷短视频越刷越窄。" },
  { id: "psy-3", term: "邓宁-克鲁格效应", category: "psychology", note: "越不懂越自信；开讲拿新手司机或刚入门就敢指点江山的人开刀。" },
  { id: "psy-4", term: "心流", category: "psychology", note: "完全沉浸的状态；开讲说说你打游戏或做喜欢的事时忘了时间那会儿。" },
  { id: "psy-5", term: "损失厌恶", category: "psychology", note: "丢一百比赚一百更疼；开讲说说为啥明知道该割肉却下不了手。" },
  { id: "psy-6", term: "旁观者效应", category: "psychology", note: "人越多越没人帮；开讲还原一个地铁里有人摔倒没人动的场景。" },
  { id: "psy-7", term: "自我实现预言", category: "psychology", note: "你信什么就真成什么；开讲说说老师对「好学生」的期待如何应验。" },
  { id: "psy-8", term: "认知失调", category: "psychology", note: "言行不一心里难受；开讲说说明知道不好还继续的人怎么给自己找补。" },
  { id: "psy-9", term: "破窗效应", category: "psychology", note: "小破不修大破就来；开讲拿小区环境和公共秩序讲。" },
  { id: "psy-10", term: "间歇性强化", category: "psychology", note: "偶尔给糖最上头；开讲说说抽卡、盲盒为啥让人停不下来。" },
  { id: "psy-11", term: "投射效应", category: "psychology", note: "把自己的想法安别人头上；开讲说说吵架时我们多容易误读对方。" },
  { id: "psy-12", term: "峰终定律", category: "psychology", note: "记得最清的是高峰和结尾；开讲用一次旅行或一顿饭拆给你听。" },
  { id: "psy-13", term: "刻板印象", category: "psychology", note: "给一群人贴一张标签；开讲说说地域或职业偏见从哪来。" },
  { id: "psy-14", term: "归因偏差", category: "psychology", note: "好事归自己、坏事怪别人；开讲复盘一次工作汇报或比赛失利。" },
  { id: "psy-15", term: "霍桑效应", category: "psychology", note: "被关注就表现好；开讲说说被老板盯着时你为啥突然勤快。" },

  // ===== 经济商业 =====
  { id: "eco-1", term: "机会成本", category: "economy", note: "选了 A 就放弃了 B；开讲用「今晚的时间花在哪」说清。" },
  { id: "eco-2", term: "沉没成本", category: "economy", note: "花了的回不来；开讲拿电影看一半要不要走、会员要不要续讲。" },
  { id: "eco-3", term: "复利", category: "economy", note: "利滚利；开讲用存钱或每天学一点讲长期主义。" },
  { id: "eco-4", term: "规模效应", category: "economy", note: "越大越便宜；开讲说说为啥大厂成本能压到很低。" },
  { id: "eco-5", term: "网络效应", category: "economy", note: "用的人多才好用；开讲用微信或打车软件讲护城河。" },
  { id: "eco-6", term: "长尾理论", category: "economy", note: "冷门加起来也很大；开讲说说小众书或小众歌怎么养活平台。" },
  { id: "eco-7", term: "边际效用递减", category: "economy", note: "第二杯没第一杯爽；开讲用吃同一道菜或收同款礼物讲。" },
  { id: "eco-8", term: "二八定律", category: "economy", note: "两成决定八成；开讲用客户、时间和收入拆给你听。" },
  { id: "eco-9", term: "黑天鹅", category: "economy", note: "想不到但影响巨大；开讲用疫情或某次突发崩盘讲风险。" },
  { id: "eco-10", term: "博弈论", category: "economy", note: "你动我动、互相算计；开讲用两家打价格战讲策略。" },
  { id: "eco-11", term: "囚徒困境", category: "economy", note: "都招供一起惨；开讲用竞品或同事甩锅讲个人与集体的拉扯。" },
  { id: "eco-12", term: "蓝海战略", category: "economy", note: "别挤红海；开讲说说怎么避开卷到死的赛道找新市场。" },
  { id: "eco-13", term: "羊群效应", category: "economy", note: "跟着大家买；开讲还原一次抢购或跟风投资。" },
  { id: "eco-14", term: "通货膨胀", category: "economy", note: "钱越来越不值钱；开讲用菜价和工资讲购买力。" },
  { id: "eco-15", term: "护城河", category: "economy", note: "对手抄不走的本事；开讲用品牌、牌照或习惯讲竞争壁垒。" },

  // ===== 科学科技 =====
  { id: "sci-1", term: "熵", category: "science", note: "越乱越自然；开讲用房间只会越来越乱讲无序。" },
  { id: "sci-2", term: "涌现", category: "science", note: "拼起来冒出新东西；开讲用蚁群或大脑讲整体大于部分。" },
  { id: "sci-3", term: "蝴蝶效应", category: "science", note: "小因撬大果；开讲用天气预报为啥总不准讲混沌。" },
  { id: "sci-4", term: "量子纠缠", category: "science", note: "隔空也连着；开讲用一对粒子讲「超距感应」。" },
  { id: "sci-5", term: "摩尔定律", category: "science", note: "芯片越做越强；开讲用手机几年一换代讲指数。" },
  { id: "sci-6", term: "薛定谔的猫", category: "science", note: "又死又活；开讲用「没打开前不知道」讲叠加态。" },
  { id: "sci-7", term: "图灵测试", category: "science", note: "机器像人不像；开讲用现在聊天机器人讲怎么判断。" },
  { id: "sci-8", term: "相对论", category: "science", note: "快慢是相对的；开讲用 GPS 卫星钟讲时间会被拉扯。" },
  { id: "sci-9", term: "基因编辑", category: "science", note: "改生命的代码；开讲讲能力也讲那条伦理红线。" },
  { id: "sci-10", term: "核聚变", category: "science", note: "人造小太阳；开讲讲为啥它是终极能源又总差十年。" },
  { id: "sci-11", term: "克隆", category: "science", note: "复制一个你；开讲讲技术也讲「那还是你吗」。" },
  { id: "sci-12", term: "区块链", category: "science", note: "一本谁都改不了的账；开讲用记账讲去中心化，少提币价。" },
  { id: "sci-13", term: "深度学习", category: "science", note: "机器自己学特征；开讲用识图或翻译讲它咋「看」。" },
  { id: "sci-14", term: "暗物质", category: "science", note: "看不见却撑着宇宙；开讲讲我们懂的只是很小一部分。" },
  { id: "sci-15", term: "费米悖论", category: "science", note: "外星人到底在哪；开讲用宇宙这么大却静悄悄讲矛盾。" },

  // ===== 思维哲学 =====
  { id: "phi-1", term: "奥卡姆剃刀", category: "philosophy", note: "简单的更可能对；开讲用解释一件事时别堆太多假设。" },
  { id: "phi-2", term: "电车难题", category: "philosophy", note: "杀一救五；开讲讲功利和道义怎么打架。" },
  { id: "phi-3", term: "忒修斯之船", category: "philosophy", note: "零件全换还是原船吗；开讲用它讲「我还是不是我」。" },
  { id: "phi-4", term: "缸中之脑", category: "philosophy", note: "你确定这是真实；开讲讲感知和真实之间的缝。" },
  { id: "phi-5", term: "存在主义", category: "philosophy", note: "先存在再定义自己；开讲用「你选成为谁」讲自由。" },
  { id: "phi-6", term: "功利主义", category: "philosophy", note: "最大多数最大幸福；开讲用一条政策讲代价和收益。" },
  { id: "phi-7", term: "滑坡谬误", category: "philosophy", note: "一步滑到底；开讲讲哪些论证是在吓人不是讲理。" },
  { id: "phi-8", term: "二律背反", category: "philosophy", note: "两边都对又都错；开讲用自由意志讲矛盾共存。" },
  { id: "phi-9", term: "他者", category: "philosophy", note: "我是谁看你而定；开讲用镜子外的目光讲身份。" },
  { id: "phi-10", term: "启蒙", category: "philosophy", note: "自己思考别被人带；开讲用康德那句「勇敢运用理智」。" },
  { id: "phi-11", term: "虚无主义", category: "philosophy", note: "没意义也行；开讲讲「既然没意义，反而更自由」。" },
  { id: "phi-12", term: "悖论", category: "philosophy", note: "自相矛盾却说得通；开讲用理发师或这句话是谎话开场。" },
  { id: "phi-13", term: "决定论", category: "philosophy", note: "一切早已写好；开讲讲如果命运注定，努力还有没有用。" },
  { id: "phi-14", term: "自由意志", category: "philosophy", note: "你真能选吗；开讲讲责任和选择到底归不归你。" },
  { id: "phi-15", term: "中庸", category: "philosophy", note: "不偏不倚；开讲讲它不是和稀泥，是分寸感。" },
];

export function promptsFor(key: CategoryKey): Prompt[] {
  if (key === "all") return prompts;
  if (key === "custom") return [];
  return prompts.filter((p) => p.category === key);
}

export function categoryMeta(key: CategoryKey): Category {
  const found = categories.find((c) => c.key === key);
  if (found) return found;
  return { key: "custom", name: "我的命题", tag: "自命题", blurb: "你自己往里加的词。" };
}
