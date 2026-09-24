"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Dialog,
  ProgressStatus,
  StatusRegion,
} from "@/components/ui";
import { PageTransition } from "@/components/layout/page-transition";
import { ImportDomainError } from "@/features/analyzer/model/errors";
import type { LocalAccount, LocalSnapshot, SocialPlatform } from "@/features/analyzer/model/types";
import {
  PersistenceDomainError,
  type SaveSnapshotInput,
} from "@/features/analyzer/persistence";
import {
  createCloudAnalyzerServices,
  type AnalyzerServices,
} from "@/features/analyzer/services/analyzer-services";
import {
  getImportErrorMessage,
  getImportProgressMessage,
  getImportWarningMessage,
  getPersistenceErrorMessage,
  useI18n,
} from "@/i18n";

import { AccountPanel } from "./account-panel";
import { ImportPanel } from "./import-panel";
import { ResultsView } from "./results-view";
import {
  analyzerWorkflowReducer,
  INITIAL_ANALYZER_STATE,
  type AnalyzerWorkflowState,
  type ImportSourceSummary,
  type ReviewDraft,
  type WorkflowError,
} from "./state-machine";

export interface AnalyzerAppProps {
  readonly services?: AnalyzerServices;
  readonly platform?: SocialPlatform;
}

type DeleteMode = "account" | "all";

function WorkflowRail({
  workflow,
  platform,
}: Readonly<{ workflow: AnalyzerWorkflowState; platform: SocialPlatform }>) {
  const { dictionary } = useI18n();
  const copy = dictionary.analyzer.ux;
  const active = workflow.status === "NO_ACCOUNT"
    ? 0
    : workflow.status === "REVIEW_IMPORT" || workflow.status === "SAVING"
      ? 2
      : workflow.status === "RESULTS"
        ? 3
        : 1;
  const labels = [
    platform === "facebook" ? dictionary.analyzer.facebook.workflowAccount : copy.workflowAccount,
    copy.workflowImport,
    copy.workflowReview,
    copy.workflowResults,
  ];
  return (
    <nav aria-label={copy.workflowLabel} className="workflow-rail" data-active-step={active + 1} tabIndex={0}>
      <ol>
        {labels.map((label, index) => (
          <li aria-current={index === active ? "step" : undefined} className={index < active ? "is-complete" : ""} key={label}>
            <span aria-hidden="true">{index < active ? "✓" : index + 1}</span>
            <strong>{label}</strong>
          </li>
        ))}
      </ol>
    </nav>
  );
}

function localDateTimeValue(timestamp: number): string {
  const date = new Date(timestamp);
  const shifted = new Date(timestamp - date.getTimezoneOffset() * 60_000);
  return shifted.toISOString().slice(0, 16);
}

function inMemorySnapshot(input: SaveSnapshotInput): LocalSnapshot {
  return {
    ...input,
    id: `memory-${globalThis.crypto.randomUUID()}`,
    importedAt: Date.now(),
    ...(input.platform === "facebook"
      ? { friends: [...(input.friends ?? [])], friendCount: input.friends?.length ?? 0 }
      : {}),
    followers: [...input.followers],
    following: [...input.following],
    warnings: [...input.warnings],
    followerCount: input.followers.length,
    followingCount: input.following.length,
  };
}

export function AnalyzerApp({ services: providedServices, platform = "instagram" }: AnalyzerAppProps) {
  const { dictionary, formatNumber } = useI18n();
  const copy = dictionary.analyzer;
  const [workflow, dispatch] = useReducer(analyzerWorkflowReducer, INITIAL_ANALYZER_STATE);
  const servicesRef = useRef<AnalyzerServices | undefined>(undefined);
  const activeJobRef = useRef<string | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<readonly LocalAccount[]>([]);
  const [snapshots, setSnapshots] = useState<readonly LocalSnapshot[]>([]);
  const [current, setCurrent] = useState<LocalSnapshot>();
  const [baseline, setBaseline] = useState<LocalSnapshot>();
  const [accountError, setAccountError] = useState<string>();
  const [fileError, setFileError] = useState<string>();
  const [duplicate, setDuplicate] = useState<LocalSnapshot>();
  const [deleteMode, setDeleteMode] = useState<DeleteMode>();
  const selectedAccountId = "accountId" in workflow ? workflow.accountId : undefined;

  const presentAccount = async (
    api: AnalyzerServices,
    accountId: string,
    preferredSnapshotId?: string,
  ): Promise<void> => {
    const history = await api.listSnapshots(accountId);
    setSnapshots(history);
    const selected =
      history.find((snapshot) => snapshot.id === preferredSnapshotId) ?? history[0];
    if (selected === undefined) {
      setCurrent(undefined);
      setBaseline(undefined);
      dispatch({ type: "ACCOUNT_SELECTED", accountId });
      return;
    }
    const prior = history.find((snapshot) => snapshot.snapshotAt < selected.snapshotAt);
    setCurrent(selected);
    setBaseline(prior);
    dispatch({ type: "ACCOUNT_SELECTED", accountId, snapshotId: selected.id });
  };

  useEffect(() => {
    let active = true;
    let api: AnalyzerServices;
    try {
      if (providedServices !== undefined) {
        api = providedServices;
      } else {
        api = createCloudAnalyzerServices(platform);
      }
      servicesRef.current = api;
    } catch {
      queueMicrotask(() => {
        if (!active) return;
        setLoading(false);
        dispatch({
          type: "FAILED",
          error: { kind: "persistence", code: "INDEXEDDB_UNAVAILABLE" },
        });
      });
      return;
    }
    void api.listAccounts().then(async (allAccounts) => {
      if (!active) return;
      const loaded = allAccounts.filter((account) => account.platform === platform);
      setAccounts(loaded);
      if (loaded[0] === undefined) {
        dispatch({ type: "ACCOUNTS_EMPTY" });
      } else {
        await presentAccount(api, loaded[0].id);
      }
    }).catch(() => {
      if (active) dispatch({ type: "FAILED", error: { kind: "persistence", code: "INDEXEDDB_UNAVAILABLE" } });
    }).finally(() => {
      if (active) setLoading(false);
    });
    return () => {
      active = false;
      api.close();
      servicesRef.current = undefined;
    };
  }, [platform, providedServices]);

  const refreshAccounts = async (api: AnalyzerServices): Promise<readonly LocalAccount[]> => {
    const loaded = (await api.listAccounts()).filter((account) => account.platform === platform);
    setAccounts(loaded);
    return loaded;
  };

  const selectAccount = (accountId: string): void => {
    const api = servicesRef.current;
    if (api === undefined) return;
    activeJobRef.current = undefined;
    api.cancelImport();
    setFileError(undefined);
    setDuplicate(undefined);
    void presentAccount(api, accountId).catch((error: unknown) => {
      const domain = error instanceof PersistenceDomainError ? error : new PersistenceDomainError("UNKNOWN_PERSISTENCE_ERROR");
      dispatch({ type: "FAILED", accountId, error: { kind: "persistence", code: domain.code } });
    });
  };

  const createAccount = async (label: string, username: string): Promise<void> => {
    const api = servicesRef.current;
    if (api === undefined) return;
    setAccountError(undefined);
    try {
      const created = await api.createAccount({ platform, label, ...(username.trim() === "" ? {} : { username }) });
      await refreshAccounts(api);
      await presentAccount(api, created.id);
    } catch (error) {
      const domain = error instanceof PersistenceDomainError ? error : new PersistenceDomainError("UNKNOWN_PERSISTENCE_ERROR");
      setAccountError(getPersistenceErrorMessage(dictionary, domain.code));
    }
  };

  const updateAccount = async (label: string, username: string): Promise<void> => {
    const api = servicesRef.current;
    if (api === undefined || selectedAccountId === undefined) return;
    setAccountError(undefined);
    try {
      await api.updateAccount(selectedAccountId, { label, username: username.trim() === "" ? null : username });
      await refreshAccounts(api);
    } catch (error) {
      const domain = error instanceof PersistenceDomainError ? error : new PersistenceDomainError("UNKNOWN_PERSISTENCE_ERROR");
      setAccountError(getPersistenceErrorMessage(dictionary, domain.code));
    }
  };

  const importFiles = async (
    source: ImportSourceSummary,
    operation: (api: AnalyzerServices, jobId: string) => ReturnType<AnalyzerServices["parseArchive"]>,
  ): Promise<void> => {
    const api = servicesRef.current;
    if (api === undefined || selectedAccountId === undefined) return;
    setFileError(undefined);
    setDuplicate(undefined);
    const jobId = globalThis.crypto.randomUUID();
    activeJobRef.current = jobId;
    dispatch({ type: "IMPORT_STARTED", accountId: selectedAccountId, jobId });
    try {
      const result = await operation(api, jobId);
      if (activeJobRef.current !== jobId) return;
      if (result.payload.platform !== platform) {
        throw new ImportDomainError(
          platform === "facebook" ? "UNSUPPORTED_FACEBOOK_SCHEMA" : "UNSUPPORTED_INSTAGRAM_SCHEMA",
          { reason: "platform-mismatch" },
        );
      }
      activeJobRef.current = undefined;
      const suggested = Number.isSafeInteger(source.lastModified) && source.lastModified > 0
        ? source.lastModified
        : Date.now();
      dispatch({
        type: "IMPORT_SUCCEEDED",
        jobId,
        draft: { result, source, snapshotAt: suggested },
      });
    } catch (error) {
      if (activeJobRef.current !== jobId) return;
      activeJobRef.current = undefined;
      if (error instanceof ImportDomainError && error.code === "IMPORT_CANCELLED") {
        dispatch({ type: "CANCEL" });
        return;
      }
      const domain = error instanceof ImportDomainError ? error : new ImportDomainError("UNKNOWN_IMPORT_ERROR");
      dispatch({
        type: "FAILED",
        accountId: selectedAccountId,
        error: { kind: "import", code: domain.code },
      });
    }
  };

  const importArchive = (file: File): void => {
    if (!file.name.toLowerCase().endsWith(".zip")) {
      setFileError(copy.ux.invalidFile);
      return;
    }
    void importFiles(
      { name: file.name, size: file.size, lastModified: file.lastModified, mode: "archive" },
      (api, jobId) => api.parseArchive(file, jobId, (progress) => dispatch({
        type: "IMPORT_PROGRESS",
        jobId: progress.jobId,
        stage: progress.stage,
        completed: progress.completed,
        total: progress.total,
      })),
    );
  };

  const importManualFiles = (files: readonly File[]): void => {
    if (files.length === 0 || files.some((file) => !file.name.toLowerCase().endsWith(".json"))) {
      setFileError(copy.ux.invalidFile);
      return;
    }
    void importFiles(
      {
        name: files.map((file) => file.name).join(", "),
        size: files.reduce((total, file) => total + file.size, 0),
        lastModified: Math.max(...files.map((file) => file.lastModified)),
        mode: "manual",
      },
      (api, jobId) => api.parseFiles(files, jobId, (progress) => dispatch({
        type: "IMPORT_PROGRESS",
        jobId: progress.jobId,
        stage: progress.stage,
        completed: progress.completed,
        total: progress.total,
      })),
    );
  };

  const cancelImport = (): void => {
    activeJobRef.current = undefined;
    servicesRef.current?.cancelImport();
    dispatch({ type: "CANCEL" });
  };

  const saveDraft = async (draft: ReviewDraft): Promise<void> => {
    const api = servicesRef.current;
    if (api === undefined || selectedAccountId === undefined) return;
    const existing = snapshots.find((snapshot) => snapshot.fingerprint === draft.result.fingerprint);
    if (existing !== undefined) {
      setDuplicate(existing);
      return;
    }
    dispatch({ type: "SAVE_STARTED" });
    const payload = draft.result.payload;
    const input: SaveSnapshotInput = {
      accountId: selectedAccountId,
      platform: payload.platform,
      snapshotAt: draft.snapshotAt,
      fingerprint: draft.result.fingerprint,
      parserVersion: payload.parserVersion,
      ...(platform === "facebook" ? { friends: payload.friends ?? [] } : {}),
      followers: payload.followers,
      following: payload.following,
      warnings: payload.warnings,
      sourceFileName: draft.source.name,
      sourceFileSize: draft.source.size,
    };
    const result = await api.saveSnapshot(input);
    if (result.status === "duplicate") {
      setDuplicate(result.existing);
      dispatch({ type: "CANCEL" });
      return;
    }
    if (result.status === "not-saved") {
      const memory = inMemorySnapshot(input);
      const prior = snapshots.find((snapshot) => snapshot.snapshotAt < draft.snapshotAt);
      setCurrent(memory);
      setBaseline(prior);
      dispatch({ type: "SAVE_SUCCEEDED", snapshotId: memory.id, saved: false });
      return;
    }
    await presentAccount(api, selectedAccountId, result.snapshot.id);
  };

  const deleteSnapshot = async (snapshotId: string): Promise<void> => {
    const api = servicesRef.current;
    if (api === undefined || selectedAccountId === undefined) return;
    try {
      await api.deleteSnapshot(selectedAccountId, snapshotId);
      await presentAccount(api, selectedAccountId);
    } catch (error) {
      const domain = error instanceof PersistenceDomainError ? error : new PersistenceDomainError("UNKNOWN_PERSISTENCE_ERROR");
      dispatch({ type: "FAILED", accountId: selectedAccountId, error: { kind: "persistence", code: domain.code } });
    }
  };

  const confirmDelete = async (): Promise<void> => {
    const api = servicesRef.current;
    if (api === undefined || deleteMode === undefined) return;
    if (deleteMode === "account" && selectedAccountId !== undefined) {
      await api.deleteAccount(selectedAccountId);
      const remaining = await refreshAccounts(api);
      if (remaining[0] === undefined) {
        setSnapshots([]);
        setCurrent(undefined);
        setBaseline(undefined);
        dispatch({ type: "ACCOUNTS_EMPTY" });
      } else {
        await presentAccount(api, remaining[0].id);
      }
    } else if (deleteMode === "all") {
      await api.deleteAll();
      setAccounts([]);
      setSnapshots([]);
      setCurrent(undefined);
      setBaseline(undefined);
      dispatch({ type: "ACCOUNTS_EMPTY" });
    }
    setDeleteMode(undefined);
  };

  const errorAction = (error: WorkflowError): string => {
    if (error.kind === "persistence") return copy.ux.errorStorageAction;
    switch (error.code) {
      case "UNSUPPORTED_HTML_EXPORT":
        return copy.ux.errorHtmlAction;
      case "INCOMPLETE_MULTIPART_FOLLOWERS":
        return copy.ux.errorMultipartAction;
      case "RELEVANT_DATA_TOO_LARGE":
      case "RELATIONSHIP_LIMIT_EXCEEDED":
        return copy.ux.errorMemoryAction;
      case "ARCHIVE_ENCRYPTED":
        return copy.ux.errorEncryptedAction;
      default:
        return copy.ux.errorDefaultAction;
    }
  };

  const errorMessage = (error: WorkflowError): string =>
    error.kind === "import"
      ? getImportErrorMessage(dictionary, error.code as Parameters<typeof getImportErrorMessage>[1])
      : getPersistenceErrorMessage(dictionary, error.code as Parameters<typeof getPersistenceErrorMessage>[1]);

  if (loading) {
    return (
      <PageTransition>
        <main className="page-shell page-shell--analyzer" data-workflow-state="loading" id="main-content">
          <StatusRegion>{copy.ux.loading}</StatusRegion>
        </main>
      </PageTransition>
    );
  }

  return (
    <PageTransition>
    <main className="page-shell page-shell--analyzer" data-workflow-state={workflow.status.toLowerCase().replaceAll("_", "-")} id="main-content">
      <div className="analyzer-app">
      <header className="analyzer-heading">
        <span className="eyebrow">{(platform === "facebook" ? dictionary.pages.facebookAnalyzer : dictionary.pages.analyzer).eyebrow}</span>
        <h1>{(platform === "facebook" ? dictionary.pages.facebookAnalyzer : dictionary.pages.analyzer).title}</h1>
        <p>{(platform === "facebook" ? dictionary.pages.facebookAnalyzer : dictionary.pages.analyzer).description}</p>
        <p className="privacy-note">{(platform === "facebook" ? dictionary.pages.facebookAnalyzer : dictionary.pages.analyzer).notice}</p>
      </header>

      <WorkflowRail platform={platform} workflow={workflow} />

      <AccountPanel
        key={selectedAccountId ?? "no-account"}
        accounts={accounts}
        error={accountError}
        onCreate={createAccount}
        onSelect={selectAccount}
        onUpdate={updateAccount}
        platform={platform}
        selectedId={selectedAccountId}
      />

      {selectedAccountId === undefined ? null : (
        <>
          {workflow.status === "READY_TO_IMPORT" || workflow.status === "RESULTS" ? (
            <ImportPanel error={fileError} onArchive={importArchive} onManualFiles={importManualFiles} platform={platform} />
          ) : null}

          {workflow.status === "VALIDATING" || workflow.status === "PARSING" ? (
            <Card className="processing-card" heading={copy.ux.processing}>
              <ProgressStatus
                label={getImportProgressMessage(dictionary, workflow.stage)}
                max={workflow.total}
                value={workflow.total > 1 ? workflow.completed : undefined}
              />
              {workflow.total > 1 ? <p>{copy.ux.processed}: {formatNumber(workflow.completed)} / {formatNumber(workflow.total)}</p> : null}
              <Button onClick={cancelImport} type="button" variant="secondary">{copy.import.cancel}</Button>
            </Card>
          ) : null}

          {workflow.status === "REVIEW_IMPORT" || workflow.status === "SAVING" ? (
            <Card className="review-card" heading={copy.review.title}>
              <dl className="review-grid">
                <div><dt>{copy.ux.reviewAccount}</dt><dd>{accounts.find((account) => account.id === selectedAccountId)?.label}</dd></div>
                <div><dt>{copy.ux.source}</dt><dd>{workflow.draft.source.name}</dd></div>
                <div><dt>{copy.ux.fileSize}</dt><dd>{formatNumber(workflow.draft.source.size)} {copy.ux.bytes}</dd></div>
                {platform === "facebook" ? <div><dt>{copy.facebook.detectedConnections}</dt><dd>{formatNumber(workflow.draft.result.payload.friends?.length ?? 0)}</dd></div> : null}
                <div><dt>{platform === "facebook" ? copy.facebook.detectedFollowers : copy.ux.detectedFollowers}</dt><dd>{formatNumber(workflow.draft.result.payload.followers.length)}</dd></div>
                <div><dt>{platform === "facebook" ? copy.facebook.detectedFollowing : copy.ux.detectedFollowing}</dt><dd>{formatNumber(workflow.draft.result.payload.following.length)}</dd></div>
              </dl>
              <div className="field">
                <label htmlFor="snapshot-date">{copy.review.snapshotDate}</label>
                <input
                  disabled={workflow.status === "SAVING"}
                  id="snapshot-date"
                  onChange={(event) => {
                    const next = new Date(event.currentTarget.value).getTime();
                    if (Number.isSafeInteger(next) && next >= 0) dispatch({ type: "REVIEW_DATE_CHANGED", snapshotAt: next });
                  }}
                  type="datetime-local"
                  value={localDateTimeValue(workflow.draft.snapshotAt)}
                />
              </div>
              <section className="warning-list" aria-label={copy.ux.parserWarnings}>
                <h3>{copy.ux.parserWarnings}</h3>
                {workflow.draft.result.payload.warnings.length === 0 ? <p>{copy.ux.noWarnings}</p> : (
                  <ul>{workflow.draft.result.payload.warnings.map((warning) => <li key={`${warning.code}-${warning.relationshipKind ?? "all"}`}><Badge tone="warning">{getImportWarningMessage(dictionary, warning.code)} ({warning.count})</Badge></li>)}</ul>
                )}
              </section>
              <p className="privacy-note">{copy.ux.retention}</p>
              <p className="muted-copy">{platform === "facebook" ? copy.facebook.accuracy : copy.ux.accuracy}</p>
              {workflow.status === "SAVING" ? <StatusRegion>{copy.ux.saving}</StatusRegion> : (
                <div className="button-row">
                  <Button onClick={() => void saveDraft(workflow.draft)} type="button">{copy.review.save}</Button>
                  <Button onClick={() => dispatch({ type: "CANCEL" })} type="button" variant="secondary">{copy.review.cancel}</Button>
                </div>
              )}
            </Card>
          ) : null}

          {workflow.status === "RESULTS" && current !== undefined ? (
            <ResultsView
              baseline={baseline}
              current={current}
              onDeleteSnapshot={deleteSnapshot}
              onSelectSnapshot={(snapshotId) => {
                const api = servicesRef.current;
                if (api !== undefined) void presentAccount(api, selectedAccountId, snapshotId);
              }}
              saved={workflow.saved}
              snapshots={snapshots}
              platform={platform}
            />
          ) : null}

          {workflow.status === "ERROR" ? (
            <Card className="error-card" heading={copy.ux.errorTitle}>
              <h3>{copy.ux.errorCause}</h3>
              <StatusRegion assertive>{errorMessage(workflow.error)}</StatusRegion>
              <h3>{copy.ux.errorAction}</h3>
              <p>{errorAction(workflow.error)}</p>
              <details>
                <summary>{copy.ux.diagnostic}</summary>
                <p>{copy.ux.diagnosticHelp}</p>
                <pre>{JSON.stringify({ code: workflow.error.code, ...(workflow.error.diagnostics ?? {}) }, null, 2)}</pre>
              </details>
              <Button onClick={() => dispatch({ type: "RESET" })} type="button">{copy.ux.retryImport}</Button>
            </Card>
          ) : null}

          <div className="danger-zone">
            <Card heading={copy.ux.dataControls}>
              <div className="button-row">
                <Button onClick={() => setDeleteMode("account")} type="button" variant="danger">{copy.ux.deleteAccount}</Button>
                <Button onClick={() => setDeleteMode("all")} type="button" variant="danger">{platform === "facebook" ? copy.facebook.deleteAll : copy.ux.deleteAll}</Button>
              </div>
            </Card>
          </div>
        </>
      )}

      <Dialog
        alert
        description={copy.review.duplicate}
        onClose={() => setDuplicate(undefined)}
        open={duplicate !== undefined}
        title={copy.ux.duplicateTitle}
      >
        <p>{platform === "facebook" ? copy.facebook.duplicateBody : copy.ux.duplicateBody}</p>
        <div className="button-row">
          <Button onClick={() => {
            const api = servicesRef.current;
            if (duplicate !== undefined && api !== undefined) {
              void presentAccount(api, duplicate.accountId, duplicate.id);
            }
            setDuplicate(undefined);
          }} type="button">{copy.ux.viewExisting}</Button>
          <Button onClick={() => setDuplicate(undefined)} type="button" variant="secondary">{copy.review.cancel}</Button>
        </div>
      </Dialog>

      <Dialog
        alert
        description={deleteMode === "all"
          ? platform === "facebook" ? copy.facebook.allDeleteBody : copy.delete.allBody
          : platform === "facebook" ? copy.facebook.accountDeleteBody : copy.delete.accountBody}
        onClose={() => setDeleteMode(undefined)}
        open={deleteMode !== undefined}
        title={deleteMode === "all"
          ? platform === "facebook" ? copy.facebook.allDeleteTitle : copy.delete.allTitle
          : platform === "facebook" ? copy.facebook.accountDeleteTitle : copy.delete.accountTitle}
      >
        <div className="button-row">
          <Button onClick={() => void confirmDelete()} type="button" variant="danger">{copy.delete.confirm}</Button>
          <Button onClick={() => setDeleteMode(undefined)} type="button" variant="secondary">{copy.delete.cancel}</Button>
        </div>
      </Dialog>
      </div>
    </main>
    </PageTransition>
  );
}
