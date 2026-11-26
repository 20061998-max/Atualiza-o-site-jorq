import type { BillingCycle, Plan } from '../types';
import type { SupportedLang } from '../i18n/translations';

export function formatBRL(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(Number.isFinite(value) ? value : 0);
}

export function formatCompactBRL(value: number): string {
  const num = Number.isFinite(value) ? value : 0;
  const abs = Math.abs(num);
  const sign = num < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}R$ ${(abs / 1_000_000).toFixed(1).replace('.', ',')}M`;
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    const formatted = k >= 100 ? k.toFixed(0) : k.toFixed(1).replace(/\.0$/, '');
    return `${sign}R$ ${formatted.replace('.', ',')}k`;
  }
  return `${sign}R$ ${Math.round(abs)}`;
}

export function addMonthsToDateIso(baseIso: string, cycle: BillingCycle): string {
  const months =
    cycle === 'annual' ? 12 : cycle === 'semiannual' ? 6 : cycle === 'quarterly' ? 3 : 1;
  const d = new Date(baseIso);
  if (Number.isNaN(d.getTime())) {
    const now = new Date();
    now.setMonth(now.getMonth() + months);
    return now.toISOString();
  }
  d.setMonth(d.getMonth() + months);
  return d.toISOString();
}

export function getDaysUntilDate(dateStr?: string | null): number | null {
  if (!dateStr) return null;
  const parsed = new Date(dateStr);
  if (Number.isNaN(parsed.getTime())) return null;
  const now = new Date();
  const todayUtc = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
  const targetUtc = Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth(), parsed.getUTCDate());
  return Math.round((targetUtc - todayUtc) / (24 * 60 * 60 * 1000));
}

export function safeExternalUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      return parsed.toString();
    }
  } catch {
    return undefined;
  }
  return undefined;
}

export function formatDateBR(dateStr?: string | null, lang: SupportedLang = 'pt'): string {
  if (!dateStr) return '—';
  const clean = dateStr.slice(0, 10);
  const [y, m, d] = clean.split('-');
  if (!y || !m || !d) return dateStr;
  if (lang === 'en') return `${m}/${d}/${y}`;
  return `${d}/${m}/${y}`;
}

export const BILLING_CYCLES: {
  id: BillingCycle;
  label: string;
  months: number;
  defaultDiscount: number;
}[] = [
  { id: 'monthly', label: 'Mensal', months: 1, defaultDiscount: 0 },
  { id: 'quarterly', label: 'Trimestral', months: 3, defaultDiscount: 3 },
  { id: 'semiannual', label: 'Semestral', months: 6, defaultDiscount: 5 },
  { id: 'annual', label: 'Anual', months: 12, defaultDiscount: 8 },
];

const CYCLE_LABELS: Record<SupportedLang, Record<BillingCycle, string>> = {
  pt: { monthly: 'Mensal', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual' },
  en: { monthly: 'Monthly', quarterly: 'Quarterly', semiannual: 'Semiannual', annual: 'Annual' },
  es: { monthly: 'Mensual', quarterly: 'Trimestral', semiannual: 'Semestral', annual: 'Anual' },
  fr: { monthly: 'Mensuel', quarterly: 'Trimestriel', semiannual: 'Semestriel', annual: 'Annuel' },
};

export function getBillingCycles(lang: SupportedLang = 'pt') {
  return BILLING_CYCLES.map((c) => ({
    ...c,
    label: CYCLE_LABELS[lang][c.id],
  }));
}

export function calculatePlanPrice(
  plan: Plan,
  cycle: BillingCycle,
  couponDiscountPercent = 0
): {
  months: number;
  grossTotal: number;
  cycleDiscountPercent: number;
  afterCycleTotal: number;
  finalTotal: number;
  monthlyEquivalent: number;
} {
  const cycleMeta = BILLING_CYCLES.find((c) => c.id === cycle) || BILLING_CYCLES[0];
  const discountMap: Record<BillingCycle, number> = {
    monthly: plan.discountMonthly ?? 0,
    quarterly: plan.discountQuarterly ?? 3,
    semiannual: plan.discountSemiannual ?? 5,
    annual: plan.discountAnnual ?? 8,
  };

  const months = cycleMeta.months;
  const cycleDiscountPercent = discountMap[cycle];
  const grossTotal = Number((plan.monthlyPrice * months).toFixed(2));
  const afterCycleTotal = Number((grossTotal * (1 - cycleDiscountPercent / 100)).toFixed(2));
  const couponFactor = 1 - Math.max(0, Math.min(90, couponDiscountPercent)) / 100;
  const finalTotal = Number((afterCycleTotal * couponFactor).toFixed(2));
  const monthlyEquivalent = Number((finalTotal / months).toFixed(2));

  return {
    months,
    grossTotal,
    cycleDiscountPercent,
    afterCycleTotal,
    finalTotal,
    monthlyEquivalent,
  };
}

const SUB_STATUS_LABELS: Record<SupportedLang, Record<string, string>> = {
  pt: {
    authorized: 'Ativa',
    pending: 'Aguardando pagamento',
    overdue: 'Inadimplente',
    suspended: 'Suspensa',
    cancelled: 'Cancelada',
    paused: 'Pausada',
    fallback: 'Pendente',
  },
  en: {
    authorized: 'Active',
    pending: 'Awaiting payment',
    overdue: 'Overdue',
    suspended: 'Suspended',
    cancelled: 'Cancelled',
    paused: 'Paused',
    fallback: 'Pending',
  },
  es: {
    authorized: 'Activa',
    pending: 'Esperando pago',
    overdue: 'Vencida',
    suspended: 'Suspendida',
    cancelled: 'Cancelada',
    paused: 'Pausada',
    fallback: 'Pendiente',
  },
  fr: {
    authorized: 'Active',
    pending: 'En attente de paiement',
    overdue: 'En retard',
    suspended: 'Suspendue',
    cancelled: 'Annulée',
    paused: 'En pause',
    fallback: 'En attente',
  },
};

export function translateSubscriptionStatus(
  status: string,
  lang: SupportedLang = 'pt'
): {
  label: string;
  tone: 'success' | 'warning' | 'danger' | 'neutral';
} {
  const labels = SUB_STATUS_LABELS[lang] || SUB_STATUS_LABELS.pt;
  switch (status) {
    case 'authorized':
    case 'active':
      return { label: labels.authorized, tone: 'success' };
    case 'pending':
      return { label: labels.pending, tone: 'warning' };
    case 'overdue':
      return { label: labels.overdue, tone: 'danger' };
    case 'suspended':
      return { label: labels.suspended, tone: 'danger' };
    case 'cancelled':
      return { label: labels.cancelled, tone: 'neutral' };
    case 'paused':
      return { label: labels.paused, tone: 'warning' };
    default:
      return { label: status || labels.fallback, tone: 'neutral' };
  }
}
