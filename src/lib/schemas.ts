import { z } from 'zod';

/** Zod schemas mirroring backend bean validation (see the Java *Request records). */

const CODE = /^[A-Za-z0-9_-]+$/;
const PHONE = /^\+?[0-9][0-9 -]{6,18}$/;

export const loginSchema = z.object({
  email: z.string().trim().min(1, 'Enter your email or phone number').max(254),
  password: z.string().min(1, 'Enter your password').max(72),
});
export type LoginValues = z.infer<typeof loginSchema>;

export const otpPhoneSchema = z.object({
  phone: z
    .string()
    .trim()
    .min(1, 'Enter your phone number')
    .regex(/^[+\d][\d\s-]{8,16}$/, 'Enter a valid Indian mobile number'),
});

export const otpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'Enter the 6-digit code'),
});

export const reasonSchema = z.object({
  reason: z.string().trim().min(1, 'A reason is required').max(500, 'Keep it under 500 characters'),
});
export const optionalReasonSchema = z.object({
  reason: z.string().trim().max(500, 'Keep it under 500 characters').optional(),
});

export const programSchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(40, 'At most 40 characters')
    .regex(CODE, "Letters, digits, '_' and '-' only"),
  name: z.string().trim().min(1, 'Name is required').max(120, 'At most 120 characters'),
  description: z.string().max(1000, 'At most 1000 characters').optional(),
  category: z.string().trim().min(1, 'Category is required').max(60, 'At most 60 characters'),
  active: z.boolean(),
});
export type ProgramValues = z.infer<typeof programSchema>;

export const amenitySchema = z.object({
  code: z
    .string()
    .trim()
    .min(1, 'Code is required')
    .max(40, 'At most 40 characters')
    .regex(CODE, "Letters, digits, '_' and '-' only"),
  name: z.string().trim().min(1, 'Name is required').max(80, 'At most 80 characters'),
  icon: z.string().max(60).optional(),
  description: z.string().max(300, 'At most 300 characters').optional(),
  active: z.boolean(),
});
export type AmenityValues = z.infer<typeof amenitySchema>;

export const adminProfileSchema = z.object({
  fullName: z.string().trim().min(1, 'Full name is required').max(120),
  email: z.union([z.literal(''), z.string().trim().email('Enter a valid email').max(254)]),
  phone: z.union([z.literal(''), z.string().trim().regex(PHONE, 'Enter a valid phone number')]),
  title: z.string().trim().max(80, 'At most 80 characters'),
});
export type AdminProfileValues = z.infer<typeof adminProfileSchema>;

/** auth-service ValidationPatterns.PASSWORD: 8-72 chars, at least one letter and one digit. */
export const passwordRules = [
  { id: 'length', label: '8–72 characters', test: (v: string) => v.length >= 8 && v.length <= 72 },
  { id: 'letter', label: 'At least one letter', test: (v: string) => /[A-Za-z]/.test(v) },
  { id: 'digit', label: 'At least one digit', test: (v: string) => /\d/.test(v) },
] as const;

export function passwordSchema(requireCurrent: boolean) {
  return z
    .object({
      currentPassword: requireCurrent
        ? z.string().min(1, 'Enter your current password').max(72)
        : z.string().max(72).optional(),
      newPassword: z
        .string()
        .min(8, 'Must be at least 8 characters')
        .max(72, 'Must be at most 72 characters')
        .regex(/[A-Za-z]/, 'Must contain at least one letter')
        .regex(/\d/, 'Must contain at least one digit'),
      confirm: z.string(),
    })
    .refine((v) => v.newPassword === v.confirm, { path: ['confirm'], message: 'Passwords do not match' });
}
export type PasswordValues = { currentPassword?: string; newPassword: string; confirm: string };

export function passwordStrength(v: string): 0 | 1 | 2 | 3 | 4 {
  if (!v) return 0;
  let score = 0;
  if (v.length >= 8) score++;
  if (v.length >= 12) score++;
  if (/[A-Za-z]/.test(v) && /\d/.test(v)) score++;
  if (/[^A-Za-z0-9]/.test(v) || (/[a-z]/.test(v) && /[A-Z]/.test(v))) score++;
  return Math.min(4, score) as 0 | 1 | 2 | 3 | 4;
}
