import { bootstrap } from "../../core/bootstrap.js";
import { login, formatAuthError, resetPassword } from "../../services/auth.service.js";
import { getHomeForRole, navigateTo } from "../../core/router.js";
import { showLoading, hideLoading } from "../../components/loading.js";
import { toast } from "../../components/toast.js";
import { t, getLocale, setLocale, renderLanguageOptions } from "../../core/i18n.js";

bootstrap({
  publicPage: true,
  redirectIfAuth: true,
  onReady: () => {
    const form = document.getElementById("loginForm");
    const errorMsg = document.getElementById("errorMsg");
    const loginBtn = document.getElementById("loginBtn");
    const forgotBtn = document.getElementById("forgotPasswordBtn");
    const langSelect = document.getElementById("ncms-language-select");

    if (langSelect) {
      langSelect.innerHTML = renderLanguageOptions();
      langSelect.value = getLocale();
      langSelect.addEventListener("change", () => {
        setLocale(langSelect.value);
        window.location.reload();
      });
    }

    if (!form) return;

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      errorMsg.textContent = "";
      loginBtn.disabled = true;
      loginBtn.textContent = t("buttons.loggingIn");

      const email = document.getElementById("email").value.trim();
      const password = document.getElementById("password").value;

      showLoading(t("login.signingIn"));

      try {
        const { profile } = await login(email, password);
        navigateTo(getHomeForRole(profile.role));
      } catch (error) {
        console.error(error);
        const message = formatAuthError(error);
        errorMsg.textContent = message;
        toast.error(message);
        loginBtn.textContent = t("buttons.login");
        loginBtn.disabled = false;
      } finally {
        hideLoading();
      }
    });

    if (forgotBtn) {
      forgotBtn.addEventListener("click", async () => {
        const email = document.getElementById("email").value.trim();
        if (!email) {
          toast.warning(t("login.enterEmailFirst"));
          return;
        }

        showLoading(t("common.loading"));
        try {
          await resetPassword(email);
          toast.success(t("login.resetSent"));
        } catch (error) {
          toast.error(formatAuthError(error));
        } finally {
          hideLoading();
        }
      });
    }
  },
});
