import { useEffect, useState } from "react";
import { deleteUser, fetchAdminUsers, sendUserResetCode, updateUserRole, updateUserStatus } from "../../api/adminApi";
import AdminUserDetailModal from "../../components/admin/AdminUserDetailModal";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../hooks/useToast";

export default function AdminUsers() {
  const { user: currentAdmin } = useAuth();
  const showToast = useToast();

  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [inspectUserId, setInspectUserId] = useState(null);

  const loadData = () => {
    setLoading(true);
    fetchAdminUsers({ search, role: roleFilter, status: statusFilter, page, limit: 15 })
      .then((res) => {
        setUsers(res.users);
        setTotal(res.total);
      })
      .catch((err) => showToast(err.message, "⚠️"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, [page, roleFilter, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setPage(1);
    loadData();
  };

  const handleToggleStatus = async (user) => {
    setBusyId(user.id);
    try {
      await updateUserStatus(user.id, { is_active: !user.is_active });
      showToast(`User ${user.username} ${!user.is_active ? "activated" : "suspended"}`, "✅");
      loadData();
    } catch (err) {
      showToast(err.message, "⚠️");
    } finally {
      setBusyId(null);
    }
  };

  const handleUnlock = async (user) => {
    setBusyId(user.id);
    try {
      await updateUserStatus(user.id, { unlock: true });
      showToast(`Account unlocked for ${user.username}`, "🔓");
      loadData();
    } catch (err) {
      showToast(err.message, "⚠️");
    } finally {
      setBusyId(null);
    }
  };

  const handleToggleRole = async (user) => {
    const nextRole = user.role === "admin" ? "user" : "admin";
    if (user.id === currentAdmin?.id && nextRole !== "admin") {
      showToast("You cannot demote yourself from admin role.", "⚠️");
      return;
    }
    if (!window.confirm(`Are you sure you want to change ${user.username}'s role to ${nextRole}?`)) {
      return;
    }
    setBusyId(user.id);
    try {
      await updateUserRole(user.id, nextRole);
      showToast(`Role updated to ${nextRole} for ${user.username}`, "👑");
      loadData();
    } catch (err) {
      showToast(err.message, "⚠️");
    } finally {
      setBusyId(null);
    }
  };

  const handleSendReset = async (user) => {
    setBusyId(user.id);
    try {
      await sendUserResetCode(user.id);
      showToast(`Password verification code dispatched to ${user.email}`, "✉️");
    } catch (err) {
      showToast(err.message, "⚠️");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (user) => {
    if (user.id === currentAdmin?.id) {
      showToast("You cannot delete your own admin account.", "⚠️");
      return;
    }
    if (!window.confirm(`Permanently delete account ${user.username} (${user.email}) and all their meal logs? This action is irreversible.`)) {
      return;
    }
    setBusyId(user.id);
    try {
      await deleteUser(user.id);
      showToast(`User ${user.username} permanently deleted.`, "🗑️");
      loadData();
    } catch (err) {
      showToast(err.message, "⚠️");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-5">
      {/* Search & Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div>
          <h2 className="text-lg font-extrabold text-slate-900">User Management</h2>
          <p className="text-xs text-slate-500 mt-0.5">Search, moderate, change roles, or inspect registered accounts ({total} total)</p>
        </div>

        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search email or username…"
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
          <select
            value={roleFilter}
            onChange={(e) => {
              setRoleFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none"
          >
            <option value="">All Roles</option>
            <option value="user">Users</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-700 bg-white focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="locked">Locked</option>
          </select>
          <button
            type="submit"
            className="px-3 py-1.5 rounded-xl bg-slate-900 text-white font-bold text-xs hover:bg-slate-800 transition shadow-sm"
          >
            Search
          </button>
        </form>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <th className="py-3 px-3">User</th>
              <th className="py-3 px-3">Role</th>
              <th className="py-3 px-3">Status</th>
              <th className="py-3 px-3">Meals Logged</th>
              <th className="py-3 px-3">Auth</th>
              <th className="py-3 px-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-slate-700">
            {loading ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  Loading user records…
                </td>
              </tr>
            ) : users.length === 0 ? (
              <tr>
                <td colSpan={6} className="py-8 text-center text-slate-400">
                  No users found matching your query.
                </td>
              </tr>
            ) : (
              users.map((u) => {
                const isCurrent = u.id === currentAdmin?.id;
                const isBusy = busyId === u.id;
                return (
                  <tr key={u.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2.5">
                        {u.avatar_url ? (
                          <img src={u.avatar_url} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" referrerPolicy="no-referrer" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center font-bold text-slate-600 uppercase shrink-0">
                            {u.username[0]}
                          </div>
                        )}
                        <div>
                          <div
                            onClick={() => setInspectUserId(u.id)}
                            className="font-bold text-slate-900 hover:text-emerald-600 transition cursor-pointer flex items-center gap-1.5"
                            title="Click to view full logs and AI plans"
                          >
                            <span>{u.username}</span>
                            {isCurrent && <span className="text-[9px] bg-slate-100 px-1.5 py-0.2 rounded font-semibold text-slate-600">You</span>}
                          </div>
                          <div className="text-slate-400 text-[11px] font-medium">{u.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === "admin"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role === "admin" ? "👑 Admin" : "User"}
                      </span>
                    </td>
                    <td className="py-3 px-3">
                      {u.is_locked ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800">
                          🔒 Locked
                        </span>
                      ) : u.is_active ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          Active
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-200 text-slate-600">
                          Suspended
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {u.meals_logged_count} meals
                    </td>
                    <td className="py-3 px-3 text-slate-500 capitalize">
                      {u.provider}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setInspectUserId(u.id)}
                          className="px-2 py-1 rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 font-bold text-[11px] border border-emerald-200 transition flex items-center gap-1 shadow-xs"
                          title="Inspect user meal history by date and AI plans"
                        >
                          👁️ Details
                        </button>
                        {u.is_locked && (
                          <button
                            type="button"
                            disabled={isBusy}
                            onClick={() => handleUnlock(u)}
                            className="px-2 py-1 rounded bg-amber-50 text-amber-700 hover:bg-amber-100 font-semibold text-[11px] transition"
                            title="Unlock account"
                          >
                            Unlock
                          </button>
                        )}
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleToggleStatus(u)}
                          className={`px-2 py-1 rounded font-semibold text-[11px] transition ${
                            u.is_active
                              ? "bg-slate-100 text-slate-600 hover:bg-slate-200"
                              : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                          }`}
                          title={u.is_active ? "Suspend account" : "Activate account"}
                        >
                          {u.is_active ? "Suspend" : "Activate"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || isCurrent}
                          onClick={() => handleToggleRole(u)}
                          className="px-2 py-1 rounded bg-indigo-50 text-indigo-700 hover:bg-indigo-100 font-semibold text-[11px] disabled:opacity-30 disabled:cursor-not-allowed transition"
                          title="Toggle Admin role"
                        >
                          {u.role === "admin" ? "Demote" : "Make Admin"}
                        </button>
                        <button
                          type="button"
                          disabled={isBusy}
                          onClick={() => handleSendReset(u)}
                          className="px-2 py-1 rounded bg-slate-100 text-slate-700 hover:bg-slate-200 font-semibold text-[11px] transition"
                          title="Send Password Reset verification code"
                        >
                          Reset Code
                        </button>
                        <button
                          type="button"
                          disabled={isBusy || isCurrent}
                          onClick={() => handleDelete(u)}
                          className="px-2 py-1 rounded text-rose-500 hover:text-rose-700 hover:bg-rose-50 font-semibold text-[11px] disabled:opacity-30 disabled:cursor-not-allowed transition"
                          title="Delete user and all data"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div className="flex items-center justify-between pt-3 border-t border-slate-100 text-xs">
          <span className="text-slate-400 font-medium">
            Showing Page {page} of {Math.ceil(total / 15)}
          </span>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
              className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page * 15 >= total}
              onClick={() => setPage((p) => p + 1)}
              className="px-2.5 py-1 rounded border border-slate-200 text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {/* User Details & Logs Modal */}
      {inspectUserId && (
        <AdminUserDetailModal
          userId={inspectUserId}
          onClose={() => setInspectUserId(null)}
        />
      )}
    </div>
  );
}
