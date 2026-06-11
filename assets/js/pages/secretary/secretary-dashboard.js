import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { buildUrl } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { renderDashStats, renderDashActions } from "../../components/dashboard-stats.js";
import { formatFirestoreError } from "../../utils/firestore-error.js";
import { formatNumber } from "../../utils/format.js";
import { getIntlLocale } from "../../core/i18n.js";
import { isToday, tsMillis } from "./secretary-helpers.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const welcomeEl = document.getElementById("welcomeText");
    const subtitleEl = document.getElementById("dashboardSubtitle");
    const statsEl = document.getElementById("statsCards");
    const gridEl = document.getElementById("dashboardGrid");

    if (welcomeEl) {
      welcomeEl.textContent = `${t("common.welcome")}, ${session.profile.name || t("roles.secretary")}`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = t("secretary.dashboardSubtitle");
    }

    showLoading(t("loading.dashboard"));

    try {
      const patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
      const appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, []);
      const payments = await FirestoreService.query(COLLECTIONS.PAYMENTS, []);

      const todayCount = appointments.filter(
        (a) => isToday(a.scheduledAt) && a.status !== "cancelled"
      ).length;
      const pendingCount = appointments.filter((a) => a.status === "pending").length;
      const unpaidCount = payments.filter((p) => p.status === "unpaid").length;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthStart = startOfMonth.getTime();

      const paidThisMonth = payments
        .filter((p) => p.status === "paid" && tsMillis(p.createdAt) >= monthStart)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const monthLabel = startOfMonth.toLocaleString(getIntlLocale(), { month: "short", year: "numeric" });

      renderDashStats(statsEl, [
        {
          label: t("doctor.totalPatients"),
          value: patients.length,
          meta: t("doctor.registeredPatients"),
          icon: "👥",
          tone: "green",
          href: buildUrl("/secretary/patients/list.html"),
        },
        {
          label: t("secretary.todayAppointments"),
          value: todayCount,
          meta: t("secretary.scheduledToday"),
          icon: "📅",
          tone: "sky",
          href: buildUrl("/secretary/appointments/list.html"),
          badge: todayCount > 0 ? t("status.today") : t("status.none"),
          badgeTone: todayCount > 0 ? "success" : "muted",
        },
        {
          label: t("doctor.pendingAppointments"),
          value: pendingCount,
          meta: t("secretary.needConfirmation"),
          icon: "⏳",
          tone: "amber",
          href: buildUrl("/secretary/appointments/list.html"),
          badge: pendingCount > 0 ? t("status.pending") : t("status.clear"),
          badgeTone: pendingCount > 0 ? "warning" : "muted",
        },
        {
          label: t("secretary.unpaidPayments"),
          value: unpaidCount,
          meta: t("secretary.outstanding"),
          icon: "💳",
          tone: "violet",
          href: buildUrl("/secretary/payments/list.html"),
          badge: unpaidCount > 0 ? t("status.due") : t("status.clear"),
          badgeTone: unpaidCount > 0 ? "warning" : "muted",
        },
        {
          label: t("secretary.paidThisMonth"),
          value: formatMoney(paidThisMonth),
          meta: monthLabel,
          icon: "💵",
          tone: "teal",
          href: buildUrl("/secretary/payments/list.html"),
          badge: t("status.revenue"),
          badgeTone: "success",
        },
      ]);

      renderDashActions(gridEl, [
        {
          title: t("nav.addPatient"),
          desc: t("secretary.registerPatient"),
          icon: "➕",
          href: buildUrl("/secretary/add-patient.html"),
        },
        {
          title: t("nav.patients"),
          desc: t("secretary.browsePatients"),
          icon: "👥",
          href: buildUrl("/secretary/patients/list.html"),
        },
        {
          title: t("nav.appointments"),
          desc: t("secretary.manageSchedule"),
          icon: "📅",
          href: buildUrl("/secretary/appointments/list.html"),
        },
        {
          title: t("nav.payments"),
          desc: t("secretary.recordPayments"),
          icon: "💵",
          href: buildUrl("/secretary/payments/list.html"),
        },
      ]);
    } catch (error) {
      console.error(error);
      toast.error(formatFirestoreError(error));
    } finally {
      hideLoading();
    }
  },
});

function formatMoney(amount) {
  return formatNumber(amount, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
