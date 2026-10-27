import { toZonedTime } from 'date-fns-tz';

/** The camp runs on Bangkok time; everything is stored as timestamptz. */
export const BANGKOK_TIME_ZONE = 'Asia/Bangkok';

const THAI_MONTHS = [
  'ม.ค.',
  'ก.พ.',
  'มี.ค.',
  'เม.ย.',
  'พ.ค.',
  'มิ.ย.',
  'ก.ค.',
  'ส.ค.',
  'ก.ย.',
  'ต.ค.',
  'พ.ย.',
  'ธ.ค.',
] as const;

/** Thailand counts years in the Buddhist era, 543 ahead of the common era. */
const BUDDHIST_ERA_OFFSET = 543;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** e.g. 7 พ.ย. 2569 */
export function formatThaiDate(date: Date): string {
  const bangkok = toZonedTime(date, BANGKOK_TIME_ZONE);
  return `${bangkok.getDate()} ${THAI_MONTHS[bangkok.getMonth()]} ${
    bangkok.getFullYear() + BUDDHIST_ERA_OFFSET
  }`;
}

/** e.g. 18:00 น. */
export function formatThaiTime(date: Date): string {
  const bangkok = toZonedTime(date, BANGKOK_TIME_ZONE);
  return `${pad(bangkok.getHours())}:${pad(bangkok.getMinutes())} น.`;
}

/** e.g. 7 พ.ย. 2569 · 18:00 น. */
export function formatThaiDateTime(date: Date): string {
  return `${formatThaiDate(date)} · ${formatThaiTime(date)}`;
}

/** e.g. 30 ต.ค. – 6 พ.ย. 2569, dropping the year when both dates share one. */
export function formatThaiDateRange(from: Date, to: Date): string {
  const fromZoned = toZonedTime(from, BANGKOK_TIME_ZONE);
  const toZoned = toZonedTime(to, BANGKOK_TIME_ZONE);

  if (fromZoned.getFullYear() !== toZoned.getFullYear()) {
    return `${formatThaiDate(from)} – ${formatThaiDate(to)}`;
  }
  return `${fromZoned.getDate()} ${THAI_MONTHS[fromZoned.getMonth()]} – ${formatThaiDate(to)}`;
}

/**
 * Bangkok has observed +07:00 with no daylight saving since 1940, so the
 * offset can be written literally rather than looked up per date.
 */
export const BANGKOK_UTC_OFFSET = '+07:00';

/** A timestamp as a datetime-local input wants it, in Bangkok wall time. */
export function toBangkokInputValue(date: Date | null | undefined): string {
  if (!date) return '';
  const bangkok = toZonedTime(date, BANGKOK_TIME_ZONE);

  return (
    `${bangkok.getFullYear()}-${pad(bangkok.getMonth() + 1)}-${pad(bangkok.getDate())}` +
    `T${pad(bangkok.getHours())}:${pad(bangkok.getMinutes())}`
  );
}

/** The reverse: a datetime-local value read as Bangkok wall time. */
export function fromBangkokInputValue(value: string): string | null {
  if (!value.trim()) return null;

  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value) ? `${value}:00` : value;
  const iso = `${withSeconds}${BANGKOK_UTC_OFFSET}`;

  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}
