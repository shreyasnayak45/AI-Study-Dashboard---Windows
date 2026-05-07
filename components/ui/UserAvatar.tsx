"use client";

import Image from "next/image";
import { useState } from "react";
import { cn } from "@/lib/utils";

interface UserAvatarProps {
  avatarUrl?:   string | null;
  displayName?: string | null;
  email?:       string | null;
  size?:        "xs" | "sm" | "md" | "lg" | "xl" | "2xl";
  className?:   string;
  /** Set true for avatars that are always visible on mount (e.g. sidebar). */
  priority?:    boolean;
}

const SIZE: Record<string, { container: string; text: string; px: number }> = {
  xs:    { container: "h-6  w-6",  text: "text-[9px]  font-semibold", px: 24  },
  sm:    { container: "h-8  w-8",  text: "text-[10px] font-semibold", px: 32  },
  md:    { container: "h-9  w-9",  text: "text-xs     font-bold",     px: 36  },
  lg:    { container: "h-12 w-12", text: "text-sm     font-bold",     px: 48  },
  xl:    { container: "h-20 w-20", text: "text-2xl    font-bold",     px: 80  },
  "2xl": { container: "h-24 w-24", text: "text-3xl    font-bold",     px: 96  },
};

function getInitials(displayName?: string | null, email?: string | null): string {
  const src = displayName?.trim() || email || "?";
  return (
    src
      .split(/[\s@.]+/)
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase() || "?"
  );
}

export function UserAvatar({
  avatarUrl, displayName, email, size = "md", className, priority = false,
}: UserAvatarProps) {
  const [imgError, setImgError] = useState(false);
  const sizeDef  = SIZE[size] ?? SIZE.md;
  const { container, text, px } = sizeDef;
  const initials = getInitials(displayName, email);

  if (avatarUrl && !imgError) {
    return (
      <Image
        src={avatarUrl}
        alt={displayName ?? email ?? "Avatar"}
        width={px}
        height={px}
        priority={priority}
        onError={() => setImgError(true)}
        className={cn(
          container,
          "shrink-0 rounded-full object-cover ring-1 ring-white/[0.08]",
          className
        )}
      />
    );
  }

  return (
    <div
      className={cn(
        container,
        "shrink-0 flex items-center justify-center rounded-full",
        "bg-gradient-to-br from-brand-400 to-brand-600 text-white",
        text,
        className
      )}
    >
      {initials}
    </div>
  );
}
