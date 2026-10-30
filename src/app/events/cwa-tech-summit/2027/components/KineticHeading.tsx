"use client";

import { Fragment } from "react";
import { motion } from "framer-motion";
import { useReduceMotion } from "./useReduceMotion";

type Props = {
  text: string;
  as?: "h2" | "h3";
  id?: string;
  align?: "left" | "center";
  className?: string;
};

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * The one entrance animation used on section headings: each word rises out of
 * a clipped mask while its weight sweeps 300 → 800, once, when the heading
 * scrolls into view. Reduced motion renders the settled state.
 */
const KineticHeading = ({ text, as = "h2", id, align = "left", className = "" }: Props) => {
  const reduce = useReduceMotion();
  const Tag = as;
  const words = text.split(" ");

  return (
    <Tag
      id={id}
      className={`font-(family-name:--font-summit) text-4xl leading-[0.95] text-(--sm-paper) sm:text-5xl lg:text-6xl ${
        align === "center" ? "text-center" : ""
      } ${className}`}
      style={{ fontWeight: 800 }}
    >
      {/* Screen readers get the plain string, not one node per word. */}
      <span className="sr-only">{text}</span>
      <motion.span
        aria-hidden
        className="inline"
        initial="hidden"
        animate={reduce === true ? "shown" : undefined}
        whileInView={reduce === false ? "shown" : undefined}
        viewport={{ once: true, amount: 0.3 }}
        transition={{ staggerChildren: 0.07 }}
      >
        {words.map((word, i) => (
          <Fragment key={`${word}-${i}`}>
            <span className="inline-block overflow-hidden pb-[0.08em] align-bottom">
              <motion.span
                className="inline-block"
                variants={{
                  hidden: { y: "110%", fontWeight: 300 },
                  shown: { y: "0%", fontWeight: 800 },
                }}
                transition={reduce ? { duration: 0 } : { duration: 0.8, ease: EASE }}
              >
                {word}
              </motion.span>
            </span>
            {i < words.length - 1 ? " " : null}
          </Fragment>
        ))}
      </motion.span>
    </Tag>
  );
};

export default KineticHeading;
