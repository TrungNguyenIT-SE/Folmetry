import type { LocalAccount, SocialPlatform } from "@/features/analyzer/model/types";
import type { AnalyzerDatabase } from "@/features/analyzer/persistence/database";
import { PersistenceDomainError, mapPersistenceError } from "@/features/analyzer/persistence/errors";
import {
  normalizeAccountLabel,
  normalizeOptionalAccountUsername,
} from "@/features/analyzer/persistence/validation";

export interface AccountRepositoryDependencies {
  readonly now?: () => number;
  readonly createId?: () => string;
}

export interface CreateAccountInput {
  readonly platform: SocialPlatform;
  readonly label: string;
  readonly username?: string;
}

export interface UpdateAccountInput {
  readonly label?: string;
  readonly username?: string | null;
}

export interface AccountCascadeConfirmation {
  readonly confirmed: true;
  readonly cascadeAcknowledged: true;
}

export class AccountRepository {
  private readonly now: () => number;
  private readonly createId: () => string;

  constructor(
    private readonly database: AnalyzerDatabase,
    dependencies: AccountRepositoryDependencies = {},
  ) {
    this.now = dependencies.now ?? Date.now;
    this.createId = dependencies.createId ?? (() => globalThis.crypto.randomUUID());
  }

  async create(input: CreateAccountInput): Promise<LocalAccount> {
    const timestamp = this.now();
    const username = normalizeOptionalAccountUsername(input.platform, input.username);
    const account: LocalAccount = {
      id: this.createId(),
      platform: input.platform,
      label: normalizeAccountLabel(input.label),
      ...(username === undefined ? {} : { username }),
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    try {
      await this.database.accounts.add(account);
      return account;
    } catch (error) {
      throw mapPersistenceError(error, "operation");
    }
  }

  async get(id: string): Promise<LocalAccount | undefined> {
    try {
      return await this.database.accounts.get(id);
    } catch (error) {
      throw mapPersistenceError(error, "operation");
    }
  }

  async list(): Promise<readonly LocalAccount[]> {
    try {
      const accounts = await this.database.accounts.toArray();
      return accounts.sort(
        (left, right) => left.createdAt - right.createdAt || left.id.localeCompare(right.id, "en"),
      );
    } catch (error) {
      throw mapPersistenceError(error, "operation");
    }
  }

  async update(id: string, input: UpdateAccountInput): Promise<LocalAccount> {
    try {
      return await this.database.transaction("rw", this.database.accounts, async () => {
        const current = await this.database.accounts.get(id);
        if (current === undefined) throw new PersistenceDomainError("ACCOUNT_NOT_FOUND");
        const username =
          input.username === undefined
            ? current.username
            : normalizeOptionalAccountUsername(current.platform, input.username);
        const label = input.label === undefined ? current.label : normalizeAccountLabel(input.label);
        const updated: LocalAccount = {
          id: current.id,
          platform: current.platform,
          label,
          ...(username === undefined ? {} : { username }),
          createdAt: current.createdAt,
          updatedAt: this.now(),
        };
        await this.database.accounts.put(updated);
        return updated;
      });
    } catch (error) {
      throw mapPersistenceError(error, "transaction");
    }
  }

  async delete(
    id: string,
    confirmation?: AccountCascadeConfirmation,
  ): Promise<void> {
    if (confirmation?.confirmed !== true || confirmation.cascadeAcknowledged !== true) {
      throw new PersistenceDomainError("DELETION_CONFIRMATION_REQUIRED", {
        reason: "account-cascade",
      });
    }
    try {
      await this.database.transaction(
        "rw",
        this.database.accounts,
        this.database.snapshots,
        async () => {
          await this.database.snapshots.where("accountId").equals(id).delete();
          await this.database.accounts.delete(id);
        },
      );
    } catch (error) {
      throw mapPersistenceError(error, "transaction");
    }
  }
}
