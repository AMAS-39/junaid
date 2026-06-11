import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { ROLE_LABELS } from "../../config/constants.js";
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

    if (welcomeEl) welcomeEl.textContent = `${t("welcome")}, ${profile.name || "Doctor"}`;
    if (subtitleEl) subtitleEl.textContent = "Clinic overview and quick actions";
    if (roleEl) roleEl.textContent = ROLE_LABELS[profile.role] || profile.role;

    showLoading("Loading dashboard...");

    try {
      const stats = await loadDoctorStats(doctorId);

      renderDashStats(statsEl, [
        {
          label: "Total Patients",
          value: stats.totalPatients,
          meta: "Registered in clinic",
          icon: "👥",
          tone: "green",
          href: buildUrl("/doctor/patients/list.html"),
        },
        {
          label: "Active Diet Plans",
          value: stats.activePlans,
          meta: "Currently assigned",
          icon: "🥗",
          tone: "teal",
          href: buildUrl("/doctor/diet-plans/list.html"),
          badge: stats.activePlans > 0 ? "Active" : "None",
          badgeTone: stats.activePlans > 0 ? "success" : "muted",
        },
        {
          label: "Pending Appointments",
          value: stats.pendingAppointments,
          meta: "Awaiting approval",
          icon: "📅",
          tone: "amber",
          href: buildUrl("/doctor/appointments/list.html"),
          badge: stats.pendingAppointments > 0 ? "Review" : "Clear",
          badgeTone: stats.pendingAppointments > 0 ? "warning" : "muted",
        },
        {
          label: "New Patient Photos",
          value: stats.newPhotos,
          meta: "Uploaded last 7 days",
          icon: "📷",
          tone: "sky",
          href: buildUrl("/doctor/photos/list.html"),
        },
        {
          label: "Unread Messages",
          value: stats.unreadMessages,
          meta: "From patients",
          icon: "💬",
          tone: "violet",
          href: buildUrl("/doctor/messages/list.html"),
          badge: stats.unreadMessages > 0 ? "New" : "Read",
          badgeTone: stats.unreadMessages > 0 ? "warning" : "muted",
        },
      ]);

      renderDashActions(gridEl, [
        {
          title: "Patients",
          desc: "View profiles and care plans",
          icon: "👥",
          href: buildUrl("/doctor/patients/list.html"),
        },
        {
          title: "Diet Plans",
          desc: "Create and manage nutrition plans",
          icon: "🥗",
          href: buildUrl("/doctor/diet-plans/list.html"),
        },
        {
          title: "Appointments",
          desc: "Approve or reschedule visits",
          icon: "📅",
          href: buildUrl("/doctor/appointments/list.html"),
        },
        {
          title: "Messages",
          desc: "Chat with your patients",
          icon: "💬",
          href: buildUrl("/doctor/messages/list.html"),
        },
        {
          title: "Reports",
          desc: "Clinic analytics and summaries",
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
