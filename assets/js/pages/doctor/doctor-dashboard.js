import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { buildUrl } from "../../core/router.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { renderDashStats, renderDashActions } from "../../components/dashboard-stats.js";
import { formatFirestoreError } from "../../utils/firestore-error.js";
import { tsMillis } from "../secretary/secretary-helpers.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const { profile, user } = session;
    const doctorId = user.uid;
    const welcomeEl = document.getElementById("welcomeText");
    const subtitleEl = document.getElementById("dashboardSubtitle");
    const roleEl = document.getElementById("roleBadge");
    const statsEl = document.getElementById("statsCards");
    const gridEl = document.getElementById("dashboardGrid");

    if (welcomeEl) welcomeEl.textContent = `${t("common.welcome")}, ${profile.name || t("roles.doctor")}`;
    if (subtitleEl) subtitleEl.textContent = t("doctor.dashboardSubtitle");
    if (roleEl) roleEl.textContent = t(`roles.${profile.role}`) || profile.role;

    showLoading(t("loading.dashboard"));

    try {
      const stats = await loadDoctorStats(doctorId);

      renderDashStats(statsEl, [
        {
          label: t("doctor.totalPatients"),
          value: stats.totalPatients,
          meta: t("doctor.registeredPatients"),
          icon: "👥",
          tone: "green",
          href: buildUrl("/doctor/patients/list.html"),
        },
        {
          label: t("doctor.activeDietPlans"),
          value: stats.activePlans,
          meta: t("doctor.currentlyAssigned"),
          icon: "🥗",
          tone: "teal",
          href: buildUrl("/doctor/diet-plans/list.html"),
          badge: stats.activePlans > 0 ? t("status.active") : t("status.none"),
          badgeTone: stats.activePlans > 0 ? "success" : "muted",
        },
        {
          label: t("doctor.pendingAppointments"),
          value: stats.pendingAppointments,
          meta: t("doctor.awaitingApproval"),
          icon: "📅",
          tone: "amber",
          href: buildUrl("/doctor/appointments/list.html"),
          badge: stats.pendingAppointments > 0 ? t("status.review") : t("status.clear"),
          badgeTone: stats.pendingAppointments > 0 ? "warning" : "muted",
        },
        {
          label: t("doctor.newPhotos"),
          value: stats.newPhotos,
          meta: t("doctor.last7Days"),
          icon: "📷",
          tone: "sky",
          href: buildUrl("/doctor/photos/list.html"),
        },
        {
          label: t("doctor.unreadMessages"),
          value: stats.unreadMessages,
          meta: t("doctor.fromPatients"),
          icon: "💬",
          tone: "violet",
          href: buildUrl("/doctor/messages/list.html"),
          badge: stats.unreadMessages > 0 ? t("status.new") : t("status.read"),
          badgeTone: stats.unreadMessages > 0 ? "warning" : "muted",
        },
      ]);

      renderDashActions(gridEl, [
        {
          title: t("nav.patients"),
          desc: t("doctor.patientsDesc"),
          icon: "👥",
          href: buildUrl("/doctor/patients/list.html"),
        },
        {
          title: t("nav.dietPlans"),
          desc: t("doctor.dietPlansDesc"),
          icon: "🥗",
          href: buildUrl("/doctor/diet-plans/list.html"),
        },
        {
          title: t("nav.appointments"),
          desc: t("doctor.appointmentsDesc"),
          icon: "📅",
          href: buildUrl("/doctor/appointments/list.html"),
        },
        {
          title: t("nav.messages"),
          desc: t("doctor.messagesDesc"),
          icon: "💬",
          href: buildUrl("/doctor/messages/list.html"),
        },
        {
          title: t("nav.reports"),
          desc: t("doctor.reportsDesc"),
          icon: "📊",
          href: buildUrl("/doctor/reports/list.html"),
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

async function loadDoctorStats(doctorId) {
  const [patients, dietPlans, appointments, photos, messagesReceived] = await Promise.all([
    FirestoreService.query(COLLECTIONS.PATIENTS, []),
    FirestoreService.query(COLLECTIONS.DIET_PLANS, [["doctorId", "==", doctorId]]),
    FirestoreService.query(COLLECTIONS.APPOINTMENTS, [["doctorId", "==", doctorId]]),
    FirestoreService.query(COLLECTIONS.PATIENT_PHOTOS, []),
    FirestoreService.query(COLLECTIONS.MESSAGES, [["receiverId", "==", doctorId]]),
  ]);

  const activePlans = dietPlans.filter((p) => p.status === "active").length;
  const pendingAppointments = appointments.filter((a) => a.status === "pending").length;
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const newPhotos = photos.filter((p) => tsMillis(p.createdAt) >= weekAgo).length;
  const unreadMessages = messagesReceived.filter((m) => !m.read).length;

  return {
    totalPatients: patients.length,
    activePlans,
    pendingAppointments,
    newPhotos,
    unreadMessages,
  };
}
