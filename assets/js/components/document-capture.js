import { t } from "../core/i18n.js";
import { escapeHtml } from "../utils/format.js";
import { openModal, closeModal } from "./modal.js";
import { toast } from "./toast.js";
import { StorageService } from "../services/storage.service.js";

/**
 * Wire up choose-file + take-photo controls for medicine paper uploads.
 * @param {object} [options]
 */
export function initPaperDocumentCapture(options = {}) {
  const {
    fileInputId = "paperFile",
    cameraInputId = "paperCameraInput",
    previewId = "paperFilePreview",
    chooseBtnId = "paperChooseFileBtn",
    cameraBtnId = "paperTakePhotoBtn",
  } = options;

  const fileInput = document.getElementById(fileInputId);
  const cameraInput = document.getElementById(cameraInputId);
  const preview = document.getElementById(previewId);
  const chooseBtn = document.getElementById(chooseBtnId);
  const cameraBtn = document.getElementById(cameraBtnId);

  let selectedFile = null;
  let previewObjectUrl = null;

  if (!fileInput || !cameraBtn) {
    return { getFile: () => null, reset: () => {} };
  }

  function clearPreview() {
    if (previewObjectUrl) {
      URL.revokeObjectURL(previewObjectUrl);
      previewObjectUrl = null;
    }
    if (preview) {
      preview.innerHTML = "";
      preview.classList.add("hidden");
    }
  }

  function setFile(file) {
    const validation = StorageService.validateFile(file, "DOCUMENT");
    if (!validation.valid) {
      toast.error(validation.error || t("toast.selectFile"));
      return;
    }

    selectedFile = file;
    showPreview(file);
  }

  function showPreview(file) {
    if (!preview) return;
    clearPreview();
    preview.classList.remove("hidden");

    const isImage =
      file.type.startsWith("image/") || /\.(jpg|jpeg|png)$/i.test(file.name || "");
    const name = escapeHtml(file.name || "document");
    const sizeKb = Math.max(1, Math.round(file.size / 1024));

    if (isImage) {
      previewObjectUrl = URL.createObjectURL(file);
      preview.innerHTML = `
        <div class="document-capture-preview-inner">
          <img src="${previewObjectUrl}" alt="" class="document-capture-thumb" />
          <div class="document-capture-preview-meta">
            <span class="document-capture-preview-name">${name}</span>
            <span class="document-capture-preview-size">${sizeKb} KB</span>
          </div>
          <button type="button" class="document-capture-remove" data-remove-preview aria-label="${escapeHtml(t("common.close"))}">×</button>
        </div>
      `;
    } else {
      preview.innerHTML = `
        <div class="document-capture-preview-inner">
          <span class="document-capture-pdf-icon" aria-hidden="true">📄</span>
          <div class="document-capture-preview-meta">
            <span class="document-capture-preview-name">${name}</span>
            <span class="document-capture-preview-size">${sizeKb} KB</span>
          </div>
          <button type="button" class="document-capture-remove" data-remove-preview aria-label="${escapeHtml(t("common.close"))}">×</button>
        </div>
      `;
    }

    preview.querySelector("[data-remove-preview]")?.addEventListener("click", () => {
      selectedFile = null;
      fileInput.value = "";
      if (cameraInput) cameraInput.value = "";
      clearPreview();
    });
  }

  chooseBtn?.addEventListener("click", (e) => {
    e.preventDefault();
    fileInput.click();
  });

  fileInput.addEventListener("change", () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    if (cameraInput) cameraInput.value = "";
    setFile(file);
  });

  cameraInput?.addEventListener("change", () => {
    const file = cameraInput.files?.[0];
    if (!file) return;
    fileInput.value = "";
    setFile(file);
  });

  cameraBtn.addEventListener("click", async (e) => {
    e.preventDefault();

    const preferNativeCamera =
      window.matchMedia("(pointer: coarse)").matches && window.innerWidth < 1024;

    if (preferNativeCamera && cameraInput) {
      cameraInput.click();
      return;
    }

    if (navigator.mediaDevices?.getUserMedia) {
      try {
        const file = await capturePhotoFromWebcam();
        fileInput.value = "";
        if (cameraInput) cameraInput.value = "";
        setFile(file);
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
        console.warn("Webcam capture failed, falling back to file picker:", err);
      }
    }

    if (cameraInput) {
      cameraInput.click();
      return;
    }

    toast.error(t("forms.cameraNotAvailable"));
  });

  return {
    getFile: () => selectedFile,
    reset: () => {
      selectedFile = null;
      fileInput.value = "";
      if (cameraInput) cameraInput.value = "";
      clearPreview();
    },
  };
}

/**
 * Open webcam modal and return a JPEG File from the current frame.
 * @returns {Promise<File>}
 */
function capturePhotoFromWebcam() {
  const bodyHtml = `
    <div class="document-capture-camera">
      <video id="ncms-capture-video" class="document-capture-video" autoplay playsinline muted></video>
      <p class="document-capture-camera-hint">${escapeHtml(t("forms.cameraHint"))}</p>
    </div>
  `;

  return new Promise((resolve, reject) => {
    let stream = null;

    const stopStream = () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
        stream = null;
      }
    };

    openModal({
      title: t("forms.takePhoto"),
      body: bodyHtml,
      confirmText: t("forms.capturePhoto"),
      cancelText: t("buttons.cancel"),
      onConfirm: async () => {
        const video = document.getElementById("ncms-capture-video");
        if (!video?.videoWidth) {
          reject(new Error(t("forms.cameraNotAvailable")));
          return;
        }
        try {
          const file = await videoFrameToFile(video);
          stopStream();
          resolve(file);
        } catch (err) {
          stopStream();
          reject(err);
        }
      },
      onCancel: () => {
        stopStream();
        reject(new DOMException("Aborted", "AbortError"));
      },
    });

    const startCamera = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: "environment" },
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
          audio: false,
        });
        const video = document.getElementById("ncms-capture-video");
        if (video) {
          video.srcObject = stream;
        }
      } catch (err) {
        closeModal();
        stopStream();
        reject(new Error(t("forms.cameraNotAvailable")));
      }
    };

    requestAnimationFrame(() => startCamera());
  });
}

/**
 * @param {HTMLVideoElement} video
 */
async function videoFrameToFile(video) {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error(t("toast.failed"));

  ctx.drawImage(video, 0, 0);
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.92));
  if (!blob) throw new Error(t("toast.failed"));

  return new File([blob], `medicine-paper-${Date.now()}.jpg`, { type: "image/jpeg" });
}
