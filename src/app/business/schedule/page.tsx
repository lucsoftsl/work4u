"use client";

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { Button } from "@/components/ui/Button";
import { CurrencySelector } from "@/components/CurrencySelector";
import { CategorySelector } from "@/components/CategorySelector";
import { LocationPicker } from "@/components/ui/LocationPicker";
import { companiesApi } from "@/lib/companies-api";
import { CATEGORIES } from "@/data/categories";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/lib/i18n";
import type {
  Company,
  CreateShiftPayload,
  RecurrenceRule,
  RosterWorker,
  Shift,
} from "@/api/types";
import {
  CalendarClock,
  CalendarX,
  ChevronLeft,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  User,
  Wallet,
  X,
} from "lucide-react";

const DAY_MS = 24 * 60 * 60 * 1000;
const MAX_RECURRENCE_COUNT = 26;

type Period = "morning" | "afternoon" | "evening";

const PERIOD_LABEL_KEYS: Record<Period, string> = {
  morning: "schedule.periodMorning",
  afternoon: "schedule.periodAfternoon",
  evening: "schedule.periodEvening",
};

const STATUS_STYLES: Record<string, string> = {
  IN_PROGRESS: "bg-brand-soft text-brand",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-muted text-ink-subtle",
  DISPUTED: "bg-red-50 text-red-700",
};

const STATUS_LABEL_KEYS: Record<string, string> = {
  IN_PROGRESS: "schedule.statusScheduled",
  COMPLETED: "schedule.statusCompleted",
  CANCELLED: "schedule.statusCancelled",
  DISPUTED: "schedule.statusDisputed",
};

// ---------- date helpers ----------

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getMondayOfWeek(date: Date): Date {
  const d = startOfDay(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  return addDays(d, diff);
}

function isSameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

function dayInitial(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "narrow" });
}

function formatDatetimeLocal(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function formatTime(iso: string | null): string {
  if (!iso) return "--:--";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
}

function formatBudget(amount: number, currency: string, budgetType: "FIXED" | "HOURLY"): string {
  const formatted = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
  return budgetType === "HOURLY" ? `${formatted}/hr` : formatted;
}

function titleCase(value: string): string {
  return value.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ---------- shift grouping ----------

function periodForShift(shift: Shift): Period {
  const hour = shift.scheduledStartAt ? new Date(shift.scheduledStartAt).getHours() : 12;
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}

function groupShiftsByPeriod(shifts: Shift[]): Record<Period, Shift[]> {
  const groups: Record<Period, Shift[]> = { morning: [], afternoon: [], evening: [] };
  const sorted = [...shifts].sort((a, b) => {
    const ta = a.scheduledStartAt ? new Date(a.scheduledStartAt).getTime() : 0;
    const tb = b.scheduledStartAt ? new Date(b.scheduledStartAt).getTime() : 0;
    return ta - tb;
  });
  for (const shift of sorted) {
    groups[periodForShift(shift)].push(shift);
  }
  return groups;
}

// ---------- small presentational pieces ----------

function Avatar({
  worker,
  size = 40,
}: {
  worker: { name: string; photoUrl: string | null } | null;
  size?: number;
}) {
  if (!worker) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-muted text-ink-subtle"
        style={{ width: size, height: size }}
      >
        <User size={size * 0.5} />
      </div>
    );
  }
  if (worker.photoUrl) {
    return (
      <Image
        src={worker.photoUrl}
        alt={worker.name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-brand-soft text-sm font-bold text-brand"
      style={{ width: size, height: size }}
    >
      {worker.name.charAt(0).toUpperCase()}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const { t } = useTranslation();
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold",
        STATUS_STYLES[status] ?? "bg-muted text-ink-subtle"
      )}
    >
      {STATUS_LABEL_KEYS[status] ? t(STATUS_LABEL_KEYS[status]) : status}
    </span>
  );
}

function ModalShell({
  title,
  onClose,
  children,
  footer,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 backdrop-blur-sm p-0 sm:items-center sm:p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[92vh] w-full flex-col rounded-t-3xl bg-card shadow-soft sm:max-w-lg sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-center justify-between gap-3 border-b border-outline px-5 py-4">
          <h2 className="text-lg font-bold text-ink">{title}</h2>
          <button
            onClick={onClose}
            aria-label={t('roster.close')}
            className="flex h-8 w-8 items-center justify-center rounded-full text-ink-muted transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <div className="border-t border-outline px-5 py-4">{footer}</div>}
      </div>
    </div>
  );
}

function EmptyDayState({ onSchedule }: { onSchedule: () => void }) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-center justify-center rounded-2xl bg-card px-6 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-brand">
        <CalendarX size={24} />
      </div>
      <p className="text-sm font-semibold text-ink">{t('schedule.noShiftsToday')}</p>
      <p className="mt-1 max-w-[240px] text-xs text-ink-muted">
        {t('schedule.noShiftsTodayDesc')}
      </p>
      <Button className="mt-5" onClick={onSchedule}>
        <Plus size={15} />
        {t('schedule.scheduleShift')}
      </Button>
    </div>
  );
}

function ShiftAgendaRow({ shift, onSelect }: { shift: Shift; onSelect: () => void }) {
  const { t } = useTranslation();

  return (
    <button
      onClick={onSelect}
      className="flex w-full items-center gap-3 rounded-2xl bg-card p-4 text-left transition hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
    >
      <Avatar worker={shift.worker} size={44} />
      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <p className="truncate text-sm font-semibold text-ink">{shift.worker?.name ?? t('biz.unassigned')}</p>
          <StatusPill status={shift.lifecycleStatus} />
        </div>
        <p className="mt-0.5 text-xs font-medium text-ink-muted">
          {formatTime(shift.scheduledStartAt)} – {formatTime(shift.scheduledEndAt)}
        </p>
        <p className="mt-1 truncate text-sm text-ink">{shift.title}</p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-xs text-ink-subtle">
          <MapPin size={12} className="shrink-0" />
          {shift.location}
        </p>
      </div>
    </button>
  );
}

// ---------- week strip ----------

function WeekStrip({
  weekDays,
  selectedDate,
  today,
  onSelect,
  onPrev,
  onNext,
}: {
  weekDays: Date[];
  selectedDate: Date;
  today: Date;
  onSelect: (date: Date) => void;
  onPrev: () => void;
  onNext: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="mb-6 flex items-center gap-1">
      <button
        onClick={onPrev}
        aria-label={t('schedule.previousWeek')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-muted hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <ChevronLeft size={18} />
      </button>
      <div className="flex min-w-0 flex-1 gap-2 overflow-x-auto px-1 py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {weekDays.map((day) => {
          const isSelected = isSameDay(day, selectedDate);
          const isToday = isSameDay(day, today);
          return (
            <button
              key={day.toISOString()}
              onClick={() => onSelect(day)}
              aria-pressed={isSelected}
              aria-label={day.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              className={cn(
                "flex min-w-[52px] shrink-0 flex-col items-center justify-center gap-1 rounded-2xl px-3 py-2.5 transition-colors focus:outline-none focus:ring-2 focus:ring-primary",
                isSelected ? "bg-brand text-white shadow-soft" : "bg-card text-ink-muted hover:bg-muted"
              )}
            >
              <span className="text-[11px] font-bold uppercase tracking-wide">{dayInitial(day)}</span>
              <span className="text-base font-bold">{day.getDate()}</span>
              {isToday && !isSelected && <span className="h-1 w-1 rounded-full bg-brand" />}
            </button>
          );
        })}
      </div>
      <button
        onClick={onNext}
        aria-label={t('schedule.nextWeek')}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-ink-muted transition hover:bg-muted hover:text-ink focus:outline-none focus:ring-2 focus:ring-primary"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// ---------- create shift modal ----------

function ScheduleShiftModal({
  companyId,
  token,
  roster,
  defaultDate,
  onClose,
  onCreated,
}: {
  companyId: string;
  token: string;
  roster: RosterWorker[];
  defaultDate: Date;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState<string>(CATEGORIES[0]?.id ?? "");
  const [description, setDescription] = useState("");
  const [location, setLocation] = useState("");
  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [workerId, setWorkerId] = useState(roster[0]?.workerId ?? "");
  const [budget, setBudget] = useState("");
  const [budgetType, setBudgetType] = useState<"FIXED" | "HOURLY">("FIXED");
  const [budgetCurrency, setBudgetCurrency] = useState("USD");
  const [scheduledStartAt, setScheduledStartAt] = useState(() => {
    const d = new Date(defaultDate);
    d.setHours(9, 0, 0, 0);
    return formatDatetimeLocal(d);
  });
  const [scheduledEndAt, setScheduledEndAt] = useState(() => {
    const d = new Date(defaultDate);
    d.setHours(17, 0, 0, 0);
    return formatDatetimeLocal(d);
  });
  const [recurrenceRule, setRecurrenceRule] = useState<RecurrenceRule>("NONE");
  const [recurrenceCount, setRecurrenceCount] = useState(4);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (!title.trim() || !location.trim() || !workerId) {
      setError(t('schedule.fillTitleLocationWorker'));
      return;
    }
    const budgetValue = Number(budget);
    if (!budgetValue || budgetValue <= 0) {
      setError(t('schedule.budgetGreaterThanZero'));
      return;
    }
    const startDate = new Date(scheduledStartAt);
    const endDate = new Date(scheduledEndAt);
    if (!scheduledStartAt || !scheduledEndAt || endDate <= startDate) {
      setError(t('schedule.endAfterStart'));
      return;
    }

    setSubmitting(true);
    try {
      const payload: CreateShiftPayload = {
        title: title.trim(),
        category,
        location: location.trim(),
        latitude,
        longitude,
        workerId,
        budget: budgetValue,
        budgetType,
        budgetCurrency,
        scheduledStartAt: startDate.toISOString(),
        scheduledEndAt: endDate.toISOString(),
        ...(description.trim() ? { description: description.trim() } : {}),
        ...(recurrenceRule !== "NONE"
          ? { recurrenceRule, recurrenceCount: Math.min(recurrenceCount, MAX_RECURRENCE_COUNT) }
          : {}),
      };
      await companiesApi.createShift(companyId, payload, token);
      onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('schedule.scheduleError'));
    } finally {
      setSubmitting(false);
    }
  }

  const footer = (
    <div className="flex gap-2">
      <Button type="button" variant="outline" className="flex-1" onClick={onClose} disabled={submitting}>
        {t('jobDetail.cancel')}
      </Button>
      <Button type="submit" form="create-shift-form" className="flex-1" disabled={submitting}>
        {submitting ? t('schedule.scheduling') : t('schedule.scheduleShiftButton')}
      </Button>
    </div>
  );

  return (
    <ModalShell title={t('schedule.scheduleShiftTitle')} onClose={onClose} footer={footer}>
      <form id="create-shift-form" onSubmit={handleSubmit} className="space-y-4">
        {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

        <div className="space-y-1.5">
          <label htmlFor="shift-title" className="text-xs font-bold uppercase tracking-wide text-ink-subtle">
            {t('common.title')}
          </label>
          <input
            id="shift-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={t('schedule.titlePlaceholder')}
            className="field-shell w-full"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{t('jobs.category')}</label>
          <CategorySelector
            value={category}
            onChange={setCategory}
            categories={CATEGORIES.map((cat) => ({ id: cat.id, name: titleCase(cat.id), icon: cat.icon }))}
          />
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{t('jobDetail.location')}</span>
          <LocationPicker
            value={{ lat: latitude ?? 0, lng: longitude ?? 0, address: location }}
            onChange={({ lat, lng, address }) => {
              setLocation(address);
              setLatitude(lat);
              setLongitude(lng);
            }}
            addressPlaceholder={t('schedule.locationPlaceholder')}
            height="200px"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="shift-description" className="text-xs font-bold uppercase tracking-wide text-ink-subtle">
            {t('postService.descriptionLabel')} <span className="normal-case text-ink-subtle">{t('biz.optional')}</span>
          </label>
          <textarea
            id="shift-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={t('schedule.descPlaceholder')}
            className="field-shell w-full"
          />
        </div>

        <div className="space-y-1.5">
          <label htmlFor="shift-worker" className="text-xs font-bold uppercase tracking-wide text-ink-subtle">
            {t('schedule.workerLabel')}
          </label>
          {roster.length === 0 ? (
            <p className="rounded-xl bg-muted px-3 py-2 text-xs text-ink-muted">
              {t('schedule.emptyRosterInline')}{" "}
              <Link href="/business/roster" className="font-semibold text-brand underline">
                {t('schedule.addAWorker')}
              </Link>{" "}
              {t('schedule.beforeScheduling')}
            </p>
          ) : (
            <select
              id="shift-worker"
              value={workerId}
              onChange={(e) => setWorkerId(e.target.value)}
              className="field-shell w-full"
            >
              {roster.map((entry) => (
                <option key={entry.workerId} value={entry.workerId}>
                  {entry.worker.name}
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="space-y-1.5">
          <span className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{t('jobDetail.budget')}</span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_180px]">
            <input
              type="number"
              min="0"
              step="0.01"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="0.00"
              className="field-shell w-full"
            />
            <CurrencySelector value={budgetCurrency} onChange={setBudgetCurrency} />
          </div>
          <div className="flex gap-2">
            <div className="flex overflow-hidden rounded-2xl bg-muted p-1">
              <button
                type="button"
                onClick={() => setBudgetType("FIXED")}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-bold transition",
                  budgetType === "FIXED" ? "bg-brand text-white" : "text-ink-muted"
                )}
              >
                {t('schedule.fixed')}
              </button>
              <button
                type="button"
                onClick={() => setBudgetType("HOURLY")}
                className={cn(
                  "rounded-xl px-3 py-2 text-xs font-bold transition",
                  budgetType === "HOURLY" ? "bg-brand text-white" : "text-ink-muted"
                )}
              >
                {t('schedule.hourly')}
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <label htmlFor="shift-start" className="text-xs font-bold uppercase tracking-wide text-ink-subtle">
              {t('schedule.startsLabel')}
            </label>
            <input
              id="shift-start"
              type="datetime-local"
              value={scheduledStartAt}
              onChange={(e) => setScheduledStartAt(e.target.value)}
              className="field-shell w-full"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="shift-end" className="text-xs font-bold uppercase tracking-wide text-ink-subtle">
              {t('schedule.endsLabel')}
            </label>
            <input
              id="shift-end"
              type="datetime-local"
              value={scheduledEndAt}
              onChange={(e) => setScheduledEndAt(e.target.value)}
              className="field-shell w-full"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="shift-recurrence" className="text-xs font-bold uppercase tracking-wide text-ink-subtle">
            {t('schedule.recurrenceLabel')}
          </label>
          <select
            id="shift-recurrence"
            value={recurrenceRule}
            onChange={(e) => setRecurrenceRule(e.target.value as RecurrenceRule)}
            className="field-shell w-full"
          >
            <option value="NONE">{t('schedule.doesNotRepeat')}</option>
            <option value="DAILY">{t('schedule.daily')}</option>
            <option value="WEEKLY">{t('schedule.weekly')}</option>
            <option value="BIWEEKLY">{t('schedule.every2Weeks')}</option>
            <option value="MONTHLY">{t('schedule.monthly')}</option>
          </select>
          {recurrenceRule !== "NONE" && (
            <div className="flex items-center gap-2 pt-1">
              <label htmlFor="shift-recurrence-count" className="text-xs text-ink-muted">
                {t('schedule.occurrences')}
              </label>
              <input
                id="shift-recurrence-count"
                type="number"
                min={1}
                max={MAX_RECURRENCE_COUNT}
                value={recurrenceCount}
                onChange={(e) =>
                  setRecurrenceCount(Math.min(MAX_RECURRENCE_COUNT, Math.max(1, Number(e.target.value) || 1)))
                }
                className="field-shell w-20"
              />
              <span className="text-xs text-ink-subtle">({t('schedule.max')} {MAX_RECURRENCE_COUNT})</span>
            </div>
          )}
        </div>
      </form>
    </ModalShell>
  );
}

// ---------- shift detail modal ----------

function ShiftDetailModal({
  shift,
  roster,
  companyId,
  token,
  onClose,
  onUpdated,
}: {
  shift: Shift;
  roster: RosterWorker[];
  companyId: string;
  token: string;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { t } = useTranslation();
  const [scheduledStartAt, setScheduledStartAt] = useState(() =>
    shift.scheduledStartAt ? formatDatetimeLocal(new Date(shift.scheduledStartAt)) : ""
  );
  const [scheduledEndAt, setScheduledEndAt] = useState(() =>
    shift.scheduledEndAt ? formatDatetimeLocal(new Date(shift.scheduledEndAt)) : ""
  );
  const [reassignWorkerId, setReassignWorkerId] = useState(shift.worker?.userId ?? shift.hiredWorkerId ?? "");
  const [confirmingCancel, setConfirmingCancel] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [busyAction, setBusyAction] = useState<"reschedule" | "reassign" | "cancel" | null>(null);

  const isEditable = shift.lifecycleStatus === "IN_PROGRESS";

  async function handleReschedule() {
    setActionError(null);
    if (!scheduledStartAt || !scheduledEndAt) {
      setActionError(t('schedule.pickStartEnd'));
      return;
    }
    const start = new Date(scheduledStartAt);
    const end = new Date(scheduledEndAt);
    if (end <= start) {
      setActionError(t('schedule.endAfterStart'));
      return;
    }
    setBusyAction("reschedule");
    try {
      await companiesApi.updateShift(
        companyId,
        shift.id,
        { scheduledStartAt: start.toISOString(), scheduledEndAt: end.toISOString() },
        token
      );
      onUpdated();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('schedule.rescheduleError'));
      setBusyAction(null);
    }
  }

  async function handleReassign() {
    setActionError(null);
    if (!reassignWorkerId) {
      setActionError(t('schedule.chooseWorkerError'));
      return;
    }
    setBusyAction("reassign");
    try {
      await companiesApi.updateShift(companyId, shift.id, { workerId: reassignWorkerId }, token);
      onUpdated();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('schedule.reassignError'));
      setBusyAction(null);
    }
  }

  async function handleCancelShift() {
    setActionError(null);
    setBusyAction("cancel");
    try {
      await companiesApi.updateShift(companyId, shift.id, { lifecycleStatus: "CANCELLED" }, token);
      onUpdated();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : t('schedule.cancelShiftError'));
      setBusyAction(null);
    }
  }

  return (
    <ModalShell title={t('schedule.shiftDetails')} onClose={onClose}>
      <div className="space-y-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <Avatar worker={shift.worker} size={44} />
            <div>
              <p className="text-sm font-semibold text-ink">{shift.worker?.name ?? t('biz.unassigned')}</p>
              <p className="text-xs text-ink-muted">{shift.title}</p>
            </div>
          </div>
          <StatusPill status={shift.lifecycleStatus} />
        </div>

        <div className="space-y-1.5 rounded-2xl bg-muted px-4 py-3 text-xs text-ink-muted">
          <p className="flex items-center gap-2">
            <Clock size={13} />
            {formatTime(shift.scheduledStartAt)} – {formatTime(shift.scheduledEndAt)}
          </p>
          <p className="flex items-center gap-2">
            <MapPin size={13} />
            {shift.location}
          </p>
          <p className="flex items-center gap-2">
            <Wallet size={13} />
            {formatBudget(shift.budget, shift.budgetCurrency, shift.budgetType)}
          </p>
        </div>

        {actionError && (
          <p className="rounded-xl bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{actionError}</p>
        )}

        {!isEditable ? (
          <p className="text-xs text-ink-subtle">
            {t('schedule.thisShiftIs')} {(STATUS_LABEL_KEYS[shift.lifecycleStatus] ? t(STATUS_LABEL_KEYS[shift.lifecycleStatus]) : shift.lifecycleStatus).toLowerCase()}{" "}
            {t('schedule.andCanNoLongerChange')}
          </p>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{t('schedule.reschedule')}</p>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <input
                  type="datetime-local"
                  value={scheduledStartAt}
                  onChange={(e) => setScheduledStartAt(e.target.value)}
                  className="field-shell"
                />
                <input
                  type="datetime-local"
                  value={scheduledEndAt}
                  onChange={(e) => setScheduledEndAt(e.target.value)}
                  className="field-shell"
                />
              </div>
              <Button size="sm" variant="outline" onClick={handleReschedule} disabled={busyAction !== null}>
                {busyAction === "reschedule" ? t('schedule.saving') : t('schedule.saveNewTime')}
              </Button>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wide text-ink-subtle">{t('schedule.reassignWorker')}</p>
              <select
                value={reassignWorkerId}
                onChange={(e) => setReassignWorkerId(e.target.value)}
                className="field-shell w-full"
              >
                <option value="" disabled>
                  {t('schedule.chooseWorker')}
                </option>
                {roster.map((entry) => (
                  <option key={entry.workerId} value={entry.workerId}>
                    {entry.worker.name}
                  </option>
                ))}
              </select>
              <Button size="sm" variant="outline" onClick={handleReassign} disabled={busyAction !== null}>
                {busyAction === "reassign" ? t('schedule.reassigning') : t('schedule.reassign')}
              </Button>
            </div>

            <div className="space-y-2 border-t border-outline pt-4">
              {!confirmingCancel ? (
                <Button
                  size="sm"
                  variant="ghost"
                  className="text-red-600 hover:bg-red-50"
                  onClick={() => setConfirmingCancel(true)}
                  disabled={busyAction !== null}
                >
                  <X size={14} />
                  {t('schedule.cancelShift')}
                </Button>
              ) : (
                <div className="rounded-xl bg-red-50 p-3">
                  <p className="mb-2 text-xs font-medium text-red-700">
                    {t('schedule.confirmCancelShift')}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="bg-red-600 hover:bg-red-600/90"
                      onClick={handleCancelShift}
                      disabled={busyAction !== null}
                    >
                      {busyAction === "cancel" ? t('schedule.cancelling') : t('schedule.yesCancelShift')}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setConfirmingCancel(false)}
                      disabled={busyAction !== null}
                    >
                      {t('schedule.neverMind')}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </ModalShell>
  );
}

// ---------- page ----------

export default function BusinessSchedulePage() {
  const router = useRouter();
  const { isAuthenticated, firebaseToken, loading: authLoading } = useAuth();
  const { t } = useTranslation();

  const [company, setCompany] = useState<Company | null>(null);
  const [companyLoading, setCompanyLoading] = useState(true);
  const [companyError, setCompanyError] = useState<string | null>(null);

  const [roster, setRoster] = useState<RosterWorker[]>([]);

  const [selectedDate, setSelectedDate] = useState<Date>(() => startOfDay(new Date()));
  const [weekStart, setWeekStart] = useState<Date>(() => getMondayOfWeek(new Date()));

  const [shifts, setShifts] = useState<Shift[]>([]);
  const [shiftsLoading, setShiftsLoading] = useState(false);
  const [shiftsError, setShiftsError] = useState<string | null>(null);

  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const today = useMemo(() => startOfDay(new Date()), []);
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart]);
  const grouped = useMemo(() => groupShiftsByPeriod(shifts), [shifts]);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      router.push("/signin?redirect=/business/schedule");
    }
  }, [authLoading, isAuthenticated, router]);

  useEffect(() => {
    if (authLoading || !isAuthenticated || !firebaseToken) return;
    let cancelled = false;
    setCompanyLoading(true);
    companiesApi
      .getMyCompany(firebaseToken)
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          router.push("/business/dashboard");
          return;
        }
        setCompany(data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setCompanyError(err instanceof Error ? err.message : t('roster.loadCompanyError'));
      })
      .finally(() => {
        if (!cancelled) setCompanyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [authLoading, isAuthenticated, firebaseToken, router, t]);

  const loadShifts = useCallback(async (companyId: string, token: string, date: Date) => {
    setShiftsLoading(true);
    setShiftsError(null);
    try {
      const from = startOfDay(date).toISOString();
      const to = new Date(startOfDay(date).getTime() + DAY_MS - 1).toISOString();
      const data = await companiesApi.listShifts(companyId, from, to, token);
      setShifts(data);
    } catch (err) {
      setShiftsError(err instanceof Error ? err.message : t('schedule.loadShiftsError'));
    } finally {
      setShiftsLoading(false);
    }
  }, [t]);

  const loadRoster = useCallback(async (companyId: string, token: string) => {
    try {
      const data = await companiesApi.listRoster(companyId, token);
      setRoster(data);
    } catch {
      setRoster([]);
    }
  }, []);

  useEffect(() => {
    if (!company || !firebaseToken) return;
    void loadShifts(company.id, firebaseToken, selectedDate);
  }, [company, firebaseToken, selectedDate, loadShifts]);

  useEffect(() => {
    if (!company || !firebaseToken) return;
    void loadRoster(company.id, firebaseToken);
  }, [company, firebaseToken, loadRoster]);

  function refreshShifts() {
    if (!company || !firebaseToken) return;
    void loadShifts(company.id, firebaseToken, selectedDate);
  }

  function handlePreviousWeek() {
    const newStart = addDays(weekStart, -7);
    setWeekStart(newStart);
    setSelectedDate(newStart);
  }

  function handleNextWeek() {
    const newStart = addDays(weekStart, 7);
    setWeekStart(newStart);
    setSelectedDate(newStart);
  }

  if (authLoading || !isAuthenticated || companyLoading || !company || !firebaseToken) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center bg-background">
        {companyError ? (
          <p className="text-sm font-medium text-red-600">{companyError}</p>
        ) : (
          <div
            className="h-8 w-8 animate-spin rounded-full border-2 border-outline"
            style={{ borderTopColor: "hsl(var(--brand))" }}
          />
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-28">
      <main className="mx-auto max-w-2xl px-4 py-8 sm:py-10">
        <div className="mb-6">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-brand-soft px-4 py-1.5 text-sm font-medium text-brand">
            <CalendarClock size={14} />
            {t('schedule.badge')}
          </div>
          <h1 className="text-2xl font-bold text-ink sm:text-3xl">{t('schedule.heading')}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {company.name ? `${t('schedule.schedulingFor')} ${company.name}` : t('schedule.manageTeamShifts')}
          </p>
        </div>

        <WeekStrip
          weekDays={weekDays}
          selectedDate={selectedDate}
          today={today}
          onSelect={setSelectedDate}
          onPrev={handlePreviousWeek}
          onNext={handleNextWeek}
        />

        <p className="mb-4 text-sm font-semibold text-ink-subtle">
          {selectedDate.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </p>

        {shiftsLoading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-muted" />
            <div className="h-20 animate-pulse rounded-2xl bg-muted" />
          </div>
        ) : shiftsError ? (
          <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{shiftsError}</p>
        ) : shifts.length === 0 ? (
          <EmptyDayState onSchedule={() => setShowCreateModal(true)} />
        ) : (
          <div className="space-y-6">
            {(["morning", "afternoon", "evening"] as const).map(
              (period) =>
                grouped[period].length > 0 && (
                  <div key={period}>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-ink-subtle">
                      {t(PERIOD_LABEL_KEYS[period])}
                    </h3>
                    <div className="space-y-2">
                      {grouped[period].map((shift) => (
                        <ShiftAgendaRow key={shift.id} shift={shift} onSelect={() => setSelectedShift(shift)} />
                      ))}
                    </div>
                  </div>
                )
            )}
          </div>
        )}
      </main>

      <button
        onClick={() => setShowCreateModal(true)}
        aria-label={t('schedule.scheduleShift')}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-brand text-white shadow-soft transition hover:bg-brand-strong focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
      >
        <Plus size={26} />
      </button>

      {showCreateModal && (
        <ScheduleShiftModal
          companyId={company.id}
          token={firebaseToken}
          roster={roster}
          defaultDate={selectedDate}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refreshShifts();
          }}
        />
      )}

      {selectedShift && (
        <ShiftDetailModal
          shift={selectedShift}
          roster={roster}
          companyId={company.id}
          token={firebaseToken}
          onClose={() => setSelectedShift(null)}
          onUpdated={() => {
            setSelectedShift(null);
            refreshShifts();
          }}
        />
      )}
    </div>
  );
}
