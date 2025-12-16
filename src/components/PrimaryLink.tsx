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
      className="text-primary dark:text-primary"
      rel="noopener noreferrer"
      target={"_blank"}
    >
      {children}
    </Link>
  );
};

export default PrimaryLink;
