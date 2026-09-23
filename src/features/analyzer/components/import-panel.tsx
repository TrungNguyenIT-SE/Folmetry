"use client";

import { useRef, useState, type DragEvent } from "react";

import { Button, ButtonLink, Card, StatusRegion } from "@/components/ui";
import { useI18n } from "@/i18n";
import type { SocialPlatform } from "@/features/analyzer/model/types";

export interface ImportPanelProps {
  readonly disabled?: boolean;
  readonly error?: string;
  readonly onArchive: (file: File) => void;
  readonly onManualFiles: (files: readonly File[]) => void;
  readonly platform: SocialPlatform;
}

export function ImportPanel({ disabled = false, error, onArchive, onManualFiles, platform }: ImportPanelProps) {
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
    <Card className="import-card" heading={platform === "facebook" ? copy.facebook.importTitle : copy.ux.importTitle}>
      <p>{platform === "facebook" ? copy.facebook.importIntro : copy.ux.importIntro}</p>
      <div
        aria-describedby={errorId}
        className={`drop-zone${dragging ? " drop-zone--active" : ""}`}
        data-dragging={dragging ? "true" : "false"}
        onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
        onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }}
        onDragOver={(event) => event.preventDefault()}
        onDrop={drop}
      >
        <p>{platform === "facebook" ? copy.facebook.dropZone : copy.ux.dropZone}</p>
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
      <p className="muted-copy">{platform === "facebook" ? copy.facebook.supportedFiles : copy.ux.supportedFiles}</p>
      <p className="privacy-note">{copy.import.privacy}</p>
      {error === undefined ? null : <StatusRegion assertive><span id={errorId}>{error}</span></StatusRegion>}

      <details className="export-guide" id={`${platform}-export-guide`}>
        <summary>{copy.ux.exportGuide}</summary>
        <ol>
          <li>{platform === "facebook" ? copy.facebook.guideMenu : copy.ux.guideMenu}</li>
          <li>{platform === "facebook" ? copy.facebook.guideCenter : copy.ux.guideCenter}</li>
          <li>{platform === "facebook" ? copy.facebook.guideExport : copy.ux.guideExport}</li>
          <li>{platform === "facebook" ? copy.facebook.guideAccount : copy.ux.guideAccount}</li>
          <li>{platform === "facebook" ? copy.facebook.guideDestination : copy.ux.guideDestination}</li>
          <li>{platform === "facebook" ? copy.facebook.guideData : copy.ux.guideData}</li>
          <li>{platform === "facebook" ? copy.facebook.guideRange : copy.ux.guideRange}</li>
          <li>{platform === "facebook" ? copy.facebook.guideFormat : copy.ux.guideFormat}</li>
          <li>{platform === "facebook" ? copy.facebook.guideWait : copy.ux.guideWait}</li>
          <li>{platform === "facebook" ? copy.facebook.guideZip : copy.ux.guideZip}</li>
        </ol>
        <p className="muted-copy">{platform === "facebook" ? copy.facebook.guideChange : copy.ux.guideChange}</p>
        <ButtonLink href="/how-it-works" variant="secondary">{dictionary.nav.howItWorks}</ButtonLink>
      </details>
    </Card>
  );
}
