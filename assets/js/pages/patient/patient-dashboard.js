import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { buildUrl } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { calculateBMI, formatDate } from "../../utils/format.js";
import { renderDashStats, renderDashActions } from "../../components/dashboard-stats.js";
import { formatFirestoreError } from "../../utils/firestore-error.js";
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
    const subtitleEl = document.getElementById("dashboardSubtitle");
    const summaryEl = document.getElementById("summaryCards");
    const gridEl = document.getElementById("dashboardGrid");

    if (welcomeEl) {
      welcomeEl.textContent = `Hi, ${session.profile.name || "there"}`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = "Your health snapshot for today";
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
      const checklistStats = getComplianceStats(todayChecklist);

      const nextApptMeta = nextAppointment
        ? `Status: ${nextAppointment.status || "pending"}`
        : "Book with your clinic";

      const dietTitle = dietPlan?.title || "No active plan";
      const dietMeta = dietPlan
        ? String(dietPlan.breakfast || "View meals and goals").slice(0, 48)
        : "Your doctor will assign one";

      renderDashStats(
        summaryEl,
        [
          {
            label: "Current Weight",
            value: weight === "—" ? "—" : `${weight} kg`,
            meta: "Latest recorded",
            icon: "⚖️",
            tone: "green",
            href: buildUrl("/patient/progress/list.html"),
          },
          {
            label: "Target Weight",
            value: target === "—" ? "—" : `${target} kg`,
            meta: "Your goal",
            icon: "🎯",
            tone: "teal",
          },
          {
            label: "BMI",
            value: bmiDisplay,
            meta: patient?.height ? `${patient.height} cm height` : "Body mass index",
            icon: "📊",
            tone: "sky",
          },
          {
            label: "Next Appointment",
            value: nextAppointment ? formatDate(nextAppointment.scheduledAt) : "—",
            meta: nextApptMeta,
            icon: "📅",
            tone: "violet",
            href: buildUrl("/patient/appointments/list.html"),
            badge: nextAppointment ? nextAppointment.status || "pending" : undefined,
            badgeTone: nextAppointment
              ? nextAppointment.status === "approved"
                ? "success"
                : "warning"
              : undefined,
          },
          {
            label: "Diet Plan",
            value: dietPlan ? "Active" : "None",
            meta: dietMeta,
            icon: "🥗",
            tone: "amber",
            href: buildUrl("/patient/diet-plan/view.html"),
            badge: dietPlan ? "Active" : "Pending",
            badgeTone: dietPlan ? "success" : "muted",
          },
          {
            label: "Today's Checklist",
            value: `${checklistStats.percent}%`,
            meta: `${checklistStats.completed} of ${checklistStats.total} completed`,
            icon: "✅",
            tone: "green",
            href: "#todayChecklist",
            badge: checklistStats.percent >= 100 ? "Done" : "In progress",
            badgeTone: checklistStats.percent >= 100 ? "success" : "warning",
          },
        ],
        { gridClass: "dash-stats-grid patient-dash-stats-grid" }
      );

      renderDashActions(
        gridEl,
        [
          {
            title: "Today's Checklist",
            desc: "Log meals and water",
            icon: "✅",
            href: "#todayChecklist",
          },
          {
            title: "Medicine Schedule",
            desc: "Reminders and papers",
            icon: "💊",
            href: buildUrl("/patient/medicine/list.html"),
          },
          {
            title: "My Diet Plan",
            desc: "View nutrition plan",
            icon: "🥗",
            href: buildUrl("/patient/diet-plan/view.html"),
          },
          {
            title: "Upload Photo",
            desc: "Meals, progress, reports",
            icon: "📷",
            href: buildUrl("/patient/photos/upload.html"),
          },
          {
            title: "My Progress",
            desc: "Weight history",
            icon: "📈",
            href: buildUrl("/patient/progress/list.html"),
          },
          {
            title: "Book Appointment",
            desc: "Schedule a visit",
            icon: "📅",
            href: buildUrl("/patient/appointments/list.html"),
          },
          {
            title: "Messages",
            desc: "Chat with your doctor",
            icon: "💬",
            href: buildUrl("/patient/messages/list.html"),
          },
        ],
        "dash-actions-grid patient-dash-actions"
      );
    } catch (error) {
      console.error(error);
      toast.error(formatFirestoreError(error));
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
