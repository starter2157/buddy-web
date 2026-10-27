import { NextResponse } from 'next/server';
import type { z } from 'zod';
import { fieldErrors } from './schemas';

/** The shape every API route answers with, so the forms can read one thing. */
export interface ApiError {
  error: string;
  fields?: Record<string, string>;
}

export function apiError(message: string, status: number, fields?: Record<string, string>) {
  return NextResponse.json<ApiError>({ error: message, ...(fields ? { fields } : {}) }, { status });
}

export function validationError(error: z.ZodError) {
  return apiError('ข้อมูลยังไม่ครบถ้วน กรุณาตรวจสอบอีกครั้ง', 400, fieldErrors(error));
}

export const UNAUTHENTICATED = 'กรุณาเข้าสู่ระบบก่อน';
export const NOT_REGISTERED = 'ยังไม่พบข้อมูลการลงทะเบียนของคุณ';
export const SAVE_FAILED = 'บันทึกข้อมูลไม่สำเร็จ กรุณาลองใหม่อีกครั้ง';
export const ALREADY_REGISTERED = 'คุณลงทะเบียนไว้แล้ว';
export const LOCKED_FIELDS = 'ปิดรับลงทะเบียนแล้ว จึงแก้ไขข้อมูลส่วนนี้ไม่ได้';
export const STUDENT_ID_MISMATCH = 'รหัสนิสิตต้องตรงกับอีเมลที่ใช้เข้าสู่ระบบ';
export const FACULTY_NOT_PARTICIPATING = 'รหัสนี้ไม่ใช่ของคณะที่เข้าร่วม กรุณาตรวจสอบอีกครั้ง';

/** Postgres unique-violation, which here means the student ID is taken. */
export const UNIQUE_VIOLATION = '23505';
