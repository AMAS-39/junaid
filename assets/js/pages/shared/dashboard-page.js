import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";

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
      welcomeEl.textContent = `${t("common.welcome")}, ${profile.name || t("common.user")}`;
    }

    if (roleEl) {
      roleEl.textContent = t(`roles.${profile.role}`) || profile.role;
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
      { title: t("nav.patients"), desc: t("doctor.patientsDesc"), icon: "👥" },
      { title: t("nav.dietPlans"), desc: t("doctor.dietPlansDesc"), icon: "🥗" },
      { title: t("nav.appointments"), desc: t("doctor.appointmentsDesc"), icon: "📅" },
      { title: t("nav.messages"), desc: t("doctor.messagesDesc"), icon: "💬" },
      { title: t("nav.reports"), desc: t("doctor.reportsDesc"), icon: "📊" },
    ],
    secretary: [
      { title: t("nav.addPatient"), desc: t("secretary.registerPatient"), icon: "➕" },
      { title: t("nav.patients"), desc: t("secretary.browsePatients"), icon: "👥" },
      { title: t("nav.appointments"), desc: t("secretary.manageSchedule"), icon: "📅" },
      { title: t("nav.payments"), desc: t("secretary.recordPayments"), icon: "💵" },
    ],
    patient: [
      { title: t("nav.diet"), desc: t("patient.myDietPlan"), icon: "🥗" },
      { title: t("nav.progress"), desc: t("patient.myProgress"), icon: "📈" },
      { title: t("nav.appointments"), desc: t("patient.appointment"), icon: "📅" },
      { title: t("nav.messages"), desc: t("patient.messageDoctor"), icon: "💬" },
    ],
  };

  return (cards[role] || [])
    .map(
      (card) => `
      <div class="ncms-card ncms-card-hover p-5 cursor-default">
        <div class="text-3xl mb-3">${card.icon}</div>
        <h3 class="font-semibold text-slate-800">${card.title}</h3>
        <p class="text-sm text-slate-500 mt-1">${card.desc}</p>
        <span class="inline-block mt-3 text-xs font-medium text-medical-600 bg-medical-50 px-2 py-1 rounded-full">${t("common.comingSoon")}</span>
      </div>
    `
    )
    .join("");
}
