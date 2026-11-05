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
    if (!inScope(el)) return;
    if (el.matches(template) && !plugin) {
      plugin = document.createElement("script");
      plugin.src = new URL("kazak.js", here).href;
      plugin.onerror = () => { plugin.remove(); plugin = null; };
      document.head.appendChild(plugin);
    }
    if (io && !motion.matches && el.matches(effect) && played.get(el) !== el.dataset.fx && !waiting.has(el)) {
      waiting.add(el);
      io.observe(el);
    }
  }
  const candidates = effect + "," + template;
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
      if (r.type === "attributes") { scan(r.target); cleanup = true; }
      else {
        r.addedNodes.forEach(scan);
        if (r.removedNodes.length) cleanup = true;
      }
    }
    if (cleanup) prune();
  });
  watcher.observe(document.documentElement, {childList: true, subtree: true, attributes: true,
    attributeFilter: ["data-imweb-fx", "data-imweb-template", "data-fx", "data-kz-story"]});
  const updateMotion = () => { prune(); if (!motion.matches) document.querySelectorAll(scope).forEach(scan); };
  if (motion.addEventListener) motion.addEventListener("change", updateMotion);
  else if (motion.addListener) motion.addListener(updateMotion);
  document.querySelectorAll(scope).forEach(scan);
})();
