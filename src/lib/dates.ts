import { differenceInCalendarDays, format } from "date-fns";
import { es } from "date-fns/locale";

export function greetingDate(date: Date = new Date()): string {
  const formatted = format(date, "EEEE d 'de' MMMM", { locale: es });
  return formatted.charAt(0).toUpperCase() + formatted.slice(1);
}

export function relativeShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  const diffDays = differenceInCalendarDays(new Date(), date);
  if (diffDays <= 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return format(date, "d MMM", { locale: es });
}
