import type { AnalyzerDatabase } from "@/features/analyzer/persistence/database";
import { PersistenceDomainError, mapPersistenceError } from "@/features/analyzer/persistence/errors";

export interface DeleteAllLocalDataConfirmation {
  readonly confirmed: true;
  readonly scope: "all-local-data";
}

export class LocalDataRepository {
  constructor(private readonly database: AnalyzerDatabase) {}

  async deleteAll(confirmation?: DeleteAllLocalDataConfirmation): Promise<void> {
    if (confirmation?.confirmed !== true || confirmation.scope !== "all-local-data") {
      throw new PersistenceDomainError("DELETION_CONFIRMATION_REQUIRED", {
        reason: "all-local-data",
      });
    }
    try {
      await this.database.transaction(
        "rw",
        this.database.accounts,
        this.database.snapshots,
        this.database.settings,
        async () => {
          await Promise.all([
            this.database.accounts.clear(),
            this.database.snapshots.clear(),
            this.database.settings.clear(),
          ]);
        },
      );
    } catch (error) {
      throw mapPersistenceError(error, "transaction");
    }
  }
}
