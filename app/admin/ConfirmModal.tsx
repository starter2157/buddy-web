'use client';

import { useEffect, useRef } from 'react';

export interface ConfirmRequest {
  title: string;
  body: string;
  confirmLabel: string;
  tone: 'confirm' | 'danger';
  onConfirm: () => void;
}

/**
 * An in-page dialog rather than window.confirm, as the brief asks: it can carry
 * the names involved and read in Thai.
 */
export function ConfirmModal({
  request,
  busy,
  onCancel,
}: {
  request: ConfirmRequest;
  busy: boolean;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    confirmRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onCancel();
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [busy, onCancel]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/40 p-5"
      onClick={() => !busy && onCancel()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="flex w-full max-w-mobile flex-col gap-3 rounded-card-lg bg-card p-5 shadow-card-deep"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="confirm-title" className="m-0 font-heading text-[18px] font-semibold">
          {request.title}
        </h2>
        <p className="m-0 text-[14px] leading-relaxed text-muted">{request.body}</p>

        <div className="mt-1 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={busy}
            onClick={onCancel}
            className="min-h-touch rounded-input border-2 border-border bg-card px-4 font-heading text-[15px] text-ink disabled:opacity-60"
          >
            ยกเลิก
          </button>
          <button
            ref={confirmRef}
            type="button"
            disabled={busy}
            onClick={request.onConfirm}
            className={`min-h-touch rounded-input px-4 font-heading text-[15px] font-medium text-card disabled:opacity-60 ${
              request.tone === 'confirm' ? 'bg-pharmacy' : 'bg-primary'
            }`}
          >
            {busy ? 'กำลังดำเนินการ…' : request.confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
