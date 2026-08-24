(() => {
  "use strict";

  const manifest = globalThis.VIDEO_EVIDENCE_MANIFEST || {};
  const iframeSelector = ".video-embed iframe";

  const el = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined && text !== null) node.textContent = text;
    return node;
  };

  const clock = (seconds) => {
    const value = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(value / 3600);
    const minutes = Math.floor((value % 3600) / 60);
    const secs = value % 60;
    const values = hours ? [hours, minutes, secs] : [minutes, secs];
    return values.map((part) => String(part).padStart(2, "0")).join(":");
  };

  const truncate = (value, length = 120) => {
    const text = String(value || "").replace(/\s+/g, " ").trim();
    return text.length > length ? `${text.slice(0, length - 1)}…` : text;
  };

  const parseIframe = (iframe) => {
    let url;
    try {
      const inertSource = iframe.getAttribute("data-src") || iframe.getAttribute("src");
      if (!inertSource) return null;
      url = new URL(inertSource, document.baseURI);
    } catch {
      return null;
    }

    let provider = "";
    let id = "";
    if (/youtube(?:-nocookie)?\.com$/i.test(url.hostname)) {
      provider = "youtube";
      id = url.pathname.match(/\/embed\/([^/?#]+)/)?.[1] || url.searchParams.get("v") || "";
    } else if (/bilibili\.com$/i.test(url.hostname)) {
      provider = "bilibili";
      id = url.searchParams.get("bvid") || url.pathname.match(/\/(BV[\w]+)/i)?.[1] || "";
    }
    if (!provider || !id) return null;

    const start = Number(url.searchParams.get("start") || url.searchParams.get("t") || 0);
    const end = Number(url.searchParams.get("end") || 0);
    return {
      provider,
      id,
      key: `${provider}:${id}`,
      start: Number.isFinite(start) ? start : 0,
      end: Number.isFinite(end) && end > start ? end : 0,
      embedUrl: url
    };
  };

  const sourceUrl = (video, start) => {
    if (video.provider === "youtube") {
      return `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}&t=${Math.max(0, start)}s`;
    }
    return `https://www.bilibili.com/video/${encodeURIComponent(video.id)}/?t=${Math.max(0, start)}`;
  };

  const quartoRootUrl = () => {
    const offset = document.querySelector('meta[name="quarto:offset"]')?.content || "./";
    return new URL(offset, document.baseURI);
  };

  const resolveBookAsset = (path) => {
    if (!path || !/^(?:\.\/)?assets\//.test(path)) return path || "";
    return new URL(path.replace(/^\.\//, ""), quartoRootUrl()).href;
  };

  const contextFor = (iframe) => {
    const block = iframe.closest(".video-clip, .video-lesson, .real-case") || iframe.parentElement;
    const heading = block?.querySelector("h3, h4")?.textContent || iframe.title || "视频证据";
    const guide = [...(block?.querySelectorAll("p") || [])]
      .find((paragraph) => !paragraph.classList.contains("attribution"))?.textContent || "先明确观察任务，再决定是否载入视频。";
    const attribution = block?.querySelector(".attribution")?.textContent || "";
    return {
      title: truncate(heading, 72),
      guide: truncate(guide, 150),
      attribution: truncate(attribution, 120)
    };
  };

  const mergedEntry = (video, iframe) => {
    const entry = manifest[video.key] || {};
    const context = contextFor(iframe);
    const start = Number.isFinite(Number(entry.start)) ? Number(entry.start) : video.start;
    const end = Number.isFinite(Number(entry.end)) && Number(entry.end) > start ? Number(entry.end) : video.end;
    return {
      ...entry,
      title: entry.title || context.title,
      watch: entry.watch || context.guide,
      credit: entry.credit || context.attribution,
      start,
      end,
      mode: entry.mode || "undecided"
    };
  };

  const posterFor = (video, entry) => {
    if (entry.rightsNote) return "";
    if (entry.poster) return resolveBookAsset(entry.poster);
    if (video.provider === "youtube") return `https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg`;
    return "";
  };

  const timedEmbedUrl = (video, entry) => {
    const url = new URL(video.embedUrl);
    url.searchParams.set("autoplay", "0");
    if (video.provider === "youtube") {
      url.hostname = "www.youtube-nocookie.com";
      url.searchParams.set("start", String(Math.max(0, entry.start)));
      if (entry.end > entry.start) url.searchParams.set("end", String(entry.end));
    } else {
      url.searchParams.set("t", String(Math.max(0, entry.start)));
    }
    return url.toString();
  };

  const clipLabel = (entry) => {
    if (entry.end > entry.start) return `${clock(entry.start)}–${clock(entry.end)}`;
    if (entry.start > 0) return `${clock(entry.start)} 起`;
    return "按需播放";
  };

  const renderFullCard = (container, iframe, video, entry) => {
    const config = {
      id: video.key,
      kicker: entry.kicker || "VIDEO EVIDENCE · 自动匹配",
      title: entry.title,
      thesis: entry.why || entry.watch,
      still: {
        src: posterFor(video, entry),
        alt: entry.alt || `${entry.title}的原平台预览图`,
        time: entry.keyframe || clock(entry.start),
        kind: entry.poster ? "来源关键帧" : "原平台封面预览",
        caption: entry.caption || "按视频 ID 自动匹配"
      },
      annotations: entry.annotations || [],
      decision: {
        mode: entry.mode === "still" ? "still" : "motion",
        title: entry.decisionTitle || (entry.mode === "still" ? "这一帧已经足够" : `只看 ${clipLabel(entry)}`),
        reason: entry.why || entry.watch
      },
      clip: {
        provider: video.provider,
        id: video.id,
        start: entry.start,
        end: entry.end || undefined,
        title: iframe.title || entry.title,
        purpose: entry.purpose || entry.watch,
        instruction: entry.instruction
      },
      segments: entry.segments || [],
      translationNote: entry.translationNote,
      source: {
        creator: entry.creator || entry.credit || "待补原作者",
        publisher: entry.publisher || (video.provider === "youtube" ? "YouTube" : "Bilibili"),
        url: entry.url || sourceUrl(video, entry.start),
        linkLabel: `原视频 ${clipLabel(entry)} ↗`,
        boundary: entry.boundary
      }
    };

    const host = el("div", "");
    host.dataset.videoEvidence = "";
    const data = el("script", "");
    data.type = "application/json";
    data.textContent = JSON.stringify(config).replace(/<\//g, "<\\/");
    host.append(data);
    container.replaceWith(host);

    if (globalThis.VideoEvidence?.init) {
      globalThis.VideoEvidence.init();
    } else {
      document.dispatchEvent(new CustomEvent("video-evidence:refresh"));
    }
  };

  const renderCompactPreview = (container, iframe, video, entry) => {
    const originalTitle = iframe.title || entry.title;
    const originalAllow = iframe.getAttribute("allow") || "accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    const poster = posterFor(video, entry);
    // 始终把学生送到本卡的核心时刻；裸视频首页会再次制造搜索负担。
    const linkUrl = sourceUrl(video, entry.start);

    container.classList.add("vec-auto-preview");
    container.dataset.videoEvidenceAuto = video.key;
    let belowObserver;

    const normalizedLabels = (Array.isArray(entry.labels) ? entry.labels : [])
      .slice(0, 5)
      .map((label) => typeof label === "string" ? { label } : label)
      .filter((label) => label?.label || label?.text);

    const normalizedNarration = (Array.isArray(entry.narration) ? entry.narration : [])
      .slice(0, 4)
      .map((item) => typeof item === "string" ? { text: item } : item)
      .filter((item) => item?.title || item?.text);

    const buildPreview = () => {
      const staticMode = ["still", "stepper"].includes(entry.mode);
      const surface = el(staticMode ? (poster ? "a" : "div") : "button", "vec-auto__surface");
      if (surface.tagName === "BUTTON") {
        surface.type = "button";
        surface.setAttribute("aria-label", `载入视频：${entry.title}，${clipLabel(entry)}`);
      } else if (surface.tagName === "A") {
        surface.href = poster;
        surface.target = "_blank";
        surface.rel = "noopener noreferrer";
        surface.setAttribute("aria-label", `放大关键帧：${entry.title}；不加载视频`);
      } else {
        surface.setAttribute("role", "group");
        surface.setAttribute("aria-label", entry.title);
      }

      if (poster) {
        const image = el("img", "vec-auto__poster");
        image.src = poster;
        image.alt = "";
        image.loading = "lazy";
        image.decoding = "async";
        surface.append(image);
      } else {
        surface.append(el("span", "vec-auto__placeholder", `${video.provider === "bilibili" ? "BILIBILI" : "VIDEO"} · ${video.id}`));
      }

      const shade = el("span", "vec-auto__shade");
      const statusText = entry.mode === "still"
        ? `静态 · ${entry.keyframe || clock(entry.start)}`
        : entry.mode === "stepper"
          ? `分步 · ${entry.keyframe || clock(entry.start)}`
          : entry.mode === "motion"
            ? "需要运动"
            : "尚待筛选";
      const status = el("span", `vec-auto__status vec-auto__status--${entry.mode}`, statusText);
      const actionText = entry.mode === "still"
        ? (poster ? "放大图｜无需播放" : "无复用画面")
        : entry.mode === "stepper"
          ? (poster ? `放大图｜${normalizedNarration.length} 步` : `${normalizedNarration.length} 步｜不复用画面`)
          : `${entry.mode === "undecided" ? "按需" : "载入"} ${clipLabel(entry)}`;
      const action = el(
        "span",
        `vec-auto__action${["still", "stepper"].includes(entry.mode) ? " vec-auto__action--note" : ""}`,
        actionText
      );
      shade.append(status, action);
      surface.append(shade);

      if (!["still", "stepper"].includes(entry.mode)) {
        surface.addEventListener("click", () => {
          const player = el("div", "vec-auto__player");
          const close = el("button", "vec-auto__close", "收起视频，回到关键帧");
          close.type = "button";
          const nextIframe = el("iframe", "");
          nextIframe.src = timedEmbedUrl(video, entry);
          nextIframe.title = originalTitle;
          nextIframe.loading = "lazy";
          nextIframe.allow = originalAllow;
          nextIframe.allowFullscreen = true;
          nextIframe.referrerPolicy = "strict-origin-when-cross-origin";
          close.addEventListener("click", () => {
            mount(buildPreview());
            container.querySelector(".vec-auto__surface")?.focus();
          });
          player.append(close, nextIframe);
          mount(player);
          close.focus({ preventScroll: true });
        });
      }

      return surface;
    };

    const makeBelow = () => {
      const below = el("div", "vec-auto__below");

      if (normalizedLabels.length) {
        const guide = el("div", "vec-auto__labels");
        guide.append(el("strong", "vec-auto__labels-title", "看这里"));
        const list = el("ul", "vec-auto__label-list");
        normalizedLabels.forEach((label) => {
          const item = el("li", "vec-auto__label");
          if (label.label) item.append(el("strong", "", label.label));
          if (label.text) item.append(el("span", "", label.text));
          list.append(item);
        });
        guide.append(list);
        below.append(guide);
      }

      if (entry.task) {
        const task = el("p", "vec-auto__task");
        task.append(el("strong", "", "只做一件事｜"), document.createTextNode(entry.task));
        below.append(task);
      }

      if (normalizedNarration.length && entry.mode === "stepper") {
        const stepper = el("section", "vec-auto__stepper");
        stepper.setAttribute("aria-label", `逐步图解，共 ${normalizedNarration.length} 步`);
        stepper.append(el("strong", "vec-auto__stepper-title", `逐步图解 · ${normalizedNarration.length} 步`));
        const list = el("ol", "vec-auto__step-list");
        normalizedNarration.forEach((item, index) => {
          const row = el("li", "vec-auto__step");
          const detail = el("details", "");
          const stepCue = item.title || item.time || truncate(item.text, 22) || "查看解释";
          const label = `${index + 1}｜${stepCue}`;
          detail.append(el("summary", "", label));
          if (item.time) detail.append(el("span", "vec-auto__narration-time", item.time));
          if (item.text) detail.append(el("p", "", item.text));
          row.append(detail);
          list.append(row);
        });
        stepper.append(list);
        below.append(stepper);
      } else if (normalizedNarration.length) {
        const details = el("details", "vec-auto__narration");
        details.append(el("summary", "", `中文讲解 · ${normalizedNarration.length} 条（原创）`));
        const list = el("ol", "vec-auto__narration-list");
        normalizedNarration.forEach((item) => {
          const row = el("li", "vec-auto__narration-item");
          if (item.time) row.append(el("span", "vec-auto__narration-time", item.time));
          if (item.title) row.append(el("strong", "", item.title));
          if (item.text) row.append(el("p", "", item.text));
          list.append(row);
        });
        details.append(list);
        below.append(details);
      }

      const meta = el("div", "vec-auto__meta");
      const source = el("a", "vec-auto__source", `原视频 ${clock(entry.start)} ↗`);
      source.href = linkUrl;
      source.target = "_blank";
      source.rel = "noopener noreferrer";
      source.setAttribute("aria-label", `在原平台打开 ${entry.credit || entry.title}，从 ${clock(entry.start)} 开始`);
      const sourceNote = el(
        "span",
        "vec-auto__source-note",
        `${entry.credit || (video.provider === "youtube" ? "YouTube" : "Bilibili")} · 默认不加载、不开启自动播放`
      );
      meta.append(source, sourceNote);
      below.append(meta);
      if (entry.rightsNote) {
        const rights = el("span", "vec-auto__rights");
        rights.append(el("strong", "", "版权边界｜"), document.createTextNode(entry.rightsNote));
        below.append(rights);
      }
      return below;
    };

    const mount = (surface) => {
      belowObserver?.disconnect();
      const below = makeBelow();
      container.replaceChildren(surface, below);
      container.classList.toggle("vec-auto-playing", surface.classList.contains("vec-auto__player"));
      const reserveBelow = () => {
        container.style.marginBottom = `${Math.ceil(below.getBoundingClientRect().height) + 16}px`;
      };
      requestAnimationFrame(reserveBelow);
      if ("ResizeObserver" in globalThis) {
        belowObserver = new ResizeObserver(reserveBelow);
        belowObserver.observe(below);
      }
    };

    mount(buildPreview());
  };

  const normalizeClipOrder = (container, iframe) => {
    const article = iframe.closest(".video-clip");
    if (!article || container.parentElement !== article) return;
    const directChildren = [...article.children];
    const heading = directChildren.find((node) => /^(H3|H4)$/.test(node.tagName));
    const guide = directChildren.find(
      (node) => node.tagName === "P" && !node.classList.contains("attribution")
    );
    if (heading) article.insertBefore(heading, container);
    if (guide) article.insertBefore(guide, container);
    directChildren
      .filter((node) => node.classList?.contains("attribution"))
      .forEach((node) => node.remove());
  };

  const init = () => {
    document.querySelectorAll(iframeSelector).forEach((iframe) => {
      const container = iframe.closest(".video-embed");
      if (!container || container.dataset.videoEvidenceAuto) return;
      const video = parseIframe(iframe);
      if (!video) return;
      const entry = mergedEntry(video, iframe);
      normalizeClipOrder(container, iframe);
      if (entry.variant === "card") {
        renderFullCard(container, iframe, video, entry);
      } else {
        renderCompactPreview(container, iframe, video, entry);
      }
    });
  };

  globalThis.VideoEvidenceAuto = Object.assign(globalThis.VideoEvidenceAuto || {}, { init });
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init, { once: true });
  } else {
    init();
  }
})();
