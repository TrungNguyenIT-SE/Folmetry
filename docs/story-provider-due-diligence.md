# M6S provider due diligence

Review date: 2026-09-16. Decision owner approval is still required. Production activation remains blocked by both `STORY_FEATURE_ENABLED` and `STORY_PROVIDER_APPROVED`.

## Decision

No candidate is approved for production yet. The code integrates only through a replaceable server-side adapter and must not fall back to scraping, an unofficial private client, or an end-user Instagram credential.

InstaGapi is the preferred technical evaluation candidate because its public documentation covers currently active Stories and complete Highlight trays. Its published Terms put compliance with third-party platform terms on the customer. Its Privacy Policy says API usage logs include request counts, endpoint, timestamp, and IP address and are retained for 90 days, but does not explicitly say whether usernames/query parameters are included. Written clarification and legal/product approval are required before setting `STORY_PROVIDER_APPROVED=true`.

`instagramapi.dev` is a fallback candidate. It documents active Stories and Highlights, typed HTTP errors, request billing, and no end-user login. Its Privacy Policy explicitly says request parameters, including looked-up usernames/public identifiers, are logged and gives no fixed deletion deadline. It therefore is not the default candidate.

## Evidence reviewed

| Area | InstaGapi | instagramapi.dev |
| --- | --- | --- |
| Identity/contact | Support email and Turkey postal address are published | Support email is published |
| Stories | Active items, image/video URLs, timestamps | Active Stories endpoint is documented |
| Highlights | Trays and complete item list are documented | Highlights endpoint is documented; detailed item behavior needs validation |
| Authentication | Provider API key only; no end-user login/token | Provider bearer/API key only; no end-user login/token |
| Private accounts | Detailed private content is unavailable | Says private/protected accounts are unavailable |
| Logging | Endpoint/count/timestamp/IP stated; query logging unclear; 90 days | Endpoint and request parameters including handles are logged; retention is account lifetime plus an unspecified reasonable period |
| Terms | Public data only; customer responsible for law/platform terms | Terms page and production authorization still need owner review |
| Billing/rate limits | Subscription tiers and plan-specific per-minute limits | Prepaid credits; typed billing behavior documented |
| Versioning/deprecation | Versioned paths exist; no adequate deprecation commitment found | `/v1` exists; no adequate deprecation commitment found |
| Media hosts/redirects | Examples use Instagram CDN; exhaustive allowlist/redirect contract not supplied | Exhaustive allowlist/redirect contract not supplied |

Primary sources:

- [InstaGapi Stories API](https://www.instagapi.com/instagram-stories-api)
- [InstaGapi Highlights API](https://www.instagapi.com/instagram-highlights-api)
- [InstaGapi Terms](https://www.instagapi.com/terms)
- [InstaGapi Privacy Policy](https://www.instagapi.com/privacy)
- [instagramapi.dev API reference](https://api.instagramapi.dev/docs)
- [instagramapi.dev Privacy Policy](https://api.instagramapi.dev/privacy)

## Required written answers before approval

1. Are username, query string, response payload, media URL, or request body values logged anywhere, including infrastructure and subprocessors?
2. What retention and deletion deadlines apply to each log class and backups?
3. Which subprocessors and processing/storage regions receive API traffic?
4. What exact CDN hostnames and redirects can Story/Highlight media use?
5. Is user-initiated preview and individual download permitted by the contract?
6. What versioning, deprecation, incident-status, quota-alert, and key-rotation support is provided?

After approval, configure an exact `STORY_MEDIA_HOSTS` list from the provider contract, run the opt-in production smoke test with a supplied non-sensitive public test handle, and record the approval owner/date here.
