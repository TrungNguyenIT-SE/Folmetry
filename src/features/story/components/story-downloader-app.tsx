"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { RouteIntro } from "@/components/layout/route-intro";
import { Button, EmptyState, Field, StatusRegion, Tabs } from "@/components/ui";
import type { PublicHighlightCollection, PublicStoryItem, PublicStoryLookupResult, StoryApiResponse, StoryErrorCode } from "@/features/story/model";
import { useI18n } from "@/i18n";

type RequestState = "idle" | "loading" | "success" | "error";

function mediaUrl(reference: string, download = false): string {
  return `/api/story/media/${encodeURIComponent(reference)}${download ? "?disposition=download" : ""}`;
}

async function postJson<T>(path: string, body: unknown, signal: AbortSignal): Promise<T> {
  const response = await fetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
    credentials: "same-origin",
    signal,
  });
  const payload = await response.json() as StoryApiResponse<T>;
  if (!payload.ok) throw Object.assign(new Error(payload.error.code), { code: payload.error.code, retryAfterSeconds: payload.error.retryAfterSeconds });
  return payload.data;
}

function MediaCard({ item, downloadLabel, refreshLabel }: Readonly<{ item: PublicStoryItem; downloadLabel: string; refreshLabel: string }>) {
  const [expired, setExpired] = useState(false);
  const preview = mediaUrl(item.previewRef);
  return (
    <article className="story-media-card">
      <div className="story-media-card__preview">
        {item.mediaType === "video" ? (
          <video controls playsInline preload="metadata" onError={() => setExpired(true)}>
            <source src={preview} />
          </video>
        ) : (
          <Image alt="" height={720} onError={() => setExpired(true)} src={preview} unoptimized width={540} />
        )}
      </div>
      {item.takenAt ? <time dateTime={item.takenAt}>{new Date(item.takenAt).toLocaleString()}</time> : null}
      {expired ? <p className="field__error">{refreshLabel}</p> : null}
      <a className="button button--secondary" download href={mediaUrl(item.downloadRef, true)}>{downloadLabel}</a>
    </article>
  );
}

function MediaGallery({ items, empty, download, refresh }: Readonly<{ items: readonly PublicStoryItem[]; empty: string; download: string; refresh: string }>) {
  if (items.length === 0) return <EmptyState description={empty} title={empty} />;
  return <div className="story-gallery">{items.map((item) => <MediaCard downloadLabel={download} item={item} key={item.id} refreshLabel={refresh} />)}</div>;
}

function errorMessage(code: StoryErrorCode | undefined, story: ReturnType<typeof useI18n>["dictionary"]["story"]): string {
  if (code === "STORY_INVALID_HANDLE") return story.invalid;
  if (code === "STORY_PRIVATE_ACCOUNT" || code === "STORY_ACCOUNT_NOT_FOUND") return story.private;
  if (code === "STORY_NO_ACTIVE_ITEMS") return story.empty;
  if (code === "STORY_RATE_LIMITED" || code === "STORY_PROVIDER_RATE_LIMITED") return story.rateLimited;
  if (code === "STORY_PROVIDER_QUOTA_EXCEEDED") return story.quota;
  if (code === "STORY_PROVIDER_NOT_CONFIGURED") return story.notConfigured;
  if (code === "STORY_PROVIDER_TIMEOUT") return story.timeout;
  if (code === "STORY_MEDIA_TOKEN_EXPIRED") return story.refresh;
  return story.providerUnavailable;
}

function Highlights({ collections, download, empty, loading, refresh }: Readonly<{ collections: readonly PublicHighlightCollection[]; download: string; empty: string; loading: string; refresh: string }>) {
  const [selected, setSelected] = useState<string>();
  const [items, setItems] = useState<Readonly<Record<string, readonly PublicStoryItem[]>>>({});
  const [error, setError] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);

  const moveHighlightFocus = (event: React.KeyboardEvent<HTMLButtonElement>): void => {
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.closest(".highlight-list")?.querySelectorAll<HTMLButtonElement>(".highlight-card") ?? []);
    const current = buttons.indexOf(event.currentTarget);
    if (current < 0 || buttons.length === 0) return;
    event.preventDefault();
    const next = event.key === "Home"
      ? 0
      : event.key === "End"
        ? buttons.length - 1
        : (current + (event.key === "ArrowRight" || event.key === "ArrowDown" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next]?.focus();
  };

  useEffect(() => () => controller.current?.abort(), []);

  const select = async (id: string): Promise<void> => {
    setSelected(id);
    setError(false);
    if (items[id]) return;
    controller.current?.abort();
    controller.current = new AbortController();
    try {
      const result = await postJson<readonly PublicStoryItem[]>("/api/story/highlight-items", { highlightId: id }, controller.current.signal);
      setItems((current) => ({ ...current, [id]: result }));
    } catch (caught) {
      if (!(caught instanceof DOMException && caught.name === "AbortError")) setError(true);
    }
  };

  if (collections.length === 0) return <EmptyState description={empty} title={empty} />;
  return (
    <div className="highlight-browser">
      <div className="highlight-list" role="list">
        {collections.map((collection) => (
          <div key={collection.id} role="listitem">
            <button aria-pressed={selected === collection.id} className="highlight-card" onClick={() => void select(collection.id)} onKeyDown={moveHighlightFocus} type="button">
              {collection.coverRef ? <Image alt="" height={120} src={mediaUrl(collection.coverRef)} unoptimized width={120} /> : <span className="highlight-card__placeholder" aria-hidden="true" />}
              <span><strong>{collection.title}</strong>{collection.itemCount === undefined ? null : <small>{collection.itemCount}</small>}</span>
            </button>
          </div>
        ))}
      </div>
      {selected && !items[selected] && !error ? <StatusRegion>{loading}</StatusRegion> : null}
      {error ? <StatusRegion assertive>{refresh}</StatusRegion> : null}
      {selected && items[selected] ? <MediaGallery download={download} empty={empty} items={items[selected]} refresh={refresh} /> : null}
    </div>
  );
}

export function StoryDownloaderApp() {
  const { dictionary } = useI18n();
  const story = dictionary.story;
  const page = dictionary.pages.stories;
  const [handle, setHandle] = useState("");
  const [state, setState] = useState<RequestState>("idle");
  const [result, setResult] = useState<PublicStoryLookupResult>();
  const [errorCode, setErrorCode] = useState<StoryErrorCode>();
  const [activeTab, setActiveTab] = useState("active-stories");
  const controller = useRef<AbortController | undefined>(undefined);

  useEffect(() => () => controller.current?.abort(), []);

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const submittedHandle = String(new FormData(event.currentTarget as HTMLFormElement).get("handle") ?? "");
    controller.current?.abort();
    controller.current = new AbortController();
    setState("loading");
    setErrorCode(undefined);
    setResult(undefined);
    try {
      const data = await postJson<PublicStoryLookupResult>("/api/story/lookup", { handle: submittedHandle }, controller.current.signal);
      setResult(data);
      setState("success");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") { setState("idle"); return; }
      setErrorCode((error as { code?: StoryErrorCode }).code);
      setState("error");
    }
  };

  const tabs = useMemo(() => result ? [
    { id: "active-stories", label: story.storiesTab, content: <MediaGallery download={story.download} empty={story.empty} items={result.stories} refresh={story.refresh} /> },
    { id: "highlights", label: story.highlightsTab, content: <Highlights collections={result.highlights} download={story.download} empty={story.highlightsEmpty} loading={story.loadingHighlights} refresh={story.refresh} /> },
  ] : [], [result, story]);

  return (
    <RouteIntro description={page.description} eyebrow={page.eyebrow} title={page.title}>
      <div className="story-app" data-state={state}>
        <form aria-busy={state === "loading"} className="story-form" onSubmit={(event) => void submit(event)}>
          <Field autoComplete="off" description={story.hint} disabled={state === "loading"} label={story.label} name="handle" onChange={(event) => setHandle(event.target.value)} placeholder="@username" required spellCheck={false} value={handle} />
          <p className="privacy-note">{story.disclosure}</p>
          <div className="button-row">
            <Button disabled={state === "loading"} type="submit">{story.submit}</Button>
            {state === "loading" ? <Button onClick={() => controller.current?.abort()} type="button" variant="secondary">{story.cancel}</Button> : null}
          </div>
        </form>
        {state === "loading" ? <StatusRegion>{story.loading}</StatusRegion> : null}
        {state === "error" ? <StatusRegion assertive>{errorMessage(errorCode, story)}</StatusRegion> : null}
        {result ? (
          <section aria-labelledby="story-results-title" className="story-results">
            <div className="story-results__heading"><h2 id="story-results-title">@{result.handle}</h2><span>{story.publicOnly}</span></div>
            <Tabs activeId={activeTab} items={tabs} label={story.tabsLabel} onChange={setActiveTab} />
          </section>
        ) : null}
        <aside className="notice" role="note"><strong>{story.permissionTitle}</strong><p>{story.copyright}</p><p>{story.noAffiliation}</p></aside>
      </div>
    </RouteIntro>
  );
}
