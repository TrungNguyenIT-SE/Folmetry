# Folmetry Assistant

## Product boundary

Folmetry Assistant is an authenticated, cross-device chat surface for two classes of work:

- Folmetry guidance: exports, analyzers, privacy boundaries, accounts, Stories, Instagram, and Facebook.
- General knowledge: ordinary questions outside Folmetry. **Live Web** remains disabled until a separately reviewed search provider is configured; the assistant must not present time-sensitive claims as verified without grounding.

The assistant does not automatically receive relationship ZIP/JSON files, raw exports, profiles, snapshots, follower lists, Story results, passwords, cookies, or social-network tokens. A user must not interpret the assistant as having inspected those resources unless a future, separately reviewed feature explicitly attaches them.

## Request path

1. The browser sends one bounded message, mode, locale, pathname, and optional conversation UUID to the same-origin API.
2. The server derives the owner from the authenticated session; the client cannot supply an owner ID.
3. PostgreSQL applies per-account minute/day quotas and stores the user message.
4. `Auto` resolves to Folmetry, general, or web intent. A conversation UUID determines the preferred provider so ordinary traffic is distributed consistently.
5. Groq or Cloudflare Workers AI receives a bounded history and a server-owned system prompt.
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

Configure one or both providers. Groq requires `GROQ_API_KEY`. Cloudflare Workers AI requires `CLOUDFLARE_ACCOUNT_ID` and `CLOUDFLARE_AI_API_TOKEN`; the token needs `Account > Workers AI > Read`. `CLOUDFLARE_AI_GATEWAY_ID` defaults to `default`, and `CLOUDFLARE_AI_MODEL` defaults to `@cf/zai-org/glm-4.7-flash`. Tokens are read only on the server and must be stored in the deployment platform's encrypted secret store. Never commit them and never prefix them with `NEXT_PUBLIC_`.

Cloudflare is called directly from the Vercel server through the OpenAI-compatible `/ai/v1/chat/completions` endpoint. No additional Worker deployment is required. Live Web is deliberately unavailable because ordinary Workers AI inference is not a verified web-search source.

Existing conversation rows with provider `google` remain readable as legacy history. New assistant messages can only store `groq` or `cloudflare`; the idempotent schema migration expands the provider constraint without rewriting historical provenance.

## Operational controls

- Per account: 8 accepted turns per minute and 100 per rolling 24 hours.
- Input: 4,000 characters; request body: 24 KiB; bounded history: 24 messages/24,000 characters.
- Provider timeout: 45 seconds; response body: 2 MiB; rendered answer: 12,000 characters.
- No provider response body or raw upstream error is returned to the browser.
- Disabling either release gate is the emergency kill switch.

## Production checklist

- Review current Groq and Cloudflare model availability, pricing, retention, gateway logging, regional processing, and abuse policies.
- Set spend caps and provider-side rate limits; configure alerts before public release.
- Confirm Privacy and Terms pages describe both providers and state that Live Web is unavailable without a separate search provider.
- Smoke-test both providers independently, fallback before first output, citations, stream interruption, deletion, and cross-account isolation.
- Exercise medical, legal, financial, self-harm, credential-exfiltration, and prompt-injection test cases. AI output is not a substitute for qualified professional advice.
- Rotate any key exposed in chat, logs, screenshots, or source control.
