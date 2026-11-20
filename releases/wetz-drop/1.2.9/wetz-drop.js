(function () {
  "use strict";
  const key = Symbol.for("mines.imweb.wetz-drop.1.2.9");
  if (window[key]) return;
  window[key] = true;

  const selector = '[data-wetz-drop-version="1.2.9"],[data-wetz-drop-version="1.2.5"],[data-wetz-drop-version="1.2.6"],[data-wetz-drop-version="1.2.7"],[data-wetz-drop-version="1.2.8"]';
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
    for (const [value, text, label] of [["-1", "←", "이전 사진"], ["1", "→", "다음 사진"]]) {
      let arrow = controls.querySelector('button[data-slide="' + value + '"]');
      if (!arrow) arrow = button(controls, text, "data-slide", value);
      arrow.setAttribute("aria-label", label);
    }
    return { tabs, bar, controls };
  }

  // Imweb's editor removes empty spans. Recreate visual layers after saving.
  function repairMarkup(root) {
    const ensure = (parent, selector, className) => {
      if (!parent || parent.querySelector(selector)) return;
      const layer = document.createElement('span');
      layer.className = className;
      layer.setAttribute('aria-hidden', 'true');
      parent.appendChild(layer);
    };
    const frame = root.querySelector('.wd-drop-frame');
    ensure(frame, '.wd-falling-drop', 'wd-falling-drop');
    ensure(frame, '.wd-impact-ring:not(.wd-impact-ring-two)', 'wd-impact-ring');
    ensure(frame, '.wd-impact-ring-two', 'wd-impact-ring wd-impact-ring-two');
    ensure(frame, '.wd-impact-splash', 'wd-impact-splash');
    root.querySelectorAll('.wd-box').forEach(box => {
      ensure(box, '.wd-box-top', 'wd-box-top');
      ensure(box, '.wd-box-side', 'wd-box-side');
    });

    // Upgrade saved Imweb product bodies through the common code alone.
    if (['1.2.5', '1.2.6', '1.2.7', '1.2.8'].includes(root.dataset.wetzDropVersion)) {
      const core = root.querySelector('#wd-ingredients');
      if (core) core.innerHTML = "<p class=\"eyebrow\">CLEAN & SIMPLE</p><h2 class=\"title\">필요한 것은 담고,<br>설탕은 가볍게 비우고.</h2><p class=\"copy wd-mineral-basis\">한 병(50g) 기준 함량</p><div class=\"ingredients\"><article class=\"ingredient\"><div class=\"wd-mineral\">Na<span>나트륨</span></div><h3>2,185mg</h3><p>한 병(50g) 기준 나트륨 함량</p></article><article class=\"ingredient\"><div class=\"wd-mineral\">K<span>칼륨</span></div><h3>1,014mg</h3><p>한 병(50g) 기준 칼륨 함량</p></article><article class=\"ingredient\"><div class=\"wd-mineral\">Ca<span>칼슘</span></div><h3>114mg</h3><p>한 병(50g) 기준 칼슘 함량</p></article></div>";
      root.querySelectorAll('.wd-nutrition tbody').forEach(body => {
        body.innerHTML = "<tr><th scope=\"row\">나트륨</th><td>2,185mg</td><td>109%</td></tr><tr><th scope=\"row\">칼륨</th><td>1,014mg</td><td>29%</td></tr><tr><th scope=\"row\">칼슘</th><td>114mg</td><td>16%</td></tr><tr><th scope=\"row\">탄수화물</th><td>0g</td><td>0%</td></tr><tr><th scope=\"row\">당류</th><td>0g</td><td>0%</td></tr><tr><th scope=\"row\">지방</th><td>0g</td><td>0%</td></tr><tr><th scope=\"row\">트랜스지방</th><td>0g</td><td>-</td></tr><tr><th scope=\"row\">포화지방</th><td>0g</td><td>0%</td></tr><tr><th scope=\"row\">콜레스테롤</th><td>0mg</td><td>0%</td></tr><tr><th scope=\"row\">단백질</th><td>0g</td><td>0%</td></tr>";
      });
      const dropImage = root.querySelector('.wd-drop-base');
      if (dropImage) dropImage.src = "https://ecimg.cafe24img.com/pg3547b37711334091/nayoonk/web/upload/wetz-drop/wetz-drop-drop-cutout-arm-v3-1e82b050a743.png";
      root.querySelectorAll('.wd-box-print > img[src*="wetz-drop-pack-1-"]').forEach(image => {
        image.src = "https://ecimg.cafe24img.com/pg3547b37711334091/nayoonk/web/upload/wetz-drop/wetz-drop-box-cherry-vector-0faabcd505e8.svg";
        image.classList.add('wd-box-vector');
      });
      const wordmark = root.querySelector('.hero-type');
      if (wordmark) {
        const logo = document.createElement('img');
        logo.className = 'wd-brand-logo';
        logo.src = "https://ecimg.cafe24img.com/pg3547b37711334091/nayoonk/web/upload/wetz-drop/wetz-drop-logo-original-87e9d2178270.svg";
        logo.alt = 'WETZ DROP · ZERO SUGAR · 무설탕';
        logo.width = 435;
        logo.height = 164;
        logo.decoding = 'async';
        logo.loading = 'eager';
        wordmark.replaceChildren(logo);
        wordmark.removeAttribute('aria-hidden');
      }
      root.dataset.wetzDropVersion = '1.2.9';
    }
  }

  function mount(root) {
    const get = s => root.querySelector(s);
    const hero = get(".hero"), art = get(".hero-art"), photo = get(".texture-photo");
    const story = root.querySelector(".wd-flavor-story");
    const stage = story?.querySelector(".wd-rail-stage");
    const rail = story?.querySelector(".wd-making-grid");
    const spoonScene = photo?.closest(".wd-spoon-scroll");
    const squeezeScene = photo?.closest(".wd-squeeze-scroll,[data-squeeze-scene]");
    const track = get(".gallery-track"), flavors = get(".flavors");
    const belt = track?.querySelector(".gallery-belt");
    const group = belt?.querySelector(':scope > .gallery-group:not([aria-hidden="true"])');
    const panels = flavors ? Array.from(flavors.querySelectorAll(".flavor-panel")) : [];
    if (!hero || !art || !photo || !group?.children.length || !panels.length) return;

    // Upgrade existing Imweb editor HTML without requiring it to be pasted again.
    let heroScene = null;
    if (!root.hasAttribute("data-hero-preview") && art.querySelector(".wd-hero-mini")) {
      heroScene = hero.closest(".wd-hero-meet");
      if (!heroScene) {
        heroScene = document.createElement("div");
        heroScene.className = "wd-hero-meet";
        hero.before(heroScene);
        heroScene.append(hero);
      }
      const jarPhoto = art.querySelector(":scope > .photo");
      // Product dimensions come from the 1.5x packaging composition.
    }

    const { tabs, bar, controls } = getControls(root, { track, flavors, panels });
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

    const id = "wd-v3-0-2-ui-" + (++nextId);
    panels.forEach((panel, i) => {
      const tab = tabs[i];
      tab.id = id + "-tab-" + i;
      // Preserve author-supplied panel anchor IDs for links in the description.
      if (!panel.id || panel.id.startsWith("wd-v3-ui-") || panel.id.startsWith("wd-v3-0-1-ui-") || panel.id.startsWith("wd-v3-0-2-ui-")) panel.id = id + "-panel-" + i;
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
        "--wd-viewport-width": document.documentElement.clientWidth + "px",
        "--wd-viewport-offset": (margin - rect.left).toFixed(3) + "px"
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
    const paused = () => reduced.matches;

    function choose(i, focus) {
      index = i;
      tabs.forEach((tab, n) => {
        tab.setAttribute("aria-selected", String(n === i));
        tab.tabIndex = n === i ? 0 : -1;
        panels[n].hidden = n !== i;
      });
      if (panels[i].dataset.color) flavors.style.setProperty("--flavor-bg", panels[i].dataset.color);
      if (panels[i].dataset.ink) flavors.style.setProperty("--flavor-ink", panels[i].dataset.ink);
      if (panels[i].dataset.tabInk) flavors.style.setProperty("--flavor-tab-ink", panels[i].dataset.tabInk);
      if (focus) tabs[i].focus();
    }
    function rotation() {
      clearInterval(timer);
      if (panels.length < 2 || paused()) return;
      timer = setInterval(() => {
        if (!root.isConnected || document.hidden || bar.querySelector(":focus-visible")) return;
        const rect = flavors.getBoundingClientRect();
        if (rect.height && rect.bottom > 0 && rect.top < innerHeight) choose((index + 1) % panels.length, false);
      }, 6000);
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
      const pinned = squeezeScene.querySelector('.wd-squeeze-stage');
      const progress = paused() ? 1 : clamp(-scene.top / Math.max(1, (scene.height - pinned.offsetHeight) * .92));
      // Photo coordinates stay fixed. The drop grows at the pipette, falls with
      // acceleration, and reaches the photographed water surface before rippling.
      const grow = clamp(progress / .18);
      const fall = clamp((progress - .18) / .56);
      const impact = clamp((progress - .74) / .26);
      const y = 43.50 + 13.85 * fall * fall;
      const splash = Math.sin(Math.PI * clamp(impact * 3));
      const values = {
        '--drop-y': y.toFixed(4) + '%',
        '--drop-opacity': progress < .74 ? (grow > .025 ? '1' : '0') : Math.max(0, 1 - impact * 12).toFixed(4),
        '--drop-scale-x': (.18 + .82 * grow).toFixed(4),
        '--drop-scale-y': ((.18 + .82 * grow) * (1 + Math.sin(Math.PI * fall) * .32)).toFixed(4),
        '--drop-radius': (fall > .08 ? '48% 52% 48% 52%' : '48% 48% 53% 53%'),
        '--ripple-scale': (.05 + impact * 1.5).toFixed(4),
        '--ripple-opacity': (Math.sin(Math.PI * impact) * .8).toFixed(4),
        '--ripple-two-scale': (.04 + clamp((impact - .15) / .85) * 1.1).toFixed(4),
        '--splash-opacity': splash.toFixed(4),
        '--splash-rise': (-splash * 65).toFixed(3) + '%'
      };
      for (const [name, value] of Object.entries(values)) squeezeScene.style.setProperty(name, value);
      squeezeScene.dataset.progress = progress.toFixed(4);
      squeezeScene.dataset.dropPhase = progress < .18 ? 'forming' : progress < .74 ? 'falling' : 'impact';
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
        image.style.setProperty("--wd-recipe-angle", angle.toFixed(2) + "deg");
      });
    }
    function schedule() { if (!frame && !paused()) frame = requestAnimationFrame(paint); }
    function sync() {
      root.classList.toggle("is-paused", paused());
      paintHero();
      paintSqueeze();
      if (paused()) {
        art.style.setProperty("--hy", "0px"); art.style.setProperty("--hr", "-7deg");
        photo.style.setProperty("--ts", "1");
      } else schedule();
      rotation();
    }
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
      const link = event.target.closest?.('a[href^="#wd-"]');
      if (!link) return;
      const target = root.querySelector("#" + CSS.escape(link.getAttribute("href").slice(1)));
      if (target) { event.preventDefault(); target.scrollIntoView({ behavior: paused() ? "auto" : "smooth", block: "start" }); }
    }, { signal });
    const enters = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { if (!paused()) e.target.classList.add("enter"); enters.unobserve(e.target); }
    }, { threshold: .15 }) : null;
    if (enters) {
      root.querySelectorAll(".ingredient, .process-grid article, .recipe-card, .wd-making > h3, .wd-making-card")
        .forEach(el => enters.observe(el));
    }
    root.classList.add("enhanced");
    root.dataset.ready = "1";
    choose(0, false);
    sync();

    const heroObserver = heroScene && "ResizeObserver" in window ? new ResizeObserver(paintHero) : null;
    if (heroObserver) { heroObserver.observe(hero); heroObserver.observe(art); }
    const needed = [hero, art, photo, track, group, clone, flavors, bar, ...tabs, ...panels, ...galleryCards, ...arrows, ...(heroScene ? [heroScene] : [])];
    active.set(root, {
      complete: () => needed.every(el => root.contains(el)) && group.children.length === galleryCards.length &&
        flavors.querySelectorAll(".flavor-panel").length === panels.length,
      remove() {
        controller.abort(); clearInterval(timer); cancelAnimationFrame(frame); enters?.disconnect();
        layoutObserver?.disconnect(); cancelAnimationFrame(layoutFrame);
        heroObserver?.disconnect();
        root.style.removeProperty("--wd-viewport-width");
        root.style.removeProperty("--wd-viewport-offset");
        clone.remove();
        root.classList.remove("enhanced", "is-paused"); delete root.dataset.ready;
        panels.forEach(panel => { panel.hidden = false; });
        active.delete(root);
      }
    });
  }

  function update(root) {
    if (root.isConnected && root.matches(selector)) repairMarkup(root);
    const state = active.get(root);
    const eligible = root.isConnected && root.matches(selector);
    if (state && (!eligible || !state.complete())) state.remove();
    if (eligible) {
      // Keep the two Wetz Drop product labels at their supplied 280g content.
      const sizes = "50g";
      root.querySelectorAll(".wd-product-info dt").forEach(label => {
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
  watcher.observe(document.documentElement, { childList: true, subtree: true, attributes: true, attributeFilter: ["data-wetz-drop-version"] });
  document.querySelectorAll(selector).forEach(update);
})();
