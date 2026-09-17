"use client";

import { useState } from "react";

import { Badge, Button, Field, StatusRegion } from "@/components/ui";
import { authClient } from "@/features/auth/client";
import { useI18n } from "@/i18n";

type AdminUser = NonNullable<Awaited<ReturnType<typeof authClient.admin.listUsers>>["data"]>["users"][number];

const pageSize = 50;

export function AdminUserManager({ currentUserId, initialUsers, initialTotal }: Readonly<{ currentUserId: string; initialUsers: readonly AdminUser[]; initialTotal: number }>) {
  const { dictionary, formatDate } = useI18n();
  const copy = dictionary.auth.admin;
  const accountCopy = dictionary.auth.account;
  const [users, setUsers] = useState<readonly AdminUser[]>(initialUsers);
  const [total, setTotal] = useState(initialTotal);
  const [offset, setOffset] = useState(0);
  const [search, setSearch] = useState("");
  const [pendingId, setPendingId] = useState<string>();
  const [error, setError] = useState<string>();

  const loadUsers = async (nextOffset = 0): Promise<void> => {
    setError(undefined);
    const result = await authClient.admin.listUsers({
      query: {
        limit: pageSize,
        offset: nextOffset,
        sortBy: "createdAt",
        sortDirection: "desc",
        ...(search.trim() === "" ? {} : { searchValue: search.trim(), searchField: "email", searchOperator: "contains" }),
      },
    });
    if (result.error !== null) {
      setError(copy.loadError);
      return;
    }
    setUsers(result.data.users);
    setTotal(result.data.total);
    setOffset(nextOffset);
  };

  const mutate = async (userId: string, operation: () => Promise<{ error: unknown }>): Promise<void> => {
    setPendingId(userId);
    setError(undefined);
    const result = await operation();
    setPendingId(undefined);
    if (result.error !== null) {
      setError(copy.updateError);
      return;
    }
    await loadUsers(offset);
  };

  return (
    <section className="admin-users" aria-labelledby="admin-users-title">
      <div className="admin-users__heading">
        <div><h2 id="admin-users-title">{copy.users}</h2><p>{copy.intro}</p></div>
        <form onSubmit={(event) => { event.preventDefault(); void loadUsers(0); }}>
          <Field aria-label={copy.search} label={copy.search} onChange={(event) => setSearch(event.currentTarget.value)} type="search" value={search} />
        </form>
      </div>
      {error === undefined ? null : <StatusRegion assertive>{error}</StatusRegion>}
      <div className="admin-table-wrap">
        <table className="admin-table">
          <thead><tr><th scope="col">User</th><th scope="col">{copy.role}</th><th scope="col">{copy.status}</th><th scope="col">{copy.created}</th><th scope="col">{copy.actions}</th></tr></thead>
          <tbody>
            {users.map((user) => {
              const isSelf = user.id === currentUserId;
              const isAdmin = String(user.role ?? "user").split(",").includes("admin");
              const pending = pendingId === user.id;
              return (
                <tr key={user.id}>
                  <td><strong>{user.name}</strong><span>{user.email}</span></td>
                  <td><Badge tone={isAdmin ? "success" : "neutral"}>{isAdmin ? accountCopy.admin : accountCopy.user}</Badge></td>
                  <td><Badge tone={user.banned ? "danger" : "success"}>{user.banned ? copy.suspended : copy.active}</Badge></td>
                  <td>{formatDate(new Date(user.createdAt))}</td>
                  <td><div className="row-actions">
                    <Button disabled={pending || isSelf} onClick={() => void mutate(user.id, async () => authClient.admin.setRole({ userId: user.id, role: isAdmin ? "user" : "admin" }))} type="button" variant="secondary">{isAdmin ? copy.makeUser : copy.makeAdmin}</Button>
                    <Button disabled={pending || isSelf} onClick={() => void mutate(user.id, async () => user.banned ? authClient.admin.unbanUser({ userId: user.id }) : authClient.admin.banUser({ userId: user.id, banReason: "Suspended by administrator" }))} type="button" variant="secondary">{user.banned ? copy.restore : copy.suspend}</Button>
                    <Button disabled={pending || isSelf} onClick={() => void mutate(user.id, async () => authClient.admin.revokeUserSessions({ userId: user.id }))} type="button" variant="secondary">{copy.revoke}</Button>
                    <Button disabled={pending || isSelf} onClick={() => { if (window.confirm(copy.confirmDelete)) void mutate(user.id, async () => authClient.admin.removeUser({ userId: user.id })); }} type="button" variant="danger">{copy.delete}</Button>
                  </div></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="pagination">
        <Button disabled={offset === 0} onClick={() => void loadUsers(Math.max(0, offset - pageSize))} type="button" variant="secondary">{dictionary.auth.common.previous}</Button>
        <span>{total === 0 ? "0" : `${offset + 1}–${Math.min(offset + users.length, total)}`} {copy.of} {total}</span>
        <Button disabled={offset + users.length >= total} onClick={() => void loadUsers(offset + pageSize)} type="button" variant="secondary">{dictionary.auth.common.next}</Button>
      </div>
      {users.length === 0 && error === undefined ? <p>{copy.empty}</p> : null}
    </section>
  );
}
