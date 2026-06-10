import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { ROLE_LABELS } from "../../config/constants.js";

/**
 * Generic dashboard page initializer — no business logic.
 * Role-specific dashboards use this until feature modules are built.
 */
bootstrap({
  onReady: (session) => {
    if (!session) return;

    const { profile } = session;
    const welcomeEl = document.getElementById("welcomeText");
    const roleEl = document.getElementById("roleBadge");
    const gridEl = document.getElementById("dashboardGrid");

    if (welcomeEl) {
      welcomeEl.textContent = `${t("welcome")}, ${profile.name || "User"}`;
    }

    if (roleEl) {
      roleEl.textContent = ROLE_LABELS[profile.role] || profile.role;
    }

    if (gridEl) {
      gridEl.innerHTML = renderPlaceholderCards(profile.role);
    }
  },
});

/**
 * Placeholder cards — replaced when business modules are implemented.
 * @param {string} role
 */
function renderPlaceholderCards(role) {
  const cards = {
    doctor: [
      { title: "Patients", desc: "Manage patient records", icon: "👥" },
      { title: "Diet Plans", desc: "Create nutrition plans", icon: "🥗" },
      { title: "Appointments", desc: "Review requests", icon: "📅" },
      { title: "Messages", desc: "Patient communication", icon: "💬" },
      { title: "Reports", desc: "Progress summaries", icon: "📊" },
    ],
    secretary: [
      { title: "Add Patient", desc: "Register new patients", icon: "➕" },
      { title: "Patients", desc: "Search and view list", icon: "👥" },
      { title: "Appointments", desc: "Schedule visits", icon: "📅" },
      { title: "Payments", desc: "Track billing status", icon: "💵" },
    ],
    patient: [
      { title: "Diet Plan", desc: "View your meal plan", icon: "🥗" },
      { title: "Progress", desc: "Track your journey", icon: "📈" },
      { title: "Appointments", desc: "Book a visit", icon: "📅" },
      { title: "Messages", desc: "Contact your doctor", icon: "💬" },
    ],
  };

  return (cards[role] || [])
    .map(
      (card) => `
      <div class="ncms-card ncms-card-hover p-5 cursor-default">
        <div class="text-3xl mb-3">${card.icon}</div>
        <h3 class="font-semibold text-slate-800">${card.title}</h3>
        <p class="text-sm text-slate-500 mt-1">${card.desc}</p>
        <span class="inline-block mt-3 text-xs font-medium text-medical-600 bg-medical-50 px-2 py-1 rounded-full">Coming soon</span>
      </div>
    `
    )
    .join("");
}
