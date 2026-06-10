import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { buildUrl } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { calculateBMI, escapeHtml, formatDateTime } from "../../utils/format.js";
import { getPatientRecord, getActiveDietPlan, tsMillis } from "./patient-helpers.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const patientId = session.user.uid;
    const welcomeEl = document.getElementById("welcomeText");
    const summaryEl = document.getElementById("summaryCards");
    const gridEl = document.getElementById("dashboardGrid");

    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${session.profile.name || "Patient"}`;
    }

    showLoading("Loading your dashboard...");

    try {
      const patient = await getPatientRecord(patientId);
      const dietPlan = await getActiveDietPlan(patientId);

      let appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, [
        ["patientId", "==", patientId],
      ]);
      appointments = appointments
        .filter((a) => ["pending", "approved"].includes(a.status))
        .sort((a, b) => tsMillis(a.scheduledAt) - tsMillis(b.scheduledAt));

      const now = Date.now();
      const nextAppointment = appointments.find((a) => tsMillis(a.scheduledAt) >= now) || appointments[0];

      const weight = patient?.currentWeight ?? "—";
      const target = patient?.targetWeight ?? "—";
      const bmi = calculateBMI(patient?.height, patient?.currentWeight);
      const bmiDisplay = bmi ?? "—";

      if (summaryEl) {
        summaryEl.innerHTML = `
          <div class="patient-stat-row">
            <div class="patient-stat-box"><span>Current</span><strong>${escapeHtml(String(weight))} kg</strong></div>
            <div class="patient-stat-box"><span>Goal</span><strong>${escapeHtml(String(target))} kg</strong></div>
            <div class="patient-stat-box"><span>BMI</span><strong>${escapeHtml(String(bmiDisplay))}</strong></div>
          </div>
          ${dietPlan ? `
            <div class="patient-summary-card">
              <h3>Active Diet Plan</h3>
              <p><strong>${escapeHtml(dietPlan.title || "Your plan")}</strong></p>
              <p class="text-sm text-slate-500 mt-1">${escapeHtml(String(dietPlan.breakfast || "").slice(0, 80))}${dietPlan.breakfast?.length > 80 ? "…" : ""}</p>
            </div>
          ` : `
            <div class="patient-summary-card muted">
              <p>No active diet plan yet. Your doctor will assign one.</p>
            </div>
          `}
          ${nextAppointment ? `
            <div class="patient-summary-card">
              <h3>Next Appointment</h3>
              <p><strong>${escapeHtml(formatDateTime(nextAppointment.scheduledAt))}</strong></p>
              <span class="status-badge status-${escapeHtml(nextAppointment.status || "pending")}">${escapeHtml(nextAppointment.status || "pending")}</span>
            </div>
          ` : `
            <div class="patient-summary-card muted">
              <p>No upcoming appointments.</p>
            </div>
          `}
        `;
      }

      if (gridEl) {
        const cards = [
          { title: "My Diet Plan", icon: "🥗", href: "/patient/diet-plan/view.html" },
          { title: "Upload Photo", icon: "📷", href: "/patient/photos/upload.html" },
          { title: "My Progress", icon: "📈", href: "/patient/progress/list.html" },
          { title: "Book Appointment", icon: "📅", href: "/patient/appointments/list.html" },
          { title: "Messages", icon: "💬", href: "/patient/messages/list.html" },
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
