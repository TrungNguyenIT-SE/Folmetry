"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type FormEvent,
} from "react";

import {
  type AssistantConversation,
  type AssistantConversationSummary,
  type AssistantMessage,
  type AssistantMode,
  type AssistantStreamEvent,
} from "@/features/assistant/model";
import { ASSISTANT_POLICY } from "@/features/assistant/policy";
import { authClient } from "@/features/auth/client";
import { useI18n } from "@/i18n";

const subscribeToHydration = (): (() => void) => () => undefined;

interface AssistantStatus {
  readonly configured: boolean;
  readonly providers: readonly string[];
  readonly liveWeb: boolean;
}

function parseErrorCode(value: unknown): string | undefined {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return undefined;
  const code = (value as Record<string, unknown>)["code"];
  return typeof code === "string" ? code : undefined;
}

async function jsonResponse<T>(response: Response): Promise<T> {
  const body = await response.json() as unknown;
  if (!response.ok) throw new Error(parseErrorCode(body) ?? "ASSISTANT_PROVIDER_UNAVAILABLE");
  return body as T;
}

async function* assistantEvents(response: Response): AsyncGenerator<AssistantStreamEvent> {
  if (!response.ok || response.body === null) {
    const body = await response.json().catch(() => undefined) as unknown;
    throw new Error(parseErrorCode(body) ?? "ASSISTANT_PROVIDER_UNAVAILABLE");
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      buffer += decoder.decode(chunk.value, { stream: true }).replaceAll("\r\n", "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = block.split("\n").find((line) => line.startsWith("data:"))?.slice(5).trim();
        if (data) yield JSON.parse(data) as AssistantStreamEvent;
        boundary = buffer.indexOf("\n\n");
      }
    }
  } finally {
    reader.releaseLock();
  }
}

export function AssistantWidget() {
  const { dictionary, locale } = useI18n();
  const copy = dictionary.assistant;
  const pathname = usePathname();
  const { data: session, isPending } = authClient.useSession();
  const hydrated = useSyncExternalStore(subscribeToHydration, () => true, () => false);
  const [open, setOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [status, setStatus] = useState<AssistantStatus>();
  const [conversations, setConversations] = useState<readonly AssistantConversationSummary[]>([]);
  const [conversationId, setConversationId] = useState<string>();
  const [messages, setMessages] = useState<readonly AssistantMessage[]>([]);
  const [mode, setMode] = useState<AssistantMode>("auto");
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string>();
  const abortRef = useRef<AbortController | undefined>(undefined);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const messageListRef = useRef<HTMLDivElement>(null);

  const messageForError = useCallback((code: string): string => {
    const errors: Readonly<Record<string, string>> = copy.errors;
    return errors[code] ?? copy.errors.ASSISTANT_PROVIDER_UNAVAILABLE;
  }, [copy.errors]);

  const loadConversations = async (): Promise<void> => {
    const response = await fetch("/api/assistant?resource=conversations", { cache: "no-store" });
    const data = await jsonResponse<{ conversations: readonly AssistantConversationSummary[] }>(response);
    setConversations(data.conversations);
  };

  useEffect(() => {
    if (!open || session === null || session === undefined) return;
    const controller = new AbortController();
    void Promise.all([
      fetch("/api/assistant?resource=status", { cache: "no-store", signal: controller.signal })
        .then((response) => jsonResponse<AssistantStatus>(response)),
      fetch("/api/assistant?resource=conversations", { cache: "no-store", signal: controller.signal })
        .then((response) => jsonResponse<{ conversations: readonly AssistantConversationSummary[] }>(response)),
    ]).then(([nextStatus, history]) => {
      setStatus(nextStatus);
      setConversations(history.conversations);
    }).catch((loadError: unknown) => {
      if (!controller.signal.aborted) {
        setError(messageForError(loadError instanceof Error ? loadError.message : ""));
      }
    });
    return () => controller.abort();
  }, [messageForError, open, session]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => inputRef.current?.focus());
    const onKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  useEffect(() => {
    messageListRef.current?.scrollTo({
      top: messageListRef.current.scrollHeight,
      behavior: busy ? "auto" : "smooth",
    });
  }, [busy, messages]);

  const newConversation = (): void => {
    abortRef.current?.abort();
    setConversationId(undefined);
    setMessages([]);
    setInput("");
    setError(undefined);
    setHistoryOpen(false);
  };

  const loadConversation = async (id: string): Promise<void> => {
    if (busy) return;
    setError(undefined);
    try {
      const response = await fetch(`/api/assistant?resource=conversation&id=${encodeURIComponent(id)}`, {
        cache: "no-store",
      });
      const data = await jsonResponse<{ conversation: AssistantConversation }>(response);
      setConversationId(data.conversation.id);
      setMode(data.conversation.mode);
      setMessages(data.conversation.messages);
      setHistoryOpen(false);
    } catch (loadError) {
      setError(messageForError(loadError instanceof Error ? loadError.message : ""));
    }
  };

  const deleteConversation = async (): Promise<void> => {
    if (conversationId === undefined || busy) return;
    try {
      const response = await fetch("/api/assistant", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => undefined) as unknown;
        throw new Error(parseErrorCode(body));
      }
      newConversation();
      await loadConversations();
    } catch (deleteError) {
      setError(messageForError(deleteError instanceof Error ? deleteError.message : ""));
    }
  };

  const submit = async (event: FormEvent): Promise<void> => {
    event.preventDefault();
    const content = input.trim();
    if (busy || content.length === 0 || content.length > ASSISTANT_POLICY.maxMessageCharacters) return;
    const controller = new AbortController();
    abortRef.current = controller;
    const optimisticUser: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
      createdAt: Date.now(),
      citations: [],
    };
    const optimisticAssistant: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "assistant",
      content: "",
      createdAt: Date.now() + 1,
      citations: [],
    };
    setMessages((current) => [...current, optimisticUser, optimisticAssistant]);
    setInput("");
    setError(undefined);
    setBusy(true);
    try {
      let completed = false;
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId, message: content, mode, locale, pathname }),
        signal: controller.signal,
      });
      for await (const streamEvent of assistantEvents(response)) {
        if (streamEvent.type === "meta") {
          setConversationId(streamEvent.conversationId);
          setMessages((current) => current.map((message) => message.id === optimisticAssistant.id
            ? { ...message, id: streamEvent.messageId, provider: streamEvent.provider, model: streamEvent.model }
            : message));
        } else if (streamEvent.type === "delta") {
          setMessages((current) => current.map((message, index) =>
            message.role === "assistant" && index === current.length - 1
              ? { ...message, content: message.content + streamEvent.text }
              : message));
        } else if (streamEvent.type === "citations") {
          setMessages((current) => current.map((message, index) =>
            message.role === "assistant" && index === current.length - 1
              ? { ...message, citations: streamEvent.citations }
              : message));
        } else if (streamEvent.type === "error") {
          throw new Error(streamEvent.code);
        } else if (streamEvent.type === "done") {
          completed = true;
        }
      }
      if (!completed) throw new Error("ASSISTANT_PROVIDER_UNAVAILABLE");
      await loadConversations();
    } catch (sendError) {
      setMessages((current) => current.filter((message, index) =>
        !(index === current.length - 1 && message.role === "assistant" && message.content.length === 0)));
      if (!controller.signal.aborted) {
        setError(messageForError(sendError instanceof Error ? sendError.message : ""));
      }
    } finally {
      if (abortRef.current === controller) abortRef.current = undefined;
      setBusy(false);
    }
  };

  const close = (): void => {
    abortRef.current?.abort();
    setOpen(false);
  };

  return (
    <div className="assistant-widget" data-open={open ? "true" : "false"}>
      {open ? (
        <section aria-label={copy.title} className="assistant-panel" role="dialog">
          <header className="assistant-panel__header">
            <div><span className="assistant-panel__signal" aria-hidden="true" /><div><strong>{copy.title}</strong><small>{copy.subtitle}</small></div></div>
            <button aria-label={copy.close} className="icon-button" onClick={close} type="button">×</button>
          </header>
          {!hydrated || isPending ? <div className="assistant-panel__state">{copy.loading}</div> : session === null ? (
            <div className="assistant-panel__state">
              <h2>{copy.signInTitle}</h2>
              <p>{copy.signInBody}</p>
              <Link className="button button--primary" href="/login">{copy.signIn}</Link>
            </div>
          ) : (
            <>
              <div className="assistant-toolbar">
                <button aria-expanded={historyOpen} onClick={() => setHistoryOpen((value) => !value)} type="button">{copy.history}</button>
                <button onClick={newConversation} type="button">{copy.newChat}</button>
                {conversationId === undefined ? null : <button onClick={() => void deleteConversation()} type="button">{copy.delete}</button>}
              </div>
              {historyOpen ? (
                <nav aria-label={copy.history} className="assistant-history">
                  {conversations.length === 0 ? <p>{copy.noHistory}</p> : conversations.map((conversation) => (
                    <button aria-current={conversation.id === conversationId ? "page" : undefined} key={conversation.id} onClick={() => void loadConversation(conversation.id)} type="button">
                      <strong>{conversation.title}</strong><span>{conversation.preview}</span>
                    </button>
                  ))}
                </nav>
              ) : (
                <>
                  <div aria-live="polite" className="assistant-messages" ref={messageListRef}>
                    {messages.length === 0 ? (
                      <div className="assistant-welcome"><span aria-hidden="true">AI / 01</span><h2>{copy.welcomeTitle}</h2><p>{copy.welcomeBody}</p></div>
                    ) : messages.map((message) => (
                      <article className={`assistant-message assistant-message--${message.role}`} key={message.id}>
                        <span>{message.role === "user" ? copy.you : copy.assistant}</span>
                        <p>{message.content || (busy ? copy.thinking : copy.emptyResponse)}</p>
                        {message.citations.length === 0 ? null : (
                          <ol className="assistant-citations">
                            {message.citations.map((citation) => <li key={citation.url}><a href={citation.url} rel="noopener noreferrer" target="_blank">{citation.title}</a></li>)}
                          </ol>
                        )}
                        {message.provider === undefined ? null : <small>{copy.via} {message.provider === "google" ? "Google" : "Groq"}</small>}
                      </article>
                    ))}
                  </div>
                  {status?.configured === false ? <p className="assistant-notice">{copy.notConfigured}</p> : null}
                  <p className="assistant-privacy">{copy.privacy}</p>
                  {error === undefined ? null : <p className="assistant-error" role="alert">{error}</p>}
                  <form className="assistant-composer" onSubmit={(event) => void submit(event)}>
                    <label>
                      <span className="visually-hidden">{copy.mode}</span>
                      <select disabled={busy} onChange={(event) => setMode(event.currentTarget.value as AssistantMode)} value={mode}>
                        <option value="auto">{copy.modes.auto}</option>
                        <option value="folmetry">{copy.modes.folmetry}</option>
                        <option value="general">{copy.modes.general}</option>
                        <option disabled={status?.configured === true && !status.liveWeb} value="web">{copy.modes.web}</option>
                      </select>
                    </label>
                    <textarea disabled={busy || status?.configured === false} maxLength={ASSISTANT_POLICY.maxMessageCharacters} onChange={(event) => setInput(event.currentTarget.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder={copy.placeholder} ref={inputRef} rows={2} value={input} />
                    <button
                      disabled={!busy && (input.trim().length === 0 || status?.configured === false)}
                      onClick={busy ? () => abortRef.current?.abort() : undefined}
                      type={busy ? "button" : "submit"}
                    >
                      {busy ? copy.stop : copy.send}
                    </button>
                  </form>
                </>
              )}
            </>
          )}
        </section>
      ) : null}
      <button aria-expanded={open} aria-label={open ? copy.close : copy.open} className="assistant-launcher" onClick={() => open ? close() : setOpen(true)} type="button">
        <span aria-hidden="true">AI</span><strong>{copy.launcher}</strong>
      </button>
    </div>
  );
}
