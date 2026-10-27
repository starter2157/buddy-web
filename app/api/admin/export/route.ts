import { loadAdminData } from '@/lib/admin';
import { requireAdmin } from '@/lib/admin-guard';
import { csvFilename, toCsv } from '@/lib/csv';
import { FACULTY_LABEL } from '@/lib/faculty';
import { GENDER_PAIRING_LABEL } from '@/lib/prefix';
import type { AdminPerson } from '@/lib/pairs';

const HEADERS = [
  'ลำดับ',
  'บัดเดอร์ ชื่อเล่น',
  'บัดเดอร์ คำนำหน้า',
  'บัดเดอร์ ชื่อ',
  'บัดเดอร์ นามสกุล',
  'บัดเดอร์ คณะ',
  'บัดเดอร์ ชั้นปี',
  'บัดเดอร์ Instagram',
  'บัดเดอร์ รหัสนิสิต',
  'บัดดี้ ชื่อเล่น',
  'บัดดี้ คำนำหน้า',
  'บัดดี้ ชื่อ',
  'บัดดี้ นามสกุล',
  'บัดดี้ คณะ',
  'บัดดี้ ชั้นปี',
  'บัดดี้ Instagram',
  'บัดดี้ รหัสนิสิต',
  'ต่างคณะ',
  'เพศ',
];

function cells(person: AdminPerson) {
  return [
    person.nickname,
    person.prefix,
    person.firstName,
    person.lastName,
    FACULTY_LABEL[person.faculty].long,
    person.year,
    person.instagram ?? '',
    person.studentId,
  ];
}

export async function GET() {
  const guard = await requireAdmin();
  if (!guard.ok) return guard.response;

  const { pairs } = await loadAdminData(guard.supabase);

  const csv = toCsv([
    HEADERS,
    ...pairs.map((pair) => [
      pair.position + 1,
      ...cells(pair.budder),
      ...cells(pair.buddy),
      pair.crossFaculty ? 'ใช่' : 'ไม่ใช่',
      GENDER_PAIRING_LABEL[pair.gender],
    ]),
  ]);

  return new Response(csv, {
    headers: {
      'content-type': 'text/csv; charset=utf-8',
      'content-disposition': `attachment; filename="${csvFilename('buddy-pairs', new Date())}"`,
      'cache-control': 'no-store',
    },
  });
}
