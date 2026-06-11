import { bootstrap } from "../../core/bootstrap.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { buildUrl } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { renderDashStats, renderDashActions } from "../../components/dashboard-stats.js";
import { formatFirestoreError } from "../../utils/firestore-error.js";
import { isToday, tsMillis } from "./secretary-helpers.js";

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    const welcomeEl = document.getElementById("welcomeText");
    const subtitleEl = document.getElementById("dashboardSubtitle");
    const statsEl = document.getElementById("statsCards");
    const gridEl = document.getElementById("dashboardGrid");

    if (welcomeEl) {
      welcomeEl.textContent = `Welcome, ${session.profile.name || "Secretary"}`;
    }
    if (subtitleEl) {
      subtitleEl.textContent = "Front desk overview for today";
    }

    showLoading("Loading dashboard...");

    try {
      const patients = await FirestoreService.query(COLLECTIONS.PATIENTS, []);
      const appointments = await FirestoreService.query(COLLECTIONS.APPOINTMENTS, []);
      const payments = await FirestoreService.query(COLLECTIONS.PAYMENTS, []);

      const todayCount = appointments.filter(
        (a) => isToday(a.scheduledAt) && a.status !== "cancelled"
      ).length;
      const pendingCount = appointments.filter((a) => a.status === "pending").length;
      const unpaidCount = payments.filter((p) => p.status === "unpaid").length;

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);
      const monthStart = startOfMonth.getTime();

      const paidThisMonth = payments
        .filter((p) => p.status === "paid" && tsMillis(p.createdAt) >= monthStart)
        .reduce((sum, p) => sum + Number(p.amount || 0), 0);

      const monthLabel = startOfMonth.toLocaleString(undefined, { month: "short", year: "numeric" });

      renderDashStats(statsEl, [
        {
          label: "Total Patients",
          value: patients.length,
          meta: "Registered patients",
          icon: "👥",
          tone: "green",
          href: buildUrl("/secretary/patients/list.html"),
        },
        {
          label: "Today's Appointments",
          value: todayCount,
          meta: "Scheduled for today",
          icon: "📅",
          tone: "sky",
          href: buildUrl("/secretary/appointments/list.html"),
          badge: todayCount > 0 ? "Today" : "None",
          badgeTone: todayCount > 0 ? "success" : "muted",
        },
        {
          label: "Pending Appointments",
          value: pendingCount,
          meta: "Need confirmation",
          icon: "⏳",
          tone: "amber",
          href: buildUrl("/secretary/appointments/list.html"),
          badge: pendingCount > 0 ? "Pending" : "Clear",
          badgeTone: pendingCount > 0 ? "warning" : "muted",
        },
        {
          label: "Unpaid Payments",
          value: unpaidCount,
          meta: "Outstanding invoices",
          icon: "💳",
          tone: "violet",
          href: buildUrl("/secretary/payments/list.html"),
          badge: unpaidCount > 0 ? "Due" : "Clear",
          badgeTone: unpaidCount > 0 ? "warning" : "muted",
        },
        {
          label: "Paid This Month",
          value: formatMoney(paidThisMonth),
          meta: monthLabel,
          icon: "💵",
          tone: "teal",
          href: buildUrl("/secretary/payments/list.html"),
          badge: "Revenue",
          badgeTone: "success",
        },
      ]);

      renderDashActions(gridEl, [
        {
          title: "Add Patient",
          desc: "Register a new patient",
          icon: "➕",
          href: buildUrl("/secretary/add-patient.html"),
        },
        {
          title: "Patient List",
          desc: "Browse all patients",
          icon: "👥",
          href: buildUrl("/secretary/patients/list.html"),
        },
        {
          title: "Appointments",
          desc: "Manage visit schedule",
          icon: "📅",
          href: buildUrl("/secretary/appointments/list.html"),
        },
        {
          title: "Payments",
          desc: "Record and track payments",
          icon: "💵",
          href: buildUrl("/secretary/payments/list.html"),
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

function formatMoney(amount) {
  const n = Number(amount) || 0;
  return n.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
