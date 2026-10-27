'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

const SECOND = 1000;
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function split(remainingSeconds: number) {
  return [
    { value: pad(Math.floor(remainingSeconds / DAY)), label: 'วัน' },
    { value: pad(Math.floor((remainingSeconds % DAY) / HOUR)), label: 'ชั่วโมง' },
    { value: pad(Math.floor((remainingSeconds % HOUR) / MINUTE)), label: 'นาที' },
    { value: pad(remainingSeconds % MINUTE), label: 'วินาที' },
  ];
}

/**
 * Counts down to the reveal.
 *
 * The device clock cannot be trusted — it is the visitor's to change — so the
 * server sends its own idea of "now" alongside the target. The difference
 * between the two is measured once on mount and applied to every tick after,
 * which keeps the countdown honest without polling the server.
 *
 * The first render uses the server's numbers directly, so what the browser
 * hydrates matches what the server sent.
 */
export function Countdown({ serverNowMs, revealAtMs }: { serverNowMs: number; revealAtMs: number }) {
  const router = useRouter();
  const [remaining, setRemaining] = useState(() =>
    Math.max(0, Math.floor((revealAtMs - serverNowMs) / SECOND)),
  );

  useEffect(() => {
    const offsetFromServer = serverNowMs - Date.now();

    const tick = () =>
      setRemaining(Math.max(0, Math.floor((revealAtMs - (Date.now() + offsetFromServer)) / SECOND)));

    tick();
    const timer = setInterval(tick, SECOND);
    return () => clearInterval(timer);
  }, [serverNowMs, revealAtMs]);

  const done = remaining === 0;

  return (
    <>
      <div className="grid grid-cols-4 gap-2" aria-live="off">
        {split(remaining).map((unit) => (
          <div
            key={unit.label}
            className="flex flex-col items-center gap-0.5 rounded-btn bg-card px-1 pb-2.5 pt-3 shadow-card-raised"
          >
            <span className="font-logo text-[34px] font-semibold leading-none text-primary">
              {unit.value}
            </span>
            <span className="text-[12px] text-muted">{unit.label}</span>
          </div>
        ))}
      </div>

      {done ? (
        <button
          type="button"
          onClick={() => router.refresh()}
          className="flex min-h-action items-center justify-center rounded-btn bg-primary font-heading text-[17px] font-medium text-card shadow-btn transition-transform active:translate-y-px"
        >
          ดูบัดดี้ของฉัน
        </button>
      ) : null}
    </>
  );
}
