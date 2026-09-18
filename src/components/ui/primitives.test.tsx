// @vitest-environment jsdom

import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { Badge, Button, Card, Dialog, Field, ProgressStatus, Tabs } from "@/components/ui";

describe("accessible UI primitives", () => {
  it("connects field labels, descriptions, and errors", () => {
    render(<Field label="Account label" description="Stored locally" error="Required" />);
    const input = screen.getByRole("textbox", { name: "Account label" });
    expect(input.getAttribute("aria-invalid")).toBe("true");
    expect(input.getAttribute("aria-describedby")).toContain("description");
    expect(input.getAttribute("aria-describedby")).toContain("error");
  });

  it("supports arrow-key tab navigation", () => {
    function Example() {
      const [active, setActive] = useState("one");
      return <Tabs label="Results" activeId={active} onChange={setActive} items={[{ id: "one", label: "One", content: "First" }, { id: "two", label: "Two", content: "Second" }]} />;
    }
    render(<Example />);
    const first = screen.getByRole("tab", { name: "One" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    expect(screen.getByRole("tab", { name: "Two" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tabpanel").textContent).toBe("Second");
  });

  it("traps dialog focus, closes on Escape, and returns focus", () => {
    const closed = vi.fn();
    function Example() {
      const [open, setOpen] = useState(false);
      return <><button type="button" onClick={() => setOpen(true)}>Open</button><Dialog open={open} title="Confirm" onClose={() => { closed(); setOpen(false); }}><button type="button">Cancel</button><button type="button">Delete</button></Dialog></>;
    }
    render(<Example />);
    const trigger = screen.getByRole("button", { name: "Open" });
    trigger.focus();
    fireEvent.click(trigger);
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Close dialog" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(closed).toHaveBeenCalledOnce();
    expect(document.activeElement).toBe(trigger);
  });

  it("uses text/symbol semantics in badges and native determinate progress", () => {
    render(<><Badge tone="success">Saved</Badge><ProgressStatus label="Importing" value={2} max={4} /></>);
    expect(screen.getByText("Saved").textContent).toBe("✓Saved");
    expect(screen.getByRole("progressbar", { name: "Importing" }).getAttribute("value")).toBe("2");
  });

  it("exposes quiet, icon-only, surface, and successful field states", () => {
    render(<>
      <Button aria-label="Settings" iconOnly variant="quiet">S</Button>
      <Card heading="Inset" surface="inset"><p>Content</p></Card>
      <Field label="Username" success="Available" />
    </>);
    expect(screen.getByRole("button", { name: "Settings" }).className).toContain("button--icon");
    expect(screen.getByRole("button", { name: "Settings" }).className).toContain("button--quiet");
    expect(screen.getByRole("heading", { name: "Inset" }).parentElement?.className).toContain("card--inset");
    expect(screen.getByRole("textbox", { name: "Username" }).getAttribute("aria-describedby")).toContain("success");
  });
});
