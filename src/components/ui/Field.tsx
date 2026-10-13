"use client";

import React, { useId } from "react";
import { AlertCircle, Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Labelled form controls: label above, hint and error linked via aria-describedby (design-tokens §5.5).

const CONTROL =
  "w-full min-h-[48px] rounded-control border bg-surface px-3 py-2.5 text-body text-ink placeholder:text-ink-subtle transition-colors duration-fast " +
  "hover:border-ink-muted focus:border-primary focus:outline-none focus:shadow-focus " +
  "disabled:cursor-not-allowed disabled:border-line disabled:bg-sunken disabled:text-ink-subtle read-only:border-transparent read-only:bg-sunken";

const controlBorder = (error?: string | null) => (error ? "border-danger" : "border-line-strong");

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  error?: string | null;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

export function FieldShell({ id, label, hint, error, required, className, children }: FieldShellProps) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={id} className="block text-label text-ink">
        {label}
        {required ? <span aria-hidden="true" className="text-danger"> *</span> : null}
      </label>
      {children}
      {hint && !error ? (
        <p id={`${id}-hint`} className="text-caption text-ink-muted">
          {hint}
        </p>
      ) : null}
      {error ? (
        <p id={`${id}-error`} className="flex items-start gap-1.5 text-caption font-bold text-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
}

function describedBy(id: string, hint?: string, error?: string | null) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

type BaseProps = { label: string; hint?: string; error?: string | null; wrapperClassName?: string };

export const Input = React.forwardRef<HTMLInputElement, BaseProps & React.InputHTMLAttributes<HTMLInputElement>>(
  ({ label, hint, error, wrapperClassName, className, id, required, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
        <input
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cn(CONTROL, controlBorder(error), className)}
          {...props}
        />
      </FieldShell>
    );
  }
);
Input.displayName = "Input";

export const Textarea = React.forwardRef<HTMLTextAreaElement, BaseProps & React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ label, hint, error, wrapperClassName, className, id, required, rows = 4, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
        <textarea
          ref={ref}
          id={fieldId}
          rows={rows}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cn(CONTROL, "min-h-[96px] resize-y", controlBorder(error), className)}
          {...props}
        />
      </FieldShell>
    );
  }
);
Textarea.displayName = "Textarea";

export const Select = React.forwardRef<HTMLSelectElement, BaseProps & React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ label, hint, error, wrapperClassName, className, id, required, children, ...props }, ref) => {
    const autoId = useId();
    const fieldId = id ?? autoId;
    return (
      <FieldShell id={fieldId} label={label} hint={hint} error={error} required={required} className={wrapperClassName}>
        <select
          ref={ref}
          id={fieldId}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy(fieldId, hint, error)}
          className={cn(CONTROL, "appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10", controlBorder(error), className)}
          style={{
            backgroundImage:
              "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%234F4A42' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
          }}
          {...props}
        >
          {children}
        </select>
      </FieldShell>
    );
  }
);
Select.displayName = "Select";

/** 20px box with a 44px tap target (the label). */
export const Checkbox = React.forwardRef<
  HTMLInputElement,
  { label: React.ReactNode; error?: string | null; wrapperClassName?: string } & Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">
>(({ label, error, wrapperClassName, className, id, ...props }, ref) => {
  const autoId = useId();
  const fieldId = id ?? autoId;
  return (
    <div className={wrapperClassName}>
      <label htmlFor={fieldId} className="flex min-h-[44px] cursor-pointer items-start gap-3 py-2 text-label font-normal text-ink">
        <span className="relative mt-0.5 inline-flex h-5 w-5 shrink-0">
          <input
            ref={ref}
            id={fieldId}
            type="checkbox"
            aria-invalid={error ? true : undefined}
            aria-describedby={error ? `${fieldId}-error` : undefined}
            className={cn(
              "peer h-5 w-5 appearance-none rounded-control border bg-surface transition-colors checked:border-primary checked:bg-primary focus-visible:shadow-focus",
              error ? "border-danger" : "border-line-strong",
              className
            )}
            {...props}
          />
          <Check className="pointer-events-none absolute inset-0 m-auto h-3.5 w-3.5 text-on-fill opacity-0 peer-checked:opacity-100" aria-hidden="true" />
        </span>
        <span>{label}</span>
      </label>
      {error ? (
        <p id={`${fieldId}-error`} className="flex items-start gap-1.5 text-caption font-bold text-danger">
          <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          {error}
        </p>
      ) : null}
    </div>
  );
});
Checkbox.displayName = "Checkbox";
