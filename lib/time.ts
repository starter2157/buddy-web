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
