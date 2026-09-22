"use client";

import { useState, type FormEvent } from "react";

import { Button, Card, Field, SelectField, StatusRegion } from "@/components/ui";
import type { LocalAccount } from "@/features/analyzer/model/types";
import { useI18n } from "@/i18n";

export interface AccountPanelProps {
  readonly accounts: readonly LocalAccount[];
  readonly selectedId?: string;
  readonly error?: string;
  readonly onSelect: (accountId: string) => void;
  readonly onCreate: (label: string, username: string) => Promise<void>;
  readonly onUpdate: (label: string, username: string) => Promise<void>;
}

export function AccountPanel({
  accounts,
  selectedId,
  error,
  onSelect,
  onCreate,
  onUpdate,
}: AccountPanelProps) {
  const { dictionary } = useI18n();
  const copy = dictionary.analyzer;
  const selected = accounts.find((account) => account.id === selectedId);
  const [label, setLabel] = useState(selected?.label ?? "");
  const [username, setUsername] = useState(selected?.username ?? "");
  const [editing, setEditing] = useState(false);
  const [creating, setCreating] = useState(accounts.length === 0);
  const [pending, setPending] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      if (editing) {
        await onUpdate(label, username);
        setEditing(false);
      } else {
        await onCreate(label, username);
        setLabel("");
        setUsername("");
        setCreating(false);
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <Card className="account-card" heading={copy.account.title}>
      <p>{copy.ux.accountIntro}</p>
      <p className="muted-copy">{copy.ux.accountPrivacy}</p>
      {accounts.length === 0 ? (
        <p>{copy.ux.noAccounts}</p>
      ) : (
        <div className="account-toolbar">
          <SelectField
            label={copy.account.select}
            onChange={(event) => onSelect(event.currentTarget.value)}
            value={selectedId ?? ""}
          >
            {accounts.map((account) => (
              <option key={account.id} value={account.id}>
                {account.label}{account.username === undefined ? "" : ` (@${account.username})`}
              </option>
            ))}
          </SelectField>
          {selected === undefined ? null : (
            <Button onClick={() => { setLabel(selected.label); setUsername(selected.username ?? ""); setCreating(false); setEditing(true); }} type="button" variant="secondary">
              {copy.account.edit}
            </Button>
          )}
          <Button onClick={() => { setEditing(false); setCreating(true); setLabel(""); setUsername(""); }} type="button" variant="secondary">
            {copy.ux.createAnother}
          </Button>
        </div>
      )}

      {creating || editing ? (
        <form className="stack-form" onSubmit={(event) => void submit(event)}>
          <Field
            autoComplete="off"
            description={copy.ux.labelHint}
            label={copy.account.label}
            maxLength={80}
            onChange={(event) => setLabel(event.currentTarget.value)}
            required
            value={label}
          />
          <Field
            autoComplete="off"
            description={copy.ux.usernameHint}
            label={copy.account.username}
            onChange={(event) => setUsername(event.currentTarget.value)}
            value={username}
          />
          <div className="button-row">
            <Button disabled={pending} type="submit">
              {editing ? copy.ux.saveChanges : copy.account.create}
            </Button>
            {accounts.length === 0 ? null : (
              <Button onClick={() => { setCreating(false); setEditing(false); }} type="button" variant="secondary">
                {copy.review.cancel}
              </Button>
            )}
          </div>
        </form>
      ) : null}
      {error === undefined ? null : <StatusRegion assertive>{error}</StatusRegion>}
    </Card>
  );
}
