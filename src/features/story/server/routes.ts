import "server-only";

import { normalizePublicInstagramHandle, STORY_POLICY, StoryError, type HighlightItemsRequest, type PublicStoryProvider, type StoryLookupRequest } from "../model";
import { readStoryServerConfig, type StoryServerConfig } from "./env";
import { assertSameOrigin, jsonFailure, jsonSuccess, readJsonBody, requestId, requestRateLimitKey } from "./http";
import { deliverStoryMedia } from "./media";
import { getStoryProvider } from "./provider";
import { storyConcurrencyGate, storyRateLimiter } from "./rate-limit";
import { lookupHighlightItems, lookupPublicStories } from "./service";

interface RouteDependencies {
  readonly config?: StoryServerConfig;
  readonly provider?: PublicStoryProvider;
}

function configAndProvider(dependencies: RouteDependencies): { config: StoryServerConfig; provider: PublicStoryProvider } {
  const config = dependencies.config ?? readStoryServerConfig();
  return { config, provider: dependencies.provider ?? getStoryProvider(config) };
}

export async function handleStoryLookup(request: Request, dependencies: RouteDependencies = {}): Promise<Response> {
  const supportId = requestId();
  try {
    assertSameOrigin(request);
    storyRateLimiter.check(requestRateLimitKey(request));
    const body = await readJsonBody(request) as Partial<StoryLookupRequest>;
    const handle = normalizePublicInstagramHandle(body.handle);
    const { config, provider } = configAndProvider(dependencies);
    const timeout = AbortSignal.timeout(STORY_POLICY.providerTimeoutMs);
    const signal = AbortSignal.any([request.signal, timeout]);
    return jsonSuccess(await storyConcurrencyGate.run(() => lookupPublicStories(handle, provider, config, signal)));
  } catch (error) {
    return jsonFailure(error, supportId);
  }
}

export async function handleHighlightItems(request: Request, dependencies: RouteDependencies = {}): Promise<Response> {
  const supportId = requestId();
  try {
    assertSameOrigin(request);
    storyRateLimiter.check(requestRateLimitKey(request));
    const body = await readJsonBody(request) as Partial<HighlightItemsRequest>;
    if (typeof body.highlightId !== "string") throw new StoryError("STORY_HIGHLIGHTS_UNAVAILABLE");
    const { config, provider } = configAndProvider(dependencies);
    const signal = AbortSignal.any([request.signal, AbortSignal.timeout(STORY_POLICY.providerTimeoutMs)]);
    return jsonSuccess(await storyConcurrencyGate.run(() => lookupHighlightItems(body.highlightId!, provider, config, signal)));
  } catch (error) {
    return jsonFailure(error, supportId);
  }
}

export async function handleStoryMedia(request: Request, token: string, dependencies: Pick<RouteDependencies, "config"> = {}): Promise<Response> {
  const supportId = requestId();
  try {
    const config = dependencies.config ?? readStoryServerConfig();
    const disposition = new URL(request.url).searchParams.get("disposition");
    if (disposition !== null && disposition !== "download") throw new StoryError("STORY_MEDIA_TOKEN_INVALID");
    return await deliverStoryMedia(token, disposition === "download", config, request.signal);
  } catch (error) {
    return jsonFailure(error, supportId);
  }
}
