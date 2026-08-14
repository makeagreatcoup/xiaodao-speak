export type CategoryKey = "life" | "work" | "opinion" | "whimsy" | "all";

export interface Prompt {
  id: string;
  text: string;
  /** 小导支招：一个查资料角度 + 一个开讲角度 */
  note?: string;
}

export interface Category {
  key: CategoryKey;
  name: string;
  tag: string;
  blurb: string;
  prompts: Prompt[];
}

const life: Category = {
  key: "life",
  name: "生活现场",
  tag: "日常即剧本",
  blurb: "把你每天经历的小事，查清楚再讲出花来。",
  prompts: [
    {
      id: "life-1",
      text: "用 60 秒安利你最近沉迷的一样东西，但全篇不许出现「很好用」三个字。",
      note: "查资料时找它的来历或冷门用法；开讲先给结论，再补一个你自己的瞬间。",
    },
    {
      id: "life-2",
      text: "复刻一次你被外卖迟到的瞬间，现场表演你的内心戏。",
    },
    {
      id: "life-3",
      text: "向一个从没来过你家的朋友，云参观你的房间，从进门讲到床头。",
    },
    {
      id: "life-4",
      text: "描述你理想中完美的一天，从睁眼到睡着，不许跳时段。",
    },
    {
      id: "life-5",
      text: "模仿你家的某样电器，讲讲它平时积下的怨气。",
      note: "给它一个性格，冰箱和路由器怨的点肯定不一样。",
    },
    {
      id: "life-6",
      text: "给三年前的自己发一段语音，只准说三句话。",
    },
    {
      id: "life-7",
      text: "现场教大家一道你只会做一次的「招牌菜」，步骤要听得懂。",
    },
    {
      id: "life-8",
      text: "描述一种只有你自己懂的「舒服」，别人听了应该有点羡慕。",
    },
    {
      id: "life-9",
      text: "假装你是你家小区的一只猫，点评住在这里的几户人家。",
    },
    {
      id: "life-10",
      text: "用带货主播的语气，卖你桌上的一支笔，必须让人想下单。",
      note: "限时感、数字感、逼单，一个都不能少。",
    },
    {
      id: "life-11",
      text: "讲讲你手机相册里最尴尬的那张照片，背后的故事。",
    },
    {
      id: "life-12",
      text: "向外星人解释「凑单满减」到底是一种什么人类行为。",
    },
    {
      id: "life-13",
      text: "用 60 秒讲清楚你家乡的一道小吃，外地人听了应该想订票。",
      note: "查资料找这道小吃的起源和独特工艺；开讲用气味和声音拉人进场。",
    },
    {
      id: "life-14",
      text: "描述你第一次坐飞机或高铁的某个细节，为什么记得这么清。",
    },
    {
      id: "life-15",
      text: "向一个不爱运动的朋友，安利你最喜欢的一种「动一动」的方式。",
    },
  ],
};

const work: Category = {
  key: "work",
  name: "职场过招",
  tag: "社畜即演员",
  blurb: "把那些说不清的职场瞬间，查明白了再练到张口就来。",
  prompts: [
    {
      id: "work-1",
      text: "开会迟到三分钟，用一句话把锅甩得毫无痕迹。",
      note: "真诚地圆场，才是职场艺术。",
    },
    {
      id: "work-2",
      text: "客户说「再改改就好」，你当场翻译他到底想要什么。",
    },
    {
      id: "work-3",
      text: "把你上周最水的一次周报，讲出史诗感。",
      note: "关键词：对齐、闭环、颗粒度。",
    },
    {
      id: "work-4",
      text: "面试被问「你最大的缺点」，给个 HR 挑不出毛病的答案。",
    },
    {
      id: "work-5",
      text: "用 30 秒说服老板，周末加班是不对的。",
    },
    {
      id: "work-6",
      text: "扮演一个把「赋能」挂嘴边的同事，即兴来一段汇报。",
    },
    {
      id: "work-7",
      text: "你刚被通知项目黄了，给团队打个圆场，别让气氛塌。",
    },
    {
      id: "work-8",
      text: "向完全外行的爸妈，解释你每天到底在干嘛。",
      note: "别用行话，他们要的是画面感。",
    },
    {
      id: "work-9",
      text: "电梯里偶遇大老板，30 秒留下一个忘不掉的印象。",
    },
    {
      id: "work-10",
      text: "把「这个需求很简单」翻译成开发听不懂的人话。",
    },
    {
      id: "work-11",
      text: "模拟一次你最想直接挂掉的推销电话，反客为主。",
    },
    {
      id: "work-12",
      text: "用饭圈用语，重新讲一遍你们公司的年会。",
    },
    {
      id: "work-13",
      text: "把「我在做一个副业」讲得既酷又不像在割韭菜。",
      note: "查资料找副业和诈骗的边界案例；开讲用「我在解决什么问题」切入。",
    },
    {
      id: "work-14",
      text: "你刚涨薪，怎么在不招恨的前提下，让关系好的同事知道。",
    },
    {
      id: "work-15",
      text: "用老板能听懂的话，解释为什么「这个需求其实不简单」。",
    },
  ],
};

const opinion: Category = {
  key: "opinion",
  name: "观点交锋",
  tag: "站队即立场",
  blurb: "挑一个日常争议，查了反方再亮明态度，把道理讲圆。",
  prompts: [
    {
      id: "opinion-1",
      text: "奶茶三分糖到底是不是在自欺欺人？陈述你的立场。",
    },
    {
      id: "opinion-2",
      text: "周末宅家充电，和出门 social，哪个更值得？二选一。",
    },
    {
      id: "opinion-3",
      text: "「早起的鸟有虫吃」是不是一句毒鸡汤？说说你的判断。",
    },
    {
      id: "opinion-4",
      text: "朋友圈该不该屏蔽爸妈？给出你的理由。",
      note: "别两头讨好，选一边往死里说。",
    },
    {
      id: "opinion-5",
      text: "过年发红包，该按岁数还是按关系？亮明态度。",
    },
    {
      id: "opinion-6",
      text: "电子书能不能取代纸质书，站一边说清楚。",
    },
    {
      id: "opinion-7",
      text: "熬夜是因为自律差，还是因为白天根本不属于自己？",
    },
    {
      id: "opinion-8",
      text: "相亲该不该先看照片？把你的态度摆出来。",
    },
    {
      id: "opinion-9",
      text: "打工人的摸鱼，算偷懒还是算必要的喘息？",
    },
    {
      id: "opinion-10",
      text: "该不该为了合群，去吃你其实不喜欢的火锅？",
    },
    {
      id: "opinion-11",
      text: "「断舍离」是不是中产的新焦虑？抛出你的看法。",
    },
    {
      id: "opinion-12",
      text: "表情包算不算一种语言能力？论证你的观点。",
    },
    {
      id: "opinion-13",
      text: "预制菜进校园，该支持还是该警惕？亮明态度。",
      note: "查资料时务必看反方数据；开讲先给结论，再用一条数据撑住。",
    },
    {
      id: "opinion-14",
      text: "AI 写的东西算不算创作？把你的判断讲圆。",
    },
    {
      id: "opinion-15",
      text: "攒钱和花钱，哪个更需要对生活的掌控感？二选一。",
    },
  ],
};

const whimsy: Category = {
  key: "whimsy",
  name: "脑洞大开",
  tag: "离谱即自由",
  blurb: "越不靠谱越练嘴，给想象力松松绑。",
  prompts: [
    {
      id: "whimsy-1",
      text: "如果猫咪统治世界，第一条法律你起草什么？",
    },
    {
      id: "whimsy-2",
      text: "你刚发明了一种新情绪，给它起名并描述它的症状。",
      note: "先定义感受，再举一个你中招的例子。",
    },
    {
      id: "whimsy-3",
      text: "用倒叙的方式，讲一个你「差点迟到」的悬疑故事。",
    },
    {
      id: "whimsy-4",
      text: "如果后悔能打包寄给过去的自己，你寄了什么回去？",
    },
    {
      id: "whimsy-5",
      text: "给「拖延症」写一封正式的情书。",
    },
    {
      id: "whimsy-6",
      text: "你是一家时间旅行社的导游，重点推销「回到周一早晨」。",
    },
    {
      id: "whimsy-7",
      text: "如果所有 APP 图标都长一样，世界会变成什么样？",
    },
    {
      id: "whimsy-8",
      text: "用天气预报的腔调，播报你今天的心情。",
      note: "晴转多云、局部阵雨，都能用上。",
    },
    {
      id: "whimsy-9",
      text: "发明一道菜，原料只有「昨天」和「明天」。",
    },
    {
      id: "whimsy-10",
      text: "如果你是「已读不回」这个功能，你觉得委屈吗？",
    },
    {
      id: "whimsy-11",
      text: "给宇宙的客服写一条差评，必须具体。",
    },
    {
      id: "whimsy-12",
      text: "用广告法禁止的绝对化用语，夸一夸你家楼下的便利店。",
    },
    {
      id: "whimsy-13",
      text: "如果人的记忆能像聊天记录一样搜索，你会先搜什么？",
      note: "查资料想想记忆检索如果是真的会有什么伦理问题；开讲从一个具体画面开头。",
    },
    {
      id: "whimsy-14",
      text: "给「周一」和「周五」各写一句颁奖词。",
    },
    {
      id: "whimsy-15",
      text: "假如地球是个人，他最近在为什么发朋友圈？",
    },
  ],
};

const baseCategories: Category[] = [life, work, opinion, whimsy];

export const allPrompts: Prompt[] = baseCategories.flatMap((c) => c.prompts);

export const categories: Category[] = [
  ...baseCategories,
  {
    key: "all",
    name: "随机全场",
    tag: "全池混抽",
    blurb: "四块场子混在一起，抽到谁算谁，主打一个大量随机。",
    prompts: allPrompts,
  },
];
