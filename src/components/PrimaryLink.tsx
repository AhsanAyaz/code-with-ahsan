import Link from "./Link";
import { ReactNode } from "react";

interface PrimaryLinkProps {
  href: string;
  children: ReactNode;
}

const PrimaryLink = ({ href, children }: PrimaryLinkProps) => {
  return (
    <Link
      href={href}
      className="link link-primary underline-offset-2"
      rel="noopener noreferrer"
      target={"_blank"}
    >
      {children}
    </Link>
  );
};

export default PrimaryLink;
