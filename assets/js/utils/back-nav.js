/**
 * Back navigation — resolves dynamic hrefs and handles clicks without per-page JS.
 */

let initialized = false;

/**
 * Wire up all `.back-btn` elements (anchors and buttons).
 */
export function initBackNavigation() {
  if (initialized) {
    resolveBackHrefs();
    return;
  }

  initialized = true;
  document.addEventListener("click", onBackClick);
  resolveBackHrefs();
}

/**
 * Apply query-param templates to back links after layout moves DOM.
 */
export function resolveBackHrefs() {
  document.querySelectorAll(".back-btn[data-back-param]").forEach((el) => {
    const param = el.dataset.backParam;
    const template = el.dataset.backTemplate;
    if (!param || !template) return;

    const value = new URLSearchParams(window.location.search).get(param);
    if (!value) return;

    const href = template.replace(`{${param}}`, encodeURIComponent(value));
    if (el.tagName === "A") {
      el.href = href;
    } else {
      el.dataset.href = href;
    }
  });
}

function onBackClick(e) {
  const el = e.target.closest(".back-btn");
  if (!el) return;

  if (el.tagName === "A") {
    const href = el.getAttribute("href");
    if (href && href !== "#" && !href.includes("{")) return;
  }

  const href = el.dataset.href || el.getAttribute("href");
  if (!href || href === "#" || href.includes("{")) return;

  e.preventDefault();
  window.location.href = href;
}
