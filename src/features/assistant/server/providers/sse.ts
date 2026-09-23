import "server-only";

import { AssistantError } from "@/features/assistant/model";
import { ASSISTANT_POLICY } from "@/features/assistant/policy";

export async function* sseData(
  response: Response,
): AsyncGenerator<string> {
  if (!response.ok || response.body === null) {
    await response.body?.cancel().catch(() => undefined);
    throw new AssistantError("ASSISTANT_PROVIDER_UNAVAILABLE");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let bytes = 0;
  try {
    while (true) {
      const chunk = await reader.read();
      if (chunk.done) break;
      bytes += chunk.value.byteLength;
      if (bytes > ASSISTANT_POLICY.providerResponseBytes) {
        throw new AssistantError("ASSISTANT_PROVIDER_UNAVAILABLE");
      }
      buffer += decoder.decode(chunk.value, { stream: true }).replaceAll("\r\n", "\n");
      let boundary = buffer.indexOf("\n\n");
      while (boundary >= 0) {
        const block = buffer.slice(0, boundary);
        buffer = buffer.slice(boundary + 2);
        const data = block
          .split("\n")
          .filter((line) => line.startsWith("data:"))
          .map((line) => line.slice(5).trimStart())
          .join("\n");
        if (data && data !== "[DONE]") yield data;
        boundary = buffer.indexOf("\n\n");
      }
    }
    buffer += decoder.decode();
    const data = buffer
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (data && data !== "[DONE]") yield data;
  } catch (error) {
    if (error instanceof AssistantError) throw error;
    throw new AssistantError("ASSISTANT_PROVIDER_UNAVAILABLE", { cause: error });
  } finally {
    reader.releaseLock();
  }
}
