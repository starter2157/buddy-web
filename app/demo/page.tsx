import { notFound } from 'next/navigation';
import { HeaderTag } from '@/components/ui/Chip';
import { FacultyChip } from '@/components/ui/Chip';
import { MobileShell, SkyHeader } from '@/components/ui/Shell';
import { isDemoLoginEnabled } from '@/lib/demo';
import { FACULTY_LABEL, type Faculty } from '@/lib/faculty';
import type { Prefix } from '@/lib/prefix';
import { createAdminClient } from '@/lib/supabase/admin';

interface Row {
  email: string;
  nickname: string;
  prefix: Prefix;
  faculty: Faculty;
  year: number;
}

// Evaluated per request, never prerendered: the gate and the roster are both
// properties of the running environment, not of the build.
export const dynamic = 'force-dynamic';

/**
 * The local demo picker: sign in as any seeded participant with one tap.
 * Answers 404 unless the demo gates are open, so it cannot exist in a real
 * deployment.
 */
export default async function DemoPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  if (!isDemoLoginEnabled()) notFound();

  const { error } = await searchParams;

  // Reads every profile, which is exactly why this page is local-only.
  const admin = createAdminClient();
  const [{ data: profiles }, { data: admins }] = await Promise.all([
    admin
      .from('profiles')
      .select('email, nickname, prefix, faculty, year')
      .order('student_id', { ascending: true })
      .returns<Row[]>(),
    admin.from('admins').select('email').returns<{ email: string }[]>(),
  ]);

  const adminEmails = new Set((admins ?? []).map((row) => row.email));
  const people = profiles ?? [];

  return (
    <MobileShell>
      <SkyHeader>
        <HeaderTag>Demo</HeaderTag>
      </SkyHeader>

      <div className="flex flex-col gap-4 px-5 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="m-0 font-heading text-[22px] font-semibold">เข้าสู่ระบบสำหรับทดลองใช้</h1>
          <p className="m-0 text-[14px] leading-relaxed text-muted">
            หน้านี้มีเฉพาะตอนรันในเครื่องเท่านั้น เลือกผู้ใช้เพื่อเข้าสู่ระบบโดยไม่ต้องใช้ Google
          </p>
        </div>

        {error ? (
          <p
            role="alert"
            className="m-0 rounded-input border-2 border-engineering bg-engineering-soft px-3.5 py-2.5 text-[13px] text-engineering-text"
          >
            เข้าสู่ระบบไม่สำเร็จ — ลองรัน <code>npm run seed -- --reset</code> อีกครั้ง
          </p>
        ) : null}

        {people.length === 0 ? (
          <div className="rounded-card bg-card p-5 shadow-card">
            <p className="m-0 text-[14px] leading-relaxed text-muted">
              ยังไม่มีข้อมูลในระบบ รัน <code>npm run seed</code> ก่อน แล้วรีเฟรชหน้านี้
            </p>
          </div>
        ) : (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {people.map((person) => (
              <li key={person.email}>
                <form action="/auth/demo" method="post">
                  <input type="hidden" name="email" value={person.email} />
                  <button
                    type="submit"
                    className="flex w-full min-h-touch items-center justify-between gap-3 rounded-card bg-card px-4 py-3 text-left shadow-card"
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="font-heading text-[16px] font-medium">
                        {person.nickname}
                        {adminEmails.has(person.email) ? (
                          <span className="ml-2 rounded-md bg-brown px-2 py-0.5 font-heading text-[11px] text-card">
                            Admin
                          </span>
                        ) : null}
                      </span>
                      <span className="text-[13px] text-muted">
                        {FACULTY_LABEL[person.faculty].long} · ปี {person.year} · {person.prefix}
                      </span>
                    </span>
                    <FacultyChip faculty={person.faculty} tone="soft" label="short" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </MobileShell>
  );
}
