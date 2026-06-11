import { bootstrap } from "../../core/bootstrap.js";
import { t } from "../../core/i18n.js";
import { toast } from "../../components/toast.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { createSecondaryAccount } from "../../services/auth.service.js";
import { FirestoreService } from "../../services/firestore.service.js";
import { COLLECTIONS } from "../../architecture/firestore-collections.js";
import { ROLES } from "../../config/constants.js";

/**
 * @returns {Record<string, string | number>}
 */
function getFormValues() {
  return {
    fullName: document.getElementById("fullName").value.trim(),
    phone: document.getElementById("phone").value.trim(),
    email: document.getElementById("email").value.trim(),
    password: document.getElementById("password").value,
    gender: document.getElementById("gender").value,
    age: Number(document.getElementById("age").value),
    height: Number(document.getElementById("height").value),
    currentWeight: Number(document.getElementById("currentWeight").value),
    targetWeight: Number(document.getElementById("targetWeight").value),
  };
}

/**
 * @param {Record<string, string | number>} values
 * @returns {string | null}
 */
function validateForm(values) {
  if (!values.fullName) return t("validation.fullNameRequired");
  if (!values.phone) return t("validation.phoneRequired");
  if (!values.email) return t("validation.emailRequired");
  if (!values.password || values.password.length < 6) {
    return t("validation.passwordMinLength");
  }
  if (!values.gender) return t("validation.genderRequired");
  if (!values.age || values.age <= 0) return t("validation.agePositive");
  if (!values.height || values.height <= 0) return t("validation.heightPositive");
  if (!values.currentWeight || values.currentWeight <= 0) {
    return t("validation.currentWeightPositive");
  }
  if (!values.targetWeight || values.targetWeight <= 0) {
    return t("validation.targetWeightPositive");
  }
  return null;
}

/**
 * @param {unknown} error
 * @returns {string}
 */
function formatError(error) {
  const code = error && typeof error === "object" && "code" in error ? error.code : "";

  const messages = {
    "auth/email-already-in-use": t("authErrors.emailAlreadyInUse"),
    "auth/invalid-email": t("authErrors.invalidEmail"),
    "auth/weak-password": t("authErrors.weakPassword"),
    "auth/operation-not-allowed": t("authErrors.operationNotAllowed"),
    "permission-denied": t("authErrors.permissionDenied"),
  };

  if (code && messages[code]) return messages[code];

  if (error && typeof error === "object" && "message" in error && error.message) {
    return String(error.message);
  }

  return t("authErrors.failedCreatePatient");
}

bootstrap({
  onReady: (session) => {
    if (!session || session.profile.role !== ROLES.SECRETARY) return;

    const form = document.getElementById("addPatientForm");
    const saveBtn = document.getElementById("saveBtn");

    if (!form || !saveBtn) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();

      const values = getFormValues();
      const validationError = validateForm(values);

      if (validationError) {
        toast.error(validationError);
        return;
      }

      saveBtn.disabled = true;
      const originalLabel = saveBtn.textContent;
      saveBtn.textContent = t("loading.creating");

      showLoading(t("loading.creatingPatient"));

      try {
        const credential = await createSecondaryAccount(values.email, values.password);
        const patientUID = credential.user.uid;
        const secretaryUID = session.user.uid;

        await FirestoreService.create(
          COLLECTIONS.USERS,
          {
            name: values.fullName,
            email: values.email,
            phone: values.phone,
            role: ROLES.PATIENT,
            createdBy: secretaryUID,
            status: "active",
          },
          patientUID
        );

        await FirestoreService.create(
          COLLECTIONS.PATIENTS,
          {
            patientId: patientUID,
            fullName: values.fullName,
            email: values.email,
            phone: values.phone,
            gender: values.gender,
            age: values.age,
            height: values.height,
            currentWeight: values.currentWeight,
            targetWeight: values.targetWeight,
            createdBy: secretaryUID,
            status: "active",
          },
          patientUID
        );

        toast.success(t("toast.patientCreated"));
        form.reset();
      } catch (error) {
        console.error(error);
        toast.error(formatError(error));
      } finally {
        hideLoading();
        saveBtn.disabled = false;
        saveBtn.textContent = originalLabel;
      }
    });
  },
});
