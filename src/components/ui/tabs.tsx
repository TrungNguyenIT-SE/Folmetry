"use client";

import { useRef, type KeyboardEvent, type ReactNode } from "react";

export interface TabItem {
  readonly id: string;
  readonly label: string;
  readonly content: ReactNode;
}

export function Tabs({ items, activeId, onChange, label }: Readonly<{ items: readonly TabItem[]; activeId: string; onChange: (id: string) => void; label: string }>) {
  const buttons = useRef(new Map<string, HTMLButtonElement>());
  const move = (event: KeyboardEvent<HTMLButtonElement>, index: number): void => {
    const delta = event.key === "ArrowRight" ? 1 : event.key === "ArrowLeft" ? -1 : 0;
    if (delta === 0 && event.key !== "Home" && event.key !== "End") return;
    event.preventDefault();
    const nextIndex = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + delta + items.length) % items.length;
    const next = items[nextIndex];
    if (next !== undefined) {
      onChange(next.id);
      buttons.current.get(next.id)?.focus();
    }
  };
  const active = items.find((item) => item.id === activeId) ?? items[0];
  return (
    <div className="tabs">
      <div role="tablist" aria-label={label}>
        {items.map((item, index) => <button aria-controls={`${item.id}-panel`} aria-selected={item.id === active?.id} id={`${item.id}-tab`} key={item.id} onClick={() => onChange(item.id)} onKeyDown={(event) => move(event, index)} ref={(node) => { if (node === null) buttons.current.delete(item.id); else buttons.current.set(item.id, node); }} role="tab" tabIndex={item.id === active?.id ? 0 : -1} type="button">{item.label}</button>)}
      </div>
      {active === undefined ? null : <div aria-labelledby={`${active.id}-tab`} id={`${active.id}-panel`} role="tabpanel" tabIndex={0}>{active.content}</div>}
    </div>
  );
}
