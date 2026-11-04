/* eslint-disable jsx-a11y/anchor-has-content */
import Link, { LinkProps } from "next/link";
import { AnchorHTMLAttributes, DetailedHTMLProps } from "react";

type CustomLinkProps = LinkProps &
  DetailedHTMLProps<AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement> & { href: string };

/**
 * Inline links (MDX/markdown `a`, and anything else that doesn't style itself)
 * previously rendered with no colour affordance at all — `currentColor`, no
 * underline. Give them the AA-safe violet + underline by default.
 *
 * Callers that pass their own `className` opt out entirely: this component is
 * also used for structural anchors (card wrappers, nav items, buttons) where an
 * inline-link treatment would be wrong.
 */
const DEFAULT_LINK_CLASS = "link link-primary underline-offset-2";

const CustomLink = ({ href, className, ...rest }: CustomLinkProps) => {
  const isInternalLink = href && href.startsWith("/");
  const isAnchorLink = href && href.startsWith("#");
  const linkClassName = className ?? DEFAULT_LINK_CLASS;

  if (isInternalLink) {
    return <Link href={href} className={linkClassName} {...rest} />;
  }

  if (isAnchorLink) {
    return <a href={href} className={linkClassName} {...rest} />;
  }

  return (
    <a target="_blank" rel="noopener noreferrer" href={href} className={linkClassName} {...rest} />
  );
};

export default CustomLink;
