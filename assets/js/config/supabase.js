/**
 * Supabase client configuration for file storage.
 * Uses anon key only — never expose service_role in the client.
 */
import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.0/+esm";

export const SUPABASE_URL = "https://vlwbxdlaupykxlgthdxp.supabase.co";
export const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsd2J4ZGxhdXB5a3hsZ3RoZHhwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExMjE3OTksImV4cCI6MjA5NjY5Nzc5OX0.uu6FDEZtO0-2EZrL3KFCAMOTKMIsGiR2PpQq5VtlF8E";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
