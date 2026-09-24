import "server-only";

import type { PoolClient, QueryResultRow } from "pg";

import {
  AssistantError,
  type AssistantCitation,
  type AssistantConversation,
  type AssistantConversationSummary,
  type AssistantMessage,
  type AssistantMode,
  type AssistantProviderName,
  type AssistantStoredProviderName,
} from "@/features/assistant/model";
import { ASSISTANT_POLICY } from "@/features/assistant/policy";
import { authDatabase } from "@/features/auth/server/database";

async function transaction<T>(operation: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await authDatabase.connect();
  try {
    await client.query("BEGIN");
    const result = await operation(client);
    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

function timestamp(value: unknown): number {
  const result = Number(value);
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new AssistantError("ASSISTANT_PROVIDER_UNAVAILABLE");
  }
  return result;
}

function citations(value: unknown): readonly AssistantCitation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item): AssistantCitation[] => {
    if (typeof item !== "object" || item === null || Array.isArray(item)) return [];
    const candidate = item as Record<string, unknown>;
    return typeof candidate["title"] === "string" &&
      typeof candidate["url"] === "string" && candidate["url"].startsWith("https://")
      ? [{ title: candidate["title"], url: candidate["url"] }]
      : [];
  });
}

function mapMessage(row: QueryResultRow): AssistantMessage {
  const storedProvider = row["provider"];
  const provider: AssistantStoredProviderName | undefined =
    storedProvider === "groq" || storedProvider === "cloudflare" || storedProvider === "google"
      ? storedProvider
      : undefined;
  return {
    id: String(row["id"]),
    role: row["role"] === "assistant" ? "assistant" : "user",
    content: String(row["content"]),
    createdAt: timestamp(row["created_at"]),
    ...(provider === undefined ? {} : { provider }),
    ...(row["model"] === null ? {} : { model: String(row["model"]) }),
    citations: citations(row["citations"]),
  };
}

function mapSummary(row: QueryResultRow): AssistantConversationSummary {
  const mode = row["mode"];
  return {
    id: String(row["id"]),
    title: String(row["title"]),
    mode: mode === "folmetry" || mode === "general" || mode === "web" ? mode : "auto",
    createdAt: timestamp(row["created_at"]),
    updatedAt: timestamp(row["updated_at"]),
    preview: row["preview"] === null ? "" : String(row["preview"]),
  };
}

function titleFrom(content: string): string {
  const title = content.replace(/\s+/gu, " ").trim();
  return title.slice(0, ASSISTANT_POLICY.conversationTitleCharacters) || "New conversation";
}

export interface BegunAssistantTurn {
  readonly conversationId: string;
  readonly userMessage: AssistantMessage;
  readonly messages: readonly AssistantMessage[];
}

export class AssistantRepository {
  constructor(private readonly ownerId: string) {}

  async listConversations(): Promise<readonly AssistantConversationSummary[]> {
    const result = await authDatabase.query(
      `SELECT conversation.*,
         (SELECT content FROM folmetry_ai_message message
          WHERE message.owner_id = conversation.owner_id
            AND message.conversation_id = conversation.id
          ORDER BY message.created_at DESC, message.id DESC LIMIT 1) AS preview
       FROM folmetry_ai_conversation conversation
       WHERE conversation.owner_id = $1
       ORDER BY conversation.updated_at DESC, conversation.id DESC
       LIMIT $2`,
      [this.ownerId, ASSISTANT_POLICY.listLimit],
    );
    return result.rows.map(mapSummary);
  }

  async getConversation(id: string): Promise<AssistantConversation | undefined> {
    const conversation = await authDatabase.query(
      `SELECT conversation.*,
         (SELECT content FROM folmetry_ai_message message
          WHERE message.owner_id = conversation.owner_id
            AND message.conversation_id = conversation.id
          ORDER BY message.created_at DESC, message.id DESC LIMIT 1) AS preview
       FROM folmetry_ai_conversation conversation
       WHERE conversation.id = $1 AND conversation.owner_id = $2`,
      [id, this.ownerId],
    );
    if (conversation.rowCount !== 1) return undefined;
    const messages = await authDatabase.query(
      `SELECT * FROM (
         SELECT * FROM folmetry_ai_message
         WHERE conversation_id = $1 AND owner_id = $2
         ORDER BY created_at DESC, id DESC
         LIMIT $3
       ) recent
       ORDER BY created_at ASC, id ASC`,
      [id, this.ownerId, ASSISTANT_POLICY.maxStoredMessagesPerConversation],
    );
    return { ...mapSummary(conversation.rows[0]), messages: messages.rows.map(mapMessage) };
  }

  async beginTurn(
    conversationId: string | undefined,
    mode: AssistantMode,
    content: string,
  ): Promise<BegunAssistantTurn> {
    return transaction(async (client) => {
      await client.query("SELECT pg_advisory_xact_lock(hashtext($1))", [`ai:${this.ownerId}`]);
      const now = Date.now();
      const usage = await client.query(
        `SELECT
          COUNT(*) FILTER (WHERE created_at >= $2)::int AS minute_count,
          COUNT(*) FILTER (WHERE created_at >= $3)::int AS day_count
         FROM folmetry_ai_message
         WHERE owner_id = $1 AND role = 'user'`,
        [this.ownerId, now - 60_000, now - 86_400_000],
      );
      if (
        Number(usage.rows[0]?.["minute_count"] ?? 0) >= ASSISTANT_POLICY.requestsPerMinute ||
        Number(usage.rows[0]?.["day_count"] ?? 0) >= ASSISTANT_POLICY.requestsPerDay
      ) {
        throw new AssistantError("ASSISTANT_RATE_LIMITED", { retryAfterSeconds: 60 });
      }

      let id = conversationId;
      if (id === undefined) {
        const count = await client.query(
          "SELECT COUNT(*)::int AS count FROM folmetry_ai_conversation WHERE owner_id = $1",
          [this.ownerId],
        );
        if (Number(count.rows[0]?.["count"] ?? 0) >= ASSISTANT_POLICY.maxConversationsPerUser) {
          throw new AssistantError("ASSISTANT_RATE_LIMITED", { retryAfterSeconds: 60 });
        }
        id = crypto.randomUUID();
        await client.query(
          `INSERT INTO folmetry_ai_conversation
           (id, owner_id, title, mode, created_at, updated_at)
           VALUES ($1, $2, $3, $4, $5, $5)`,
          [id, this.ownerId, titleFrom(content), mode, now],
        );
      } else {
        const updated = await client.query(
          `UPDATE folmetry_ai_conversation SET mode = $3, updated_at = $4
           WHERE id = $1 AND owner_id = $2 RETURNING id`,
          [id, this.ownerId, mode, now],
        );
        if (updated.rowCount !== 1) {
          throw new AssistantError("ASSISTANT_CONVERSATION_NOT_FOUND");
        }
      }

      const messageId = crypto.randomUUID();
      await client.query(
        `INSERT INTO folmetry_ai_message
         (id, conversation_id, owner_id, role, content, citations, created_at)
         VALUES ($1, $2, $3, 'user', $4, '[]'::jsonb, $5)`,
        [messageId, id, this.ownerId, content, now],
      );
      await client.query(
        `DELETE FROM folmetry_ai_message
         WHERE id IN (
           SELECT id FROM folmetry_ai_message
           WHERE conversation_id = $1 AND owner_id = $2
           ORDER BY created_at DESC, id DESC
           OFFSET $3
         )`,
        [id, this.ownerId, ASSISTANT_POLICY.maxStoredMessagesPerConversation],
      );
      const history = await client.query(
        `SELECT * FROM folmetry_ai_message
         WHERE conversation_id = $1 AND owner_id = $2
         ORDER BY created_at DESC, id DESC LIMIT $3`,
        [id, this.ownerId, ASSISTANT_POLICY.maxHistoryMessages],
      );
      const userMessage: AssistantMessage = {
        id: messageId,
        role: "user",
        content,
        createdAt: now,
        citations: [],
      };
      return {
        conversationId: id,
        userMessage,
        messages: history.rows.reverse().map(mapMessage),
      };
    });
  }

  async completeTurn(
    id: string,
    conversationId: string,
    content: string,
    provider: AssistantProviderName,
    model: string,
    citationList: readonly AssistantCitation[],
  ): Promise<AssistantMessage> {
    const now = Date.now();
    const result = await authDatabase.query(
      `INSERT INTO folmetry_ai_message
       (id, conversation_id, owner_id, role, content, provider, model, citations, created_at)
       SELECT $1, id, owner_id, 'assistant', $4, $5, $6, $7::jsonb, $8
       FROM folmetry_ai_conversation
       WHERE id = $2 AND owner_id = $3
       RETURNING *`,
      [id, conversationId, this.ownerId, content, provider, model, JSON.stringify(citationList), now],
    );
    if (result.rowCount !== 1) {
      throw new AssistantError("ASSISTANT_CONVERSATION_NOT_FOUND");
    }
    await authDatabase.query(
      "UPDATE folmetry_ai_conversation SET updated_at = $3 WHERE id = $1 AND owner_id = $2",
      [conversationId, this.ownerId, now],
    );
    await authDatabase.query(
      `DELETE FROM folmetry_ai_message
       WHERE id IN (
         SELECT id FROM folmetry_ai_message
         WHERE conversation_id = $1 AND owner_id = $2
         ORDER BY created_at DESC, id DESC
         OFFSET $3
       )`,
      [conversationId, this.ownerId, ASSISTANT_POLICY.maxStoredMessagesPerConversation],
    );
    return mapMessage(result.rows[0]);
  }

  async deleteConversation(id: string): Promise<void> {
    const result = await authDatabase.query(
      "DELETE FROM folmetry_ai_conversation WHERE id = $1 AND owner_id = $2",
      [id, this.ownerId],
    );
    if (result.rowCount !== 1) {
      throw new AssistantError("ASSISTANT_CONVERSATION_NOT_FOUND");
    }
  }
}
