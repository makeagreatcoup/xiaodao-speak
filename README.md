# 小导片场 · 先查后讲

随机抽一个词，先花 10 分钟上网查资料，再用 1 分钟把它讲清楚。一个练「把陌生东西讲到别人听懂」本事的小工具。灵感来自 [unprompted.cool](https://www.unprompted.cool/)，做了王小导 IP 人格化（导演 / 导航）与纯中文单词语题库。

## 玩法

1. 小导随机甩你一个词（心理学 / 经济 / 科学 / 哲学……）。
2. **查 10 分钟**：搞懂它的定义、来龙去脉、案例、反方观点。
3. **讲 1 分钟**：合上屏幕，先给结论再补细节，开口就讲。

练的不是背词，是把「查来的东西」用自己的嘴重新讲出来的能力。

## 功能

- **单词语题库**：60 个概念词，按领域分四类（心理学 / 经济商业 / 科学科技 / 思维哲学）+「随机全场」全池混抽。每个词带一条「小导支招」（查资料角度 + 开讲角度）。
- **已表达 / 未表达**：自动排除已经练过的词，进度存在本机浏览器；可一键重置、可勾选「包含已表达过的」。
- **我的命题**：可自己往题库里加词，分类栏会出现「我的命题」标签。
- **两段式计时**：阶段一「查资料」（5 / 10 / 15 分钟，默认 10 分钟）→ 阶段二「开讲」（30 / 60 / 90 / 120 秒，默认 1 分钟），支持暂停 / 继续。
- **暗色模式**、尊重「减弱动效」系统偏好。

## 技术栈

Next.js 15（App Router）· TypeScript · Tailwind CSS v4 · Geist 字体 · Radix Icons · IntersectionObserver（滚动揭示，替代 motion）。

## 本地运行

```bash
npm install
npm run dev        # 开发预览：http://localhost:3000
npm run build      # 生产构建
npm run start      # 本地跑生产构建
```

## 目录结构

```
xiaodao-speak/
├── app/                # 页面与全局样式（layout / page / globals.css）
├── components/         # 交互组件，PromptStage 为核心抽题计时器
├── lib/prompts.ts      # 词库与分类（改词 / 加词只动这一个文件）
├── vercel.json         # Vercel 部署配置
├── next.config.mjs
├── tailwind 配置（postcss.config.mjs）
└── package.json
```

> 命题数据全部集中在 `lib/prompts.ts`，改文案、加词、调分类都只动这一个文件。

## 部署（Vercel）

仓库根目录即为 Next.js 项目，**导入时 Root Directory 保持仓库根（`.`）**，Framework 会自动识别为 Next.js，`vercel.json` 已兜底声明框架。推送 `main` 分支即触发自动部署。

> 历史上曾把项目放在 `next/` 子目录，Vercel 因找不到 `package.json` 一直 404；现项目已提升至仓库根，无需任何子目录配置。

## 许可证

仅供学习练习使用。
