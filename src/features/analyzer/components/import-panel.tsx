"use client";

import { useRef, useState, type DragEvent } from "react";

import { Button, ButtonLink, Card, StatusRegion } from "@/components/ui";
import { useI18n } from "@/i18n";

export interface ImportPanelProps {
  readonly disabled?: boolean;
  readonly error?: string;
  readonly onArchive: (file: File) => void;
  readonly onManualFiles: (files: readonly File[]) => void;
}

export function ImportPanel({ disabled = false, error, onArchive, onManualFiles }: ImportPanelProps) {
  const { dictionary } = useI18n();
  const copy = dictionary.analyzer;
  const zipInput = useRef<HTMLInputElement>(null);
  const jsonInput = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const errorId = error === undefined ? undefined : "import-file-error";

  const drop = (event: DragEvent<HTMLDivElement>): void => {
    event.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = [...event.dataTransfer.files];
    if (files.length === 1 && files[0]?.name.toLowerCase().endsWith(".zip")) {
      onArchive(files[0]);
    } else {
      onManualFiles(files);
    }
  };

  return (
    <Card heading={copy.ux.importTitle}>
      <p>{copy.ux.importIntro}</p>
      <div
        aria-describedby={errorId}
        className={`drop-zone${dragging ? " drop-zone--active" : ""}`}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        <p>{copy.ux.dropZone}</p>
        <div className="button-row">
          <Button disabled={disabled} onClick={() => zipInput.current?.click()} type="button">
            {copy.ux.browseZip}
          </Button>
          <Button disabled={disabled} onClick={() => jsonInput.current?.click()} type="button" variant="secondary">
            {copy.ux.browseJson}
          </Button>
        </div>
        <input
          accept=".zip,application/zip"
          aria-label={copy.ux.browseZip}
          className="visually-hidden"
          disabled={disabled}
          onChange={(event) => {
            const file = event.currentTarget.files?.[0];
            if (file !== undefined) onArchive(file);
            event.currentTarget.value = "";
          }}
          ref={zipInput}
          type="file"
        />
        <input
          accept=".json,application/json"
          aria-label={copy.ux.browseJson}
          className="visually-hidden"
          disabled={disabled}
          multiple
          onChange={(event) => {
            onManualFiles([...(event.currentTarget.files ?? [])]);
            event.currentTarget.value = "";
          }}
          ref={jsonInput}
          type="file"
        />
      </div>
      <p className="muted-copy">{copy.ux.supportedFiles}</p>
      <p className="privacy-note">{copy.import.privacy}</p>
      {error === undefined ? null : <StatusRegion assertive><span id={errorId}>{error}</span></StatusRegion>}

      <details className="export-guide">
        <summary>{copy.ux.exportGuide}</summary>
        <ol>
          <li>{copy.ux.guideCenter}</li>
          <li>{copy.ux.guideData}</li>
          <li>{copy.ux.guideFormat}</li>
          <li>{copy.ux.guideZip}</li>
          <li>{copy.ux.guideChange}</li>
        </ol>
        <ButtonLink href="/how-it-works" variant="secondary">{dictionary.nav.howItWorks}</ButtonLink>
      </details>
    </Card>
  );
}
