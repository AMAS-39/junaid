import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { openModal, confirmModal } from "../../components/modal.js";
import { escapeHtml, formatDateTime } from "../../utils/format.js";
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
  showLoading("Loading appointments...");
  try {
    appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, []);
    appointments.sort((a, b) => tsMillis(b.scheduledAt) - tsMillis(a.scheduledAt));
    renderAppointments();
  } catch (error) {
    console.error(error);
    toast.error("Failed to load appointments.");
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
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  listEl.innerHTML = filtered
    .map((a) => {
      const patient = patientsMap[a.patientId];
      return `
        <div class="patient-list-card">
          <div class="flex justify-between items-start gap-2">
            <strong>${escapeHtml(patient?.fullName || "Unknown")}</strong>
            <span class="status-badge status-${escapeHtml(a.status || "pending")}">${escapeHtml(a.status || "pending")}</span>
          </div>
          <p class="text-sm text-slate-600 mt-2">${escapeHtml(formatDateTime(a.scheduledAt))}</p>
          ${a.reason ? `<p class="text-sm text-slate-500">${escapeHtml(a.reason)}</p>` : ""}
          <div class="btn-row mt-3">
            <button type="button" class="btn-sm btn-sm-secondary" data-edit-appt="${escapeHtml(a.id)}">Edit</button>
            <button type="button" class="btn-sm btn-sm-danger" data-cancel-appt="${escapeHtml(a.id)}">Cancel</button>
          </div>
        </div>
      `;
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
    toast.error("Patient and date/time are required.");
    return;
  }

  saveBtn.disabled = true;
  showLoading("Creating appointment...");

  try {
    await FirestoreService.create(COLLECTIONS.APPOINTMENTS, {
      patientId,
      doctorId,
      secretaryId,
      scheduledAt: new Date(dateTime),
      reason,
      status,
    });

    toast.success("Appointment created.");
    document.getElementById("appointmentForm").reset();
    await loadAppointments();
  } catch (error) {
    console.error(error);
    toast.error("Failed to create appointment.");
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
    title: "Edit Appointment",
    body: `
      <div class="form-group mb-3">
        <label>Date & time</label>
        <input id="editApptDateTime" type="datetime-local" class="form-input" value="${local}" />
      </div>
      <div class="form-group mb-3">
        <label>Reason</label>
        <input id="editApptReason" class="form-input" value="${escapeHtml(appt.reason || "")}" />
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="editApptStatus" class="form-input">
          <option value="pending" ${appt.status === "pending" ? "selected" : ""}>Pending</option>
          <option value="approved" ${appt.status === "approved" ? "selected" : ""}>Approved</option>
        </select>
      </div>
    `,
    confirmText: "Save",
    onConfirm: async () => {
      showLoading("Updating...");
      try {
        await FirestoreService.update(COLLECTIONS.APPOINTMENTS, appointmentId, {
          scheduledAt: new Date(document.getElementById("editApptDateTime").value),
          reason: document.getElementById("editApptReason").value.trim(),
          status: document.getElementById("editApptStatus").value,
        });
        toast.success("Appointment updated.");
        await loadAppointments();
      } catch (error) {
        console.error(error);
        toast.error("Failed to update appointment.");
      } finally {
        hideLoading();
      }
    },
  });
}

async function cancelAppointment(appointmentId) {
  const confirmed = await confirmModal("Cancel appointment", "Mark this appointment as cancelled?");
  if (!confirmed) return;

  showLoading("Cancelling...");
  try {
    await FirestoreService.update(COLLECTIONS.APPOINTMENTS, appointmentId, { status: "cancelled" });
    toast.success("Appointment cancelled.");
    await loadAppointments();
  } catch (error) {
    console.error(error);
    toast.error("Failed to cancel appointment.");
  } finally {
    hideLoading();
  }
}
