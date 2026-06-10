import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { ROLE_LABELS } from "../../config/constants.js";
import { buildUrl } from "../../core/router.js";

bootstrap({
  onReady: (session) => {
    if (!session) return;

    const { profile } = session;
    const welcomeEl = document.getElementById("welcomeText");
    const roleEl = document.getElementById("roleBadge");
    const gridEl = document.getElementById("dashboardGrid");

    if (welcomeEl) welcomeEl.textContent = `${t("welcome")}, ${profile.name || "Doctor"}`;
    if (roleEl) roleEl.textContent = ROLE_LABELS[profile.role] || profile.role;

    if (gridEl) {
      gridEl.innerHTML = [
        { title: "Patients", desc: "View and manage patients", icon: "👥", href: "/doctor/patients/list.html" },
        { title: "Diet Plans", desc: "Create and manage nutrition plans", icon: "🥗", href: "/doctor/diet-plans/list.html" },
        { title: "Appointments", desc: "Approve or reschedule visits", icon: "📅", href: "/doctor/appointments/list.html" },
        { title: "Messages", desc: "Chat with patients", icon: "💬", href: "/doctor/messages/list.html" },
        { title: "Reports", desc: "Clinic overview and stats", icon: "📊", href: "/doctor/reports/list.html" },
      ]
        .map(
          (card) => `
          <a href="${buildUrl(card.href)}" class="ncms-card ncms-card-hover p-5 block">
            <div class="text-3xl mb-3">${card.icon}</div>
            <h3 class="font-semibold text-slate-800">${card.title}</h3>
            <p class="text-sm text-slate-500 mt-1">${card.desc}</p>
          </a>
        `
        )
        .join("");
    }
  },
});
