import type {
  RelationshipRecord,
  RelationshipSort,
} from "@/features/analyzer/model/types";

function compareHandle(left: RelationshipRecord, right: RelationshipRecord): number {
  return left.normalizedHandle < right.normalizedHandle
    ? -1
    : left.normalizedHandle > right.normalizedHandle
      ? 1
      : 0;
}

function compareOptionalTimestamp(
  left: RelationshipRecord,
  right: RelationshipRecord,
  direction: "asc" | "desc",
): number {
  if (left.connectedAt === undefined && right.connectedAt === undefined) {
    return compareHandle(left, right);
  }
  if (left.connectedAt === undefined) {
    return 1;
  }
  if (right.connectedAt === undefined) {
    return -1;
  }

  const dateOrder = left.connectedAt - right.connectedAt;
  return dateOrder === 0
    ? compareHandle(left, right)
    : direction === "asc"
      ? dateOrder
      : -dateOrder;
}

export function sortRelationships(
  records: readonly RelationshipRecord[],
  sort: RelationshipSort = "handle-asc",
): readonly RelationshipRecord[] {
  return [...records].sort((left, right) => {
    switch (sort) {
      case "handle-asc":
        return compareHandle(left, right);
      case "handle-desc":
        return -compareHandle(left, right);
      case "connected-newest":
        return compareOptionalTimestamp(left, right, "desc");
      case "connected-oldest":
        return compareOptionalTimestamp(left, right, "asc");
    }
  });
}
