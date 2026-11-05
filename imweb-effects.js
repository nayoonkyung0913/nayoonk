(function () {
  "use strict";
  const key = Symbol.for("mines.imweb.fx.v1");
  if (window[key]) return;
  window[key] = true;
  const here = document.currentScript.src;
  const scope = '[data-imweb-fx="1"]';
  const effect = '[data-fx="fade-up"],[data-fx="zoom-in"]';
  const template = 'article.kz-story[data-kz-story][data-imweb-template="kazak"]';
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const waiting = new Set();
  const played = new WeakMap();
  const animations = new Map();
  let plugin = null;
  let aosTask = null;
  let aosAPI = null;
  let refreshFrame = 0;

  function refreshAos() {
    if (!aosAPI || refreshFrame || motion.matches) return;
    refreshFrame = requestAnimationFrame(() => { refreshFrame = 0; aosAPI.refreshHard(); });
  }
  function existingAos() {
    return window.AOS && typeof window.AOS.init === "function" && typeof window.AOS.refreshHard === "function";
  }
  function ensureAos() {
    if (motion.matches || !document.body) return;
    if (aosAPI) { refreshAos(); return; }
    if (aosTask) return;
    const src = new URL("aos/aos.js", here).href;
    const css = new URL("aos/aos.css", here).href;
    let tag, sheet;
    const engine = existingAos() ? Promise.resolve() : new Promise((resolve, reject) => {
      tag = document.createElement("script");
      tag.onload = resolve; tag.onerror = reject; tag.src = src;
      document.head.appendChild(tag);
    });
    aosTask = engine.then(() => {
      if (!existingAos()) throw new Error("AOS unavailable");
      if (!document.body.hasAttribute("data-aos-duration")) {
        window.AOS.init({ once: true, duration: 650, offset: 48, disableMutationObserver: true });
      }
      window.AOS.refreshHard();
      // Load the styles only after the engine starts. Failed JS must leave text visible.
      return new Promise((resolve, reject) => {
        sheet = document.createElement("link");
        sheet.rel = "stylesheet"; sheet.media = "(prefers-reduced-motion: no-preference)";
        sheet.onload = resolve; sheet.onerror = reject; sheet.href = css;
        document.head.appendChild(sheet);
      });
    }).then(() => {
      aosAPI = window.AOS;
      refreshAos();
      // Unspecified image dimensions, expanding details, and Imweb's detail tabs can shift offsets.
      document.addEventListener("load", ev => { if (ev.target.tagName === "IMG") refreshAos(); }, true);
      document.addEventListener("toggle", refreshAos, true);
      if ("ResizeObserver" in window) new ResizeObserver(refreshAos).observe(document.body);
    }).catch(() => {
      if (sheet) sheet.remove();
      if (tag) tag.remove();
      aosTask = null;
    });
  }

  function inScope(el) { return el.isConnected && el.closest(scope); }
  function render(el) {
    if (!inScope(el) || !el.matches(effect) || motion.matches || !el.animate) return;
    const name = el.dataset.fx;
    if (played.get(el) === name) return;
    played.set(el, name);
    const css = getComputedStyle(el);
    const from = {opacity: "0"};
    const to = {opacity: css.opacity};
    if (name === "fade-up") { from.translate = "0 20px"; to.translate = css.translate; }
    else { from.scale = "0.96"; to.scale = css.scale; }
    const anim = el.animate([from, to], {duration: 540, easing: "cubic-bezier(.2,.7,.2,1)"});
    animations.set(el, anim);
    const clear = () => { if (animations.get(el) === anim) animations.delete(el); };
    anim.onfinish = anim.oncancel = clear;
  }
  const io = "IntersectionObserver" in window ? new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      io.unobserve(entry.target); waiting.delete(entry.target);
      render(entry.target);
    }
  }, {threshold: 0}) : null;

  function register(el) {
    if (el.hasAttribute("data-aos")) ensureAos();
    if (!inScope(el)) return;
    if (el.matches(template) && !plugin) {
      plugin = document.createElement("script");
      plugin.src = new URL("kazak.js", here).href;
      plugin.onerror = () => { plugin.remove(); plugin = null; };
      document.head.appendChild(plugin);
    }
    if (io && !motion.matches && !el.hasAttribute("data-aos") && el.matches(effect) && played.get(el) !== el.dataset.fx && !waiting.has(el)) {
      waiting.add(el);
      io.observe(el);
    }
  }
  const candidates = "[data-aos]," + effect + "," + template;
  function scan(node) {
    if (node.nodeType !== 1 || !node.isConnected) return;
    if (node.matches(candidates)) register(node);
    node.querySelectorAll(candidates).forEach(register);
  }
  function prune() {
    for (const el of waiting) {
      if (!inScope(el) || !el.matches(effect) || motion.matches) { io.unobserve(el); waiting.delete(el); }
    }
    for (const [el, anim] of animations) {
      if (!inScope(el) || played.get(el) !== el.dataset.fx || motion.matches) { anim.cancel(); animations.delete(el); }
    }
  }
  const watcher = new MutationObserver(records => {
    let cleanup = false;
    for (const r of records) {
      if (r.type === "attributes") { scan(r.target); if (r.attributeName.startsWith("data-aos")) refreshAos(); cleanup = true; }
      else {
        r.addedNodes.forEach(scan);
        if (r.removedNodes.length) {
          cleanup = true;
          if (aosAPI && Array.from(r.removedNodes).some(n => n.nodeType === 1 && (n.matches("[data-aos]") || n.querySelector("[data-aos]")))) refreshAos();
        }
      }
    }
    if (cleanup) prune();
  });
  watcher.observe(document.documentElement, {childList: true, subtree: true, attributes: true,
    attributeFilter: ["data-imweb-fx", "data-imweb-template", "data-fx", "data-kz-story","data-aos","data-aos-offset","data-aos-anchor","data-aos-anchor-placement","data-aos-once"]});
  const updateMotion = () => { prune(); if (!motion.matches) scan(document.documentElement); };
  if (motion.addEventListener) motion.addEventListener("change", updateMotion);
  else if (motion.addListener) motion.addListener(updateMotion);
  scan(document.documentElement);
})();
