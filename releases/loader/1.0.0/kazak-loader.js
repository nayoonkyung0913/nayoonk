(function () {
  "use strict";
  const key = Symbol.for("imweb.kazak.loader.1.0.0");
  if (window[key]) return;
  window[key] = true;
  const releases = new URL("../../kazak/", document.currentScript.src);
  const marker = "[data-kazak-version]";
  const requested = new Set();

  function loadFile(url, stylesheet) {
    if (requested.has(url.href)) return;
    requested.add(url.href);
    const element = document.createElement(stylesheet ? "link" : "script");
    if (stylesheet) {
      element.rel = "stylesheet";
      element.href = url.href;
    } else {
      element.src = url.href;
    }
    element.addEventListener("error", () => {
      requested.delete(url.href);
      element.remove();
    }, {once: true});
    document.head.appendChild(element);
  }

  function loadRelease(root) {
    const version = root.getAttribute("data-kazak-version");
    if (!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(version || "")) return;
    loadFile(new URL(version + "/kazak.css", releases), true);
    loadFile(new URL(version + "/kazak.js", releases), false);
  }
  function scan(node) {
    if (node.nodeType !== 1 || !node.isConnected) return;
    if (node.matches(marker)) loadRelease(node);
    node.querySelectorAll(marker).forEach(loadRelease);
  }
  const observer = new MutationObserver(records => {
    for (const record of records) {
      if (record.type === "attributes") loadRelease(record.target);
      else record.addedNodes.forEach(scan);
    }
  });
  observer.observe(document.documentElement, {
    subtree: true, childList: true, attributes: true, attributeFilter: ["data-kazak-version"]
  });
  scan(document.documentElement);
})();
