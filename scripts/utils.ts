
/**
 * Mask a name for safe console logging.
 * Example: "Ahsan Ayaz" -> "Ah***z"
 */
export function maskName(name: string | undefined): string {
  if (!name) return "Unknown";
  if (name.length <= 3) return name[0] + "***";
  return name.substring(0, 2) + "***" + name.substring(name.length - 1);
}

/**
 * Mask an email for safe console logging.
 * Example: "ahsan@example.com" -> "ah***@example.com"
 */
export function maskEmail(email: string | undefined): string {
  if (!email) return "N/A";
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return local.substring(0, 2) + "***@" + domain;
}

/**
 * Mask a Discord username for safe console logging.
 * Example: "ahsan.ayaz" -> "ah***"
 */
export function maskDiscord(discord: string | undefined): string {
  if (!discord) return "not set";
  if (discord.length <= 3) return discord[0] + "***";
  return discord.substring(0, 2) + "***";
}
