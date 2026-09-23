"use client";

import { useMemo, useState } from "react";

import {
  Badge,
  Button,
  Card,
  Dialog,
  EmptyState,
  Field,
  SelectField,
  StatusRegion,
  Tabs,
} from "@/components/ui";
import { analyzeCurrentRelationships, computeHistoricalDiff } from "@/features/analyzer/diff";
import { createRelationshipCsv, downloadCsv, safeCsvFilename } from "@/features/analyzer/export";
import type {
  HistoricalDiffResult,
  LocalSnapshot,
  PossibleHandleRename,
  RelationshipRecord,
  RelationshipSort,
  SocialPlatform,
} from "@/features/analyzer/model/types";
import { getImportWarningMessage, useI18n } from "@/i18n";

import { instagramProfileUrl, relationshipPage } from "./result-list-model";

interface RelationshipListProps {
  readonly records: readonly RelationshipRecord[];
  readonly label: string;
  readonly platform: SocialPlatform;
}

function RelationshipList({ records, label, platform }: RelationshipListProps) {
  const { dictionary, formatDate, formatNumber } = useI18n();
  const copy = dictionary.analyzer.ux;
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<RelationshipSort>("handle-asc");
  const [page, setPage] = useState(1);
  const [copied, setCopied] = useState<string>();
  const model = useMemo(
    () => relationshipPage(records, query, sort, page),
    [page, query, records, sort],
  );

  const copyHandle = async (record: RelationshipRecord): Promise<void> => {
    try {
      await navigator.clipboard.writeText(platform === "instagram" ? `@${record.normalizedHandle}` : record.handle);
      setCopied(record.normalizedHandle);
    } catch {
      setCopied(undefined);
    }
  };

  return (
    <section className="result-list" aria-label={label}>
      <div className="list-controls">
        <Field
          label={platform === "facebook" ? dictionary.analyzer.facebook.search : copy.search}
          onChange={(event) => { setPage(1); setQuery(event.currentTarget.value); }}
          type="search"
          value={query}
        />
        <SelectField
          label={copy.sort}
          onChange={(event) => { setPage(1); setSort(event.currentTarget.value as RelationshipSort); }}
          value={sort}
        >
          <option value="handle-asc">{copy.sortAz}</option>
          <option value="handle-desc">{copy.sortZa}</option>
          <option value="connected-newest">{copy.sortNewest}</option>
          <option value="connected-oldest">{copy.sortOldest}</option>
        </SelectField>
        {query.length === 0 ? null : (
          <Button onClick={() => setQuery("")} type="button" variant="secondary">
            {copy.clearSearch}
          </Button>
        )}
      </div>
      <p className="list-count">{formatNumber(model.filteredCount)} {copy.resultCount}</p>
      {model.items.length === 0 ? (
        <EmptyState description={copy.emptyList} title={label} />
      ) : (
        <ul className="relationship-list">
          {model.items.map((record, index) => (
            <li key={`${record.normalizedHandle}-${record.connectedAt ?? "unknown"}-${index}`}>
              <div>
                <strong>{platform === "instagram" ? `@${record.handle}` : record.handle}</strong>
                <span className="muted-copy">
                  {record.connectedAt === undefined
                    ? copy.connectedUnknown
                    : formatDate(record.connectedAt)}
                </span>
              </div>
              <div className="row-actions">
                <Button onClick={() => void copyHandle(record)} type="button" variant="secondary">
                  {platform === "facebook" ? dictionary.analyzer.facebook.copyName : copy.copyHandle}
                </Button>
                {platform === "instagram" ? <a
                  className="button button--secondary"
                  href={instagramProfileUrl(record.normalizedHandle)}
                  rel="noopener noreferrer"
                  target="_blank"
                >
                  {copy.openProfile}
                </a> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
      <StatusRegion>{copied === undefined ? null : platform === "facebook"
        ? `${dictionary.analyzer.facebook.copiedName}: ${copied}`
        : `${copy.copiedHandle}: @${copied}`}</StatusRegion>
      {model.pageCount <= 1 ? null : (
        <nav aria-label={`${label} pagination`} className="pagination">
          <Button disabled={model.page === 1} onClick={() => setPage(model.page - 1)} type="button" variant="secondary">
            {copy.previousPage}
          </Button>
          <span>{copy.page} {formatNumber(model.page)} / {formatNumber(model.pageCount)}</span>
          <Button disabled={model.page === model.pageCount} onClick={() => setPage(model.page + 1)} type="button" variant="secondary">
            {copy.nextPage}
          </Button>
        </nav>
      )}
    </section>
  );
}

interface PossibleRenameListProps {
  readonly records: readonly PossibleHandleRename[];
  readonly label: string;
  readonly platform: SocialPlatform;
}

function PossibleRenameList({ records, label, platform }: PossibleRenameListProps) {
  const { dictionary, formatDate, formatNumber } = useI18n();
  const copy = dictionary.analyzer.ux;

  return (
    <section className="result-list" aria-label={label}>
      <p className="privacy-note">{platform === "facebook" ? dictionary.analyzer.facebook.renameCaveat : copy.renameCaveat}</p>
      <p className="list-count">{formatNumber(records.length)} {copy.resultCount}</p>
      {records.length === 0 ? (
        <EmptyState description={copy.emptyList} title={label} />
      ) : (
        <ul className="relationship-list possible-rename-list">
          {records.map((record) => (
            <li key={`${record.previous.normalizedHandle}-${record.current.normalizedHandle}`}>
              <div className="possible-rename-list__handles">
                <span><small>{platform === "facebook" ? dictionary.analyzer.facebook.previousName : copy.previousHandle}</small><strong>{platform === "instagram" ? `@${record.previous.handle}` : record.previous.handle}</strong></span>
                <span aria-hidden="true" className="possible-rename-list__arrow">→</span>
                <span><small>{platform === "facebook" ? dictionary.analyzer.facebook.currentName : copy.currentHandle}</small><strong>{platform === "instagram" ? `@${record.current.handle}` : record.current.handle}</strong></span>
              </div>
              <span className="muted-copy">{formatDate(record.connectedAt)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface SummaryCardProps {
  readonly label: string;
  readonly value: number;
  readonly delta?: boolean;
}

function SummaryCard({ label, value, delta = false }: SummaryCardProps) {
  const { formatNumber } = useI18n();
  const prefix = delta && value > 0 ? "+" : "";
  return (
    <article className="summary-card" data-delta={delta ? (value > 0 ? "positive" : value < 0 ? "negative" : "neutral") : undefined}>
      <span>{label}</span>
      <strong>{prefix}{formatNumber(value)}</strong>
    </article>
  );
}

interface HistoryViewProps {
  readonly snapshots: readonly LocalSnapshot[];
  readonly current: LocalSnapshot;
  readonly onSelect: (snapshotId: string) => void;
  readonly onDelete: (snapshot: LocalSnapshot) => void;
  readonly platform: SocialPlatform;
}

function HistoryView({ snapshots, current, onSelect, onDelete, platform }: HistoryViewProps) {
  const { dictionary, formatDate, formatNumber } = useI18n();
  const copy = dictionary.analyzer.ux;
  const resultCopy = platform === "facebook"
    ? {
        followers: dictionary.analyzer.facebook.followers,
        following: dictionary.analyzer.facebook.following,
        lost: dictionary.analyzer.facebook.lostFollowers,
        added: dictionary.analyzer.facebook.newFollowers,
        renamed: dictionary.analyzer.facebook.possibleFollowerNameChanges,
        net: dictionary.analyzer.facebook.netChange,
      }
    : {
        followers: dictionary.analyzer.results.followers,
        following: dictionary.analyzer.results.following,
        lost: dictionary.analyzer.results.lostFollowers,
        added: dictionary.analyzer.results.newFollowers,
        renamed: dictionary.analyzer.results.possibleUsernameChanges,
        net: dictionary.analyzer.results.netChange,
      };
  const [olderId, setOlderId] = useState(snapshots.at(-1)?.id ?? "");
  const [newerId, setNewerId] = useState(snapshots[0]?.id ?? "");
  const [comparison, setComparison] = useState<{
    readonly older: LocalSnapshot;
    readonly newer: LocalSnapshot;
    readonly diff: HistoricalDiffResult;
  }>();
  const [compareError, setCompareError] = useState<string>();

  const compare = (): void => {
    const first = snapshots.find((snapshot) => snapshot.id === olderId);
    const second = snapshots.find((snapshot) => snapshot.id === newerId);
    if (first === undefined || second === undefined || first.id === second.id) {
      setComparison(undefined);
      setCompareError(copy.compareDistinct);
      return;
    }
    const [older, newer] = first.snapshotAt <= second.snapshotAt ? [first, second] : [second, first];
    const diff = computeHistoricalDiff(older, newer);
    if (diff !== undefined) {
      setComparison({ older, newer, diff });
      setCompareError(undefined);
    }
  };

  return (
    <div className="history-view">
      {snapshots.length <= 1 ? <p>{dictionary.analyzer.history.empty}</p> : null}
      <ul className="snapshot-list">
        {snapshots.map((snapshot, index) => {
          const prior = snapshots[index + 1];
          const delta = prior === undefined ? undefined : snapshot.followerCount - prior.followerCount;
          return (
            <li key={snapshot.id} className={snapshot.id === current.id ? "snapshot-list__current" : ""}>
              <div>
                <strong>{formatDate(snapshot.snapshotAt)}</strong>
                {snapshot.id === current.id ? <Badge tone="success">{copy.current}</Badge> : null}
                {platform === "facebook" ? <span>{dictionary.analyzer.facebook.connections}: {formatNumber(snapshot.friendCount ?? snapshot.friends?.length ?? 0)}</span> : null}
                <span>{resultCopy.followers}: {formatNumber(snapshot.followerCount)}</span>
                <span>{resultCopy.following}: {formatNumber(snapshot.followingCount)}</span>
                {delta === undefined ? null : <span>{resultCopy.net}: {delta > 0 ? "+" : ""}{formatNumber(delta)}</span>}
                {snapshot.warnings.length === 0 ? null : <Badge tone="warning">{formatNumber(snapshot.warnings.length)} {copy.warnings}</Badge>}
              </div>
              <div className="row-actions">
                <Button onClick={() => onSelect(snapshot.id)} type="button" variant="secondary">
                  {copy.snapshot}
                </Button>
                <Button onClick={() => onDelete(snapshot)} type="button" variant="danger">
                  {copy.deleteSnapshot}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {snapshots.length < 2 ? null : (
        <Card heading={copy.compareTitle}>
          <div className="compare-controls">
            <SelectField label={copy.compareOlder} onChange={(event) => setOlderId(event.currentTarget.value)} value={olderId}>
              {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{formatDate(snapshot.snapshotAt)}</option>)}
            </SelectField>
            <SelectField label={copy.compareNewer} onChange={(event) => setNewerId(event.currentTarget.value)} value={newerId}>
              {snapshots.map((snapshot) => <option key={snapshot.id} value={snapshot.id}>{formatDate(snapshot.snapshotAt)}</option>)}
            </SelectField>
            <Button onClick={compare} type="button">{copy.compareAction}</Button>
          </div>
          {compareError === undefined ? null : <StatusRegion assertive>{compareError}</StatusRegion>}
          {comparison === undefined ? null : (
            <div className="manual-comparison">
              <p><strong>{copy.compareRange}:</strong> {formatDate(comparison.older.snapshotAt)} - {formatDate(comparison.newer.snapshotAt)}</p>
              <div className="summary-grid">
                <SummaryCard label={resultCopy.lost} value={comparison.diff.lostFollowers.length} />
                <SummaryCard label={resultCopy.added} value={comparison.diff.newFollowers.length} />
                <SummaryCard label={resultCopy.renamed} value={comparison.diff.possibleFollowerRenames.length} />
                <SummaryCard delta label={resultCopy.net} value={comparison.diff.netFollowerChange} />
              </div>
              <p className="privacy-note">{platform === "facebook" ? dictionary.analyzer.facebook.followerCaveat : copy.lostCaveat}</p>
              {comparison.diff.possibleFollowerRenames.length === 0 ? null : <p className="privacy-note">{platform === "facebook" ? dictionary.analyzer.facebook.renameCaveat : copy.renameCaveat}</p>}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

export interface ResultsViewProps {
  readonly current: LocalSnapshot;
  readonly baseline?: LocalSnapshot;
  readonly snapshots: readonly LocalSnapshot[];
  readonly saved: boolean;
  readonly onSelectSnapshot: (snapshotId: string) => void;
  readonly onDeleteSnapshot: (snapshotId: string) => Promise<void>;
  readonly platform?: SocialPlatform;
}

export function ResultsView({
  current,
  baseline,
  snapshots,
  saved,
  onSelectSnapshot,
  onDeleteSnapshot,
  platform = current.platform,
}: ResultsViewProps) {
  const { dictionary } = useI18n();
  const copy = dictionary.analyzer;
  const resultCopy = platform === "facebook"
    ? {
        followers: copy.facebook.followers,
        following: copy.facebook.following,
        lost: copy.facebook.lostFollowers,
        added: copy.facebook.newFollowers,
        renamed: copy.facebook.possibleFollowerNameChanges,
        net: copy.facebook.netChange,
      }
    : {
        followers: copy.results.followers,
        following: copy.results.following,
        lost: copy.results.lostFollowers,
        added: copy.results.newFollowers,
        renamed: copy.results.possibleUsernameChanges,
        net: copy.results.netChange,
      };
  const currentAnalysis = useMemo(
    () => analyzeCurrentRelationships(current.followers, current.following),
    [current.followers, current.following],
  );
  const historical = useMemo(
    () => computeHistoricalDiff(baseline, current),
    [baseline, current],
  );
  const friendHistorical = useMemo(
    () => platform === "facebook"
      ? computeHistoricalDiff(
          baseline === undefined
            ? undefined
            : { followers: baseline.friends ?? [], following: [] },
          { followers: current.friends ?? [], following: [] },
          "handle-asc",
          true,
        )
      : undefined,
    [baseline, current.friends, platform],
  );
  const [activeTab, setActiveTab] = useState("overview");
  const [deleteTarget, setDeleteTarget] = useState<LocalSnapshot>();
  const [deleting, setDeleting] = useState(false);

  const exportCsv = (): void => {
    const categories: ReadonlyArray<readonly [string, readonly RelationshipRecord[]]> = [
      ...(platform === "facebook"
        ? [
            [copy.facebook.connections, current.friends ?? []] as const,
            [resultCopy.followers, current.followers] as const,
            [resultCopy.following, current.following] as const,
          ]
        : [
            [copy.results.mutuals, currentAnalysis.mutuals] as const,
            [copy.results.notFollowingBack, currentAnalysis.notFollowingBack] as const,
            [copy.results.notFollowedByMe, currentAnalysis.notFollowedByMe] as const,
          ]),
      ...(historical === undefined
        ? []
        : [
            [resultCopy.lost, historical.lostFollowers] as const,
            [resultCopy.added, historical.newFollowers] as const,
          ]),
    ];
    const csv = createRelationshipCsv(
      categories.flatMap(([category, records]) =>
        records.map((record) => ({
          record,
          category,
          currentSnapshot: current.snapshotAt,
          ...(baseline === undefined ? {} : { previousSnapshot: baseline.snapshotAt }),
        })),
      ),
      {
        handle: platform === "facebook" ? copy.facebook.csvName : copy.csv.handle,
        category: copy.csv.category,
        connectedAt: copy.csv.connectedAt,
        currentSnapshot: copy.csv.currentSnapshot,
        previousSnapshot: copy.csv.previousSnapshot,
      },
    );
    downloadCsv(csv, safeCsvFilename(platform === "facebook" ? copy.facebook.csvFilename : copy.csv.filename));
  };

  const overview = (
    <div className="overview-panel">
      <div className="summary-grid">
        {platform === "facebook" ? <SummaryCard label={copy.facebook.connections} value={current.friendCount ?? current.friends?.length ?? 0} /> : null}
        <SummaryCard label={resultCopy.followers} value={currentAnalysis.followerCount} />
        <SummaryCard label={resultCopy.following} value={currentAnalysis.followingCount} />
        {platform === "facebook" ? null : <>
          <SummaryCard label={copy.results.mutuals} value={currentAnalysis.mutuals.length} />
          <SummaryCard label={copy.results.notFollowingBack} value={currentAnalysis.notFollowingBack.length} />
          <SummaryCard label={copy.results.notFollowedByMe} value={currentAnalysis.notFollowedByMe.length} />
        </>}
        {friendHistorical === undefined ? null : <>
          <SummaryCard label={copy.facebook.lostFriends} value={friendHistorical.lostFollowers.length} />
          <SummaryCard label={copy.facebook.newFriends} value={friendHistorical.newFollowers.length} />
          <SummaryCard label={copy.facebook.possibleFriendNameChanges} value={friendHistorical.possibleFollowerRenames.length} />
        </>}
        {historical === undefined ? null : (
          <>
            <SummaryCard label={resultCopy.lost} value={historical.lostFollowers.length} />
            <SummaryCard label={resultCopy.added} value={historical.newFollowers.length} />
            <SummaryCard label={resultCopy.renamed} value={historical.possibleFollowerRenames.length} />
            <SummaryCard delta label={resultCopy.net} value={historical.netFollowerChange} />
          </>
        )}
      </div>
      {platform === "facebook" ? <p className="privacy-note">{copy.facebook.duplicateNameCaveat}</p> : null}
      {historical === undefined ? <p className="privacy-note">{copy.ux.firstSnapshot}</p> : (
        <>
          <p className="privacy-note">{platform === "facebook" ? copy.facebook.followerCaveat : copy.ux.lostCaveat}</p>
          {historical.possibleFollowerRenames.length === 0 ? null : <p className="privacy-note">{platform === "facebook" ? copy.facebook.renameCaveat : copy.ux.renameCaveat}</p>}
          {friendHistorical === undefined ? null : <p className="privacy-note">{copy.facebook.lostCaveat}</p>}
        </>
      )}
      {current.warnings.length === 0 ? null : (
        <div className="warning-list">
          <Badge tone="warning">{current.warnings.length} {copy.ux.warnings}</Badge>
          <ul>{current.warnings.map((warning) => <li key={`${warning.code}-${warning.relationshipKind ?? "all"}`}>{getImportWarningMessage(dictionary, warning.code)} ({warning.count})</li>)}</ul>
        </div>
      )}
      <Button onClick={exportCsv} type="button" variant="secondary">{copy.csv.export}</Button>
    </div>
  );

  const tabs = [
    { id: "overview", label: copy.ux.overview, content: overview },
    ...(friendHistorical === undefined ? [] : [
      { id: "lost-friends", label: copy.facebook.lostFriends, content: <RelationshipList label={copy.facebook.lostFriends} platform={platform} records={friendHistorical.lostFollowers} /> },
      { id: "new-friends", label: copy.facebook.newFriends, content: <RelationshipList label={copy.facebook.newFriends} platform={platform} records={friendHistorical.newFollowers} /> },
      { id: "possible-friend-renames", label: copy.facebook.possibleFriendNameChanges, content: <PossibleRenameList label={copy.facebook.possibleFriendNameChanges} platform={platform} records={friendHistorical.possibleFollowerRenames} /> },
    ]),
    ...(historical === undefined ? [] : [
      { id: "lost", label: resultCopy.lost, content: <RelationshipList label={resultCopy.lost} platform={platform} records={historical.lostFollowers} /> },
      { id: "new", label: resultCopy.added, content: <RelationshipList label={resultCopy.added} platform={platform} records={historical.newFollowers} /> },
      { id: "possible-renames", label: resultCopy.renamed, content: <PossibleRenameList label={resultCopy.renamed} platform={platform} records={historical.possibleFollowerRenames} /> },
    ]),
    ...(platform === "facebook" ? [
      { id: "friends", label: copy.facebook.connections, content: <RelationshipList label={copy.facebook.connections} platform={platform} records={current.friends ?? []} /> },
      { id: "followers", label: resultCopy.followers, content: <RelationshipList label={resultCopy.followers} platform={platform} records={current.followers} /> },
      { id: "following", label: resultCopy.following, content: <RelationshipList label={resultCopy.following} platform={platform} records={current.following} /> },
    ] : []),
    ...(platform === "facebook" ? [] : [
      { id: "not-following-back", label: copy.results.notFollowingBack, content: <RelationshipList label={copy.results.notFollowingBack} platform={platform} records={currentAnalysis.notFollowingBack} /> },
      { id: "not-followed-by-me", label: copy.results.notFollowedByMe, content: <RelationshipList label={copy.results.notFollowedByMe} platform={platform} records={currentAnalysis.notFollowedByMe} /> },
      { id: "mutuals", label: copy.results.mutuals, content: <RelationshipList label={copy.results.mutuals} platform={platform} records={currentAnalysis.mutuals} /> },
    ]),
    { id: "history", label: copy.ux.history, content: <HistoryView current={current} onDelete={setDeleteTarget} onSelect={onSelectSnapshot} platform={platform} snapshots={snapshots} /> },
  ];

  return (
    <Card className="results-card" heading={copy.ux.resultsTitle}>
      {!saved ? <StatusRegion assertive>{copy.ux.unsavedResult}</StatusRegion> : null}
      <Tabs activeId={activeTab} items={tabs} label={copy.ux.resultsTitle} onChange={setActiveTab} />
      <Dialog alert description={dictionary.analyzer.delete.snapshotBody} onClose={() => setDeleteTarget(undefined)} open={deleteTarget !== undefined} title={dictionary.analyzer.delete.snapshotTitle}>
        <div className="button-row">
          <Button
            disabled={deleting}
            onClick={() => {
              if (deleteTarget === undefined || deleting) return;
              setDeleting(true);
              void onDeleteSnapshot(deleteTarget.id).finally(() => {
                setDeleting(false);
                setDeleteTarget(undefined);
              });
            }}
            type="button"
            variant="danger"
          >
            {dictionary.analyzer.delete.confirm}
          </Button>
          <Button onClick={() => setDeleteTarget(undefined)} type="button" variant="secondary">{dictionary.analyzer.delete.cancel}</Button>
        </div>
      </Dialog>
    </Card>
  );
}
