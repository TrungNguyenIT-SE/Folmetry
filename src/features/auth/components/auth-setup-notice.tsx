"use client";

import { Card } from "@/components/ui";
import { useI18n } from "@/i18n";

export function AuthSetupNotice({ missing }: Readonly<{ missing: readonly string[] }>) {
  const { dictionary } = useI18n();
  const copy = dictionary.auth.setup;
  return (
    <Card heading={copy.title}>
      <p>{copy.body}</p>
      <p className="muted-copy">{copy.action}</p>
      <code>{missing.join(", ")}</code>
    </Card>
  );
}
