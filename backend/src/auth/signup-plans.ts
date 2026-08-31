import type { SignupPlan } from './dto/register.dto.js';

export const SIGNUP_PLAN_TERMS: Record<
  SignupPlan,
  { amount: number; days: number; label: string }
> = {
  FREE: { amount: 0, days: 30, label: 'Free' },
  MONTHLY: { amount: 199.9, days: 30, label: 'Mensal' },
  YEARLY: { amount: 179.9, days: 365, label: 'Anual' },
};
