# 看见结构

《看见结构：从变形、选择到验证》是一部把必要材料力学、结构设计原理、真实课堂与工程验证连成一条主线的交互式电子书。

在线阅读：<https://syzhaoln-stack.github.io/seeing-structures/>

它不复制既有教材，也不把专家名单当作教学有效性的证据。正文来自作者的课程录音、讲稿、课堂活动和持续修订；规范、原教材与AI输出只作为可追溯的外部证据。

核心公式不以“完整推导墙”作为第一次入口。高负荷主题采用同页可视化推导台：学生先作趋势判断，再按“现象—几何—材料—平衡”逐层揭示，最后进入多变量自由实验。禁用 JavaScript 时仍保留完整的静态推导链。

## 本地预览

```powershell
quarto preview
```

## 构建

```powershell
quarto render
```

生成的网站位于 `_site/`。

## 内容边界

- 不收录或发布原教材全文。
- 两本教材只用于确认知识边界；正文、图解、中文视频导看与总结均重新创作。
- 未获许可时，不重发视频、片段或逐字字幕翻译；正文只保留教学所需的低分辨率关键帧、原创中文导看与原平台时间链接。发布者明确限制再利用的条目不在本站托管截图。
- 页面默认不加载播放器。只有先后变化本身构成证据时，学生才可主动载入不超过 90 秒的原平台片段；公式、图解与推导优先转成静态帧或分步揭示。
- 不提交原始课堂录音、未匿名学生资料或云端文件。
- 交互模型用于教学探索，不替代现行规范、正式设计与注册工程师审查。
- 所有AI辅助内容均须通过公式、单位、趋势和独立算例复核。

除另行说明外，本仓库的原创文字、图解与代码版权归作者所有；第三方视频关键帧、商标与原作仍归各自权利人所有，本书中的教学评论性引用不改变其权利归属。

## 视频证据维护

逐条审看记录在 `research/video-audit-*.json`，浏览器清单由脚本生成，避免手工修改 51 张卡片后产生时间错位：

```powershell
python scripts/build_video_manifest.py
python scripts/capture_video_frames.py --workers 4
python scripts/sync_video_times.py
python scripts/verify_video_evidence.py
python scripts/verify_derivations.py
quarto render
```

新增或替换视频时，先运行 `python scripts/collect_video_metadata.py`更新本地审看缓存，再人工确认来源身份、时长、版权说明和核心时段。缓存不进入仓库，已审定的 JSON 记录才是发布时的唯一数据源。

每条记录必须说明为什么选择“静态足够、逐步图解、需要运动”之一，并提供中文观察标识、原创导看和一个可检查的学习任务。
已发现问题、修复与浏览器回归范围记录在 `research/video-evidence-adversarial-audit.md`。
可视化推导台的力学方向、移动阅读和无脚本降级审查记录在 `research/visual-derivation-adversarial-audit.md`。

