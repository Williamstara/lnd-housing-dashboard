export const DATE_FIELDS = new Set(["moveInDate"]);
export const DATETIME_FIELDS = new Set(["latestReply"]);

export const QUARTER_HOURS = Array.from({ length: 96 }, (_, i) => {
  const h = String(Math.floor(i / 4)).padStart(2, "0");
  const m = String((i % 4) * 15).padStart(2, "0");
  return `${h}:${m}`;
});

export function extractPlaceholders(message: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const match of message.matchAll(/\{\{([^}]+)\}\}/g)) {
    if (!seen.has(match[1])) {
      seen.add(match[1]);
      result.push(match[1]);
    }
  }
  return result;
}

export function toLabel(key: string): string {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase());
}

export function formatForEmail(key: string, raw: string): string {
  if (!raw) return raw;
  if (DATE_FIELDS.has(key)) {
    const d = new Date(raw + "T12:00:00");
    return d.toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
  }
  if (DATETIME_FIELDS.has(key)) {
    const d = new Date(raw);
    const date = d.toLocaleDateString("sv-SE", { year: "numeric", month: "long", day: "numeric" });
    const time = d.toLocaleTimeString("sv-SE", { hour: "2-digit", minute: "2-digit" });
    return `${date} kl. ${time}`;
  }
  return raw;
}

export function resolvePreview(message: string, vars: Record<string, string>): string {
  return message.replace(/\{\{([^}]+)\}\}/g, (_, key) => {
    const raw = vars[key as string];
    if (!raw) return `[${toLabel(key as string)}]`;
    return formatForEmail(key as string, raw);
  });
}
