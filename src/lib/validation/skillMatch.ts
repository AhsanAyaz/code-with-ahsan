/**
 * Skill Mismatch Detection for Project Applications
 *
 * Provides warnings when user skill level doesn't match project difficulty
 * to help both applicants and project creators make informed decisions.
 */

import { ProjectDifficulty } from "@/types/mentorship";

export interface SkillMismatch {
  hasWarning: boolean;
  message: string;
  severity: "none" | "info" | "warning";
}

/**
 * Detect if there's a skill mismatch between user level and project difficulty
 *
 * @param userSkillLevel - User's self-reported skill level (or undefined if not set)
 * @param projectDifficulty - Project's difficulty level
 * @returns SkillMismatch object with warning details
 */
export function detectSkillMismatch(
  userSkillLevel: ProjectDifficulty | undefined,
  projectDifficulty: ProjectDifficulty
): SkillMismatch {
  // If user hasn't set their skill level, show info message
  if (!userSkillLevel) {
    return {
      hasWarning: true,
      message: "You haven't set your skill level in your profile. Consider updating it to get better project recommendations.",
      severity: "info",
    };
  }

  // Define skill level hierarchy
  const skillLevels: Record<ProjectDifficulty, number> = {
    beginner: 1,
    intermediate: 2,
    advanced: 3,
  };

  const userLevel = skillLevels[userSkillLevel];
  const projectLevel = skillLevels[projectDifficulty];
  const gap = projectLevel - userLevel;

  // User is applying to project significantly above their level (2+ levels)
  if (gap >= 2) {
    return {
      hasWarning: true,
      message: `This ${projectDifficulty} project may be challenging for ${userSkillLevel} developers. Consider projects at your current level to build confidence.`,
      severity: "warning",
    };
  }

  // User is applying to project 1 level above (intermediate -> advanced)
  if (gap === 1) {
    return {
      hasWarning: true,
      message: `This ${projectDifficulty} project is one level above your current skill. You may need extra support from the team.`,
      severity: "info",
    };
  }

  // User is at or above project level - no warning
  return {
    hasWarning: false,
    message: "",
    severity: "none",
  };
}
