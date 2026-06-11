import { bootstrap } from "../../core/bootstrap.js";
import { t, tStatus } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal } from "../../components/modal.js";
import { getQueryParam, formatDateTime, escapeHtml } from "../../utils/format.js";

let appointments = [];
let patientsMap = {};
let filterPatientId = null;

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    filterPatientId = getQueryParam("patientId");
    const filterBanner = document.getElementById("filterBanner");

    if (filterPatientId && filterBanner) {
      const patient = await FirestoreService.getById(COLLECTIONS.PATIENTS, filterPatientId);
      filterBanner.innerHTML = `Showing appointments for <strong>${escapeHtml(patient?.fullName || "patient")}</strong>
        <a href="list.html" class="text-medical-600 font-medium ms-2">Show all</a>`;
      filterBanner.classList.remove("hidden");
    }

    await loadAppointments(session.user.uid);
  },
});

async function loadAppointments(doctorId) {
  showLoading(t("loading.appointments"));

  try {
    const allPatients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
    patientsMap = Object.fromEntries(allPatients.map((p) => [p.id, p]));

    appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, [
      ["doctorId", "==", doctorId],
    ]);
    appointments.sort((a, b) => tsMillis(b.scheduledAt) - tsMillis(a.scheduledAt));

    if (filterPatientId) {
      appointments = appointments.filter((a) => a.patientId === filterPatientId);
    }

    renderAppointments();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadAppointments"));
  } finally {
    hideLoading();
  }
}

function renderAppointments() {
  const container = document.getElementById("appointmentsContainer");
  const emptyState = document.getElementById("emptyState");

  if (!container) return;

  if (appointments.length === 0) {
    container.innerHTML = "";
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  container.innerHTML = `
    <div class="card data-table-wrap">
      <table class="data-table">
        <thead>
          <tr>
            <th>Patient</th>
            <th>Scheduled</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${appointments.map((a) => appointmentRow(a)).join("")}
        </tbody>
      </table>
    </div>
  `;
}

function appointmentRow(appointment) {
  const patient = patientsMap[appointment.patientId];
  const status = appointment.status || "pending";
  const statusClass = status === "archived" ? "old" : status;

  return `
    <tr>
      <td>${escapeHtml(patient?.fullName || "Unknown")}</td>
      <td>${escapeHtml(formatDateTime(appointment.scheduledAt))}</td>
      <td><span class="status-badge status-${statusClass}">${escapeHtml(tStatus(status))}</span></td>
      <td>${escapeHtml(appointment.notes || "—")}</td>
      <td>
        <div class="btn-row">
          ${status === "pending" ? `
            <button type="button" class="btn-sm btn-sm-primary" data-approve="${escapeHtml(appointment.id)}">Approve</button>
            <button type="button" class="btn-sm btn-sm-danger" data-reject="${escapeHtml(appointment.id)}">Reject</button>
          ` : ""}
          <button type="button" class="btn-sm btn-sm-secondary" data-reschedule="${escapeHtml(appointment.id)}">Reschedule</button>
        </div>
      </td>
    </tr>
  `;
}

document.addEventListener("click", async (e) => {
  const approveBtn = e.target.closest("[data-approve]");
  const rejectBtn = e.target.closest("[data-reject]");
  const rescheduleBtn = e.target.closest("[data-reschedule]");

  if (approveBtn) {
    await updateStatus(approveBtn.dataset.approve, "approved");
  }
  if (rejectBtn) {
    await updateStatus(rejectBtn.dataset.reject, "rejected");
  }
  if (rescheduleBtn) {
    openRescheduleModal(rescheduleBtn.dataset.reschedule);
  }
});

async function updateStatus(appointmentId, status) {
  showLoading(t("loading.updatingAppointment"));
  try {
    await FirestoreService.update(COLLECTIONS.APPOINTMENTS, appointmentId, { status });
    toast.success(`Appointment ${status}.`);
    const item = appointments.find((a) => a.id === appointmentId);
    if (item) item.status = status;
    renderAppointments();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedUpdateAppointment"));
  } finally {
    hideLoading();
  }
}

function tsMillis(ts) {
  return ts?.toMillis?.() ?? (ts ? new Date(ts).getTime() : 0);
}

function openRescheduleModal(appointmentId) {
  openModal({
    title: "Reschedule Appointment",
    body: `
      <div class="form-group">
        <label for="rescheduleDate">New date & time</label>
        <input id="rescheduleDate" type="datetime-local" class="form-input" />
      </div>
      <div class="form-group mt-3">
        <label for="rescheduleNotes">Notes (optional)</label>
        <textarea id="rescheduleNotes" class="form-textarea" rows="3" placeholder="Reason for reschedule..."></textarea>
      </div>
    `,
    confirmText: "Save",
    onConfirm: async () => {
      const dateVal = document.getElementById("rescheduleDate").value;
      if (!dateVal) {
        toast.error(t("toast.selectDateTime"));
        return;
      }
      const notes = document.getElementById("rescheduleNotes").value.trim();
      showLoading(t("loading.rescheduling"));
      try {
        await FirestoreService.update(COLLECTIONS.APPOINTMENTS, appointmentId, {
          scheduledAt: new Date(dateVal),
          status: "approved",
          rescheduleNotes: notes,
        });
        toast.success("Appointment rescheduled.");
        const item = appointments.find((a) => a.id === appointmentId);
        if (item) {
          item.scheduledAt = new Date(dateVal);
          item.status = "approved";
        }
        renderAppointments();
      } catch (error) {
        console.error(error);
        toast.error("Failed to reschedule.");
      } finally {
        hideLoading();
      }
    },
  });
}
