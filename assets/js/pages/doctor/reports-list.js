import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { escapeHtml } from "../../utils/format.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;
    await loadReports(session.user.uid);
  },
});

async function loadReports(doctorId) {
  const container = document.getElementById("reportsContainer");
  showLoading("Loading reports...");

  try {
    const patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
    const dietPlans = await FirestoreService.query(COLLECTIONS.DIET_PLANS, [
      ["doctorId", "==", doctorId],
    ]);
    const appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, [
      ["doctorId", "==", doctorId],
    ]);
    const progressEntries = await FirestoreService.query(COLLECTIONS.PROGRESS_ENTRIES, []);
    const messages = await FirestoreService.query(COLLECTIONS.MESSAGES, [
      ["senderId", "==", doctorId],
    ]);

    const activePlans = dietPlans.filter((p) => p.status === "active").length;
    const pendingAppointments = appointments.filter((a) => a.status === "pending").length;
    const approvedAppointments = appointments.filter((a) => a.status === "approved").length;
    const progressThisMonth = progressEntries.filter((e) => isThisMonth(e.recordedAt || e.createdAt)).length;

    container.innerHTML = `
      <div class="stats-grid mb-6">
        <div class="stat-card"><span>Total Patients</span><strong>${patients.length}</strong></div>
        <div class="stat-card"><span>Active Diet Plans</span><strong>${activePlans}</strong></div>
        <div class="stat-card"><span>Pending Appointments</span><strong>${pendingAppointments}</strong></div>
        <div class="stat-card"><span>Approved Appointments</span><strong>${approvedAppointments}</strong></div>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div class="card">
          <h3 class="font-bold text-slate-800 mb-2">Progress Summary</h3>
          <p class="text-slate-600 text-sm">${progressThisMonth} weight entries recorded this month across all patients.</p>
          <p class="text-slate-600 text-sm mt-2">Total progress entries: <strong>${progressEntries.length}</strong></p>
        </div>
        <div class="card">
          <h3 class="font-bold text-slate-800 mb-2">Communication</h3>
          <p class="text-slate-600 text-sm">Messages sent by you: <strong>${messages.length}</strong></p>
          <p class="text-slate-600 text-sm mt-2">Diet plans created: <strong>${dietPlans.length}</strong></p>
        </div>
      </div>

      <div class="card mt-4">
        <h3 class="font-bold text-slate-800 mb-4">Recent Appointments</h3>
        ${appointments.length === 0 ? `<p class="text-slate-500 text-sm">No appointments yet.</p>` : `
          <div class="data-table-wrap">
            <table class="data-table">
              <thead><tr><th>Status</th><th>Patient ID</th></tr></thead>
              <tbody>
                ${appointments.slice(0, 5).map((a) => `
                  <tr>
                    <td><span class="status-badge status-${a.status || "pending"}">${escapeHtml(a.status || "pending")}</span></td>
                    <td>${escapeHtml(a.patientId)}</td>
                  </tr>
                `).join("")}
              </tbody>
            </table>
          </div>
        `}
      </div>
    `;
  } catch (error) {
    console.error(error);
    toast.error("Failed to load reports.");
    container.innerHTML = `<div class="empty-state"><h3>Error</h3><p>Could not load report data.</p></div>`;
  } finally {
    hideLoading();
  }
}

function isThisMonth(timestamp) {
  if (!timestamp) return false;
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
}
