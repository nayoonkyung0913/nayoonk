(function () {
  "use strict";
  const key = Symbol.for("mines.imweb.squeeze-peanut.0.3.0");
  if (window[key]) return;
  window[key] = true;

  const selector = '[data-squeeze-peanut-version="0.3.0"]';
  const active = new Map();
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");
  const clamp = value => Math.max(0, Math.min(1, value));
  let nextId = 0;

  function button(parent, label, name, value) {
    const node = document.createElement("button");
    node.type = "button";
    node.textContent = label;
    node.setAttribute(name, value);
    parent.appendChild(node);
    return node;
  }

  function getControls(root, parts) {
    const { track, flavors, panels } = parts;
    let bar = flavors.querySelector(".tabbar");
    if (!bar) {
      bar = document.createElement("div");
      bar.className = "tabbar";
      const stage = flavors.querySelector(".flavor-stage") || panels[0];
      stage.before(bar);
    }
    let tabs = Array.from(bar.querySelectorAll("button[data-flavor]"));
    if (tabs.length !== panels.length) {
      bar.replaceChildren();
      tabs = panels.map((panel, i) => button(bar, panel.dataset.flavorName || panel.querySelector("h3")?.textContent.trim() || ("맛 " + (i + 1)), "data-flavor", String(i)));
    }
    bar.setAttribute("role", "tablist");
    bar.setAttribute("aria-label", "맛 선택");
    let controls = root.querySelector(".gallery-controls");
    if (!controls) {
      controls = document.createElement("div");
      controls.className = "gallery-controls";
      track.after(controls);
    }
    let motion = controls.querySelector("button.motion");
    if (!motion) motion = button(controls, "움직임 멈추기", "class", "motion");
    for (const [value, text, label] of [["-1", "←", "이전 사진"], ["1", "→", "다음 사진"]]) {
      let arrow = controls.querySelector('button[data-slide="' + value + '"]');
      if (!arrow) arrow = button(controls, text, "data-slide", value);
      arrow.setAttribute("aria-label", label);
    }
    return { tabs, bar, controls, motion };
  }

  function mount(root) {
    const get = s => root.querySelector(s);
    const hero = get(".hero"), art = get(".hero-art"), photo = get(".texture-photo");
    const story = root.querySelector(".pb-flavor-story");
    const stage = story?.querySelector(".pb-rail-stage");
    const rail = story?.querySelector(".pb-making-grid");
    const spoonScene = photo?.closest(".pb-spoon-scroll");
    const squeezeScene = photo?.closest("[data-squeeze-scene]");
    const track = get(".gallery-track"), flavors = get(".flavors");
    const belt = track?.querySelector(".gallery-belt");
    const group = belt?.querySelector(':scope > .gallery-group:not([aria-hidden="true"])');
    const panels = flavors ? Array.from(flavors.querySelectorAll(".flavor-panel")) : [];
    if (!hero || !art || !photo || !group?.children.length || !panels.length) return;

    // Upgrade existing Imweb editor HTML without requiring it to be pasted again.
    let heroScene = null;
    if (!root.hasAttribute("data-hero-preview") && art.querySelector(":scope > .photo")) {
      heroScene = hero.closest(".pb-hero-meet");
      if (!heroScene) {
        heroScene = document.createElement("div");
        heroScene.className = "pb-hero-meet";
        hero.before(heroScene);
        heroScene.append(hero);
      }
      const jarPhoto = art.querySelector(":scope > .photo");
      if (jarPhoto) jarPhoto.style.aspectRatio = "675 / 896";
    }

    const { tabs, bar, controls, motion } = getControls(root, { track, flavors, panels });
    const arrows = Array.from(controls.querySelectorAll("button[data-slide]"));
    const galleryCards = Array.from(group.children);
    const recipes = Array.from(root.querySelectorAll("[data-recipe-direction]"));
    belt.querySelectorAll(':scope > .gallery-group[aria-hidden="true"]').forEach(el => el.remove());
    const clone = group.cloneNode(true);
    clone.setAttribute("aria-hidden", "true");
    clone.inert = true;
    clone.removeAttribute("id");
    clone.querySelectorAll("[id]").forEach(el => el.removeAttribute("id"));
    clone.querySelectorAll("img").forEach(img => { img.alt = ""; });
    group.after(clone);

    const id = "pb-v3-0-2-ui-" + (++nextId);
    panels.forEach((panel, i) => {
      const tab = tabs[i];
      tab.id = id + "-tab-" + i;
      // Preserve author-supplied panel anchor IDs for links in the description.
      if (!panel.id || panel.id.startsWith("pb-v3-ui-") || panel.id.startsWith("pb-v3-0-1-ui-") || panel.id.startsWith("pb-v3-0-2-ui-")) panel.id = id + "-panel-" + i;
      tab.setAttribute("role", "tab");
      tab.setAttribute("aria-controls", panel.id);
      panel.setAttribute("role", "tabpanel");
      panel.setAttribute("aria-labelledby", tab.id);
    });
    const controller = new AbortController();
    const { signal } = controller;
    let layoutFrame = 0;

    function fitViewport() {
      layoutFrame = 0;
      if (!root.isConnected || !root.getClientRects().length) return;
      const rect = root.getBoundingClientRect();
      if (!rect.width) return;
      // clientWidth excludes the scrollbar. Measure the actual left edge so
      // nested padding and off-centre content columns also align correctly.
      const margin = parseFloat(getComputedStyle(root).marginLeft) || 0;
      const values = {
        "--pb-viewport-width": document.documentElement.clientWidth + "px",
        "--pb-viewport-offset": (margin - rect.left).toFixed(3) + "px"
      };
      for (const [name, value] of Object.entries(values)) {
        if (root.style.getPropertyValue(name) !== value) root.style.setProperty(name, value);
      }
    }

    function scheduleLayout() {
      if (!layoutFrame) layoutFrame = requestAnimationFrame(fitViewport);
    }

    const layoutObserver = "ResizeObserver" in window ? new ResizeObserver(scheduleLayout) : null;
    if (layoutObserver) {
      layoutObserver.observe(document.documentElement);
      layoutObserver.observe(root.parentElement);
      layoutObserver.observe(root);
    }
    window.addEventListener("resize", scheduleLayout, { passive: true, signal });
    fitViewport();

    let index = 0, frame = 0, timer = 0;
    let userPaused = false;
    const paused = () => userPaused || reduced.matches;

    function choose(i, focus) {
      index = i;
      tabs.forEach((tab, n) => {
        tab.setAttribute("aria-selected", String(n === i));
        tab.tabIndex = n === i ? 0 : -1;
        panels[n].hidden = n !== i;
      });
      if (panels[i].dataset.color) flavors.style.setProperty("--flavor-bg", panels[i].dataset.color);
      if (panels[i].dataset.ink) flavors.style.setProperty("--flavor-ink", panels[i].dataset.ink);
      if (focus) tabs[i].focus();
    }
    function rotation() {
      clearInterval(timer);
      if (panels.length < 2 || paused()) return;
      timer = setInterval(() => {
        if (!root.isConnected || document.hidden || bar.querySelector(":focus-visible")) return;
        const rect = flavors.getBoundingClientRect();
        if (rect.height && rect.bottom > 0 && rect.top < innerHeight) choose((index + 1) % panels.length, false);
      }, 2000);
    }
    tabs.forEach((tab, i) => {
      tab.addEventListener("click", () => { choose(i, false); rotation(); }, { signal });
      tab.addEventListener("keydown", event => {
        const last = tabs.length - 1;
        const keys = { ArrowRight: (i + 1) % tabs.length, ArrowLeft: (i + last) % tabs.length, Home: 0, End: last };
        if (!Object.hasOwn(keys, event.key)) return;
        event.preventDefault();
        choose(keys[event.key], true);
        rotation();
      }, { signal });
    });
    function paintHero() {
      if (!heroScene || !root.isConnected) return;
      const rect = heroScene.getBoundingClientRect();
      const range = Math.max(1, heroScene.offsetHeight - hero.offsetHeight);
      const progress = paused() ? 1 : clamp(-rect.top / (range * .8));
      const remain = 1 - progress * progress * (3 - 2 * progress);
      // Start at opposite viewport edges and meet at the unchanged final layout.
      const heroRect = hero.getBoundingClientRect();
      const artRect = art.getBoundingClientRect();
      const centerY = artRect.top - heroRect.top + artRect.height / 2;
      const visibleHeight = Math.min(hero.clientHeight, window.innerHeight);
      art.style.setProperty("--meet-large-y", (-centerY * remain).toFixed(2) + "px");
      art.style.setProperty("--meet-small-y", ((visibleHeight - centerY) * remain).toFixed(2) + "px");
      art.style.setProperty("--meet-large-angle", (-2.5 * remain).toFixed(2) + "deg");
      art.style.setProperty("--meet-small-angle", (2.5 * remain).toFixed(2) + "deg");
      hero.style.setProperty("--hero-copy-opacity", clamp((progress - .8) / .2).toFixed(3));
      heroScene.dataset.progress = progress.toFixed(3);
    }
    function paintSqueeze() {
      if (!squeezeScene) return;
      const scene = squeezeScene.getBoundingClientRect();
      const pinned = squeezeScene.querySelector('.pb-squeeze-stage');
      const raw = paused() ? 1 : clamp(-scene.top / Math.max(1, (scene.height - pinned.offsetHeight) * .90));
      const progress = raw * raw * (3 - 2 * raw);
      squeezeScene.style.setProperty('--pour-crop', ((1-progress)*37).toFixed(3)+'%');
      squeezeScene.style.setProperty('--sauce-visible', String(progress > .006 ? 1 : 0));

      squeezeScene.dataset.progress = progress.toFixed(3);
    }
    function paint() {
      frame = 0;
      if (paused() || !root.isConnected) return;
      paintSqueeze();
      const height = innerHeight;
      const h = hero.getBoundingClientRect();
      const t = photo.getBoundingClientRect();
      const boxes = recipes.map(image => image.getBoundingClientRect());
      if (heroScene) paintHero();
      else if (h.height && h.bottom > 0 && h.top < height) {
        const progress = clamp(-h.top / h.height);
        art.style.setProperty("--hy", progress * 70 + "px");
        art.style.setProperty("--hr", (-7 + progress * 18) + "deg");
      }
      if (spoonScene) {
        const scene = spoonScene.getBoundingClientRect();
        const stage = photo.parentElement.getBoundingClientRect();
        const progress = clamp(-scene.top / Math.max(1, (scene.height - stage.height) * .82));
        const travel = (scene.width + t.width) / 2;
        photo.style.setProperty("--spoon-x", (travel * (1 - progress)).toFixed(2) + "px");
      } else {
        const p = clamp((height * .95 - t.top) / (height * .60));
        photo.style.setProperty("--ts", String(.62 + p * (2 - p) * .46));
      }
      if (stage && rail && stage.offsetHeight < story.offsetHeight) {
        const rect = story.getBoundingClientRect();
        const progress = clamp(-rect.top / (rect.height - stage.offsetHeight));
        const stageWidth = stage.clientWidth;
        const railWidth = rail.scrollWidth;
        const end = railWidth <= stageWidth ? (stageWidth - railWidth) / 2 : stageWidth - railWidth - stageWidth * .05;
        const railX = stageWidth + (end - stageWidth) * clamp(progress / .82);
        stage.style.setProperty("--rail-x", railX + "px");
      }
      recipes.forEach((image, i) => {
        const progress = clamp((height - boxes[i].top) / (height + boxes[i].height));
        const angle = Math.sin(progress * 2 * Math.PI) * 20 * (Number(image.dataset.recipeDirection) || 0);
        image.style.setProperty("--pb-recipe-angle", angle.toFixed(2) + "deg");
      });
    }
    function schedule() { if (!frame && !paused()) frame = requestAnimationFrame(paint); }
    function sync() {
      root.classList.toggle("is-paused", paused());
      motion.setAttribute("aria-pressed", String(paused()));
      motion.textContent = paused() ? "움직임 켜기" : "움직임 멈추기";
      paintHero();
      paintSqueeze();
      if (paused()) {
        art.style.setProperty("--hy", "0px"); art.style.setProperty("--hr", "-7deg");
        photo.style.setProperty("--ts", "1");
      } else schedule();
      rotation();
    }
    motion.addEventListener("click", () => { userPaused = !userPaused; sync(); }, { signal });
    reduced.addEventListener("change", sync, { signal });
    window.addEventListener("scroll", schedule, { passive: true, signal });
    window.addEventListener("resize", schedule, { passive: true, signal });
    for (const arrow of arrows) {
      arrow.addEventListener("click", () => {
        const step = Number(arrow.dataset.slide);
        const anim = belt.getAnimations?.()[0];
        const duration = Number(anim?.effect?.getTiming().duration);
        if (!duration || reduced.matches) track.scrollBy({ left: step * track.clientWidth * .72, behavior: "auto" });
        else anim.currentTime = ((Number(anim.currentTime) || 0) + step * duration / galleryCards.length + duration) % duration;
      }, { signal });
    }
    root.addEventListener("click", event => {
      const link = event.target.closest?.('a[href^="#pb-"]');
      if (!link) return;
      const target = root.querySelector("#" + CSS.escape(link.getAttribute("href").slice(1)));
      if (target) { event.preventDefault(); target.scrollIntoView({ behavior: paused() ? "auto" : "smooth", block: "start" }); }
    }, { signal });
    const enters = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { if (!paused()) e.target.classList.add("enter"); enters.unobserve(e.target); }
    }, { threshold: .15 }) : null;
    if (enters) {
      root.querySelectorAll(".ingredient, .process-grid article, .recipe-card, .pb-making > h3, .pb-making-card")
        .forEach(el => enters.observe(el));
    }
    root.classList.add("enhanced");
    root.dataset.ready = "1";
    choose(0, false);
    sync();

    const heroObserver = heroScene && "ResizeObserver" in window ? new ResizeObserver(paintHero) : null;
    if (heroObserver) { heroObserver.observe(hero); heroObserver.observe(art); }
    const needed = [hero, art, photo, track, group, clone, flavors, bar, motion, ...tabs, ...panels, ...galleryCards, ...arrows, ...(heroScene ? [heroScene] : [])];
    active.set(root, {
      complete: () => needed.every(el => root.contains(el)) && group.children.length === galleryCards.length &&
        flavors.querySelectorAll(".flavor-panel").length === panels.length,
      remove() {
        controller.abort(); clearInterval(timer); cancelAnimationFrame(frame); enters?.disconnect();
        layoutObserver?.disconnect(); cancelAnimationFrame(layoutFrame);
        heroObserver?.disconnect();
        root.style.removeProperty("--pb-viewport-width");
        root.style.removeProperty("--pb-viewport-offset");
        clone.remove();
        root.classList.remove("enhanced", "is-paused"); delete root.dataset.ready;
        panels.forEach(panel => { panel.hidden = false; });
        active.delete(root);
      }
    });
  }

  function update(root) {
    const state = active.get(root);
    const eligible = root.isConnected && root.matches(selector);
    if (state && (!eligible || !state.complete())) state.remove();
    if (eligible) {
      // Keep the two Squeeze Peanut product labels at their supplied 330g content.
      const sizes = "330g";
      root.querySelectorAll(".pb-product-info dt").forEach(label => {
        const value = label.nextElementSibling;
        if (label.textContent.replace(/\s/g, "") === "총내용량" && value?.tagName === "DD" && value.textContent !== sizes) value.textContent = sizes;
      });
      if (!active.has(root)) mount(root);
    }
  }
  const watcher = new MutationObserver(records => {
    const roots = new Set();
    let removed = false;
    for (const record of records) {
      if (active.has(record.target)) roots.add(record.target);
      const parent = record.target.closest?.(selector);
      if (parent) roots.add(parent);
      for (const el of record.addedNodes) {
        if (el.nodeType !== 1) continue;
        if (el.matches(selector)) roots.add(el);
        el.querySelectorAll(selector).forEach(root => roots.add(root));
      }
      if (record.removedNodes.length) removed = true;
    }
    if (removed) for (const root of active.keys()) if (!root.isConnected) roots.add(root);
    roots.forEach(update);
  });
  watcher.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-squeeze-peanut-version"] });
  document.querySelectorAll(selector).forEach(update);
})();
