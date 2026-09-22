"use client";

import { ViewTransition, type ReactNode } from "react";

export function PageTransition({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <ViewTransition
      default="none"
      enter={{
        "nav-forward": "atlas-forward",
        "nav-back": "atlas-back",
        "nav-context": "atlas-context",
        default: "none",
      }}
      exit={{
        "nav-forward": "atlas-forward",
        "nav-back": "atlas-back",
        "nav-context": "atlas-context",
        default: "none",
      }}
    >
      {children}
    </ViewTransition>
  );
}
