import { bootstrap } from "../../core/bootstrap.js";
import { registerStaffAccount, formatAuthError } from "../../services/auth.service.js";
import { getHomeForRole, navigateTo } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { t } from "../../core/i18n.js";

bootstrap({
  publicPage: true,
  onReady: () => {
    const form = document.getElementById("setupForm");
    const saveBtn = document.getElementById("setupBtn");
    const errorMsg = document.getElementById("errorMsg");

    if (!form || !saveBtn) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorMsg.textContent = "";

      const name = document.getElementById("name").value.trim();
      const email = document.getElementById("email").value.trim();
      const phone = document.getElementById("phone").value.trim();
      const password = document.getElementById("password").value;
      const role = document.getElementById("role").value;

      if (!name || !email || !password || password.length < 6) {
        const msg = "Name, email, and password (min. 6 characters) are required.";
        errorMsg.textContent = msg;
        toast.error(msg);
        return;
      }

      saveBtn.disabled = true;
      const originalLabel = saveBtn.textContent;
      saveBtn.textContent = t("loading.creating");

      showLoading(t("loading.creatingAccount"));

      try {
        const { profile } = await registerStaffAccount({
          name,
          email,
          password,
          phone,
          role,
        });

        toast.success(t("toast.accountCreated"));
        navigateTo(getHomeForRole(profile.role));
      } catch (error) {
        console.error(error);
        const message = formatAuthError(error);
        errorMsg.textContent = message;
        toast.error(message);
        saveBtn.disabled = false;
        saveBtn.textContent = originalLabel;
      } finally {
        hideLoading();
      }
    });
  },
});
