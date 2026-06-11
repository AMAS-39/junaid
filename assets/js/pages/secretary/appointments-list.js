import { bootstrap } from "../../core/bootstrap.js";
import { t, tStatus } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal, confirmModal } from "../../components/modal.js";
import { escapeHtml } from "../../utils/format.js";
import {
  renderAppointmentCard,
  renderAppointmentEmptyState,
} from "../../components/appointment-card.js";
import { loadPatientsMap, getDefaultDoctorId, tsMillis, isToday } from "./secretary-helpers.js";

let appointments = [];
let patientsMap = {};
let secretaryId = null;
let doctorId = "";
let activeFilter = "all";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    secretaryId = session.user.uid;
    doctorId = await getDefaultDoctorId();

    const form = document.getElementById("appointmentForm");
    const patientSelect = document.getElementById("patientSelect");

    patientsMap = await loadPatientsMap();
    if (patientSelect) {
      patientSelect.innerHTML = Object.values(patientsMap)
        .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.fullName || p.id)}</option>`)
        .join("");
    }

    document.querySelectorAll("[data-filter]").forEach((btn) => {
      btn.addEventListener("click", () => {
        activeFilter = btn.dataset.filter;
        document.querySelectorAll("[data-filter]").forEach((b) => b.classList.remove("filter-active"));
        btn.classList.add("filter-active");
        renderAppointments();
      });
    });

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await createAppointment();
    });

    await loadAppointments();
  },
});

async function loadAppointments() {
  showLoading(t("loading.appointments"));
  try {
    appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, []);
    appointments.sort((a, b) => tsMillis(b.scheduledAt) - tsMillis(a.scheduledAt));
    renderAppointments();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadAppointments"));
  } finally {
    hideLoading();
  }
}

function getFiltered() {
  return appointments.filter((a) => {
    if (activeFilter === "today") return isToday(a.scheduledAt) && a.status !== "cancelled";
    if (activeFilter === "pending") return a.status === "pending";
    if (activeFilter === "approved") return a.status === "approved";
    return a.status !== "cancelled";
  });
}

function renderAppointments() {
  const listEl = document.getElementById("appointmentsList");
  const emptyState = document.getElementById("emptyState");
  const filtered = getFiltered();

  if (!listEl) return;

  if (filtered.length === 0) {
    listEl.innerHTML = "";
    if (emptyState) {
      emptyState.innerHTML = renderAppointmentEmptyState({
        title: t("pages.appointments.emptyTitle"),
        subtitle: t("pages.appointments.emptyHintSecretary"),
      });
      emptyState.classList.remove("hidden");
    }
    return;
  }

  emptyState?.classList.add("hidden");

  listEl.innerHTML = filtered
    .map((a) => {
      const patient = patientsMap[a.patientId];
      const actions = `
        <div class="btn-row">
          <button type="button" class="btn-sm btn-sm-secondary" data-edit-appt="${escapeHtml(a.id)}">${escapeHtml(t("buttons.edit"))}</button>
          <button type="button" class="btn-sm btn-sm-danger" data-cancel-appt="${escapeHtml(a.id)}">${escapeHtml(t("buttons.cancel"))}</button>
        </div>
      `;
      return renderAppointmentCard({
        status: a.status || "pending",
        scheduledAt: a.scheduledAt,
        patientName: patient?.fullName,
        reason: a.reason || "",
        actionsHtml: actions,
      });
    })
    .join("");

  listEl.querySelectorAll("[data-edit-appt]").forEach((btn) => {
    btn.addEventListener("click", () => openEditAppointment(btn.dataset.editAppt));
  });
  listEl.querySelectorAll("[data-cancel-appt]").forEach((btn) => {
    btn.addEventListener("click", () => cancelAppointment(btn.dataset.cancelAppt));
  });
}

async function createAppointment() {
  const saveBtn = document.getElementById("saveBtn");
  const patientId = document.getElementById("patientSelect").value;
  const dateTime = document.getElementById("appointmentDateTime").value;
  const reason = document.getElementById("reason").value.trim();
  const status = document.getElementById("appointmentStatus").value;

  if (!patientId || !dateTime) {
    toast.error(t("toast.patientDateTimeRequired"));
    return;
  }

  saveBtn.disabled = true;
  showLoading(t("loading.creatingAppointment"));

  try {
    await FirestoreService.create(COLLECTIONS.APPOINTMENTS, {
      patientId,
      doctorId,
      secretaryId,
      scheduledAt: new Date(dateTime),
      reason,
      status,
    });

    toast.success(t("toast.appointmentCreated"));
    document.getElementById("appointmentForm").reset();
    await loadAppointments();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedCreateAppointment"));
  } finally {
    saveBtn.disabled = false;
    hideLoading();
  }
}

function openEditAppointment(appointmentId) {
  const appt = appointments.find((a) => a.id === appointmentId);
  if (!appt) return;

  const dt = appt.scheduledAt?.toDate
    ? appt.scheduledAt.toDate()
    : new Date(appt.scheduledAt);
  const local = new Date(dt.getTime() - dt.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);

  openModal({
    title: t("modal.editAppointment"),
    body: `
      <div class="form-group mb-3">
        <label>${escapeHtml(t("forms.dateTime"))}</label>
        <input id="editApptDateTime" type="datetime-local" class="form-input" value="${local}" />
      </div>
      <div class="form-group mb-3">
        <label>${escapeHtml(t("pages.appointments.reasonLabel"))}</label>
        <input id="editApptReason" class="form-input" value="${escapeHtml(appt.reason || "")}" />
      </div>
      <div class="form-group">
        <label>${escapeHtml(t("forms.status"))}</label>
        <select id="editApptStatus" class="form-input">
          <option value="pending" ${appt.status === "pending" ? "selected" : ""}>${t("status.pending")}</option>
          <option value="approved" ${appt.status === "approved" ? "selected" : ""}>${t("status.approved")}</option>
        </select>
      </div>
    `,
    confirmText: t("buttons.save"),
    onConfirm: async () => {
      showLoading(t("loading.updatingAppointment"));
      try {
        await FirestoreService.update(COLLECTIONS.APPOINTMENTS, appointmentId, {
          scheduledAt: new Date(document.getElementById("editApptDateTime").value),
          reason: document.getElementById("editApptReason").value.trim(),
          status: document.getElementById("editApptStatus").value,
        });
        toast.success(t("toast.appointmentUpdated"));
        await loadAppointments();
      } catch (error) {
        console.error(error);
        toast.error(t("toast.failedUpdateAppointment"));
      } finally {
        hideLoading();
      }
    },
  });
}

async function cancelAppointment(appointmentId) {
  const confirmed = await confirmModal(t("modal.cancelAppointment"), t("modal.cancelAppointmentConfirm"));
  if (!confirmed) return;

  showLoading(t("loading.cancelling"));
  try {
    await FirestoreService.update(COLLECTIONS.APPOINTMENTS, appointmentId, { status: "cancelled" });
    toast.success(t("toast.appointmentCancelled"));
    await loadAppointments();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedCancelAppointment"));
  } finally {
    hideLoading();
  }
}
