import { FACULTIES, FACULTY_LABEL, FACULTY_STYLE, type Faculty } from '@/lib/faculty';

/** The design lists the faculties in this order. */
const ORDER: Faculty[] = ['pharmacy', 'science', 'engineering'];

/**
 * Faculty is derived from the student ID, so these are an indicator rather
 * than a control: the detected one lights up and the others fade back.
 */
export function FacultyChips({ detected }: { detected: Faculty | null }) {
  return (
    <div className="grid grid-cols-3 gap-2">
      {ORDER.map((faculty) => {
        const on = faculty === detected;
        const style = FACULTY_STYLE[faculty];
        return (
          <div
            key={faculty}
            aria-current={on ? 'true' : undefined}
            className={`flex min-h-[56px] flex-col items-center justify-center rounded-input border-2 font-heading text-[14px] font-medium ${
              on ? `${style.solid} border-transparent` : `${style.soft} border-transparent opacity-55`
            }`}
          >
            {FACULTY_LABEL[faculty].short}
          </div>
        );
      })}
    </div>
  );
}

export function facultyChipMessage(studentId: string, detected: Faculty | null) {
  if (studentId.length < 10) {
    return { text: 'กรอกรหัสนิสิตให้ครบ 10 หลัก', tone: 'muted' as const };
  }
  if (!detected) {
    return { text: 'รหัสนี้ไม่ใช่ของคณะที่เข้าร่วม กรุณาตรวจสอบอีกครั้ง', tone: 'error' as const };
  }
  return { text: 'ตรวจพบคณะจากรหัสนิสิตแล้ว', tone: 'ok' as const };
}

export { FACULTIES };
