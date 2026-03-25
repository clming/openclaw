---
name: gda-x-openclaw-threads
description: 在 X (Twitter) 上搜索 OpenClaw / AI 相关推文，并制作 Threads 帖子。适用于：(1) 调研 OpenClaw 热门话题，(2) 制作社群内容，(3) 追踪趋势。
---

# GDA X OpenClaw Threads 制作工具

## 功能

自动搜索 X (Twitter) 上关于 OpenClaw 或 AI 的热门推文，并制作成**简体中文**的 Threads 帖子。

## 触发关键字

- 搜索 OpenClaw
- 找 AI 热门帖子
- 制作 Threads
- OpenClaw 趋势
- X 热门话题

---

## 📝 素材模板

每次生成新的素材时，**按「日期文件夹」落盘**，且 **Markdown 与当日图片/视频（含视频首帧）放在同一目录下**，便于引用相对路径。

### ⚠️ 目录约定（必须遵守）

以技能根目录为当前目录（即 `SKILL.md` 所在目录，例如 `…/gda-x-openclaw-threads-master/`）：

```
data/
└── YYYY-MM-DD/                 # 一天一个文件夹，禁止跨日混放
    ├── YYYY-MM-DD.md           # 当日主素材 Markdown（从 Template 复制改名）
    ├── images/                 # 静态图、截图、视频首帧封面（统一放这里）
    │   ├── {推文状态ID}.jpg    # 例：推文配图或截图
    │   └── {推文状态ID}_cover.jpg  # 例：视频第一帧（与推文 ID 对应）
    └── videos/                 # 可选：需要保留完整视频时再存（多数情况只存首帧即可）
        └── {推文状态ID}.mp4
```

- **Markdown 路径**：`data/YYYY-MM-DD/YYYY-MM-DD.md`
- **图片 / 视频首帧路径**：`data/YYYY-MM-DD/images/…`
- **在 MD 里引用本地资源**（推荐）：使用相对路径，例如  
  `![推文配图](./images/2032032878855348702.jpg)`  
  `![视频封面（首帧）](./images/2032032878855348702_cover.jpg)`
- **视频首帧**：截取后 **保存为图片** 放进 `images/`，命名建议 `{推文状态ID}_cover.jpg`，并在同一条推文区块的 MD 里用 `![…](./images/…_cover.jpg)` 嵌入；**不必**把首帧再单独散落别处。
- **可选完整视频**：若业务需要保留原片，再写入 `videos/{推文状态ID}.mp4`，MD 中写清路径与说明即可（Discord/Threads 外链仍以 X 原文或 CDN 为准时可只保留链接 + 本地封面图）。

### ⚠️ 日期检查逻辑（重要！）

在收集素材前，**必须先检查今天日期**：

1. **取得今天日期**：`date +%Y-%m-%d`（例如：`2026-03-17`）
2. **当日目录**：`data/${TODAY}/`；若不存在则 **创建目录 + 子目录** 后再写 MD。
3. **严禁**：不要把 3 月 17 日收集的素材放进 `data/2026-03-16/`（或往旧日 MD 里追加当日新图）。

### ⚠️ 图片 / 视频处理流程

**线上引用（素材库里备份链接，可与本地并存）**：

1. **图片** → X CDN：`https://pbs.twimg.com/media/图片ID.jpg:large`
2. **视频页** → X 视频链接：`https://x.com/用户ID/状态ID/video/1`
3. **拿不到资源时** → 在 MD 中保留 **X 原文链接** 即可

**本地落盘（与 MD 同日的 `data/YYYY-MM-DD/`）**：

1. **图片推文**：截图或下载后保存为 `data/YYYY-MM-DD/images/{状态ID}.jpg`（扩展名按实际）
2. **视频推文**：
   - **首帧（必选其一）**：`yt-dlp` 下载到临时目录 → `ffmpeg` 截第一帧 → 保存为  
     `data/YYYY-MM-DD/images/{状态ID}_cover.jpg`
   - **整段视频（可选）**：`data/YYYY-MM-DD/videos/{状态ID}.mp4`
3. **在 `YYYY-MM-DD.md` 中**：每条推文下用相对路径嵌入图片/首帧；**原文链接、互动数据** 仍写在文字区块。

```bash
# 示例：视频 → 首帧 → 放入当日 images/
TODAY=$(date +%Y-%m-%d)
STATUS_ID=1234567890123456789
mkdir -p "data/${TODAY}/images"
yt-dlp "https://x.com/user/status/${STATUS_ID}" -o "/tmp/x_%(id)s.%(ext)s"
ffmpeg -y -i "/tmp/x_${STATUS_ID}.mp4" -vframes 1 -q:v 2 \
  "data/${TODAY}/images/${STATUS_ID}_cover.jpg"
```

### 可选：同步到公开仓库（对外发图时用）

若要把图片交给公网 Raw URL 使用，可将当日 `images/` 同步到你维护的仓库（例如），**本地仍以 `data/YYYY-MM-DD/` 为真源**：

```bash
# 按你本机克隆路径调整
cd /path/to/get-x-openclaw-public
mkdir -p "media/${TODAY}"
cp "/path/to/gda-x-openclaw-threads-master/data/${TODAY}/images/"*.jpg "media/${TODAY}/"
git add . && git commit -m "feat: media ${TODAY}" && git push
```

公开仓库示例：`https://github.com/liuyixuan896-source/gda-x-openclaw`  
同步后 MD 里可额外写一行 Raw 链接；**未推送时只用相对路径即可**。

### 初始化当日目录（脚本示例）

```bash
# 技能根目录下执行（含 data/Template.md）
TODAY=$(date +%Y-%m-%d)
BASE="data/${TODAY}"
mkdir -p "${BASE}/images" "${BASE}/videos"

if [ -f "${BASE}/${TODAY}.md" ]; then
    echo "当日 MD 已存在，追加内容"
else
    cp data/Template.md "${BASE}/${TODAY}.md"
    # 可按需在首行把标题里的 YYYY-MM-DD 改成 ${TODAY}
fi
```

模板位置：`data/Template.md`（复制到 `data/YYYY-MM-DD/YYYY-MM-DD.md` 后编辑）

模板格式包含：

- 收集时间、数据来源、关键词
- 热门推文列表（按观看量排序）
- 每条推文：原文链接、原文内容、**本地配图相对路径**（如有）、Threads 改编、互动数据
- 笔记说明

---

## 工作流程

### Step 1: 搜索 X 上的推文

使用浏览器工具打开 X 搜索页面：

```
# OpenClaw 搜索
https://x.com/search?q=openclaw&src=typed_query&f=live

# AI 搜索
https://x.com/search?q=AI&src=typed_query&f=live

# OpenAI 搜索
https://x.com/search?q=OpenAI&src=typed_query&f=live

# Claude 搜索
https://x.com/search?q=Claude+AI&src=typed_query&f=live

# Education Aid Society
```
https://x.com/search?q=Education%20Aid%20Society&src=typeahead_click&f=live



选择「最新」(Latest) 标签页，确保取得最新推文。

### Step 2: 等待页面加载

执行 `browser snapshot` 取得页面内容，确认推文已加载。

### Step 3: 过滤推文

从搜索结果中筛选：

1. **时间过滤**：只选 24 小时内的推文
2. **内容过滤**：
   - 排除涉及中国时政的内容
   - 排除可能引起争议的账号
   - 保留技术讨论、商业应用、产品测评等内容
3. **选择标准**：
   - 有独特观点
   - 具讨论性
   - 适合社群传播
   - 有图片/视频者优先

### Step 4: 提取数据

从每条推文提取：
- 账号名称与 ID
- 推文内容
- 观看次数、转发数、点赞数
- 图片/视频链接
- 推文链接

### Step 5: 制作成 Threads 帖子

将选定的推文改写为**简体中文**的 Threads 格式：

```
🧵 【标题】

推文内容摘要

#OpenClaw #相关标签
```

⚠️ **重要规则：Threads 输出时：**
- ❌ **不要**包含「来自 @账号」
- ❌ **不要**包含原文链接
- ❌ **不要**包含「原文：」或「转载：」
- ✅ 只输出干净的 Threads 内容 + Hashtags
- ✅ 原文信息（链接、账号）只保留在素材库 Markdown 文件中

### Step 6: 输出格式

每条 Threads 应包含：
- 标题序号（如 🧵 【1】）
- 改写后的内容（简体中文）
- 相关 hashtags
- 不超过 500 字

⚠️ **输出时不要包含：**
- 原始作者账号（如 @xxx）
- 原文链接
- 任何来源信息

---

## 📝 OpenClaw 热门推文素材库（2026 年 3 月）

### TOP 10 热门推文

| # | 作者 | 时间 | 内容摘要 | 热度 |
|---|------|------|----------|------|
| 1 | **@ai_muzi** | 3/12 | 开源 OpenClaw 控制中心！可看 Token 消耗、健康状态、Agent 活动 | 28 万观看 |
| 2 | **@iamlukethedev** | 3/14 | 如果 OpenClaw agents 不去健身房，你的设置有问题。于是我给 3D 办公室加了健身房🏋️ | 22 万观看 |
| 3 | **@IndieDevHailey** | 3/8 | 发现一个统计 OpenClaw 赚多少钱的网站！132 个项目、最近 30 天收入 $29 万+ | 18 万观看 |
| 4 | **@iamlukethedev** | 9 小时前 | 给 3D 办公室加了清洁人员🧹，新对话时会自动打扫 | 8,388 观看 |
| 5 | **@GithubProjects** | 3/13 | 127+ 高质量 OpenClaw skills 整合库！AI/DevOps/自动化和更多 | 4.4 万观看 |
| 6 | **@Salad_Chefs** | 广告 | OpenClaw 用 per-token API = $59/天，用 SaladCloud = $3.84/天 | 2.9 万观看 |
| 7 | **@hubz_yuma** | 22 小时前 | (日文) 经历过那些风波后，OpenClaw 做了很多防止用户流失的措施和新功能 | 482 观看 |
| 8 | **@shadowcompute** | 26 秒前 | OpenClaw 帮我规划蜜月旅行！为了省钱它订了灰狗巴士🚌 | 最新🔥 |
| 9 | **@onenewbite** | 14 秒前 | 给 OpenClaw 一个任务，不到 3 分钟就做好了一个短视频！ | 最新 |
| 10 | **@iamlukethedev** | 23 小时前 | OpenClaw 3D 办公室展示视频 | 5,047 观看 |

---

## 📝 Threads 帖子示例

### 🧵 【1】开源你的 OpenClaw 控制中心！

```
@ai_muzi 木子不写代码 开源了一个超实用的 OpenClaw 控制中心！

这个面板可以：
✅ 看哪些任务消耗了多少 Token（百分比）
✅ 看整个 OpenClaw 现在是否健康
✅ 看每个 Agent 现在在干什么，有没有卡住
✅ 直接查看和修改 Agent 的记忆、人设、任务文档
✅ 看定时任务和心跳任务有没有正常在跑

这才是真正的「掌握全局」啊～

[视频](https://x.com/ai_muzi/status/2032032878855348702)

#OpenClaw #开源 #AI #自动化
```

观看：28.5 万 | 转发：308 | 点赞：1,338

---

### 🧵 【2】OpenClaw 也有 3D 健身房了！

```
@iamlukethedev Luke The Dev 又出新花样！

他说：「如果你的 OpenClaw agents 不去健身房，你的设置有问题。」

于是...他给 3D 办公室加了健身房🏋️

当 agents 在学习或开发新技能时，会去训练。
「就连 AI 工程师也需要练腿日！」

这画面太美我不敢看 XDD

[视频](https://x.com/iamlukethedev/status/2032620613869723757)

#OpenClaw #AI #开发者 #有趣
```

观看：22.2 万 | 转发：159 | 点赞：1,742

---

### 🧵 【3】OpenClaw 赚了多少？有人帮你统计！

```
@IndieDevHailey 发现一个超猛网站！

专门统计用 OpenClaw 赚了多少钱👀

📊 目前榜单：
• 132 个 OpenClaw 项目
• 最近 30 天收入：$29 万+
• 最狠的项目：月收入 $51K

而且这些产品其实都很简单：
• OpenClaw 一键部署
• AI Agent Hosting

看完只想说：我也来做一个！

[视频](https://x.com/IndieDevHailey/status/2030545813299142860)

#OpenClaw #创业 #被动收入 #AI
```

观看：18 万 | 转发：453 | 点赞：1,897

---

### 🧵 【4】OpenClaw 127+ Skills 整合库！

```
@GithubProjects 称：

OpenClaw agents 大升级！

这个仓库整理了 127+ 高质量 OpenClaw skills：
✅ AI 工具
✅ DevOps
✅ 网络自动化
✅ 生产力
✅ 前端/后端

不用从头开始建技能，
一个来源，全部插上去就用！

[图片](https://x.com/GithubProjects/status/2032246338759639291)

#OpenClaw #GitHub #DevOps #自动化
```

观看：4.4 万 | 转发：98 | 点赞：705

---

### 🧵 【5】OpenClaw 帮你规划蜜月旅行！

```
@shadowcompute 回复网友说：

OpenClaw 帮我规划了整个蜜月旅行！

为了省钱，它帮我们订了灰狗巴士🚌跨国旅行，
还查询了 YMCA 的空房状况。

这...这也太精打细算了吧 XDD

[推文](https://x.com/shadowcompute/status/2033354525440905528)

#OpenClaw #AI #旅行 #省钱
```

观看：最新 | 转发：0 | 点赞：0

---

### 🧵 【6】3 分钟做好一支短视频！

```
@onenewbite 分享他的体验：

给了 OpenClaw 一个任务：
去他的「闪念笔记」里找一个可以做短视频的 idea，做出来。

结果...
不到 3 分钟就做好了！⏱️

这效率是要逼死谁啦～

[视频](https://x.com/onenewbite/status/2033354574665531797)

#OpenClaw #AI #短视频 #自动化
```

观看：最新 | 转发：0 | 点赞：0

---

### 🧵 【7】OpenClaw 健身房升级 - 清洁人员上线！

```
@iamlukethedev 又来了！

星期天适合打扫办公室～
于是给 OpenClaw 3D 办公室加了清洁人员🧹

当你开始新对话或说「new context」时，
他们就会进来打扫一切。

✅ Fresh context
✅ Clean office
✅ Happy agents

[视频](https://x.com/iamlukethedev/status/2033207456826835068)

#OpenClaw #AI #开发
```

观看：8,388 | 转发：3 | 点赞：192

---

### 🧵 【8】省钱大法：$59 → $3.84/天

```
@Salad_Chefs 帮你算账：

OpenClaw 用 per-token API：
💸 $59/天

用 SaladCloud：
💰 $3.84/天

省下来的都是钱啊～

[网站](https://salad.com/openclaw)

#OpenClaw #省钱 #AI #云端
```

观看：2.9 万 | 转发：2 | 点赞：11

---

## 注意事项

- 确保推文时间在 24 小时内
- 移除任何政治敏感内容
- 保持内容中立客观
- 使用简体中文与大陆常用表达
- 视频链接要分开列举
- 数据（观看/转发/点赞）要标注清楚
- 定期更新素材库（每周一次）
F