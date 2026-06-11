import { renderSidebar, renderSidebarDrawer, bindSidebarEvents } from "./sidebar.js";
import { renderTopNav, bindTopNavEvents } from "./top-nav.js";
import { renderBottomNav } from "./bottom-nav.js";
import { findRoute, getCurrentPath, getRouteTitle } from "../core/router.js";

/**
 * Initialize the app shell layout around existing page content.
 * @param {{ profile: object, user?: object } | object} sessionOrProfile
 */
export function initLayout(sessionOrProfile) {
  const pageContent = document.getElementById("page-content");
  if (!pageContent) {
    console.warn("initLayout: #page-content not found");
    return;
  }

  if (document.getElementById("ncms-app-shell")) {
    return;
  }

  const profile = sessionOrProfile?.profile ?? sessionOrProfile ?? {};
  const route = findRoute(getCurrentPath());
  const pageTitle = getRouteTitle(route);

  const existingContent = pageContent.innerHTML;

  const shell = document.createElement("div");
  shell.id = "ncms-app-shell";
  shell.className = "min-h-screen bg-slate-50 flex";
  shell.innerHTML = `
    ${renderSidebar(profile)}
    <div class="flex-1 flex flex-col min-w-0 min-h-screen">
      <div id="ncms-top-nav-slot"></div>
      <main class="flex-1 p-4 pb-24 md:p-6 md:pb-6 w-full min-w-0" id="ncms-main-content"></main>
    </div>
    <div id="ncms-bottom-nav-slot"></div>
    ${renderSidebarDrawer(profile)}
  `;

  pageContent.innerHTML = "";
  pageContent.appendChild(shell);

  document.getElementById("ncms-top-nav-slot").innerHTML = renderTopNav(profile, pageTitle);
  document.getElementById("ncms-main-content").innerHTML = existingContent;
  document.getElementById("ncms-bottom-nav-slot").innerHTML = renderBottomNav(profile);

  bindSidebarEvents();
  bindTopNavEvents();
}
