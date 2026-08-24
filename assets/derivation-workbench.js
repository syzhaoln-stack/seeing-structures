/*
 * Visual derivation workbench
 *
 * Progressive enhancement for:
 *   <div class="derive-mount" data-derivation="f2-qvm">fallback copy…</div>
 *
 * The seven diagrams below are deterministic, local SVGs.  Chapter content is
 * selected from a fixed allow-list; no markup or code is evaluated from data
 * attributes.
 */
(function () {
  "use strict";

  const COLORS = {
    ink: "#182329",
    muted: "#5b6970",
    line: "#cbd5d8",
    paper: "#ffffff",
    concrete: "#f4f7f7",
    compression: "#2457d6",
    tension: "#d83b3b",
    load: "#945800",
    verified: "#087d65"
  };

  const TOPICS = {
    "f2-qvm": {
      eyebrow: "F2 · 从荷载走到内力图",
      title: "别先背图形：切一小段梁，图形会自己长出来",
      prompt: "在一段向下的均布荷载 q 下，剪力图 V(x) 最可能怎样变化？",
      options: ["沿 x 线性下降", "保持不变", "沿 x 突然跳跃", "还不确定"],
      correct: 0,
      prediction: "因为一小段 Δx 上新增了向下的力 qΔx，右端剪力必须比左端少同样多。",
      steps: [
        {
          verb: "切一段",
          question: "如果整根梁太复杂，最小的可观察对象是什么？",
          plain: "只切下长度为 Δx 的一小段。先把两端的剪力、弯矩和段上的荷载画全，不急着求数值。",
          relation: "小段上的新增荷载 = qΔx",
          cue: "看橙色箭头：Δx 越短，新增荷载越小。"
        },
        {
          verb: "平竖力",
          question: "为什么剪力的斜率由荷载决定？",
          plain: "左端剪力向上，右端剪力与分布荷载向下。竖向力要平衡，右端剪力只能减少 qΔx。",
          relation: "ΔV = −qΔx  →  dV/dx = −q",
          cue: "“负号”不是口诀，它只表示向下荷载让 V 往下走。"
        },
        {
          verb: "平转动",
          question: "剪力又怎样改变弯矩？",
          plain: "对小段取矩，剪力在长度 Δx 上产生转动效应。忽略 Δx² 的更小项，弯矩增量就是 VΔx。",
          relation: "ΔM ≈ VΔx  →  dM/dx = V",
          cue: "V 是 M 图的斜率：V 为正，M 图就向上爬。"
        },
        {
          verb: "读三张图",
          question: "不用积分，能先判断 q、V、M 的形状吗？",
          plain: "均布 q 是常量，所以 V 是斜直线；V 再累积一次，M 就是抛物线。集中力会让 V 跳跃，集中力矩会让 M 跳跃。",
          relation: "q  —斜率→  V  —斜率→  M",
          cue: "先看“谁是谁的斜率”，再决定要不要计算。"
        }
      ],
      takeaway: "q、V、M 不是三套孤立公式，而是同一段梁的“荷载—平衡—累积”记录。",
      transfer: "如果 q(x) 是一条斜线，你能只凭斜率关系判断 V、M 分别是几次曲线吗？",
      boundary: "采用同一套正负号约定，并在 Δx→0 时忽略二阶小量。若教材的剪力正号相反，图的方向会变，平衡关系本身不变。",
      visual: drawQVM
    },

    "f3-flexure": {
      eyebrow: "F3 · 弯曲正应力",
      title: "σ = −My/I 不是从天上掉下来的：它经过四道门",
      prompt: "均质梁纯弯时，离中性轴越远的纤维，正应变怎样变化？",
      options: ["按距离线性增大", "处处相同", "越远反而越小", "还不确定"],
      correct: 0,
      prediction: "平截面保持平面时，各纤维转过同一角度；离中性轴越远，长度差就越大。",
      steps: [
        {
          verb: "看几何",
          question: "弯曲后，原来的直截面发生了什么？",
          plain: "在细长梁、小变形条件下，截面弯后仍近似为平面，并保持垂直于中性层。几何关系先给出线性应变。",
          relation: "ε(y) = −κy",
          cue: "中性轴 y=0，所以那里纵向应变为 0。"
        },
        {
          verb: "接材料",
          question: "应变怎样变成看得见的应力？",
          plain: "在线弹性阶段，同一种材料满足 σ=Eε。于是线性的应变图，变成同样线性的应力图。",
          relation: "σ(y) = Eε(y) = −Eκy",
          cue: "蓝色实线标压缩，红色虚线标拉伸；颜色之外还有文字和线型。"
        },
        {
          verb: "平轴力",
          question: "中性轴为什么穿过形心？",
          plain: "纯弯没有合轴力，截面上的拉力与压力必须抵消。对均质、等 E 截面，这让中性轴通过形心。",
          relation: "N = ∫A σ dA = 0",
          cue: "这一步把“应力为零的位置”从猜测变成平衡结果。"
        },
        {
          verb: "平弯矩",
          question: "截面怎样用这些应力抵抗外弯矩？",
          plain: "每一小块应力乘面积得到小力，再乘到中性轴的距离 y；把全截面加起来，等于弯矩 M。",
          relation: "M = −∫A σy dA  →  σ(y) = −My/I",
          cue: "I=∫A y²dA 记录材料离中性轴有多远。"
        }
      ],
      takeaway: "弯曲公式的骨架是：平截面几何 → 材料关系 → 轴力平衡 → 弯矩平衡。",
      transfer: "如果截面由两种弹性模量不同的材料组成，哪一道门会先需要修改？",
      boundary: "结论针对细长梁、小变形、线弹性、平截面假定。非均质截面、深梁、开裂混凝土或塑性阶段不能直接照搬。",
      visual: drawFlexure
    },

    "f4-curvature": {
      eyebrow: "F4 · 从弯矩到挠度",
      title: "“积分两次”太抽象：把它看成两次沿梁累积",
      prompt: "梁上弯矩最大的截面，一定也是挠度最大的截面吗？",
      options: ["不一定", "一定", "只要是简支梁就一定", "还不确定"],
      correct: 0,
      prediction: "弯矩先决定曲率，曲率累积成转角，转角再累积成位移；最大值的位置不必重合。",
      steps: [
        {
          verb: "求弯矩",
          question: "变形链的输入从哪里来？",
          plain: "先用支座和荷载做平衡，得到沿梁变化的 M(x)。它是后面所有变形信息的起点。",
          relation: "荷载 + 支座  →  M(x)",
          cue: "这一层只谈受力，还没有用材料刚度。"
        },
        {
          verb: "变曲率",
          question: "同样的弯矩，为什么有的梁弯得更多？",
          plain: "弯矩除以抗弯刚度 EI 才是曲率。E 大或 I 大，曲率都更小。",
          relation: "κ(x) = M(x) / EI",
          cue: "M 是“想弯多少”，EI 是“拒绝弯曲的能力”。"
        },
        {
          verb: "积转角",
          question: "曲率怎样改变梁的朝向？",
          plain: "曲率是转角沿 x 的变化率。沿梁走一小段，把 κΔx 累加，就得到转角的改变。",
          relation: "dθ/dx = κ ； Δθ = ∫ κ dx",
          cue: "图中的小切线一段段转动，这就是第一次累积。"
        },
        {
          verb: "积位移",
          question: "转角怎样变成我们量到的挠度？",
          plain: "转角近似为挠度曲线的斜率。再沿梁累加 θΔx，配合支座位移条件，才得到唯一的 v(x)。",
          relation: "dv/dx ≈ θ ； v = ∬ M/EI · dx² + 边界条件",
          cue: "积分给形状，支座条件负责把形状放到正确位置。"
        }
      ],
      takeaway: "M/EI → κ → θ → v 是两次“沿路累加”，不是一次公式魔法。",
      transfer: "若梁的右半段 EI 加倍，而 M(x) 不变，曲率图和挠度形状会先从哪里改变？",
      boundary: "使用 Euler–Bernoulli 小挠度梁模型，忽略剪切变形。深梁、夹层梁或大转角问题需换模型。",
      visual: drawCurvature
    },

    "m1-reliability": {
      eyebrow: "M1 · 可靠度",
      title: "把抽象概率放回一张 S–R 地图",
      prompt: "一个样本点落在 R<S 的区域，最直接表示什么？",
      options: ["作用效应超过抗力", "抗力还有富余", "两者都等于均值", "还不确定"],
      correct: 0,
      prediction: "每个点是一种可能状态；R<S 就是这次状态里需求超过能力。",
      steps: [
        {
          verb: "放一个点",
          question: "二维图上的一个点究竟是什么？",
          plain: "横坐标是作用效应 S，纵坐标是抗力 R。一次材料、尺寸和荷载的共同实现，对应一个状态点 (S,R)。",
          relation: "状态函数 g = R − S",
          cue: "先理解一个点，再讨论一整片概率云。"
        },
        {
          verb: "画边界",
          question: "安全和失效在哪里分开？",
          plain: "直线 R=S 上，能力刚好等于需求，即 g=0。线上方 g>0，线下方 g<0。",
          relation: "g>0 安全；g=0 极限；g<0 失效",
          cue: "边界用实线和文字标出，不只依赖颜色。"
        },
        {
          verb: "看概率云",
          question: "失效概率为什么是一片面积，不是一个距离？",
          plain: "不确定性形成联合概率密度。落在 R≤S 半平面的全部可能性加起来，才是失效概率。二维正态只是可选模型，不是自然定律。",
          relation: "Pf = ∬(R≤S) fS,R(s,r) ds dr",
          cue: "斜线阴影明确标出积分区域“失效 R≤S”。"
        },
        {
          verb: "投影到 g",
          question: "β 怎样把二维问题压成一个可读距离？",
          plain: "若 (S,R) 服从联合正态，线性组合 g=R−S 也为正态。均值离 g=0 有多少个标准差，就是可靠指标 β。",
          relation: "β = μg/σg；σg² = σR²+σS²−2ρσRσS；Pf=Φ(−β)",
          cue: "β 是标准化距离；离开联合正态/线性极限状态后需更一般的方法。"
        }
      ],
      takeaway: "可靠度不是给材料贴一个“安全概率”，而是计算随机状态落入失效域的可能性。",
      transfer: "如果 R 与 S 正相关（ρ>0），在其他参数不变时，σg 会怎样变化？β 又可能怎样变化？",
      boundary: "β=μg/σg 与 Pf=Φ(−β) 的直接对应，依赖 g 为正态；这里由“联合正态 + 线性 g=R−S”保证。任意分布不能直接套用。",
      visual: drawReliability
    },

    "m3-rc-bending": {
      eyebrow: "M3 · 钢筋混凝土受弯",
      title: "一块混凝土和一排钢筋，怎样组成一个内力偶？",
      prompt: "适筋矩形梁达到受弯极限状态时，受拉钢筋通常应当怎样？",
      options: ["先达到屈服", "始终保持零应力", "先被压碎", "还不确定"],
      correct: 0,
      prediction: "适筋设计让钢筋先屈服、裂缝和变形先发出警告，再由受压混凝土控制最终极限。",
      steps: [
        {
          verb: "看应变",
          question: "开裂以后，截面变形还能怎样描述？",
          plain: "采用平截面假定，应变沿高度仍近似线性。顶缘受压，往下到中性轴为零，再到钢筋位置成为拉应变。",
          relation: "εs / εcu = (h0−c) / c",
          cue: "c 是实际中性轴深度；设计等效压区深度常另记为 x。"
        },
        {
          verb: "换成应力",
          question: "复杂的混凝土压应力怎样便于计算？",
          plain: "把实际非线性压应力图，换成合力和作用点相同的等效矩形块。它不是说真实应力真的处处相等。",
          relation: "C = α₁fc b x",
          cue: "蓝色实线块写着“等效压区”；钢筋拉力用红色虚线箭头表示。"
        },
        {
          verb: "平合力",
          question: "为什么先求压区深度 x？",
          plain: "纯弯截面没有合轴力，所以混凝土压力 C 必须等于钢筋拉力 T。适筋且钢筋屈服时，T=fyAs。",
          relation: "C = T  →  α₁fc b x = fyAs",
          cue: "这一步决定两股内力各有多大。"
        },
        {
          verb: "乘力臂",
          question: "相等的拉力和压力怎样抵抗弯矩？",
          plain: "C 与 T 大小相等、方向相反、相隔力臂 z，组成内力偶。弯矩承载力就是其中一个力乘力臂。",
          relation: "z = h0−x/2；Mu = Tz = Cz",
          cue: "承载力来自“力 × 距离”，不是来自一串孤立系数。"
        }
      ],
      takeaway: "钢筋混凝土受弯计算的主线是：应变协调 → 材料应力 → C=T → Mu=Cz。",
      transfer: "若只增加受拉钢筋 As，C、x、z 会同时怎样变化？为什么承载力不会永远按 As 线性增长？",
      boundary: "针对单筋矩形截面、正截面受弯、平截面假定及适筋屈服情形；常见规范模型中 x=β₁c，α₁、β₁ 与限值应按采用的设计规范定义。超筋、双筋或 T 形截面需改写。",
      visual: drawRCBending
    },

    "m5-eccentric": {
      eyebrow: "M5 · 偏心受压",
      title: "偏心力并不是新物种：把它搬到形心看看",
      prompt: "轴力 N 不变，把偏心距 e 加倍，等效弯矩会怎样？",
      options: ["加倍", "保持不变", "减半", "还不确定"],
      correct: 0,
      prediction: "把力平移到形心时，必须补上力偶 M=Ne；同一个 N 下，e 直接控制 M。",
      steps: [
        {
          verb: "找偏心",
          question: "荷载线没有穿过形心，缺了什么信息？",
          plain: "先标出截面形心 O 和荷载作用线，两条线之间的垂直距离就是偏心距 e。",
          relation: "e = 荷载线到形心线的距离",
          cue: "偏心是几何距离，不是材料参数。"
        },
        {
          verb: "搬到形心",
          question: "力可以直接平移而什么都不补吗？",
          plain: "不能。把 N 平移到形心，必须同时加一个力偶 Ne，新的力系才与原偏心力完全等效。",
          relation: "偏心 N  ≡  形心轴力 N + 弯矩 M=Ne",
          cue: "图中橙色轴力和圆弧力偶同时出现。"
        },
        {
          verb: "叠应力",
          question: "截面一边为什么会更压，甚至另一边受拉？",
          plain: "形心轴力给出均匀压应力，弯矩给出线性应力梯度。两张应力图逐点相加，得到偏压分布。",
          relation: "σ(y) = −N/A − My/I；极纤维为 −N/A ± M/W",
          cue: "实线标压缩、虚线标可能的拉伸；零应力线会随 e 移动。"
        },
        {
          verb: "落到 N–M 图",
          question: "为什么设计要同时看 N 和 M？",
          plain: "同一个截面有一条 N–M 承载边界。荷载状态是点 (N,Ne)；增大 e 会把点沿同一 N 水平向更大 M 推动。",
          relation: "荷载点 (N,M) = (N,Ne)；再与承载边界比较",
          cue: "M=Ne 只定位需求点，不等于已经证明安全。"
        }
      ],
      takeaway: "偏心受力 = 轴力 + 弯矩；先等效、再叠加、最后在 N–M 平面比较需求与能力。",
      transfer: "若 N 同时减半、e 加倍，M 是否改变？截面应力又为何仍可能改变？",
      boundary: "线弹性应力叠加用于理解工作阶段；钢筋混凝土极限承载力应使用非线性材料关系和规范 N–M 相互作用曲线。",
      visual: drawEccentric
    },

    "m6-prestress": {
      eyebrow: "M6 · 预应力",
      title: "预应力不是“更强的钢筋”：它是在荷载到来前先存一张应力图",
      prompt: "预应力筋位于截面形心下方时，除了均匀压力 P/A，还会带来什么？",
      options: ["偏心弯矩 Pe", "只有剪力", "没有任何附加效应", "还不确定"],
      correct: 0,
      prediction: "钢束的作用线偏离形心，等效到形心后必然同时出现轴力 P 和反向弯矩 Pe。",
      steps: [
        {
          verb: "沿钢束看",
          question: "预压力真正沿哪条路线进入截面？",
          plain: "先画形心轴，再画钢束作用线。钢束在形心下方 e 处施加压力 P，这个位置决定了它不只是轴压。",
          relation: "e>0：钢束位于形心下方",
          cue: "先看力从哪里经过，再谈应力大小。"
        },
        {
          verb: "等效到形心",
          question: "偏心预压力可以拆成哪两件事？",
          plain: "把 P 搬到形心，要补上弯矩 Pe。对常见下偏钢束，这个弯矩与使用阶段的下挠弯矩方向相反。",
          relation: "偏心 P  ≡  形心压力 P + 预弯矩 Mp=Pe",
          cue: "轴压负责整体压缩，Pe 负责上下缘压应力不同。"
        },
        {
          verb: "存初始应力",
          question: "荷载还没来，截面上已经有什么？",
          plain: "P/A 形成均匀压应力；Pe/I 形成线性应力。二者叠加后，靠近下方钢束的一侧通常压得更多。",
          relation: "σp(y) = −P/A + (Pe/I)y（y 向上，e 向下为正）",
          cue: "图中的均匀块与三角块分开画，再显示相加结果。"
        },
        {
          verb: "再叠外荷载",
          question: "预应力为什么能推迟受拉开裂？",
          plain: "使用荷载的正弯矩会让下缘趋向受拉；它与预先储存的下缘压应力逐点相加。不是消灭荷载，而是改变到达拉应力限值的路径。",
          relation: "σ(y)=−P/A+(Pe/I)y−(Mext/I)y",
          cue: "最终应力必须按阶段计算，并计入预应力损失。"
        }
      ],
      takeaway: "预应力的核心是“先建立一张有利应力图”，再与自重和使用荷载的应力图叠加。",
      transfer: "保持 P 不变，把钢束向下移动，会怎样改变上、下缘初始应力？什么限制了 e 不能无限增大？",
      boundary: "图示采用直线偏心钢束、线弹性截面与给定符号约定。实际设计还需分张拉、传力、施工、使用等阶段，并考虑损失、裂缝与局部锚固效应。",
      visual: drawPrestress
    }
  };

  let mountCount = 0;

  function esc(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function markerDefs(uid) {
    return [
      '<defs>',
      '<marker id="dw-arrow-' + uid + '" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0 0L10 5L0 10Z" fill="context-stroke"/></marker>',
      '<pattern id="dw-hatch-' + uid + '" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><line x1="0" y1="0" x2="0" y2="10" stroke="' + COLORS.tension + '" stroke-width="2" opacity=".34"/></pattern>',
      '<pattern id="dw-grid-' + uid + '" width="18" height="18" patternUnits="userSpaceOnUse"><path d="M18 0H0V18" fill="none" stroke="' + COLORS.line + '" stroke-width="1"/></pattern>',
      '</defs>'
    ].join("");
  }

  function svgShell(uid, label, body) {
    return '<svg class="derive-svg" viewBox="0 0 640 360" role="img" aria-label="' + esc(label) + '" focusable="false">' +
      markerDefs(uid) +
      '<rect x="1" y="1" width="638" height="358" rx="12" fill="' + COLORS.paper + '" stroke="' + COLORS.line + '"/>' +
      body + '</svg>';
  }

  function layer(at, body, className) {
    return '<g class="derive-layer ' + (className || "") + '" data-at="' + at + '">' + body + '</g>';
  }

  function textSvg(x, y, value, className, anchor) {
    return '<text x="' + x + '" y="' + y + '" class="' + (className || "dw-label") + '" text-anchor="' + (anchor || "start") + '">' + esc(value) + '</text>';
  }

  function line(x1, y1, x2, y2, cls, uid, arrow) {
    return '<line x1="' + x1 + '" y1="' + y1 + '" x2="' + x2 + '" y2="' + y2 + '" class="' + (cls || "dw-line") + '"' + (arrow ? ' marker-end="url(#dw-arrow-' + uid + ')"' : '') + '/>';
  }

  function drawQVM(uid) {
    let body = "";
    body += layer(0,
      textSvg(28, 32, "自由体：长度 Δx", "dw-title") +
      '<rect x="118" y="92" width="386" height="48" rx="4" fill="#eef2f3" stroke="' + COLORS.ink + '" stroke-width="2"/>' +
      line(118, 80, 118, 151, "dw-cut", uid) + line(504, 80, 504, 151, "dw-cut", uid) +
      textSvg(118, 72, "x", "dw-label", "middle") + textSvg(504, 72, "x+Δx", "dw-label", "middle") +
      line(136, 58, 136, 91, "dw-load", uid, true) + line(224, 58, 224, 91, "dw-load", uid, true) +
      line(312, 58, 312, 91, "dw-load", uid, true) + line(400, 58, 400, 91, "dw-load", uid, true) + line(486, 58, 486, 91, "dw-load", uid, true) +
      textSvg(312, 47, "均布荷载 q", "dw-load-label", "middle") +
      line(118, 164, 504, 164, "dw-dimension", uid) + line(118, 158, 118, 170, "dw-dimension", uid) + line(504, 158, 504, 170, "dw-dimension", uid) +
      textSvg(311, 181, "Δx", "dw-label", "middle")
    );
    body += layer(1,
      line(96, 138, 96, 94, "dw-verified", uid, true) + textSvg(88, 118, "V", "dw-verified-label", "end") +
      line(526, 94, 526, 142, "dw-tension-dash", uid, true) + textSvg(536, 120, "V+ΔV", "dw-tension-label") +
      '<path d="M271 190H351" class="dw-bracket"/>' + textSvg(311, 207, "合力 qΔx ↓", "dw-load-label", "middle")
    );
    body += layer(2,
      '<path d="M91 145 A36 36 0 0 0 122 174" class="dw-moment" marker-end="url(#dw-arrow-' + uid + ')"/>' +
      '<path d="M531 145 A36 36 0 0 1 500 174" class="dw-moment dw-moment-alt" marker-end="url(#dw-arrow-' + uid + ')"/>' +
      textSvg(74, 178, "M", "dw-label") + textSvg(540, 178, "M+ΔM", "dw-label")
    );
    body += layer(3,
      textSvg(30, 241, "同一段梁的三张记录", "dw-title") +
      textSvg(72, 278, "q", "dw-load-label", "middle") + line(102, 290, 240, 290, "dw-axis", uid) + line(102, 290, 102, 252, "dw-axis", uid) +
      '<path d="M104 290V258H232V290Z" class="dw-load-graph"/>' +
      textSvg(309, 278, "V", "dw-verified-label", "middle") + line(260, 290, 398, 290, "dw-axis", uid) + line(260, 290, 260, 252, "dw-axis", uid) +
      '<path d="M264 257L392 287" class="dw-verified-graph"/>' +
      textSvg(508, 278, "M", "dw-compression-label", "middle") + line(420, 290, 602, 290, "dw-axis", uid) + line(420, 290, 420, 252, "dw-axis", uid) +
      '<path d="M424 289 Q512 230 596 289" class="dw-compression-graph"/>' +
      textSvg(250, 329, "斜率 −q", "dw-small", "middle") + textSvg(410, 329, "斜率 V", "dw-small", "middle")
    );
    return svgShell(uid, "梁微段的荷载、剪力、弯矩和平衡关系逐步显现", body);
  }

  function drawFlexure(uid) {
    let body = "";
    body += layer(0,
      textSvg(28, 32, "平截面几何", "dw-title") +
      '<path d="M54 121 Q214 82 374 121L374 217Q214 178 54 217Z" fill="url(#dw-grid-' + uid + ')" stroke="' + COLORS.ink + '" stroke-width="2"/>' +
      '<path d="M54 169 Q214 130 374 169" class="dw-neutral"/>' +
      '<path d="M116 104L116 199M190 91L190 186M266 91L266 186M340 104L340 199" class="dw-section-lines"/>' +
      textSvg(204, 235, "弯后截面仍保持平面", "dw-label", "middle") +
      textSvg(465, 44, "截面高度 y", "dw-title") +
      '<rect x="438" y="62" width="86" height="214" fill="#f8fafb" stroke="' + COLORS.ink + '" stroke-width="2"/>' +
      line(420, 169, 544, 169, "dw-neutral", uid) + textSvg(552, 174, "中性轴 y=0", "dw-small")
    );
    body += layer(1,
      '<path d="M544 65L596 65L544 169Z" class="dw-compression-fill"/>' +
      '<path d="M544 169L596 273L544 273Z" class="dw-tension-fill"/>' +
      line(544, 62, 544, 276, "dw-axis", uid) +
      textSvg(628, 92, "压应变 ε<0", "dw-compression-label", "end") + textSvg(628, 253, "拉应变 ε>0", "dw-tension-label", "end") +
      textSvg(569, 304, "ε = −κy", "dw-formula", "middle")
    );
    body += layer(2,
      '<path d="M438 65L401 65L438 169Z" class="dw-compression-outline"/>' +
      '<path d="M438 169L401 273L438 273Z" class="dw-tension-outline"/>' +
      textSvg(391, 93, "压应力", "dw-compression-label", "end") + textSvg(391, 253, "拉应力", "dw-tension-label", "end") +
      textSvg(439, 322, "σ = Eε", "dw-formula", "middle")
    );
    body += layer(3,
      line(438, 112, 390, 112, "dw-compression", uid, true) + textSvg(382, 108, "C", "dw-compression-label", "end") +
      line(390, 226, 438, 226, "dw-tension-dash", uid, true) + textSvg(382, 231, "T", "dw-tension-label", "end") +
      '<path d="M371 112H358V226H371" class="dw-bracket"/>' + textSvg(350, 174, "力臂", "dw-small", "end") +
      '<rect x="35" y="276" width="310" height="55" rx="8" class="dw-result-box"/>' +
      textSvg(190, 299, "N=∫σdA=0", "dw-formula", "middle") + textSvg(190, 320, "M=−∫σy dA", "dw-formula", "middle")
    );
    return svgShell(uid, "弯曲时平截面、线性应变、应力和内力合力逐步显现", body);
  }

  function graphAxes(uid, x, y, w, h, label) {
    return line(x, y + h, x + w, y + h, "dw-axis", uid) + line(x, y + h, x, y, "dw-axis", uid) + textSvg(x - 15, y + 16, label, "dw-formula", "middle");
  }

  function drawCurvature(uid) {
    let body = "";
    body += layer(0,
      textSvg(28, 31, "沿梁累积，而不是公式跳跃", "dw-title") +
      graphAxes(uid, 82, 56, 496, 52, "M") +
      '<path d="M88 106 Q330 39 572 106" class="dw-load-graph"/>' +
      textSvg(590, 107, "x", "dw-small") + textSvg(330, 69, "先由平衡得到 M(x)", "dw-load-label", "middle")
    );
    body += layer(1,
      graphAxes(uid, 82, 128, 496, 52, "κ") +
      '<path d="M88 178 Q330 119 572 178" class="dw-compression-graph"/>' +
      textSvg(330, 141, "除以 EI", "dw-compression-label", "middle") +
      line(606, 106, 606, 142, "dw-compression", uid, true)
    );
    body += layer(2,
      graphAxes(uid, 82, 200, 496, 52, "θ") +
      line(88, 226, 572, 226, "dw-guide", uid) + textSvg(580, 230, "θ=0", "dw-small") +
      '<path d="M88 244 C198 242 264 235 330 226S465 210 572 208" class="dw-verified-graph"/>' +
      textSvg(330, 214, "累积 κΔx，θ 单调改变", "dw-verified-label", "middle") +
      line(606, 178, 606, 214, "dw-verified", uid, true) +
      '<g class="dw-tangents"><line x1="155" y1="239" x2="200" y2="225"/><line x1="307" y1="214" x2="353" y2="214"/><line x1="460" y1="225" x2="505" y2="239"/></g>'
    );
    body += layer(3,
      graphAxes(uid, 82, 272, 496, 52, "v") +
      '<path d="M88 322 Q330 251 572 322" class="dw-tension-graph"/>' +
      '<path d="M88 312V330M572 312V330" class="dw-support"/>' +
      textSvg(330, 284, "再累积 θΔx，并满足支座 v=0", "dw-tension-label", "middle") +
      line(606, 250, 606, 286, "dw-tension-dash", uid, true)
    );
    return svgShell(uid, "四层对齐图依次显示弯矩、曲率、转角和挠度的累积关系", body);
  }

  function drawReliability(uid) {
    let body = "";
    const axes = line(68, 287, 414, 287, "dw-axis", uid, true) + line(68, 287, 68, 52, "dw-axis", uid, true) +
      textSvg(425, 292, "作用 S", "dw-label") + textSvg(80, 72, "抗力 R", "dw-label");
    body += layer(0,
      textSvg(28, 31, "每个点 = 一次可能状态", "dw-title") + axes +
      '<circle cx="235" cy="192" r="7" class="dw-state-point"/>' +
      line(235, 192, 235, 287, "dw-guide", uid) + line(68, 192, 235, 192, "dw-guide", uid) +
      textSvg(247, 186, "(S,R)", "dw-formula") + textSvg(235, 310, "S", "dw-small", "middle") + textSvg(54, 197, "R", "dw-small", "middle")
    );
    body += layer(1,
      '<path d="M68 287L414 52" class="dw-boundary"/>' + textSvg(334, 94, "R=S · g=0", "dw-label") +
      textSvg(130, 104, "安全 g>0", "dw-verified-label") + textSvg(316, 254, "失效 g<0", "dw-tension-label")
    );
    body += layer(2,
      '<path d="M68 287H414V52Z" fill="url(#dw-hatch-' + uid + ')" stroke="none"/>' +
      '<ellipse cx="250" cy="158" rx="105" ry="52" transform="rotate(-22 250 158)" class="dw-density dw-density-1"/>' +
      '<ellipse cx="250" cy="158" rx="72" ry="35" transform="rotate(-22 250 158)" class="dw-density dw-density-2"/>' +
      '<ellipse cx="250" cy="158" rx="38" ry="18" transform="rotate(-22 250 158)" class="dw-density dw-density-3"/>' +
      textSvg(299, 275, "积分域：R≤S", "dw-tension-label", "middle")
    );
    body += layer(3,
      line(247, 160, 331, 217, "dw-verified", uid, true) + textSvg(304, 177, "投影到 g=R−S", "dw-verified-label") +
      line(455, 287, 608, 287, "dw-axis", uid, true) + line(505, 292, 505, 250, "dw-boundary", uid) +
      '<path d="M456 287 C490 286 505 283 520 267 C538 247 560 222 608 287" class="dw-g-density"/>' +
      textSvg(505, 310, "g=0", "dw-small", "middle") + textSvg(565, 310, "μg", "dw-small", "middle") +
      line(505, 240, 565, 240, "dw-verified", uid, true) + textSvg(535, 232, "β·σg", "dw-verified-label", "middle") +
      textSvg(532, 337, "联合正态 + 线性 g", "dw-small", "middle")
    );
    return svgShell(uid, "S-R 状态点、极限边界、失效半平面、联合密度和可靠指标投影逐步显现", body);
  }

  function drawRCBending(uid) {
    let body = "";
    body += layer(0,
      textSvg(28, 31, "单筋矩形截面：从变形到内力偶", "dw-title") +
      '<rect x="155" y="58" width="170" height="244" fill="#f7f9fa" stroke="' + COLORS.ink + '" stroke-width="2"/>' +
      '<circle cx="194" cy="273" r="8" class="dw-rebar"/><circle cx="240" cy="273" r="8" class="dw-rebar"/><circle cx="286" cy="273" r="8" class="dw-rebar"/>' +
      line(140, 143, 340, 143, "dw-neutral", uid) + textSvg(346, 148, "中性轴 c", "dw-small") +
      '<path d="M126 58L90 58L126 143Z" class="dw-compression-outline"/><path d="M126 143L90 273L126 273Z" class="dw-tension-outline"/>' +
      textSvg(82, 79, "εcu", "dw-compression-label", "end") + textSvg(82, 275, "εs", "dw-tension-label", "end") + textSvg(108, 324, "线性应变", "dw-label", "middle")
    );
    body += layer(1,
      '<rect x="155" y="58" width="170" height="68" class="dw-rc-block"/>' +
      line(138, 58, 138, 126, "dw-compression", uid) + textSvg(130, 95, "x", "dw-compression-label", "end") +
      textSvg(240, 92, "等效压区 α₁fc", "dw-compression-label", "middle") +
      textSvg(240, 324, "真实曲线 → 等合力矩形块", "dw-small", "middle")
    );
    body += layer(2,
      line(392, 92, 240, 92, "dw-compression", uid, true) + textSvg(401, 97, "C", "dw-compression-label") +
      line(240, 273, 392, 273, "dw-tension-dash", uid, true) + textSvg(401, 278, "T=fyAs", "dw-tension-label") +
      '<rect x="420" y="35" width="180" height="54" rx="8" class="dw-result-box"/>' +
      textSvg(510, 58, "纯弯：C = T", "dw-formula", "middle") + textSvg(510, 78, "α₁fc b x = fyAs", "dw-small", "middle")
    );
    body += layer(3,
      '<path d="M431 92H449V273H431" class="dw-bracket"/>' + textSvg(420, 185, "z=h₀−x/2", "dw-label", "end") +
      '<path d="M515 87A77 77 0 0 1 515 278" class="dw-moment" marker-end="url(#dw-arrow-' + uid + ')"/>' +
      textSvg(552, 188, "Mu=Cz=Tz", "dw-formula", "middle")
    );
    return svgShell(uid, "钢筋混凝土截面的线性应变、等效压应力块、拉压力和平衡力臂逐步显现", body);
  }

  function drawEccentric(uid) {
    let body = "";
    body += layer(0,
      textSvg(28, 31, "偏心力的等效与定位", "dw-title") +
      '<rect x="112" y="65" width="196" height="224" fill="#f6f8f9" stroke="' + COLORS.ink + '" stroke-width="2"/>' +
      line(210, 48, 210, 307, "dw-neutral", uid) + '<circle cx="210" cy="177" r="5" fill="' + COLORS.ink + '"/>' + textSvg(197, 169, "O", "dw-label", "end") +
      line(268, 44, 268, 112, "dw-load", uid, true) + textSvg(279, 68, "N", "dw-load-label") +
      line(210, 128, 268, 128, "dw-dimension", uid) + line(210, 122, 210, 134, "dw-dimension", uid) + line(268, 122, 268, 134, "dw-dimension", uid) + textSvg(239, 119, "e", "dw-formula", "middle")
    );
    body += layer(1,
      line(210, 45, 210, 112, "dw-verified", uid, true) + textSvg(192, 65, "N", "dw-verified-label", "end") +
      '<path d="M162 166A52 52 0 1 0 249 136" class="dw-moment" marker-end="url(#dw-arrow-' + uid + ')"/>' + textSvg(151, 145, "M=Ne", "dw-load-label", "end") +
      textSvg(210, 324, "同一力系：N + Ne", "dw-verified-label", "middle")
    );
    body += layer(2,
      textSvg(383, 61, "应力叠加", "dw-title") +
      '<rect x="360" y="75" width="58" height="210" class="dw-uniform-stress"/>' + textSvg(389, 305, "−N/A", "dw-small", "middle") +
      '<path d="M442 75L500 75L442 180Z" class="dw-compression-fill"/><path d="M442 180L500 285L442 285Z" class="dw-tension-fill"/>' + textSvg(471, 305, "±M/W", "dw-small", "middle") +
      '<path d="M530 75L606 75L560 285L530 285Z" class="dw-result-stress"/>' + textSvg(568, 305, "合成", "dw-small", "middle") +
      textSvg(488, 332, "均匀压缩 + 线性弯曲", "dw-label", "middle")
    );
    body += layer(3,
      '<rect x="338" y="42" width="279" height="290" rx="8" class="dw-overlay-panel"/>' +
      line(385, 278, 590, 278, "dw-axis", uid, true) + line(385, 278, 385, 78, "dw-axis", uid, true) +
      textSvg(600, 282, "M", "dw-label") + textSvg(376, 69, "N", "dw-label", "middle") +
      '<path d="M390 88 C454 88 530 130 570 252" class="dw-capacity"/>' + textSvg(486, 111, "正弯矩承载边界", "dw-small", "middle") +
      '<circle cx="467" cy="151" r="7" class="dw-state-point"/>' + line(385, 151, 467, 151, "dw-guide", uid) + line(467, 151, 467, 278, "dw-guide", uid) +
      textSvg(478, 135, "(N,Ne)", "dw-formula") + line(467, 178, 535, 178, "dw-load", uid, true) + textSvg(502, 171, "e 增大", "dw-load-label", "middle")
    );
    return svgShell(uid, "偏心轴力、形心等效力偶、应力叠加和N-M需求点逐步显现", body);
  }

  function drawPrestress(uid) {
    let body = "";
    body += layer(0,
      textSvg(28, 31, "先看作用线，再看应力图", "dw-title") +
      '<rect x="65" y="61" width="202" height="234" fill="#f7f9fa" stroke="' + COLORS.ink + '" stroke-width="2"/>' +
      line(48, 178, 285, 178, "dw-neutral", uid) + textSvg(291, 183, "形心轴", "dw-small") +
      '<circle cx="166" cy="245" r="9" class="dw-tendon"/>' + line(83, 245, 244, 245, "dw-tension-dash", uid) + textSvg(166, 269, "钢束作用线", "dw-tension-label", "middle") +
      line(286, 178, 286, 245, "dw-dimension", uid) + line(280, 178, 292, 178, "dw-dimension", uid) + line(280, 245, 292, 245, "dw-dimension", uid) + textSvg(299, 216, "e", "dw-formula") +
      line(244, 245, 98, 245, "dw-load", uid, true) + textSvg(226, 233, "P", "dw-load-label")
    );
    body += layer(1,
      line(246, 178, 96, 178, "dw-verified", uid, true) + textSvg(226, 165, "P", "dw-verified-label") +
      '<path d="M106 142A66 66 0 0 0 225 132" class="dw-moment" marker-end="url(#dw-arrow-' + uid + ')"/>' + textSvg(166, 105, "Mp=Pe", "dw-load-label", "middle") +
      textSvg(166, 324, "偏心 P  ≡  形心 P + Pe", "dw-verified-label", "middle")
    );
    body += layer(2,
      textSvg(376, 54, "初始应力", "dw-title") +
      '<rect x="354" y="72" width="54" height="210" class="dw-uniform-stress"/>' + textSvg(381, 302, "−P/A", "dw-small", "middle") +
      line(465, 72, 465, 282, "dw-axis", uid) +
      '<path d="M465 72L510 72L465 177Z" class="dw-tension-fill"/><path d="M465 177L420 282L465 282Z" class="dw-compression-fill"/>' + textSvg(465, 302, "Pe/I · y", "dw-small", "middle") +
      '<path d="M527 72L567 72L608 282L527 282Z" class="dw-result-stress"/>' + textSvg(566, 302, "合成 σp", "dw-small", "middle") +
      textSvg(484, 329, "下缘预压通常更多", "dw-compression-label", "middle")
    );
    body += layer(3,
      '<rect x="332" y="39" width="288" height="302" rx="8" class="dw-overlay-panel"/>' +
      textSvg(352, 66, "按阶段逐点叠加", "dw-title") +
      line(390, 90, 390, 286, "dw-axis", uid) +
      '<path d="M390 90L350 90L390 188Z" class="dw-compression-fill"/><path d="M390 188L430 286L390 286Z" class="dw-tension-fill"/>' + textSvg(390, 310, "外荷载 Mext", "dw-small", "middle") +
      textSvg(450, 179, "+", "dw-operator", "middle") +
      '<path d="M480 90L520 90L561 286L480 286Z" class="dw-result-stress"/>' + textSvg(520, 310, "预应力 σp", "dw-small", "middle") +
      textSvg(574, 179, "逐点相加", "dw-verified-label", "middle") +
      textSvg(480, 332, "σ = −P/A + Pey/I − Mext y/I", "dw-formula", "middle")
    );
    return svgShell(uid, "偏心钢束、等效轴力和弯矩、初始应力以及外荷载叠加逐步显现", body);
  }

  function buildWorkbench(mount, topic, key) {
    const uid = "dw" + (++mountCount);
    const titleId = uid + "-title";
    const liveId = uid + "-live";

    const stepButtons = topic.steps.map(function (step, index) {
      return '<button type="button" class="derive-step" data-step="' + index + '" aria-controls="' + liveId + '">' +
        '<span class="derive-step-number">' + (index + 1) + '</span><span>' + esc(step.verb) + '</span></button>';
    }).join("");

    const optionButtons = topic.options.map(function (option, index) {
      return '<button type="button" class="derive-option" data-choice="' + index + '" aria-pressed="false">' + esc(option) + '</button>';
    }).join("");

    const fullChain = topic.steps.map(function (step, index) {
      return '<li><strong>' + (index + 1) + ' · ' + esc(step.verb) + '</strong><span>' + esc(step.relation) + '</span></li>';
    }).join("");

    mount.innerHTML = [
      '<section class="derive-workbench" data-topic="', esc(key), '" data-step="0" aria-labelledby="', titleId, '">',
        '<header class="derive-header">',
          '<p class="derive-eyebrow">VISUAL DERIVATION · ', esc(topic.eyebrow), '</p>',
          '<h3 id="', titleId, '">', esc(topic.title), '</h3>',
          '<p class="derive-intro">一次只回答一个问题。先猜，再点四步；公式只在它有来处时出现。</p>',
        '</header>',
        '<section class="derive-prediction" aria-labelledby="', uid, '-predict">',
          '<p id="', uid, '-predict" class="derive-predict-question"><span>先猜</span>', esc(topic.prompt), '</p>',
          '<div class="derive-options" role="group" aria-label="选择你的预测">', optionButtons, '</div>',
          '<p class="derive-feedback" aria-live="polite">不用怕选错：这是一个待验证的预测，不计分。</p>',
        '</section>',
        '<nav class="derive-stepper" aria-label="推导的四个问题">', stepButtons, '</nav>',
        '<div class="derive-main">',
          '<figure class="derive-figure">',
            '<div class="derive-figure-tools"><button type="button" class="derive-zoom-toggle" aria-pressed="false">图太小？放大</button></div>',
            '<div class="derive-svg-scroll">', topic.visual(uid), '</div>',
            '<figcaption>同一张图逐层亮起；灰色内容是上下文，当前证据会被描边。<span class="derive-mobile-hint">放大后可左右滑动核对全图。</span></figcaption>',
          '</figure>',
          '<section id="', liveId, '" class="derive-explanation" aria-live="polite" aria-atomic="true">',
            '<p class="derive-step-kicker"></p>',
            '<h4></h4>',
            '<p class="derive-plain"></p>',
            '<div class="derive-relation"><span>这一小步</span><strong></strong></div>',
            '<p class="derive-cue"></p>',
          '</section>',
        '</div>',
        '<div class="derive-controls">',
          '<button type="button" class="derive-prev">← 上一步</button>',
          '<span class="derive-progress" aria-hidden="true"></span>',
          '<button type="button" class="derive-next">下一步 →</button>',
        '</div>',
        '<section class="derive-takeaway">',
          '<p><span>带走一句</span>', esc(topic.takeaway), '</p>',
          '<p><span>换个问题</span>', esc(topic.transfer), '</p>',
        '</section>',
        '<details class="derive-full-chain">',
          '<summary>我想一次看完整推导链</summary>',
          '<ol>', fullChain, '</ol>',
          '<p><strong>模型边界：</strong>', esc(topic.boundary), '</p>',
        '</details>',
      '</section>'
    ].join("");

    const root = mount.querySelector(".derive-workbench");
    const layers = Array.prototype.slice.call(root.querySelectorAll(".derive-layer"));
    const stepControls = Array.prototype.slice.call(root.querySelectorAll(".derive-step"));
    const optionControls = Array.prototype.slice.call(root.querySelectorAll(".derive-option"));
    const prev = root.querySelector(".derive-prev");
    const next = root.querySelector(".derive-next");
    const progress = root.querySelector(".derive-progress");
    const explainer = root.querySelector(".derive-explanation");
    const feedback = root.querySelector(".derive-feedback");
    const figure = root.querySelector(".derive-figure");
    const zoomToggle = root.querySelector(".derive-zoom-toggle");
    const svgScroll = root.querySelector(".derive-svg-scroll");
    let current = 0;

    function showStep(index, moveFocus) {
      current = Math.max(0, Math.min(topic.steps.length - 1, index));
      const step = topic.steps[current];
      root.dataset.step = String(current);

      layers.forEach(function (item) {
        const at = Number(item.getAttribute("data-at"));
        item.classList.toggle("is-revealed", at <= current);
        item.classList.toggle("is-current", at === current);
      });

      stepControls.forEach(function (button, buttonIndex) {
        const active = buttonIndex === current;
        button.classList.toggle("is-active", active);
        if (active) {
          button.setAttribute("aria-current", "step");
        } else {
          button.removeAttribute("aria-current");
        }
      });

      explainer.querySelector(".derive-step-kicker").textContent = "第 " + (current + 1) + " 问 · " + step.verb;
      explainer.querySelector("h4").textContent = step.question;
      explainer.querySelector(".derive-plain").textContent = step.plain;
      explainer.querySelector(".derive-relation strong").textContent = step.relation;
      explainer.querySelector(".derive-cue").textContent = step.cue;
      progress.textContent = (current + 1) + " / " + topic.steps.length;
      prev.disabled = current === 0;
      next.disabled = current === topic.steps.length - 1;
      next.textContent = current === topic.steps.length - 1 ? "已走完四步" : "下一步 →";

      if (moveFocus) {
        explainer.setAttribute("tabindex", "-1");
        explainer.focus({ preventScroll: true });
      }
    }

    stepControls.forEach(function (button) {
      button.addEventListener("click", function () {
        showStep(Number(button.dataset.step), false);
      });
    });

    optionControls.forEach(function (button) {
      button.addEventListener("click", function () {
        const choice = Number(button.dataset.choice);
        optionControls.forEach(function (item) {
          item.classList.remove("is-chosen", "is-confirmed");
          item.setAttribute("aria-pressed", "false");
        });
        button.classList.add("is-chosen");
        button.setAttribute("aria-pressed", "true");
        if (choice === topic.correct) {
          button.classList.add("is-confirmed");
          feedback.textContent = "这个预测与平衡/几何关系一致。" + topic.prediction;
        } else if (choice === topic.options.length - 1) {
          feedback.textContent = "保留“不确定”很诚实。接下来用四步证据判断：" + topic.prediction;
        } else {
          feedback.textContent = "先保留这个预测，再用图检验它。关键线索是：" + topic.prediction;
        }
      });
    });

    prev.addEventListener("click", function () { showStep(current - 1, false); });
    next.addEventListener("click", function () { showStep(current + 1, false); });
    zoomToggle.addEventListener("click", function () {
      const zoomed = figure.classList.toggle("is-zoomed");
      zoomToggle.setAttribute("aria-pressed", String(zoomed));
      zoomToggle.textContent = zoomed ? "缩回整图" : "图太小？放大";
      if (zoomed) svgScroll.scrollLeft = 0;
    });
    showStep(0, false);
  }

  function mountAll() {
    const mounts = document.querySelectorAll(".derive-mount[data-derivation]");
    Array.prototype.forEach.call(mounts, function (mount) {
      if (mount.dataset.deriveReady === "true") return;
      const key = mount.getAttribute("data-derivation");
      const topic = TOPICS[key];
      if (!topic) return;
      mount.dataset.deriveReady = "true";
      buildWorkbench(mount, topic, key);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", mountAll, { once: true });
  } else {
    mountAll();
  }
})();
