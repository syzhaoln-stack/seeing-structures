(() => {
  "use strict";

  const CARD_SELECTOR = "[data-video-evidence]";
  const DATA_SELECTOR = "script[type='application/json']";

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };

  const appendText = (parent, label, value) => {
    const row = el("p", "vec__explain-row");
    row.append(el("strong", "", label), document.createTextNode(value));
    parent.append(row);
  };

  const formatClock = (seconds) => {
    const value = Math.max(0, Number(seconds) || 0);
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = Math.floor(value % 60);
    const pairs = hours
      ? [hours, minutes, secs]
      : [minutes, secs];
    return pairs.map((part) => String(part).padStart(2, "0")).join(":");
  };

  const getClipLabel = (clip = {}) => {
    if (clip.label) return clip.label;
    if (clip.end !== undefined) {
      const duration = Math.max(0, Number(clip.end) - Number(clip.start || 0));
      return `${formatClock(clip.start)}–${formatClock(clip.end)} · ${duration} 秒`;
    }
    return `${formatClock(clip.start)} 起`;
  };

  const originalUrl = (clip = {}) => {
    if (clip.url) return clip.url;
    const start = Math.max(0, Number(clip.start) || 0);
    if (clip.provider === "youtube" && clip.id) {
      return `https://www.youtube.com/watch?v=${encodeURIComponent(clip.id)}&t=${start}s`;
    }
    if (clip.provider === "bilibili" && clip.id) {
      return `https://www.bilibili.com/video/${encodeURIComponent(clip.id)}/?t=${start}`;
    }
    return "";
  };

  const embedUrl = (clip = {}) => {
    const start = Math.max(0, Math.floor(Number(clip.start) || 0));
    const end = Math.max(start, Math.floor(Number(clip.end) || 0));

    if (clip.provider === "youtube" && clip.id) {
      const params = new URLSearchParams({
        start: String(start),
        autoplay: "0",
        rel: "0"
      });
      if (end > start) params.set("end", String(end));
      return `https://www.youtube-nocookie.com/embed/${encodeURIComponent(clip.id)}?${params}`;
    }

    if (clip.provider === "bilibili" && clip.id) {
      const params = new URLSearchParams({
        bvid: clip.id,
        page: String(clip.page || 1),
        high_quality: "1",
        autoplay: "0",
        t: String(start)
      });
      return `https://player.bilibili.com/player.html?${params}`;
    }

    return "";
  };

  const makeSourceLink = (config, className = "vec__source-link") => {
    const url = config.source?.url || originalUrl(config.clip);
    if (!url) return null;
    const link = el("a", className, config.source?.linkLabel || "在原平台查看");
    link.href = url;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    return link;
  };

  const makeStage = (config) => {
    const stage = el("div", "vec__stage-grid");
    const figure = el("figure", "vec__still");
    const visual = el("div", "vec__still-visual");
    const still = config.still || {};

    if (still.src) {
      const image = el("img", "vec__still-image");
      image.src = still.src;
      image.alt = still.alt || "视频关键帧";
      image.loading = "lazy";
      image.decoding = "async";
      visual.append(image);
    } else {
      const placeholder = el("div", "vec__placeholder");
      placeholder.setAttribute("role", "img");
      placeholder.setAttribute("aria-label", still.alt || "等待截取的关键帧占位图");
      const trace = document.createElementNS("http://www.w3.org/2000/svg", "svg");
      trace.setAttribute("viewBox", "0 0 640 360");
      trace.setAttribute("aria-hidden", "true");
      trace.innerHTML = `
        <path d="M72 224 H566" class="vec__trace-beam" />
        <path d="M108 224 L86 266 H130 Z M530 224 L508 266 H552 Z" class="vec__trace-support" />
        <path d="M320 78 V190 M306 171 L320 190 L334 171" class="vec__trace-load" />
        <path d="M204 224 L228 175 L244 224 M260 224 L286 160 L304 224" class="vec__trace-crack" />
      `;
      placeholder.append(
        trace,
        el("span", "vec__placeholder-label", still.label || "待截取关键帧")
      );
      visual.append(placeholder);
    }

    const annotations = Array.isArray(config.annotations) ? config.annotations : [];
    annotations.forEach((annotation, index) => {
      const marker = el("span", `vec__marker vec__marker--${annotation.tone || "compression"}`, String(index + 1));
      marker.style.left = `${Math.min(100, Math.max(0, Number(annotation.x) || 0))}%`;
      marker.style.top = `${Math.min(100, Math.max(0, Number(annotation.y) || 0))}%`;
      marker.setAttribute("aria-hidden", "true");
      visual.append(marker);
    });

    const timecode = el("span", "vec__timecode", still.time || "关键帧");
    visual.append(timecode);
    figure.append(visual);

    const caption = el("figcaption", "vec__still-caption");
    caption.append(
      el("strong", "", still.kind || (still.src ? "来源关键帧" : "截帧位置")),
      document.createTextNode(still.caption ? ` · ${still.caption}` : "")
    );
    figure.append(caption);

    const guide = el("aside", "vec__guide");
    guide.setAttribute("aria-label", "关键帧观察标识");
    guide.append(el("p", "vec__utility-label", "先看哪里"));
    const heading = el("h4", "", config.guideTitle || "只追踪这些证据");
    guide.append(heading);

    if (annotations.length) {
      const list = el("ol", "vec__annotation-list");
      annotations.forEach((annotation, index) => {
        const item = el("li", "vec__annotation-item");
        const badge = el("span", `vec__annotation-key vec__marker--${annotation.tone || "compression"}`, String(index + 1));
        const copy = el("div", "vec__annotation-copy");
        copy.append(el("strong", "", annotation.label || `观察点 ${index + 1}`));
        if (annotation.watch) appendText(copy, "看：", annotation.watch);
        if (annotation.why) appendText(copy, "因为：", annotation.why);
        item.append(badge, copy);
        list.append(item);
      });
      guide.append(list);
    } else {
      guide.append(el("p", "vec__quiet", "本帧无需额外标识；先复述图中对象与关系。"));
    }

    stage.append(figure, guide);
    return stage;
  };

  const makeDecision = (config) => {
    const decision = config.decision || {};
    const motionRequired = decision.mode === "motion";
    const section = el("section", `vec__decision vec__decision--${motionRequired ? "motion" : "still"}`);
    section.setAttribute("aria-label", "是否需要观看动画的判断");
    const badge = el("span", "vec__decision-badge", motionRequired ? "需要运动" : "静态足够");
    const copy = el("div", "vec__decision-copy");
    copy.append(el("strong", "", decision.title || (motionRequired ? "运动本身就是证据" : "停在这一帧即可学习")));
    if (decision.reason) copy.append(el("p", "", decision.reason));
    section.append(badge, copy);
    return section;
  };

  const makeMotion = (config) => {
    if (config.decision?.mode !== "motion" || !config.clip) return null;

    const details = el("details", "vec__motion");
    const summary = el("summary", "");
    summary.append(
      el("span", "vec__summary-label", "看片段"),
      el("strong", "", getClipLabel(config.clip)),
      el("span", "vec__summary-purpose", config.clip.purpose || "只为观察时间关系")
    );
    details.append(summary);

    const body = el("div", "vec__motion-body");
    const intro = el("p", "vec__motion-intro", config.clip.instruction || "展开后仍不会自动播放；准备好观察任务，再载入原平台播放器。");
    const actions = el("div", "vec__actions");
    const embed = embedUrl(config.clip);

    if (embed) {
      const loadButton = el("button", "vec__load-button", `载入 ${getClipLabel(config.clip)} 片段`);
      loadButton.type = "button";
      loadButton.setAttribute("aria-expanded", "false");
      const player = el("div", "vec__player");
      player.hidden = true;

      const unload = () => {
        player.replaceChildren();
        player.hidden = true;
        loadButton.hidden = false;
        loadButton.setAttribute("aria-expanded", "false");
      };

      loadButton.addEventListener("click", () => {
        const iframe = el("iframe", "");
        iframe.src = embed;
        iframe.title = config.clip.title || config.title || "教学视频片段";
        iframe.loading = "lazy";
        iframe.allow = "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
        iframe.allowFullscreen = true;
        iframe.referrerPolicy = "strict-origin-when-cross-origin";
        player.replaceChildren(iframe);
        player.hidden = false;
        loadButton.hidden = true;
        loadButton.setAttribute("aria-expanded", "true");
      });

      details.addEventListener("toggle", () => {
        if (!details.open && !player.hidden) unload();
      });

      actions.append(loadButton);
      body.append(intro, actions, player);
    } else {
      body.append(el("p", "vec__quiet", "当前来源不支持站内片段播放，请在原平台按给定时间观看。"), actions);
    }

    const sourceLink = makeSourceLink(config);
    if (sourceLink) actions.append(sourceLink);
    details.append(body);
    return details;
  };

  const makeSegments = (config) => {
    const segments = Array.isArray(config.segments) ? config.segments : [];
    if (!segments.length) return null;

    const details = el("details", "vec__segments");
    const summary = el("summary", "", `中文分段讲解 · ${segments.length} 段`);
    details.append(summary);
    const note = el("p", "vec__translation-note", config.translationNote || "以下为教学导看与原创概括，不是原视频字幕的逐字翻译。");
    const list = el("ol", "vec__segment-list");

    segments.forEach((segment) => {
      const item = el("li", "vec__segment");
      item.append(
        el("span", "vec__segment-time", segment.time || "暂停"),
        el("strong", "", segment.title || "观察任务"),
        el("p", "", segment.text || "")
      );
      if (segment.prompt) {
        const prompt = el("p", "vec__segment-prompt");
        prompt.append(el("span", "", "暂停问自己"), document.createTextNode(segment.prompt));
        item.append(prompt);
      }
      list.append(item);
    });

    details.append(note, list);
    return details;
  };

  const makeFooter = (config) => {
    const footer = el("footer", "vec__footer");
    const source = config.source || {};
    const credit = el("p", "vec__credit");
    credit.append(el("strong", "", "来源与版权 · "));
    const pieces = [source.creator, source.publisher, source.license].filter(Boolean);
    credit.append(document.createTextNode(pieces.join(" · ") || "请在集成时补全原作者与平台信息"));
    footer.append(credit);

    const boundary = el(
      "p",
      "vec__copyright",
      source.boundary || "本卡仅提供教学导看、时间定位与来源链接；视频版权归原作者及发布平台，中文为原创讲解，不复制完整字幕。"
    );
    footer.append(boundary);

    const link = makeSourceLink(config, "vec__footer-link");
    if (link) footer.append(link);
    return footer;
  };

  const renderCard = (host, config, index) => {
    const card = el("article", "video-evidence-card");
    card.dataset.evidenceId = config.id || `evidence-${index + 1}`;

    const header = el("header", "vec__header");
    const rail = el("div", "vec__rail");
    rail.append(
      el("span", "vec__rail-index", config.kicker || `VIDEO EVIDENCE ${String(index + 1).padStart(2, "0")}`),
      el("span", "vec__rail-rule", ""),
      el("span", "vec__rail-time", config.still?.time || getClipLabel(config.clip))
    );
    header.append(rail, el("h3", "", config.title || "视频证据"));
    if (config.thesis) header.append(el("p", "vec__thesis", config.thesis));
    card.append(header, makeStage(config), makeDecision(config));

    const motion = makeMotion(config);
    if (motion) card.append(motion);
    if (config.decision?.mode !== "motion") {
      const optionalSource = makeSourceLink(config, "vec__optional-link");
      if (optionalSource) {
        optionalSource.textContent = "完整视频仅供拓展，不是本页前置条件 ↗";
        card.append(optionalSource);
      }
    }

    const segments = makeSegments(config);
    if (segments) card.append(segments);
    card.append(makeFooter(config));

    host.replaceChildren(card);
    host.dataset.videoEvidenceReady = "true";
  };

  const renderError = (host, message) => {
    const error = el("div", "vec__error");
    error.setAttribute("role", "alert");
    error.append(el("strong", "", "视频证据卡未载入"), el("p", "", message));
    host.replaceChildren(error);
  };

  const init = () => {
    document.querySelectorAll(CARD_SELECTOR).forEach((host, index) => {
      if (host.dataset.videoEvidenceReady === "true") return;
      const data = host.querySelector(DATA_SELECTOR);
      if (!data) {
        renderError(host, "缺少 application/json 数据。请检查集成说明中的最小示例。");
        return;
      }
      try {
        renderCard(host, JSON.parse(data.textContent), index);
      } catch (error) {
        renderError(host, `JSON 无法解析：${error.message}`);
      }
    });
  };

  globalThis.VideoEvidence = Object.assign(globalThis.VideoEvidence || {}, { init });
  document.addEventListener("video-evidence:refresh", init);

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
