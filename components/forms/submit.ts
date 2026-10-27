import type { ApiError } from '@/lib/api';

export interface SubmitResult {
  ok: boolean;
  error?: string;
  fields?: Record<string, string>;
}

const NETWORK_ERROR = 'เชื่อมต่อไม่สำเร็จ กรุณาตรวจสอบอินเทอร์เน็ตแล้วลองใหม่';
const UNKNOWN_ERROR = 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง';

/** Posts JSON and normalises both failure shapes into one result. */
export async function submitJson(
  url: string,
  method: 'POST' | 'PATCH',
  body: unknown,
): Promise<SubmitResult> {
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    return { ok: false, error: NETWORK_ERROR };
  }

  if (response.ok) return { ok: true };

  const payload = (await response.json().catch(() => null)) as ApiError | null;
  return {
    ok: false,
    error: payload?.error ?? UNKNOWN_ERROR,
    fields: payload?.fields,
  };
}
