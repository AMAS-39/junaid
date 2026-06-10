import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { buildUrl } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { escapeHtml } from "../../utils/format.js";
import { isToday } from "./secretary-helpers.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const welcomeEl = document.getElementById("welcomeText");
    const statsEl = document.getElementById("statsCards");
    const gridEl = document.getElementById("dashboardGrid");

    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${session.profile.name || "Secretary"}`;
    }

    showLoading("Loading dashboard...");

    try {
      const patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
      const appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, []);
      const payments = await FirestoreService.query(COLLECTIONS.PAYMENTS, []);

      const todayCount = appointments.filter(
        (a) => isToday(a.scheduledAt) && a.status !== "cancelled"
      ).length;
      const pendingCount = appointments.filter((a) => a.status === "pending").length;
      const unpaidCount = payments.filter((p) => p.status === "unpaid").length;

      if (statsEl) {
        statsEl.innerHTML = `
          <div class="stats-grid mb-4">
            <div class="stat-card"><span>Total Patients</span><strong>${patients.length}</strong></div>
            <div class="stat-card"><span>Today Appointments</span><strong>${todayCount}</strong></div>
            <div class="stat-card"><span>Pending Appointments</span><strong>${pendingCount}</strong></div>
            <div class="stat-card"><span>Unpaid Payments</span><strong>${unpaidCount}</strong></div>
          </div>
        `;
      }

      if (gridEl) {
        const cards = [
          { title: "Add Patient", icon: "➕", href: "/secretary/add-patient.html" },
          { title: "Patient List", icon: "👥", href: "/secretary/patients/list.html" },
          { title: "Appointments", icon: "📅", href: "/secretary/appointments/list.html" },
          { title: "Payments", icon: "💵", href: "/secretary/payments/list.html" },
        ];

        gridEl.innerHTML = cards
          .map(
            (c) => `
            <a href="${buildUrl(c.href)}" class="patient-big-card">
              <span class="patient-big-icon">${c.icon}</span>
              <span class="patient-big-title">${escapeHtml(c.title)}</span>
            </a>
          `
          )
          .join("");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to load dashboard.");
    } finally {
      hideLoading();
    }
  },
});
