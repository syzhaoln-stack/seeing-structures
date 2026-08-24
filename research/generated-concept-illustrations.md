# 概念插画生成记录

这两张图只承担“进入一个心智模型”的任务，不是工程照片、试验记录或设计证据。图中的技术箭头、尺寸、公式、应力分布和概率边界均不作为结论使用；这些内容在网页中由可核查的 SVG/HTML 单独绘制。

## `student-derivation-workbench.webp`

- 工具：OpenAI 内置 ImageGen
- 用途：前言中的学生中心学习路径
- 原始提示词：

> Use case: scientific-educational illustration; placement: book preface for student-centered visual derivation. Show a student's hands actively loading a small foam beam on two supports at a tabletop, with a real ruler and simple dial gauge. Around the same physical beam, show three subtle translucent conceptual overlays in a clear left-to-right learning sequence: first the visible downward deformation, second a clean cut/free-body idea at one section, third a notebook-style evidence check comparing prediction and measurement. The student is the agent doing the investigation; no lecturer, no authority podium, no robot. Editorial laboratory illustration, tactile paper-and-foam materials, white warm background with faint engineering grid, graphite outlines, compression blue #2457d6, tension red #d83b3b, sparse amber and verified green accents. Calm, humane, highly legible, generous whitespace, landscape 3:2. No text, no letters, no numbers, no equations, no labels, no UI panels, no logos, no watermark, no photorealistic claims, no sci-fi glow. Mechanically plausible supports and deflection.

## `beam-four-lenses.webp`

- 工具：OpenAI 内置 ImageGen
- 用途：F0 中“同一对象，不同观察层次”的心智锚点
- 原始提示词：

> Use case: scientific-educational illustration; placement: interactive structural engineering book homepage mental-model figure. Create one continuous wide illustration of the SAME simply supported reinforced-concrete beam shown in four aligned snapshots, like a calm visual story from left to right: (1) a downward point load and two supports, (2) the beam visibly but gently deflecting, (3) a clean cutaway showing top fibers compressed in blue and bottom fibers stretched in red, (4) a few plausible vertical flexural cracks rising from the bottom tension face while the beam still stands. White concrete/paper background with a very faint engineering grid, graphite structural outlines, compression blue #2457d6, tension red #d83b3b, sparse verified green accents. Editorial scientific illustration, tactile cut-paper and concrete texture, precise geometry, generous whitespace, student-friendly, not childish, no people, no text, no letters, no numbers, no formulas, no labels, no legend, no logo, no watermark, no fake photorealism, no dramatic collapse, no extra beams. Landscape 2:1.

对抗性审查发现初版第三格出现竖向红蓝小箭头，可能被误读为弯曲正应力方向，因此用同一工具做最小编辑，删除箭头、保留压拉色带。编辑提示词：

> Edit the provided four-panel educational beam illustration with the smallest possible change. In the THIRD panel only (the panel with the blue compression band at the top and red tension band at the bottom), REMOVE all small internal blue and red vertical arrows. Keep the blue top color band, red bottom color band, dashed neutral line, beam geometry, support geometry, and the large black downward load arrow exactly as they are. Do not alter any other panel. Add nothing new. No text, letters, numbers, formulas, labels, icons, logos, watermark, or internal arrows.

生成后统一转换为 WebP，并在页面图注中标明“概念隐喻 · AI 生成，不是工程证据”。
