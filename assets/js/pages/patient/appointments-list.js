import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import {
  renderAppointmentCard,
  renderAppointmentEmptyState,
} from "../../components/appointment-card.js";
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
        toast.error(t("toast.selectDateTime"));
        return;
      }

      saveBtn.disabled = true;
      showLoading(t("loading.submitting"));

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

        toast.success(t("toast.requestSent"));
        form.reset();
        await loadAppointments(patientId, listEl, emptyState);
      } catch (error) {
        console.error(error);
        toast.error(t("toast.failedBookAppointment"));
      } finally {
        saveBtn.disabled = false;
        hideLoading();
      }
    });
  },
});

async function loadAppointments(patientId, listEl, emptyState) {
  showLoading(t("loading.appointments"));

  try {
    let appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, [
      ["patientId", "==", patientId],
    ]);
    appointments.sort((a, b) => tsMillis(b.scheduledAt) - tsMillis(a.scheduledAt));

    if (appointments.length === 0) {
      listEl.innerHTML = "";
      if (emptyState) {
        emptyState.innerHTML = renderAppointmentEmptyState({
          title: t("empty.noAppointments"),
          subtitle: t("empty.noAppointmentsHint"),
          footer: t("empty.noAppointmentsConfirm"),
        });
        emptyState.classList.remove("hidden");
      }
      return;
    }

    emptyState?.classList.add("hidden");
    listEl.innerHTML = appointments
      .map((a) =>
        renderAppointmentCard({
          status: a.status || "pending",
          scheduledAt: a.scheduledAt,
          reason: a.reason || "",
          notes: a.notes || "",
          patientView: true,
        })
      )
      .join("");
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadAppointments"));
  } finally {
    hideLoading();
  }
}
