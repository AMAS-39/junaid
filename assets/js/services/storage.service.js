import { supabase } from "../config/supabase.js";
import { FILE_CONSTRAINTS } from "../architecture/storage-buckets.js";

/**
 * Supabase Storage service — infrastructure only, no business rules.
 */
export const StorageService = {
  /**
   * Upload a file to a bucket path.
   * @param {string} bucket
   * @param {string} path - Path within bucket
   * @param {File|Blob} file
   * @param {{ upsert?: boolean, contentType?: string }} [options]
   * @returns {Promise<{ path: string, publicUrl: string | null }>}
   */
  async upload(bucket, path, file, options = {}) {
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, {
      upsert: options.upsert ?? false,
      contentType: options.contentType || file.type,
    });

    if (error) throw error;

    const publicUrl = this.getPublicUrl(bucket, data.path);
    return { path: data.path, publicUrl };
  },

  /**
   * Get a public URL for a stored file.
   * @param {string} bucket
   * @param {string} path
   * @returns {string | null}
   */
  getPublicUrl(bucket, path) {
    const { data } = supabase.storage.from(bucket).getPublicUrl(path);
    return data?.publicUrl ?? null;
  },

  /**
   * Get a signed URL for private files.
   * @param {string} bucket
   * @param {string} path
   * @param {number} [expiresIn=3600]
   */
  async getSignedUrl(bucket, path, expiresIn = 3600) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(path, expiresIn);

    if (error) throw error;
    return data.signedUrl;
  },

  /**
   * Delete a file from storage.
   * @param {string} bucket
   * @param {string[]} paths
   */
  async remove(bucket, paths) {
    const { error } = await supabase.storage.from(bucket).remove(paths);
    if (error) throw error;
  },

  /**
   * List files in a bucket folder.
   * @param {string} bucket
   * @param {string} folder
   */
  async list(bucket, folder = "") {
    const { data, error } = await supabase.storage.from(bucket).list(folder);
    if (error) throw error;
    return data;
  },

  /**
   * Validate file against constraints before upload.
   * @param {File} file
   * @param {"IMAGE"|"DOCUMENT"} type
   * @returns {{ valid: boolean, error?: string }}
   */
  validateFile(file, type = "IMAGE") {
    const constraints = FILE_CONSTRAINTS[type];

    if (file.size > constraints.maxSizeBytes) {
      return { valid: false, error: `File exceeds ${constraints.maxSizeBytes / 1024 / 1024}MB limit` };
    }

    const mime = file.type?.toLowerCase() || "";
    const allowed = constraints.allowedMimeTypes.some((t) => t === mime);
    const ext = file.name?.split(".").pop()?.toLowerCase();
    const allowedExt = ["jpg", "jpeg", "png", "webp"].includes(ext);

    if (!allowed && !allowedExt) {
      return { valid: false, error: "Only JPG, PNG, and WEBP images are allowed." };
    }

    return { valid: true };
  },
};
