import { useState } from "react";
import { Trash2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Button } from "../../components/ui/Button";
import { Card, Chip, Skeleton } from "../../components/ui/Primitives";
import { AdminLayout } from "./Shared";
import { useAuth } from "../../context/AuthContext";
import { useApi } from "../../hooks/useApi";
import { api } from "../../api/client";

export function AdminUsersPage() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useApi(user ? "/api/admin/users" : null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  const create = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      await api.post("/api/admin/users", { username, password });
      toast.success(`User "${username}" created.`);
      setUsername("");
      setPassword("");
      refetch();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async (u) => {
    if (!window.confirm(`Delete user "${u.username}"?`)) return;
    try {
      await api.post(`/api/admin/users/${u.id}/delete`, {});
      toast.success("User deleted.");
      refetch();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const users = data?.users ?? [];

  return (
    <AdminLayout title="User manager">
      <Card className="mb-4 p-5">
        <h3 className="flex items-center gap-2 font-display font-bold">
          <UserPlus className="h-4.5 w-4.5 text-brand-600" /> Create user
        </h3>
        <form onSubmit={create} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
          <input
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Username"
            autoComplete="off"
            className="rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 dark:border-white/15"
          />
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password (min 8 chars)"
            autoComplete="new-password"
            className="rounded-xl border border-stone-200 bg-transparent px-3.5 py-2.5 text-sm outline-none focus:border-brand-600 dark:border-white/15"
          />
          <Button type="submit" disabled={busy}>
            {busy ? "Creating…" : "Create"}
          </Button>
        </form>
      </Card>

      {loading && <Skeleton className="h-32" />}
      {error && <p className="text-sm text-red-500">{error.message}</p>}

      <div className="grid gap-3">
        {users.map((u) => (
          <Card key={u.id} className="flex items-center gap-3 p-4">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-brand-100 font-display font-bold text-brand-800 dark:bg-brand-600/20 dark:text-brand-200">
              {u.username.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">{u.username}</p>
              <p className="text-xs text-stone-400">
                {u.dateCreated ? new Date(u.dateCreated).toLocaleDateString() : ""}
              </p>
            </div>
            {user?.id === u.id ? (
              <Chip>you</Chip>
            ) : (
              <button
                onClick={() => remove(u)}
                className="btn-press rounded-xl p-2 text-red-400 hover:bg-red-50 dark:hover:bg-red-500/10"
                aria-label={`Delete ${u.username}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </Card>
        ))}
      </div>
    </AdminLayout>
  );
}
