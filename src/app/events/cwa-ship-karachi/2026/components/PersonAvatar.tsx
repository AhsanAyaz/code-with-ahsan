"use client";

import Image from "next/image";
import { useState } from "react";

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

type Props = {
  name: string;
  src?: string;
  /** Rendered size in px (square). */
  size?: number;
  className?: string;
};

/**
 * Circular headshot that degrades to a gradient-initials badge when the image
 * file is missing, so sections render correctly before photos are supplied.
 */
const PersonAvatar = ({ name, src, size = 80, className = "" }: Props) => {
  const [failed, setFailed] = useState(false);
  const base = `object-cover shrink-0 ${className}`;

  if (failed || !src) {
    return (
      <div
        className={`${base} flex items-center justify-center font-bold text-primary-content`}
        style={{
          width: size,
          height: size,
          fontSize: Math.round(size / 3.2),
          background: "linear-gradient(140deg, #8f27e0 0%, #5b1699 100%)",
        }}
        aria-hidden
      >
        {initials(name)}
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={name}
      width={size}
      height={size}
      unoptimized
      onError={() => setFailed(true)}
      className={base}
      style={{ width: size, height: size }}
    />
  );
};

export default PersonAvatar;
