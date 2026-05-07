"use client";

import { useState, useRef } from "react";
import { Camera, Loader2, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { updateAvatarUrl } from "@/app/actions/profile";
import { UserAvatar } from "@/components/ui/UserAvatar";
import { cn } from "@/lib/utils";

interface AvatarUploadProps {
  userId:       string;
  currentUrl?:  string | null;
  displayName?: string | null;
  email?:       string | null;
  size?:        "md" | "lg" | "xl";
  onSuccess?:   (url: string) => void;
}

const BTN_SIZE: Record<string, string> = {
  md: "h-6 w-6 -bottom-0.5 -right-0.5",
  lg: "h-7 w-7 -bottom-1   -right-1",
  xl: "h-8 w-8 -bottom-1   -right-1",
};

export function AvatarUpload({
  userId, currentUrl, displayName, email, size = "lg", onSuccess,
}: AvatarUploadProps) {
  const [preview,   setPreview]   = useState<string | null>(currentUrl ?? null);
  const [uploading, setUploading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Image must be under 5 MB");
      return;
    }

    setError(null);

    // Instant preview while uploading
    const blobUrl = URL.createObjectURL(file);
    setPreview(blobUrl);
    setUploading(true);

    try {
      const supabase = createClient();
      const ext  = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = `${userId}/avatar.${ext}`;

      // Upload directly browser → Supabase Storage (no size-limit issues)
      const { error: uploadErr } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (uploadErr) throw new Error(uploadErr.message);

      const { data: { publicUrl } } = supabase.storage
        .from("avatars")
        .getPublicUrl(path);

      // Persist URL to profiles table via server action
      const result = await updateAvatarUrl(publicUrl);
      if (!result.success) throw new Error(result.error ?? "Profile update failed");

      URL.revokeObjectURL(blobUrl);
      setPreview(publicUrl);
      onSuccess?.(publicUrl);
    } catch (err) {
      setPreview(currentUrl ?? null);
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      // Reset so re-selecting same file fires onChange
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative">
        <UserAvatar
          avatarUrl={preview}
          displayName={displayName}
          email={email}
          size={size}
        />

        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          title="Change profile picture"
          className={cn(
            "absolute flex items-center justify-center rounded-full",
            "border-2 border-[#0d0d14] bg-brand-500 transition-colors",
            "hover:bg-brand-400 disabled:opacity-60",
            BTN_SIZE[size]
          )}
        >
          {uploading
            ? <Loader2 className="h-3 w-3 animate-spin text-white" />
            : <Camera  className="h-3 w-3 text-white"              />}
        </button>

        <input
          ref={fileRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {uploading && (
        <p className="text-[10px] text-white/40">Uploading…</p>
      )}
      {error && (
        <p className="flex items-center gap-1 text-[10px] text-red-400">
          <AlertCircle className="h-3 w-3 shrink-0" /> {error}
        </p>
      )}
    </div>
  );
}
