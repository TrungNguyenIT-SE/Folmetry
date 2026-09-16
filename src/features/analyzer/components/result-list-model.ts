import { sortRelationships } from "@/features/analyzer/diff/sort";
import type { RelationshipRecord, RelationshipSort } from "@/features/analyzer/model/types";

export const RESULT_PAGE_SIZE = 50;

export interface RelationshipPage {
  readonly items: readonly RelationshipRecord[];
  readonly filteredCount: number;
  readonly page: number;
  readonly pageCount: number;
}

export function relationshipPage(
  records: readonly RelationshipRecord[],
  query: string,
  sort: RelationshipSort,
  requestedPage: number,
  pageSize = RESULT_PAGE_SIZE,
): RelationshipPage {
  const normalizedQuery = query.trim().toLocaleLowerCase("en-US");
  const filtered =
    normalizedQuery.length === 0
      ? records
      : records.filter((record) => record.normalizedHandle.includes(normalizedQuery));
  const sorted = sortRelationships(filtered, sort);
  const pageCount = Math.max(1, Math.ceil(sorted.length / pageSize));
  const page = Math.min(Math.max(1, requestedPage), pageCount);
  const start = (page - 1) * pageSize;
  return {
    items: sorted.slice(start, start + pageSize),
    filteredCount: sorted.length,
    page,
    pageCount,
  };
}

export function instagramProfileUrl(normalizedHandle: string): string {
  return `https://www.instagram.com/${encodeURIComponent(normalizedHandle)}/`;
}
