(function () {
  "use strict";
  const key = Symbol.for("mines.imweb.filmstrip.v1");
  if (window[key]) return;
  window[key] = true;

  const selector = '[data-imweb-motion="marquee"]';
  const mounted = new Map();
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  const style = document.createElement("style");
  style.textContent = `
    .imw-film-rail { display:block; width:100%; min-width:0; overflow-x:auto; overflow-y:hidden; overscroll-behavior-x:contain; scrollbar-width:thin; direction:ltr; container-type:inline-size; scroll-behavior:auto; overflow-anchor:none; }
    .imw-film-track,.imw-film-group { display:flex; align-items:center; width:max-content; }
    .imw-film-group { --film-gap:var(--imweb-marquee-gap,12px); gap:var(--film-gap); padding-inline-end:var(--film-gap); }
    .imw-film-cell { display:grid; place-items:center; flex:none; width:var(--imweb-marquee-width,clamp(144px,48cqw,320px)); aspect-ratio:var(--imweb-marquee-ratio,4/3); }
    .imw-film-cell > *, .imw-film-cell img { display:block; width:100%; height:100%; min-height:0; max-width:100%; margin:0; object-fit:contain; }
    .imw-film-buttons { display:flex; flex-wrap:wrap; align-items:center; justify-content:flex-end; gap:6px; margin-block:8px; }
    .imw-film-buttons button { appearance:none; font:inherit; font-size:14px; line-height:1.25; color:inherit; background:transparent; padding:7px 11px; min-height:36px; border:1px solid currentColor; border-radius:999px; cursor:pointer; }
    .imw-film-buttons button[hidden] { display:none; }
    .imw-film-rail:focus-visible,.imw-film-buttons button:focus-visible { outline:2px solid currentColor; outline-offset:-2px; }
  `;
  function element(kind, className) {
    const node = document.createElement(kind);
    node.className = className;
    return node;
  }
  function isItem(node) {
    return node.matches("img") || (node.matches("a") && node.childElementCount === 1 && node.firstElementChild.matches("img"));
  }
  function mount(root, items) {
    const controller = new AbortController();
    const signal = controller.signal;
    const rail = element("div", "imw-film-rail");
    const track = element("div", "imw-film-track");
    const first = element("div", "imw-film-group");
    const buttons = element("div", "imw-film-buttons");
    rail.tabIndex = 0;
    rail.setAttribute("role", "region");
    rail.setAttribute("aria-label", root.getAttribute("aria-label") || "가로 이미지 모음");
    buttons.setAttribute("role","group");
    buttons.setAttribute("aria-label","이미지 흐름 조절");
    const places = items.map(() => document.createComment("imweb-marquee-item"));
    root.insertBefore(rail, items[0]);
    root.insertBefore(buttons, rail.nextSibling);
    items.forEach((item, index) => {
      item.before(places[index]);
      const cell = element("div","imw-film-cell");
      cell.append(item);
      first.append(cell);
    });
    track.append(first);
    rail.append(track);
    if (!style.isConnected) document.head.append(style);

    let playing = !motion.matches;
    let visible = true;
    let hovering = false;
    let cycle = 0;
    let frame = 0;
    let previousTime = 0;
    let remainder = 0;
    function stop() {
      cancelAnimationFrame(frame);
      frame = previousTime = 0;
    }
    function advance(now) {
      if (previousTime && cycle) {
        remainder += Math.min(now - previousTime, 100) * 0.032;
        const pixels = Math.floor(remainder);
        remainder -= pixels;
        if (pixels) rail.scrollLeft = (rail.scrollLeft + pixels) % cycle;
      }
      previousTime = now;
      frame = requestAnimationFrame(advance);
    }
    function sync() {
      stop();
      if (playing && cycle && visible && !motion.matches && !hovering && !document.hidden) frame = requestAnimationFrame(advance);
    }
    const button = (label, run) => {
      const node = document.createElement("button");
      node.type = "button";
      node.textContent = label;
      node.addEventListener("click", run, {signal});
      buttons.append(node);
      return node;
    };
    function setPlaying(value) {
      playing = value;
      toggle.hidden = motion.matches;
      toggle.textContent = value ? "일시정지" : "자동 재생";
      sync();
    }
    function step(dir) {
      setPlaying(false);
      if (!cycle) return;
      const pitch = cycle / items.length;
      const position = rail.scrollLeft % cycle;
      const index = dir > 0 ? Math.floor(position / pitch + .025) + 1 : Math.ceil(position / pitch - .025) - 1;
      const wrap = index < 0 ? cycle : 0;
      rail.scrollLeft = position + wrap;
      rail.scrollTo({left: index * pitch + wrap, behavior: motion.matches ? "instant" : "smooth"});
    }
    button("이전", () => step(-1));
    const toggle = button("", () => setPlaying(!playing));
    button("다음", () => step(1));

    function rebuildCopies() {
      const width = rail.clientWidth;
      cycle = first.getBoundingClientRect().width;
      // A hidden Imweb detail tab has no usable layout until it opens.
      if (cycle < 1 || width < 1) { cycle = 0; sync(); return; }
      while (track.lastElementChild !== first) track.lastElementChild.remove();
      const repeats = Math.max(1, Math.ceil((width + 2) / cycle));
      for (let group = 0; group < repeats; group++) {
        const copy = element("div", "imw-film-group");
        copy.setAttribute("aria-hidden","true");
        items.forEach((item, index) => {
          const original = item.matches("img") ? item : item.firstElementChild;
          if (!original) return;
          const image = document.createElement("img");
          for (const attr of ["sizes","srcset","src"]) {
            if (original.hasAttribute(attr)) image.setAttribute(attr, original.getAttribute(attr));
          }
          const fullSource = original.getAttribute("data-original") || original.getAttribute("data-src");
          if (fullSource) image.src = fullSource;
          image.alt = "";
          image.draggable = false;
          const cell = element("div", "imw-film-cell");
          cell.dataset.imwFilmCopy = index;
          if (item.matches("a[href]")) cell.style.cursor = "pointer";
          cell.append(image);
          copy.append(cell);
        });
        track.append(copy);
      }
      sync();
    }
    rail.addEventListener("click", e => {
      const cell = e.target.closest("[data-imw-film-copy]");
      if (!cell) return;
      const original = items[Number(cell.dataset.imwFilmCopy)];
      if (original) original.dispatchEvent(new MouseEvent("click", {bubbles:true, cancelable:true,
        ctrlKey:e.ctrlKey, altKey:e.altKey, shiftKey:e.shiftKey, metaKey:e.metaKey}));
    }, {signal});
    rail.addEventListener("pointerenter", e => { hovering = e.pointerType === "mouse"; sync(); }, {signal});
    rail.addEventListener("pointerleave", () => { hovering = false; sync(); }, {signal});
    rail.addEventListener("focusin", () => setPlaying(false), {signal});
    rail.addEventListener("pointerdown", () => setPlaying(false), {signal, passive:true});
    rail.addEventListener("wheel", e => { if (e.deltaX || e.shiftKey) setPlaying(false); }, {signal, passive:true});
    rail.addEventListener("keydown", e => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      step(e.key === "ArrowLeft" ? -1 : 1);
    }, {signal});
    motion.addEventListener("change", () => setPlaying(!motion.matches), {signal});
    document.addEventListener("visibilitychange", sync, {signal});
    const view = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
      visible = entries[0].isIntersecting; sync();
    }) : null;
    if (view) view.observe(rail);
    const size = "ResizeObserver" in window ? new ResizeObserver(rebuildCopies) : null;
    if (size) { size.observe(rail); size.observe(first); }
    else window.addEventListener("resize", rebuildCopies, {signal});
    const sources = new MutationObserver(rebuildCopies);
    sources.observe(first, {subtree:true, attributes:true, attributeFilter:["src","srcset","sizes","data-src","data-original"]});
    setPlaying(playing);
    rebuildCopies();
    mounted.set(root, {rail, cleanup() {
      controller.abort(); stop(); sources.disconnect();
      if (view) view.disconnect();
      if (size) size.disconnect();
      items.forEach((item, index) => {
        if (places[index].parentNode === root) places[index].replaceWith(item);
      });
      rail.remove(); buttons.remove();
      mounted.delete(root);
    }});
  }

  function update(root) {
    const state = mounted.get(root);
    const eligible = root.isConnected && root.matches(selector);
    const changed = state && (state.rail.parentNode !== root || Array.from(root.children).some(isItem));
    if (state && (!eligible || changed)) state.cleanup();
    if (eligible && !mounted.has(root)) {
      // A theme may clone the already-mounted desktop DOM into a mobile panel.
      const previous = root.querySelector(":scope > .imw-film-rail");
      if (previous) {
        const originals = Array.from(previous.querySelectorAll(".imw-film-track > .imw-film-group:first-child > .imw-film-cell > *")).filter(isItem);
        if (originals.length) {
          const anchors = Array.from(root.childNodes).filter(n => n.nodeType === 8 && n.data === "imweb-marquee-item");
          originals.forEach((item, index) => anchors[index] ? anchors[index].replaceWith(item) : previous.before(item));
          if (previous.nextElementSibling?.classList.contains("imw-film-buttons")) previous.nextElementSibling.remove();
          previous.remove();
        }
      }
      const items = Array.from(root.children).filter(isItem);
      if (items.length >= 2) mount(root, items);
    }
  }
  const observer = new MutationObserver(records => {
    const roots = new Set();
    let removed = false;
    for (const record of records) {
      if (record.type === "attributes" || mounted.has(record.target) || record.target.matches(selector)) roots.add(record.target);
      for (const node of record.addedNodes) {
        if (node.nodeType !== 1) continue;
        if (node.matches(selector)) roots.add(node);
        node.querySelectorAll(selector).forEach(root => roots.add(root));
      }
      if (record.removedNodes.length) removed = true;
    }
    if (removed) for (const root of mounted.keys()) if (!root.isConnected) roots.add(root);
    roots.forEach(update);
    if (!mounted.size && style.isConnected) style.remove();
  });
  observer.observe(document.documentElement, {subtree:true, childList:true, attributes:true, attributeFilter:["data-imweb-motion"]});
  document.querySelectorAll(selector).forEach(update);
})();
