"use client";

import Link from "next/link";
import type { Route } from "next";
import { useId, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "quiet" | "danger";
type Surface = "plain" | "elevated" | "inset" | "interactive" | "critical";

export function Button({ variant = "primary", iconOnly = false, className = "", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { readonly variant?: Variant; readonly iconOnly?: boolean }) {
  return <button className={`button button--${variant}${iconOnly ? " button--icon" : ""} ${className}`.trim()} {...props} />;
}

export function ButtonLink({ href, children, variant = "primary" }: Readonly<{ href: Route; children: ReactNode; variant?: Exclude<Variant, "danger"> }>) {
  return <Link className={`button button--${variant}`} href={href}>{children}</Link>;
}

export function Field({ label, description, error, success, ...props }: InputHTMLAttributes<HTMLInputElement> & Readonly<{ label: string; description?: string; error?: string; success?: string }>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  const descriptionId = description === undefined ? undefined : `${id}-description`;
  const errorId = error === undefined ? undefined : `${id}-error`;
  const successId = success === undefined ? undefined : `${id}-success`;
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      {description === undefined ? null : <p id={descriptionId}>{description}</p>}
      <input {...props} id={id} aria-invalid={error === undefined ? undefined : true} aria-describedby={[descriptionId, errorId, successId].filter(Boolean).join(" ") || undefined} />
      {error === undefined ? null : <p className="field__error" id={errorId}>{error}</p>}
      {success === undefined ? null : <p className="field__success" id={successId}>{success}</p>}
    </div>
  );
}

export function SelectField({ label, children, ...props }: SelectHTMLAttributes<HTMLSelectElement> & Readonly<{ label: string; children: ReactNode }>) {
  const generatedId = useId();
  const id = props.id ?? generatedId;
  return <div className="field"><label htmlFor={id}>{label}</label><select {...props} id={id}>{children}</select></div>;
}

export function Card({ children, heading, surface = "plain" }: Readonly<{ children: ReactNode; heading?: string; surface?: Surface }>) {
  return <section className={`card card--${surface}`}>{heading === undefined ? null : <h2>{heading}</h2>}{children}</section>;
}

export function Badge({ children, tone = "neutral" }: Readonly<{ children: ReactNode; tone?: "neutral" | "success" | "warning" | "danger" }>) {
  const symbol = { neutral: "•", success: "✓", warning: "!", danger: "×" }[tone];
  return <span className={`badge badge--${tone}`}><span aria-hidden="true" className="badge__symbol">{symbol}</span>{children}</span>;
}

export function StatusRegion({ children, assertive = false }: Readonly<{ children: ReactNode; assertive?: boolean }>) {
  return <div className="status-region" role={assertive ? "alert" : "status"} aria-live={assertive ? "assertive" : "polite"} aria-atomic="true">{children}</div>;
}

export function ProgressStatus({ label, value, max }: Readonly<{ label: string; value?: number; max?: number }>) {
  const determinate = value !== undefined && max !== undefined && max > 0;
  return (
    <div className="progress-status">
      <span>{label}</span>
      {determinate ? <progress aria-label={label} max={max} value={value} /> : <div className="progress-status__indeterminate" role="status" aria-label={label} />}
    </div>
  );
}

export function EmptyState({ title, description, action }: Readonly<{ title: string; description: string; action?: ReactNode }>) {
  return <section className="empty-state"><h2>{title}</h2><p>{description}</p>{action}</section>;
}

export function Skeleton({ width = "100%" }: Readonly<{ width?: string }>) {
  return <span aria-hidden="true" className="skeleton" style={{ width }} />;
}
