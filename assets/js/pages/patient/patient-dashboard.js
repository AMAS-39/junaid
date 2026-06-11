import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { buildUrl } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { calculateBMI, escapeHtml, formatDateTime } from "../../utils/format.js";
import { getPatientRecord, getActiveDietPlan, tsMillis } from "./patient-helpers.js";
import {
  getTodayChecklist,
  setChecklistItem,
  saveChecklistEntryDetails,
  getComplianceStats,
  getTodayDateString,
  CHECKLIST_ITEMS,
} from "../../services/daily-checklist.service.js";
import {
  renderPatientChecklist,
  updateChecklistToggleButton,
  updateChecklistProgress,
  updateEntryPreview,
} from "./checklist-ui.js";

let currentPatientId = null;
let todayChecklist = null;
let checklistSaving = false;

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    currentPatientId = session.user.uid;
    const patientId = currentPatientId;
    const welcomeEl = document.getElementById("welcomeText");
    const summaryEl = document.getElementById("summaryCards");
    const gridEl = document.getElementById("dashboardGrid");

    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${session.profile.name || "Patient"}`;
    }

    const dateEl = document.getElementById("checklistDate");
    if (dateEl) dateEl.textContent = getTodayDateString();

    showLoading("Loading your dashboard...");

    try {
      todayChecklist = await getTodayChecklist(patientId);
      renderPatientChecklist(
        document.getElementById("checklistItems"),
        todayChecklist,
        handleChecklistToggle,
        handleSaveChecklistDetails
      );

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
          { title: "Today's Checklist", icon: "✅", href: "#todayChecklist" },
          { title: "My Diet Plan", icon: "🥗", href: "/patient/diet-plan/view.html" },
          { title: "Upload Photo", icon: "📷", href: "/patient/photos/upload.html" },
          { title: "My Progress", icon: "📈", href: "/patient/progress/list.html" },
          { title: "Book Appointment", icon: "📅", href: "/patient/appointments/list.html" },
          { title: "Messages", icon: "💬", href: "/patient/messages/list.html" },
        ];

        gridEl.innerHTML = cards
          .map(
            (c) => `
            <a href="${c.href.startsWith("#") ? c.href : buildUrl(c.href)}" class="patient-big-card">
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

async function handleChecklistToggle(field, done, toggleBtn) {
  if (checklistSaving || !todayChecklist) return;

  const previousDone = Boolean(todayChecklist[field]);
  todayChecklist = { ...todayChecklist, [field]: done };

  if (toggleBtn) {
    updateChecklistToggleButton(toggleBtn, done);
  }
  updateChecklistProgress(getComplianceStats(todayChecklist));

  checklistSaving = true;

  try {
    await setChecklistItem(currentPatientId, field, done);
  } catch (error) {
    console.error(error);
    todayChecklist = { ...todayChecklist, [field]: previousDone };
    if (toggleBtn) {
      updateChecklistToggleButton(toggleBtn, previousDone);
    }
    updateChecklistProgress(getComplianceStats(todayChecklist));
    toast.error("Could not update checklist. Try again.");
  } finally {
    checklistSaving = false;
  }
}

async function handleSaveChecklistDetails(prefix, details) {
  if (checklistSaving || !todayChecklist) return;

  const item = CHECKLIST_ITEMS.find((i) => i.prefix === prefix);
  const hasContent = details.what || details.how || details.amount;
  const markDone = hasContent ? true : undefined;

  checklistSaving = true;
  showLoading("Saving log...");

  try {
    await saveChecklistEntryDetails(currentPatientId, prefix, {
      ...details,
      done: markDone,
    });

    if (item && markDone) {
      todayChecklist = {
        ...todayChecklist,
        [item.key]: true,
        [`${prefix}What`]: details.what,
        [`${prefix}How`]: details.how,
        [`${prefix}Amount`]: details.amount,
      };

      const entry = document.querySelector(`[data-checklist-prefix="${prefix}"]`);
      const toggleBtn = entry?.querySelector("[data-checklist-key]");
      if (toggleBtn) updateChecklistToggleButton(toggleBtn, true);
      if (entry) updateEntryPreview(entry, details, true);
      updateChecklistProgress(getComplianceStats(todayChecklist));
    } else {
      todayChecklist = {
        ...todayChecklist,
        [`${prefix}What`]: details.what,
        [`${prefix}How`]: details.how,
        [`${prefix}Amount`]: details.amount,
      };
      const entry = document.querySelector(`[data-checklist-prefix="${prefix}"]`);
      if (entry) updateEntryPreview(entry, details, Boolean(item?.key && todayChecklist[item.key]));
    }

    toast.success("Daily log saved.");
  } catch (error) {
    console.error(error);
    toast.error("Could not save log. Try again.");
  } finally {
    checklistSaving = false;
    hideLoading();
  }
}
