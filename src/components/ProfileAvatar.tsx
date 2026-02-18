"use client";

import Image from "next/image";
import { useState } from "react";

export interface ProfileAvatarProps {
  photoURL?: string | null;
  displayName?: string | null;
  email?: string | null;
  size?: "xs" | "sm" | "md" | "lg" | "xl" | number;
  className?: string;
  ring?: boolean;
  square?: boolean;
}

const sizeMap = {
  xs: "w-6 h-6 text-xs",
  sm: "w-8 h-8 text-sm",
  md: "w-10 h-10 text-base",
  lg: "w-12 h-12 text-lg",
  xl: "w-16 h-16 text-xl",
};

/**
 * ProfileAvatar component for displaying user profile images with automatic fallback to initials.
 *
 * Features:
 * - Automatically handles image loading errors
 * - Falls back to user initials when image fails or is missing
 * - Supports multiple size presets or custom sizes
 * - Optional ring styling
 * - Supports both circular and square avatars
 *
 * @example
 * <ProfileAvatar
 *   photoURL={user.photoURL}
 *   displayName={user.displayName}
 *   size="lg"
 *   ring
 * />
 */
export default function ProfileAvatar({
  photoURL,
  displayName,
  email,
  size = "md",
  className = "",
  ring = false,
  square = false,
}: ProfileAvatarProps) {
  const [imageError, setImageError] = useState(false);
  const hasValidPhoto = photoURL && !imageError;

  // Get size classes
  const isNumericSize = typeof size === "number";
  const sizeClasses = isNumericSize ? "" : sizeMap[size];
  const sizeStyle = isNumericSize ? { width: size, height: size } : undefined;

  // Get initials
  const initials = (displayName?.charAt(0) || email?.charAt(0) || "?").toUpperCase();

  // Build container classes
  const containerClasses = [
    sizeClasses,
    square ? "rounded-lg" : "rounded-full",
    "relative overflow-hidden",
    ring ? "ring ring-primary ring-offset-base-100 ring-offset-1" : "",
    className,
  ].filter(Boolean).join(" ");

  return (
    <div className={containerClasses} style={sizeStyle}>
      {hasValidPhoto ? (
        <Image
          src={photoURL}
          alt={displayName || email || "User"}
          fill
          className="object-cover"
          onError={() => setImageError(true)}
        />
      ) : (
        <div className="w-full h-full flex items-center justify-center bg-primary text-primary-content font-bold">
          {initials}
        </div>
      )}
    </div>
  );
}
