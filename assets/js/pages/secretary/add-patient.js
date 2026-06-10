import { bootstrap } from "../../core/bootstrap.js";
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
  if (!values.fullName) return "Full name is required.";
  if (!values.phone) return "Phone number is required.";
  if (!values.email) return "Email is required.";
  if (!values.password || values.password.length < 6) {
    return "Password must be at least 6 characters.";
  }
  if (!values.gender) return "Please select a gender.";
  if (!values.age || values.age <= 0) return "Age must be greater than 0.";
  if (!values.height || values.height <= 0) return "Height must be greater than 0.";
  if (!values.currentWeight || values.currentWeight <= 0) {
    return "Current weight must be greater than 0.";
  }
  if (!values.targetWeight || values.targetWeight <= 0) {
    return "Target weight must be greater than 0.";
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
    "auth/email-already-in-use": "This email is already registered.",
    "auth/invalid-email": "Please enter a valid email address.",
    "auth/weak-password": "Password must be at least 6 characters.",
    "auth/operation-not-allowed": "Email sign-up is not enabled. Contact support.",
    "permission-denied": "You do not have permission to create patient records.",
  };

  if (code && messages[code]) return messages[code];

  if (error && typeof error === "object" && "message" in error && error.message) {
    return String(error.message);
  }

  return "Failed to create patient account. Please try again.";
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
      saveBtn.textContent = "Creating...";

      showLoading("Creating patient account...");

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

        toast.success("Patient account created successfully.");
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
