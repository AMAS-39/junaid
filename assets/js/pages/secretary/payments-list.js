import { bootstrap } from "../../core/bootstrap.js";
import { t, tStatus } from "../../core/i18n.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { escapeHtml, formatDate } from "../../utils/format.js";
import { loadPatientsMap, tsMillis } from "./secretary-helpers.js";

let payments = [];
let patientsMap = {};
let secretaryId = null;

bootstrap({
  onReady: async (session) => {
    if (!session) return;

    secretaryId = session.user.uid;
    patientsMap = await loadPatientsMap();

    const patientSelect = document.getElementById("patientSelect");
    if (patientSelect) {
      patientSelect.innerHTML = Object.values(patientsMap)
        .map((p) => `<option value="${escapeHtml(p.id)}">${escapeHtml(p.fullName || p.id)}</option>`)
        .join("");
    }

    document.getElementById("paymentForm")?.addEventListener("submit", async (e) => {
      e.preventDefault();
      await createPayment();
    });

    document.getElementById("searchInput")?.addEventListener("input", () => {
      renderPayments(document.getElementById("searchInput").value);
    });

    await loadPayments();
  },
});

async function loadPayments() {
  showLoading(t("loading.payments"));
  try {
    payments = await FirestoreService.query(COLLECTIONS.PAYMENTS, []);
    payments.sort((a, b) => tsMillis(b.createdAt) - tsMillis(a.createdAt));
    updateSummary();
    renderPayments("");
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedLoadPayments"));
  } finally {
    hideLoading();
  }
}

function updateSummary() {
  const summaryEl = document.getElementById("paymentSummary");
  if (!summaryEl) return;

  const paidTotal = payments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const unpaidTotal = payments
    .filter((p) => p.status === "unpaid")
    .reduce((sum, p) => sum + Number(p.amount || 0), 0);

  summaryEl.innerHTML = `
    <div class="stats-grid">
      <div class="stat-card"><span>${t("payments.totalPaid")}</span><strong>${paidTotal.toFixed(2)}</strong></div>
      <div class="stat-card"><span>${t("payments.totalUnpaid")}</span><strong>${unpaidTotal.toFixed(2)}</strong></div>
    </div>
  `;
}

function renderPayments(searchValue) {
  const listEl = document.getElementById("paymentsList");
  const emptyState = document.getElementById("emptyState");
  const keyword = searchValue.trim().toLowerCase();

  const filtered = payments.filter((p) => {
    const patient = patientsMap[p.patientId];
    const name = String(patient?.fullName || "").toLowerCase();
    return name.includes(keyword);
  });

  if (!listEl) return;

  if (filtered.length === 0) {
    listEl.innerHTML = "";
    emptyState?.classList.remove("hidden");
    return;
  }

  emptyState?.classList.add("hidden");

  listEl.innerHTML = filtered
    .map((p) => {
      const patient = patientsMap[p.patientId];
      const statusClass = p.status === "paid" ? "approved" : "pending";

      return `
        <div class="patient-list-card">
          <div class="flex justify-between items-start gap-2">
            <strong>${escapeHtml(patient?.fullName || t("labels.unknown"))}</strong>
            <span class="status-badge status-${statusClass}">${escapeHtml(tStatus(p.status || "unpaid"))}</span>
          </div>
          <p class="text-sm text-slate-600 mt-2"><strong>${escapeHtml(String(p.amount))}</strong> — ${escapeHtml(p.serviceType || t("pages.payments.defaultService"))}</p>
          ${p.note || p.description ? `<p class="text-sm text-slate-500">${escapeHtml(p.note || p.description)}</p>` : ""}
          <p class="text-xs text-slate-400 mt-1">${escapeHtml(formatDate(p.createdAt))}</p>
          ${p.status === "unpaid" ? `
            <button type="button" class="btn-sm btn-sm-primary mt-3" data-mark-paid="${escapeHtml(p.id)}">${escapeHtml(t("buttons.markAsPaid"))}</button>
          ` : ""}
        </div>
      `;
    })
    .join("");

  listEl.querySelectorAll("[data-mark-paid]").forEach((btn) => {
    btn.addEventListener("click", () => markAsPaid(btn.dataset.markPaid));
  });
}

async function createPayment() {
  const saveBtn = document.getElementById("saveBtn");
  const patientId = document.getElementById("patientSelect").value;
  const amount = Number(document.getElementById("amount").value);
  const serviceType = document.getElementById("serviceType").value.trim();
  const status = document.getElementById("paymentStatus").value;
  const note = document.getElementById("note").value.trim();

  if (!patientId || !amount || amount <= 0) {
    toast.error(t("toast.patientAmountRequired"));
    return;
  }

  saveBtn.disabled = true;
  showLoading(t("loading.savingPayment"));

  try {
    await FirestoreService.create(COLLECTIONS.PAYMENTS, {
      patientId,
      amount,
      serviceType,
      status,
      note,
      description: note,
      recordedBy: secretaryId,
    });

    toast.success(t("toast.paymentSaved"));
    document.getElementById("paymentForm").reset();
    await loadPayments();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedSavePayment"));
  } finally {
    saveBtn.disabled = false;
    hideLoading();
  }
}

async function markAsPaid(paymentId) {
  showLoading(t("loading.updating"));
  try {
    await FirestoreService.update(COLLECTIONS.PAYMENTS, paymentId, { status: "paid" });
    toast.success(t("toast.markedAsPaid"));
    await loadPayments();
  } catch (error) {
    console.error(error);
    toast.error(t("toast.failedSavePayment"));
  } finally {
    hideLoading();
  }
}
