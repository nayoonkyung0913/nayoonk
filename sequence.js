(function () {
  "use strict";
  const key = Symbol.for("mines.imweb.motion.sequence.v1");
  if (window[key]) return;
  window[key] = true;

  const selector = '[data-imweb-motion="sequence"]';
  const stageAttr = "data-imweb-sequence-stage";
  const readyAttr = "data-imweb-sequence-ready";
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const states = new Map();
  const nearby = new Set();
  let paintId = 0;
  const style = document.createElement("style");
  style.textContent = `
    [data-imweb-motion="sequence"][data-imweb-sequence-ready] {
      display:block; position:relative; min-width:0; min-height:clamp(650px,205vh,2000px);
      min-height:clamp(650px,205svh,2000px);
    }
    [data-imweb-motion="sequence"][data-imweb-sequence-ready] > img { display:none !important; }
    [data-imweb-motion="sequence"][data-imweb-sequence-ready] > [data-imweb-sequence-stage] {
      position:sticky; top:var(--imweb-sequence-top,0px); overflow:hidden; width:100%;
      height:min(80vh,760px); height:min(80svh,760px); background:var(--imweb-sequence-bg,transparent);
    }
    [data-imweb-motion="sequence"][data-imweb-sequence-ready] > [data-imweb-sequence-stage] > img {
      display:block; width:100% !important; max-width:none; height:100% !important;
      margin:0; object-fit:var(--imweb-sequence-fit,contain);
    }
    [data-imweb-motion="sequence"] > [data-imweb-sequence-pin] { position:relative !important; }
    @media (prefers-reduced-motion:reduce), print {
      [data-imweb-motion="sequence"][data-imweb-sequence-ready] { min-height:0; }
      [data-imweb-motion="sequence"][data-imweb-sequence-ready] > [data-imweb-sequence-stage] { position:static !important; transform:none !important; }
    }
  `;

  function source(img) {
    return img.getAttribute("data-original") || img.getAttribute("data-src") || img.currentSrc || img.getAttribute("src");
  }

  function integer(value, fallback, min, max) {
    if (value == null || value === "") return fallback;
    const n = Number(value);
    return Number.isSafeInteger(n) && n >= min && n <= max ? n : NaN;
  }

  function framesFor(root) {
    const frames = Array.from(root.children).filter(el => el.tagName === "IMG");
    if (!frames.length || !source(frames[0])) return null;
    const poster = frames[0];
    const pattern = root.getAttribute("data-frame-src");
    if (pattern != null) {
      const count = integer(root.dataset.frameCount, NaN, 2, 2000);
      const start = integer(root.dataset.frameStart, 1, 0, 1000000);
      const pad = integer(root.dataset.framePad, 0, 0, 9);
      if (!pattern.includes("{frame}") || ![count,start,pad].every(Number.isFinite)) return null;
      return {poster, count, url: index => pattern.split("{frame}").join(String(start + index).padStart(pad,"0"))};
    }
    const urls = frames.map(source);
    if (urls.length < 2 || urls.some(url => !url)) return null;
    return {poster, count: urls.length, url: index => urls[index]};
  }

  function schedule() {
    if (!paintId && !motion.matches && nearby.size) paintId = requestAnimationFrame(paint);
  }

  function hasClippedParent(root) {
    for (let parent = root.parentElement; parent && parent !== document.body; parent = parent.parentElement) {
      const overflow = getComputedStyle(parent).overflowY;
      if (overflow === "hidden" || overflow === "auto" || overflow === "scroll") return true;
    }
    return false;
  }

  // Only the requested frame and its immediate neighbours enter the queue.
  function load(state) {
    if (!state.live || !nearby.has(state.root) || motion.matches) return;
    const order = [0, 1, -1, 2, -2].map(delta => state.target + delta)
      .filter(index => index >= 0 && index < state.frames.count);
    for (const index of order) {
      const cached = state.cache.get(index);
      if (cached) {
        if (index === state.target && cached.ready && state.displayed !== index) {
          cached.image.alt = state.poster.alt;
          state.stage.replaceChildren(cached.image);
          state.displayed = index;
        }
        continue;
      }
      if (state.pending >= 3 || state.failed.has(index)) continue;
      const image = new Image();
      const record = { image, ready: false };
      state.cache.set(index, record);
      state.pending++;
      image.decoding = "async";
      const settle = success => {
        image.onload = image.onerror = null;
        if (!state.live) return;
        state.pending--;
        if (success) record.ready = true;
        else { state.cache.delete(index); state.failed.add(index); }
        if (state.cache.size > 12) {
          for (const [id, item] of state.cache) {
            if (item.ready && id !== state.displayed && Math.abs(id - state.target) > 2) state.cache.delete(id);
            if (state.cache.size <= 12) break;
          }
        }
        load(state);
      };
      image.onload = () => settle(true);
      image.onerror = () => settle(false);
      image.src = state.frames.url(index);
    }
  }

  function paint() {
    paintId = 0;
    if (motion.matches) return;
    for (const root of nearby) {
      const state = states.get(root);
      if (!state) continue;
      const rect = root.getBoundingClientRect();
      if (!rect.width || !rect.height) continue;
      const travel = Math.max(1, rect.height - state.stage.offsetHeight);
      const top = parseFloat(getComputedStyle(state.stage).top) || 0;
      const fraction = Math.max(0, Math.min(1, (top - rect.top) / travel));
      if (state.manualPin) state.stage.style.transform = "translateY(" + (fraction * travel - top) + "px)";
      state.target = Math.round(fraction * (state.frames.count - 1));
      load(state);
    }
  }

  const viewport = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!states.has(entry.target)) continue;
      if (entry.isIntersecting) nearby.add(entry.target);
      else nearby.delete(entry.target);
    }
    schedule();
  }, { rootMargin:"240px" }) : null;
  const sizes = "ResizeObserver" in window ? new ResizeObserver(schedule) : null;

  function unmount(root) {
    const state = states.get(root);
    if (!state) return;
    state.live = false;
    if (viewport) viewport.unobserve(root);
    if (sizes) sizes.unobserve(root);
    nearby.delete(root);
    states.delete(root);
    for (const entry of state.cache.values()) entry.image.onload = entry.image.onerror = null;
    state.cache.clear();
    state.stage.remove();
    root.removeAttribute(readyAttr);
    if (!states.size) style.remove();
  }

  function mount(root) {
    if (!root.isConnected || !root.matches(selector)) return;
    // Imweb may clone an enhanced PC article when building its mobile copy.
    Array.from(root.children).filter(el => el.hasAttribute(stageAttr)).forEach(el => el.remove());
    root.removeAttribute(readyAttr);
    const frames = framesFor(root);
    if (!frames) return;
    const stage = document.createElement("div");
    stage.setAttribute(stageAttr,"");
    // An overflow wrapper in a theme can prevent native sticky from following page scroll.
    const manualPin = hasClippedParent(root);
    if (manualPin) stage.setAttribute("data-imweb-sequence-pin", "");
    const poster = new Image();
    poster.alt = frames.poster.alt;
    poster.src = source(frames.poster);
    stage.append(poster);
    states.set(root, {root, stage, frames, poster, manualPin, target:0, displayed:-1, pending:0, cache:new Map(), failed:new Set(), live:true});
    if (!style.isConnected) document.head.append(style);
    root.setAttribute(readyAttr,"");
    root.prepend(stage);
    if (sizes) sizes.observe(root);
    if (viewport) viewport.observe(root);
    else { nearby.add(root); schedule(); }
  }

  const config = ["data-imweb-motion", "data-frame-src", "data-frame-count", "data-frame-start", "data-frame-pad"];
  const watcher = new MutationObserver(records => {
    const refresh = new Set();
    for (const r of records) {
      if (r.type === "attributes") {
        if (config.includes(r.attributeName)) refresh.add(r.target);
        if (r.target.tagName === "IMG" && r.target.parentElement?.matches(selector)) refresh.add(r.target.parentElement);
        continue;
      }
      if (r.target.nodeType === 1 && r.target.matches(selector) &&
          [...r.addedNodes, ...r.removedNodes].some(n => n.nodeName === "IMG")) refresh.add(r.target);
      for (const el of r.addedNodes) {
        if (el.nodeType !== 1 || el.hasAttribute(stageAttr)) continue;
        if (el.matches(selector) && !states.has(el)) refresh.add(el);
        el.querySelectorAll(selector).forEach(root => { if (!states.has(root)) refresh.add(root); });
      }
    }
    for (const root of states.keys()) if (!root.isConnected) unmount(root);
    for (const root of refresh) { unmount(root); mount(root); }
  });
  watcher.observe(document.documentElement, {childList:true, subtree:true, attributes:true,
    attributeFilter:[...config,"src","srcset","data-src","data-original","alt"]});

  window.addEventListener("scroll", schedule, {passive:true, capture:true});
  window.addEventListener("resize", schedule, {passive:true});
  const updateMotion = () => {
    if (motion.matches) {
      for (const state of states.values()) {
        state.stage.replaceChildren(state.poster);
        state.displayed = -1;
      }
    } else schedule();
  };
  if (motion.addEventListener) motion.addEventListener("change",updateMotion);
  else if (motion.addListener) motion.addListener(updateMotion);
  document.querySelectorAll(selector).forEach(mount);
})();
