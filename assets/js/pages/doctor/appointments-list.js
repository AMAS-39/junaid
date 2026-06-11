import { bootstrap } from "../../core/bootstrap.js";
import { t, tStatus } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal } from "../../components/modal.js";
import {
  renderAppointmentCard,
  renderAppointmentEmptyState,
} from "../../components/appointment-card.js";
import { getQueryParam, escapeHtml } from "../../utils/format.js";

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
      filterBanner.innerHTML = `${escapeHtml(t("lists.showingAppointmentsFor"))} <strong>${escapeHtml(patient?.fullName || t("labels.patientLower"))}</strong>
        <a href="list.html">${escapeHtml(t("lists.showAll"))}</a>`;
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
    if (emptyState) {
      emptyState.innerHTML = renderAppointmentEmptyState({
        title: t("pages.appointments.emptyTitle"),
        subtitle: t("pages.appointments.emptyHintDoctor"),
      });
      emptyState.classList.remove("hidden");
    }
    return;
  }

  emptyState?.classList.add("hidden");

  container.innerHTML = appointments.map((a) => appointmentCard(a)).join("");
}

function appointmentCard(appointment) {
  const patient = patientsMap[appointment.patientId];
  const status = appointment.status || "pending";

  const actions =
    status === "pending"
      ? `
        <button type="button" class="btn-sm btn-sm-primary" data-approve="${escapeHtml(appointment.id)}">${escapeHtml(t("buttons.approve"))}</button>
        <button type="button" class="btn-sm btn-sm-danger" data-reject="${escapeHtml(appointment.id)}">${escapeHtml(t("buttons.reject"))}</button>
        <button type="button" class="btn-sm btn-sm-secondary" data-reschedule="${escapeHtml(appointment.id)}">${escapeHtml(t("buttons.reschedule"))}</button>
      `
      : `
        <button type="button" class="btn-sm btn-sm-secondary" data-reschedule="${escapeHtml(appointment.id)}">${escapeHtml(t("buttons.reschedule"))}</button>
      `;

  return renderAppointmentCard({
    status,
    scheduledAt: appointment.scheduledAt,
    patientName: patient?.fullName,
    reason: appointment.reason || "",
    notes: appointment.notes || appointment.rescheduleNotes || "",
    actionsHtml: `<div class="btn-row">${actions}</div>`,
  });
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
    toast.success(t("toast.appointmentStatus", { status: tStatus(status) }));
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
    title: t("modal.rescheduleAppointment"),
    body: `
      <div class="form-group">
        <label for="rescheduleDate">${escapeHtml(t("forms.newDateTime"))}</label>
        <input id="rescheduleDate" type="datetime-local" class="form-input" />
      </div>
      <div class="form-group mt-3">
        <label for="rescheduleNotes">${escapeHtml(t("forms.rescheduleNotes"))}</label>
        <textarea id="rescheduleNotes" class="form-textarea" rows="3" placeholder="${escapeHtml(t("forms.rescheduleNotesPlaceholder"))}"></textarea>
      </div>
    `,
    confirmText: t("buttons.save"),
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
        toast.success(t("toast.appointmentRescheduled"));
        const item = appointments.find((a) => a.id === appointmentId);
        if (item) {
          item.scheduledAt = new Date(dateVal);
          item.status = "approved";
        }
        renderAppointments();
      } catch (error) {
        console.error(error);
        toast.error(t("toast.failedReschedule"));
      } finally {
        hideLoading();
      }
    },
  });
}
