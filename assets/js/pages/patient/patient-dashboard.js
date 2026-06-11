import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { buildUrl } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { formatDate, formatDateTime } from "../../utils/format.js";
import { formatFirestoreError } from "../../utils/firestore-error.js";
import {
  renderPatientActionGrid,
  renderPatientTodayCards,
} from "../../components/patient-ui.js";
import { getActiveDietPlan, tsMillis } from "./patient-helpers.js";
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
    const name = session.profile.name || "there";

    const welcomeEl = document.getElementById("welcomeText");
    const subtitleEl = document.getElementById("dashboardSubtitle");
    const todayCardsEl = document.getElementById("todayCards");
    const gridEl = document.getElementById("dashboardGrid");
    const todayBadge = document.getElementById("todayDateBadge");
    const dateEl = document.getElementById("checklistDate");

    if (welcomeEl) welcomeEl.textContent = `Hello, ${name}`;
    if (subtitleEl) subtitleEl.textContent = "Here is your plan for today";
    if (todayBadge) todayBadge.textContent = getTodayDateString();
    if (dateEl) dateEl.textContent = getTodayDateString();

    showLoading("Loading your page...");

    try {
      todayChecklist = await getTodayChecklist(patientId);
      renderPatientChecklist(
        document.getElementById("checklistItems"),
        todayChecklist,
        handleChecklistToggle,
        handleSaveChecklistDetails
      );

      const checklistStats = getComplianceStats(todayChecklist);
      updateChecklistProgress(checklistStats);

      const dietPlan = await getActiveDietPlan(patientId);

      let appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, [
        ["patientId", "==", patientId],
      ]);
      appointments = appointments
        .filter((a) => ["pending", "approved"].includes(a.status))
        .sort((a, b) => tsMillis(a.scheduledAt) - tsMillis(b.scheduledAt));

      const now = Date.now();
      const nextAppointment =
        appointments.find((a) => tsMillis(a.scheduledAt) >= now) || appointments[0];

      renderPatientTodayCards(
        todayCardsEl,
        {
          nextAppointment,
          dietPlan,
          checklistPercent: checklistStats.percent,
          checklistDone: checklistStats.completed,
          checklistTotal: checklistStats.total,
        },
        { formatDate, formatDateTime }
      );

      renderPatientActionGrid(gridEl, [
        {
          title: "My Diet Plan",
          icon: "🥗",
          href: buildUrl("/patient/diet-plan/view.html"),
          tone: "teal",
        },
        {
          title: "Upload Photo",
          icon: "📷",
          href: buildUrl("/patient/photos/upload.html"),
          tone: "sky",
        },
        {
          title: "My Progress",
          icon: "📈",
          href: buildUrl("/patient/progress/list.html"),
          tone: "blue",
        },
        {
          title: "Appointment",
          icon: "📅",
          href: buildUrl("/patient/appointments/list.html"),
          tone: "violet",
        },
        {
          title: "Message Doctor",
          icon: "💬",
          href: buildUrl("/patient/messages/list.html"),
          tone: "green",
        },
        {
          title: "Medicine",
          icon: "💊",
          href: buildUrl("/patient/medicine/list.html"),
          tone: "amber",
        },
      ]);
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
  refreshTodayChecklistCard();

  checklistSaving = true;

  try {
    await setChecklistItem(currentPatientId, field, done);
    toast.success("Saved!");
  } catch (error) {
    console.error(error);
    todayChecklist = { ...todayChecklist, [field]: previousDone };
    if (toggleBtn) {
      updateChecklistToggleButton(toggleBtn, previousDone);
    }
    updateChecklistProgress(getComplianceStats(todayChecklist));
    refreshTodayChecklistCard();
    toast.error("Could not save. Please try again.");
  } finally {
    checklistSaving = false;
  }
}

function refreshTodayChecklistCard() {
  const todayCardsEl = document.getElementById("todayCards");
  if (!todayCardsEl || !todayChecklist) return;

  const stats = getComplianceStats(todayChecklist);
  const checklistLink = todayCardsEl.querySelector('a[href="#todayChecklist"]');
  if (!checklistLink) return;

  const valueEl = checklistLink.querySelector(".patient-info-card-value");
  const metaEl = checklistLink.querySelector(".patient-info-card-meta");
  if (valueEl) valueEl.textContent = `${stats.percent}% done`;
  if (metaEl) metaEl.textContent = `${stats.completed} of ${stats.total} tasks completed`;
}

async function handleSaveChecklistDetails(prefix, details) {
  if (checklistSaving || !todayChecklist) return;

  const item = CHECKLIST_ITEMS.find((i) => i.prefix === prefix);
  const hasContent = details.what || details.how || details.amount;
  const markDone = hasContent ? true : undefined;

  checklistSaving = true;
  showLoading("Saving...");

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

    refreshTodayChecklistCard();
    toast.success("Saved! Great job.");
  } catch (error) {
    console.error(error);
    toast.error("Could not save. Please try again.");
  } finally {
    checklistSaving = false;
    hideLoading();
  }
}
