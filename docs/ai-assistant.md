# Folmetry Assistant

## Product boundary

Folmetry Assistant is an authenticated, cross-device chat surface for two classes of work:

- Folmetry guidance: exports, analyzers, privacy boundaries, accounts, Stories, Instagram, and Facebook.
- General knowledge: ordinary questions outside Folmetry. Current-information requests should use **Live Web**, which can return Google Search grounding citations.

The assistant does not automatically receive relationship ZIP/JSON files, raw exports, profiles, snapshots, follower lists, Story results, passwords, cookies, or social-network tokens. A user must not interpret the assistant as having inspected those resources unless a future, separately reviewed feature explicitly attaches them.

## Request path

1. The browser sends one bounded message, mode, locale, pathname, and optional conversation UUID to the same-origin API.
2. The server derives the owner from the authenticated session; the client cannot supply an owner ID.
3. PostgreSQL applies per-account minute/day quotas and stores the user message.
4. `Auto` resolves to Folmetry, general, or web intent. A conversation UUID determines the preferred provider so ordinary traffic is distributed consistently.
5. Groq or Google receives a bounded history and a server-owned system prompt. Live Web prefers Google because Search grounding is provider-specific.
6. If the preferred provider fails before emitting content, the server tries the other configured provider. It never switches providers halfway through an answer.
7. Normalized SSE events stream to the browser. The completed answer, provider/model metadata, and safe HTTPS citations are then stored under the same owner.

## Storage and deletion

`folmetry_ai_conversation` and `folmetry_ai_message` use an owner foreign key with cascading deletion. Every select, update, and delete includes the authenticated owner ID. At most 50 conversations and the latest 200 messages per conversation are retained by application policy. Deleting a conversation removes its messages. Deleting a Folmetry user cascades to all assistant history.

## Release gates and secrets

The feature is unavailable unless both gates are explicitly enabled:

```dotenv
AI_ASSISTANT_ENABLED=true
AI_PROVIDER_APPROVED=true
```

Configure one or both providers with `GROQ_API_KEY` and `GOOGLE_AI_API_KEY`. Keys are read only on the server and must be stored in the deployment platform's encrypted secret store. Never commit them and never prefix them with `NEXT_PUBLIC_`. Model names are configurable because provider catalogs and retirement schedules change.

Google Search grounding has a separate `AI_GOOGLE_SEARCH_ENABLED` gate. Keep it off until provider terms, privacy language, quotas, and expected billing have been reviewed.

## Operational controls

- Per account: 8 accepted turns per minute and 100 per rolling 24 hours.
- Input: 4,000 characters; request body: 24 KiB; bounded history: 24 messages/24,000 characters.
- Provider timeout: 45 seconds; response body: 2 MiB; rendered answer: 12,000 characters.
- No provider response body or raw upstream error is returned to the browser.
- Disabling either release gate is the emergency kill switch.

## Production checklist

- Review current Groq and Google model availability, pricing, retention, regional processing, and abuse policies.
- Set spend caps and provider-side rate limits; configure alerts before public release.
- Confirm Privacy and Terms pages describe both providers and Live Web grounding.
- Smoke-test both providers independently, fallback before first output, citations, stream interruption, deletion, and cross-account isolation.
- Exercise medical, legal, financial, self-harm, credential-exfiltration, and prompt-injection test cases. AI output is not a substitute for qualified professional advice.
- Rotate any key exposed in chat, logs, screenshots, or source control.
