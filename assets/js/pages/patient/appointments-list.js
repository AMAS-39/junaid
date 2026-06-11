import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { escapeHtml, formatDateTime } from "../../utils/format.js";
import { getAssignedDoctorId, tsMillis } from "./patient-helpers.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const patientId = session.user.uid;
    const form = document.getElementById("appointmentForm");
    const listEl = document.getElementById("appointmentsList");
    const emptyState = document.getElementById("emptyState");

    await loadAppointments(patientId, listEl, emptyState);

    form?.addEventListener("submit", async (e) => {
      e.preventDefault();

      const preferredDateTime = document.getElementById("preferredDateTime").value;
      const reason = document.getElementById("reason").value.trim();
      const note = document.getElementById("note").value.trim();
      const saveBtn = document.getElementById("saveBtn");

      if (!preferredDateTime) {
        toast.error("Please select a preferred date and time.");
        return;
      }

      saveBtn.disabled = true;
      showLoading("Submitting request...");

      try {
        const doctorId = await getAssignedDoctorId(patientId);

        await FirestoreService.create(COLLECTIONS.APPOINTMENTS, {
          patientId,
          doctorId: doctorId || "",
          scheduledAt: new Date(preferredDateTime),
          reason,
          notes: note,
          status: "pending",
        });

        toast.success("Request sent! We will confirm soon.");
        form.reset();
        await loadAppointments(patientId, listEl, emptyState);
      } catch (error) {
        console.error(error);
        toast.error("Failed to book appointment.");
      } finally {
        saveBtn.disabled = false;
        hideLoading();
      }
    });
  },
});

async function loadAppointments(patientId, listEl, emptyState) {
  showLoading("Loading appointments...");

  try {
    let appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, [
      ["patientId", "==", patientId],
    ]);
    appointments.sort((a, b) => tsMillis(b.scheduledAt) - tsMillis(a.scheduledAt));

    if (appointments.length === 0) {
      listEl.innerHTML = "";
      emptyState?.classList.remove("hidden");
      return;
    }

    emptyState?.classList.add("hidden");
    listEl.innerHTML = appointments
      .map(
        (a) => `
        <div class="patient-list-card">
          <div class="flex justify-between items-start gap-2">
            <strong>${escapeHtml(formatDateTime(a.scheduledAt))}</strong>
            <span class="status-badge status-${escapeHtml(a.status || "pending")}">${escapeHtml(a.status || "pending")}</span>
          </div>
          ${a.reason ? `<p class="text-sm text-slate-600 mt-2">${escapeHtml(a.reason)}</p>` : ""}
          ${a.notes ? `<p class="text-sm text-slate-500 mt-1">${escapeHtml(a.notes)}</p>` : ""}
        </div>
      `
      )
      .join("");
  } catch (error) {
    console.error(error);
    toast.error("Failed to load appointments.");
  } finally {
    hideLoading();
  }
}
