"use client";

import { useEffect, useId, useRef, type ReactNode } from "react";

const FOCUSABLE = "button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex='-1'])";

export function Dialog({ open, title, description, children, onClose, alert = false, closeLabel = "Close dialog" }: Readonly<{ open: boolean; title: string; description?: string; children: ReactNode; onClose: () => void; alert?: boolean; closeLabel?: string }>) {
  const titleId = useId();
  const descriptionId = useId();
  const panelRef = useRef<HTMLDivElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;
    returnFocusRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const panel = panelRef.current;
    const focusables = panel?.querySelectorAll<HTMLElement>(FOCUSABLE);
    focusables?.[0]?.focus();
    const handleKey = (event: globalThis.KeyboardEvent): void => {
      if (event.key === "Escape" && !alert) { event.preventDefault(); onClose(); return; }
      if (event.key !== "Tab" || panel === null) return;
      const current = [...panel.querySelectorAll<HTMLElement>(FOCUSABLE)];
      if (current.length === 0) { event.preventDefault(); panel.focus(); return; }
      const first = current[0];
      const last = current.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { document.removeEventListener("keydown", handleKey); returnFocusRef.current?.focus(); };
  }, [alert, onClose, open]);

  if (!open) return null;
  return (
    <div className="dialog-backdrop" onMouseDown={(event) => { if (!alert && event.target === event.currentTarget) onClose(); }}>
      <div aria-describedby={description === undefined ? undefined : descriptionId} aria-labelledby={titleId} aria-modal="true" className="dialog-panel" ref={panelRef} role={alert ? "alertdialog" : "dialog"} tabIndex={-1}>
        <div className="dialog-panel__header"><h2 id={titleId}>{title}</h2>{alert ? null : <button aria-label={closeLabel} className="icon-button" onClick={onClose} type="button">×</button>}</div>
        {description === undefined ? null : <p id={descriptionId}>{description}</p>}
        {children}
      </div>
    </div>
  );
}
