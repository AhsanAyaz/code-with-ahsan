import React, { ReactNode, MouseEventHandler } from "react";
import Link from "next/link";

interface ButtonProps {
  onClick?: MouseEventHandler<HTMLButtonElement>;
  children: ReactNode;
  color?: "primary" | "accent" | "hackstack" | string;
  title?: string;
  className?: string;
  href?: string;
}

const Button: React.FC<ButtonProps> = ({
  onClick,
  children,
  color = "",
  title,
  className,
  href,
}) => {
  const baseClass = "btn";
  let colorClass = "btn-neutral";

  switch (color) {
    case "primary":
      colorClass = "btn-primary text-white";
      break;
    case "accent":
      colorClass = "btn-warning text-white"; // Accent was yellow
      break;
    case "hackstack":
      colorClass = "btn-error text-white"; // Hackstack was red
      break;
    default:
      colorClass = "btn-neutral";
      break;
  }

  const combinedClass = `${baseClass} ${colorClass} ${className || ""}`;

  return href ? (
    <a
      href={href}
      title={title || ""}
      target="_blank"
      rel="noopener noreferrer"
      role="button"
      className={combinedClass}
    >
      {children}
    </a>
  ) : (
    <button onClick={onClick} title={title || ""} className={combinedClass}>
      {children}
    </button>
  );
};

export default Button;
