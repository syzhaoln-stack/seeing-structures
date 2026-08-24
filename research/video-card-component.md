# “视频证据卡”组件集成说明

## 设计结论

视频不再作为“整段资源”先呈现，而是先回答三个问题：学生看哪里、为什么看、是否真的需要运动。

- **静态足够**：默认只有带时间点的关键帧、标识和中文解释；完整视频仅作拓展链接，不创建播放器。
- **需要运动**：说明运动不可替代的原因，折叠显示精确的 `start` / `end` 片段；学生主动点击后才创建 iframe，且 `autoplay=0`。
- **关闭折叠片段**：立即移除 iframe，避免视频在不可见状态继续播放。
- **中文讲解**：分成 2–4 个短观察任务，明确标注为原创导看/概括，不冒充逐字字幕。
- **来源边界**：每卡必须写原作者、平台、原链接、关键帧时间与版权说明。

这对应认知负荷中的四个修复：用关键帧消除瞬时信息；把标识贴近画面消除分散注意；按任务分段；不同时呈现完整播放器、长字幕和正文。

## 文件

- `assets/video-evidence.js`：读取 JSON 并生成卡片；只在学生主动点击时创建播放器。
- `assets/video-evidence.css`：结构学“图纸标注”视觉、移动端布局、键盘焦点与 reduced-motion 支持。
- `includes/video-evidence-script.html`：当前所有章节均在一级目录时可复用的脚本入口。
- `assets/video-evidence-auto.js`：扫描旧 `.video-embed iframe`，按视频 ID 自动改造成关键帧/占位图 + 按需播放器。
- `assets/video-evidence-manifest.js`：全书唯一的可选编辑清单；没有条目的旧视频也能先完成懒载入迁移。
- `includes/video-evidence-auto-script.html`：manifest、完整卡组件和自动迁移脚本的加载入口。
- `research/video-evidence-demo.qmd`：两个独立示范，不在书籍目录内。

## 先运行独立示范

```powershell
quarto render research/video-evidence-demo.qmd
```

输出应位于 `_site/research/video-evidence-demo.html`。页面初始 iframe 数必须为 0；展开“看片段”仍为 0；点击“载入片段”后才为 1。

## 在一级目录章节中启用

页面 YAML 增加：

```yaml
format:
  html:
    css:
      - ../assets/styles.css
      - ../assets/video-evidence.css
    include-after-body: ../includes/video-evidence-script.html
```

当前全书已在 `_quarto.yml` 统一启用组件。根目录页和一级目录页都通过 Quarto 的 `quarto:offset` 解析同一套资源路径。

## 最小批量集成：无需手写 51 份 JSON

现有 51 个播放器都已经使用 `.video-embed iframe`，因此可以先做一次全局渐进增强。推荐在 `_quarto.yml` 中全书加载一次：

```yaml
format:
  html:
    css:
      - assets/styles.css
      - assets/video-evidence.css
    include-after-body:
      - assets/after-body.html
      - includes/video-evidence-auto-script.html
```

这里的 include 路径是 Quarto 构建期路径，只写一次；输出页面里的三个脚本 URL 则由 include 读取 `quarto:offset` 动态生成，因此根页和任意一级目录页共用同一入口。

自动脚本会：

1. 从 iframe URL 识别 `youtube:视频ID` 或 `bilibili:BV号`；
2. 自动继承原 iframe 标题、同一卡片里的中文导看和来源文字；
3. 使用逐条审看后保存的低分辨率关键帧；权利说明限制复用时只显示明确占位图；
4. 源页面只写惰性 `data-src`，冷启动不向外站播放器或缩略图发请求；学生点击后才按审定 `start/end` 载入，且强制 `autoplay=0`；
5. 收起时移除 iframe；当前 51 条均已完成 `still / stepper / motion` 编辑判断。

脚本与本地 `poster` 路径都读取 Quarto 自动生成的 `<meta name="quarto:offset">`。因此 manifest 可以统一写 `poster: "assets/stills/xxx.webp"`，根目录页面会解析为 `./assets/...`，一级目录页面会解析为 `../assets/...`，无需为章节深度维护两套路径。`includes/video-evidence-auto-script.html` 也使用同一 offset，依次载入 manifest、完整卡组件和自动升级脚本，避免动态脚本的竞态。

全书 manifest 由两份逐条审看记录生成，不再手工维护 51 份页面 JSON。以下片段只用于说明字段结构：

```js
"youtube:GHMCG4fUUpM": {
  mode: "motion",       // still | motion | stepper；不写则显示“尚待筛选”
  start: 5,
  end: 54,
  title: "斜裂缝发展的路径",
  watch: "跟踪裂缝如何萌生、转斜并贯通。",
  why: "先后顺序是不可替代的证据。"
}
```

紧凑预览可进一步补两个低成本字段，不需要在截图上填写空间坐标：

```js
labels: [
  { label: "支座", text: "反力进入梁的位置" },
  { label: "斜裂缝", text: "跟踪萌生与贯通" }
],
narration: [
  { title: "先定边界", text: "只找支座和加载点。" },
  { title: "再追裂缝", text: "记录起点、方向和贯通顺序。" }
]
```

`labels[]` 常显在画面下方的“看这里”条带；`narration[]` 放进默认收起的“中文讲解”区，建议 2–4 条，必须是本书原创解释而非字幕复制。

若运动本身不是证据，但推导、自由体图或力路需要逐步揭示，使用 `mode: "stepper"`。紧凑卡会显示“逐步图解”，把 `narration[]` 变成可逐步展开的中文步骤；它不提供站内播放器按钮，只在来源栏保留带时间点的原平台链接。

普通条目仍是紧凑预览；加 `variant: "card"` 后，自动脚本会用同一条 manifest 生成完整“视频证据卡”。这样只需精写 17 个主题的主证据，其余 34 个比较/拓展视频保留自动预览，不必复制整份 JSON。

## 最小数据示例

```html
<div data-video-evidence>
<script type="application/json">
{
  "id": "topic-evidence-01",
  "kicker": "F3 · 梁弯曲",
  "title": "先看结论，不先看十分钟",
  "thesis": "一句话说明这段证据解决什么困惑。",
  "still": {
    "src": "../assets/stills/f3-bending-03m20s.webp",
    "alt": "必须描述结构、荷载、变形和标识，而不是写视频截图",
    "time": "03:20",
    "kind": "来源关键帧",
    "caption": "截取自原视频 03:20"
  },
  "annotations": [
    {
      "x": 52,
      "y": 61,
      "label": "中性轴",
      "watch": "找纵向应变等于零的位置。",
      "why": "应力在这里变号。",
      "tone": "verified"
    }
  ],
  "decision": {
    "mode": "motion",
    "title": "必须看 34 秒运动",
    "reason": "本页证据是裂缝发展的先后顺序。"
  },
  "clip": {
    "provider": "youtube",
    "id": "VIDEO_ID",
    "start": 200,
    "end": 234,
    "title": "无障碍播放器标题",
    "purpose": "看萌生 → 发展 → 贯通"
  },
  "segments": [
    {
      "time": "03:20–03:32",
      "title": "先定边界",
      "text": "中文原创概括。",
      "prompt": "暂停后的自我解释问题。"
    }
  ],
  "translationNote": "中文为本书原创导看，不是逐字字幕。",
  "source": {
    "creator": "原作者/机构",
    "publisher": "YouTube",
    "url": "https://www.youtube.com/watch?v=VIDEO_ID&t=200s",
    "linkLabel": "原视频 03:20 起 ↗",
    "boundary": "关键帧经许可或依适用授权使用；视频版权归原作者及平台。"
  }
}
</script>
</div>
```

把 `decision.mode` 改为 `still` 后，卡片不会提供内嵌播放器，`clip` 只用于生成“完整视频仅供拓展”链接。

## 数据字段与编辑判断

| 字段 | 必填 | 用途 |
|---|---:|---|
| `title`, `thesis` | 是 | 先告诉学生要解决的唯一问题 |
| `still.time` | 是 | 关键帧或建议截帧的精确位置 |
| `still.src` | 否 | 本地授权截图；缺省时显示明确占位图 |
| `annotations[]` | 建议 | `x/y` 是百分比坐标，`watch/why` 分开写 |
| `decision.mode` | 是 | 只允许 `still` 或 `motion` |
| `clip.start/end` | 运动卡必填 | 只播放能承载证据的最短片段 |
| `segments[]` | 建议 | 2–4 段，每段只安排一个观察任务 |
| `source.*` | 是 | 作者、平台、原链接与权利边界 |

编辑时优先问：如果暂停在一帧，学生还能完成本页学习目标吗？能，就选 `still`；不能，并且缺失的是变化、因果顺序、空间运动或破坏过程，才选 `motion`。

## 截图与版权工作流

1. 记录原视频标题、作者/机构、URL、关键帧时码和访问日期。
2. 优先使用明确许可的公开视频、机构媒体包或作者授权画面；不从来源不明的二次搬运视频截帧。
3. 截取只覆盖当前教学主张的最小画面，并用本书标识指出证据；不要用大量连续截图替代原视频。
4. 不复制完整字幕。中文讲解写成观察任务、概念解释和自我提问，并注明“原创导看/概括”。
5. 若画面许可不清楚，保留占位图和原平台时间链接，待取得授权后再替换 `still.src`。

## 后续批量接入建议

不要一次给 51 段视频全部截图。先为每个主题选一个“主证据”，形成 17 张主卡；其余视频进入折叠的“比较证据/拓展证据”。每张主卡应通过这五项验收：

1. 未点操作前没有 iframe；
2. 学生 10 秒内能复述“看哪里、为什么”；
3. 运动片段通常不超过 90 秒，超出需写出不可再切的理由；
4. 中文解释不是字幕复写；
5. 来源、时间点、作者和版权边界完整。
