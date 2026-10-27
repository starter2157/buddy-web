'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { submitJson } from '@/components/forms/submit';
import type { AdminData } from '@/lib/admin';
import { filterPairs, type AdminPerson } from '@/lib/pairs';
import { ConfirmModal, type ConfirmRequest } from './ConfirmModal';
import { MatchPanel } from './MatchPanel';
import { PairsTable } from './PairsTable';
import { SettingsCard } from './SettingsCard';
import { StatTiles } from './StatTiles';

function fullName(person: AdminPerson): string {
  return `${person.nickname} (${person.firstName} ${person.lastName})`;
}

export function AdminBoard({ data }: { data: AdminData }) {
  const router = useRouter();

  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<AdminPerson | null>(null);
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();

  const visible = useMemo(() => filterPairs(data.pairs, query), [data.pairs, query]);

  async function run(url: string, body?: unknown) {
    setBusy(true);
    setError(undefined);

    const result = await submitJson(url, 'POST', body ?? {});
    setBusy(false);
    setRequest(null);
    setSelected(null);

    if (result.ok) {
      router.refresh();
      return;
    }
    setError(result.error);
  }

  function askToRerun() {
    setRequest({
      title: 'สุ่มใหม่ทั้งหมด?',
      body:
        data.run?.status === 'confirmed'
          ? 'ผลเดิมยืนยันไปแล้ว การสุ่มใหม่จะสร้างผลฉบับร่างขึ้นมาแทน และผู้ใช้จะยังเห็นผลที่ยืนยันไว้จนกว่าจะกดยืนยันอีกครั้ง'
          : 'ผลการสุ่มฉบับร่างเดิมจะถูกแทนที่ทั้งหมด การสลับคู่ที่แก้ไว้จะหายไปด้วย',
      confirmLabel: 'สุ่มใหม่',
      tone: 'danger',
      onConfirm: () => run('/api/admin/match/rerun'),
    });
  }

  function askToConfirm() {
    setRequest({
      title: 'ยืนยันผลการจับคู่?',
      body: 'เมื่อยืนยันแล้ว ผู้ใช้จะเห็นบัดดี้ของตัวเองทันทีที่ถึงเวลาประกาศ',
      confirmLabel: 'ยืนยันผล',
      tone: 'confirm',
      onConfirm: () => run('/api/admin/match/confirm'),
    });
  }

  function onSwapClick(person: AdminPerson) {
    if (selected?.userId === person.userId) {
      setSelected(null);
      return;
    }
    if (!selected) {
      setSelected(person);
      return;
    }

    const first = selected;
    setRequest({
      title: 'สลับตำแหน่งสองคนนี้?',
      body: `${fullName(first)} จะย้ายไปอยู่ตำแหน่งของ ${fullName(person)} และสลับกัน ระบบจะตรวจสอบคู่ใหม่และคำนวณสถิติใหม่ให้`,
      confirmLabel: 'สลับตำแหน่ง',
      tone: 'danger',
      onConfirm: () => run('/api/admin/match/swap', { a: first.userId, b: person.userId }),
    });
  }

  return (
    <main className="mx-auto flex max-w-admin flex-col gap-6 px-6 pb-12 pt-7">
      <StatTiles totals={data.totals} />

      {error ? (
        <p
          role="alert"
          className="m-0 rounded-input border-2 border-engineering bg-engineering-soft px-4 py-3 text-[14px] leading-relaxed text-engineering-text"
        >
          {error}
        </p>
      ) : null}

      <div className="flex flex-wrap items-start gap-6">
        <PairsTable
          pairs={visible}
          shown={visible.length}
          total={data.pairs.length}
          query={query}
          onQuery={setQuery}
          selected={selected}
          onSwapClick={onSwapClick}
          disabled={busy || data.run?.status === 'confirmed'}
        />

        <aside className="flex min-w-0 flex-[1_1_300px] flex-col gap-5">
          <MatchPanel
            run={data.run}
            total={data.totals.total}
            onConfirm={askToConfirm}
            onRerun={askToRerun}
            disabled={busy}
          />
          <SettingsCard schedule={data.schedule} onSaved={() => router.refresh()} />
        </aside>
      </div>

      {request ? (
        <ConfirmModal request={request} busy={busy} onCancel={() => setRequest(null)} />
      ) : null}
    </main>
  );
}
