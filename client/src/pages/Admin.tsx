import { Fragment, useEffect, useState, type FormEvent } from 'react';
import {
    UserPlus,
    KeyRound,
    ShieldCheck,
    ShieldOff,
    Ban,
    RotateCcw,
    Trash2,
    Wand2,
    AlertTriangle,
    X,
} from 'lucide-react';
import { DashboardLayout } from '../layouts/DashboardLayout';
import { ErrorPanel, LoadingPanel, Panel } from '../components/AnalyticsPanels';
import { useAuth } from '../contexts/AuthContext';
import { SelectionProvider } from '../contexts/SelectionContext';
import {
    createUser,
    deleteUser,
    listUsers,
    resetUserPassword,
    updateUserAccess,
    type AdminUser,
    type Role,
} from '../services/adminApi';
import { cn } from '../lib/utils';

/**
 * Team access — the whitelist. Whitelisting, concretely: an admin creates an
 * account here with an email and an initial password (shared with the person
 * out of band — there's no email/SMTP integration in this project, so there's
 * no invite-link flow to click). Only an `active` account can log in;
 * `revoked` is instant and reversible, `delete` is permanent.
 *
 * The server is the actual authority on every rule here (last-admin guard,
 * self-action block) — this page just tries not to let you attempt something
 * it already knows will be rejected, so the failure is a disabled button
 * instead of a server error toast.
 */

function formatDate(iso: string | null): string {
    if (!iso) return 'Never';
    return new Date(iso).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    });
}

function randomPassword(): string {
    const bytes = crypto.getRandomValues(new Uint8Array(12));
    return btoa(String.fromCharCode(...bytes))
        .replace(/[+/=]/g, '')
        .slice(0, 14);
}

/* ------------------------------------------------------------------ */
/* Add-teammate form                                                   */
/* ------------------------------------------------------------------ */

const AddUserForm = ({ onDone }: { onDone: (created: boolean) => void }) => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [role, setRole] = useState<Role>('member');
    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setFormError(null);
        setSubmitting(true);
        try {
            await createUser({ email, password, role });
            onDone(true);
        } catch (err: any) {
            setFormError(err?.response?.data?.error || 'Could not create the account.');
            setSubmitting(false);
        }
    };

    return (
        <form
            onSubmit={submit}
            className="rounded-xl border border-primary-100 bg-primary-50/40 p-5 mb-5 animate-slide-down"
        >
            <div className="grid grid-cols-1 sm:grid-cols-[2fr_2fr_1fr] gap-3 items-end">
                <div>
                    <label className="block text-xs font-semibold text-primary-600 mb-1.5">
                        Email
                    </label>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="teammate@company.com"
                        className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                    />
                </div>
                <div>
                    <label className="block text-xs font-semibold text-primary-600 mb-1.5">
                        Initial password
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            required
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="At least 8 characters"
                            className="flex-1 min-w-0 text-sm font-mono border border-primary-200 rounded-lg px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                        />
                        <button
                            type="button"
                            onClick={() => setPassword(randomPassword())}
                            title="Generate a random password"
                            className="flex-shrink-0 px-3 rounded-lg border border-primary-200 text-primary-500 hover:text-primary-900 hover:bg-white transition-colors"
                        >
                            <Wand2 size={16} />
                        </button>
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-primary-600 mb-1.5">
                        Role
                    </label>
                    <select
                        value={role}
                        onChange={(e) => setRole(e.target.value as Role)}
                        className="w-full text-sm border border-primary-200 rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                    >
                        <option value="member">Member</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>

            <p className="text-xs text-primary-500 mt-3">
                Share this password with them yourself (Slack, in person, etc.) — there's no
                automated invite email. They can't reset it themselves yet, so use "Reset
                password" below if they forget it.
            </p>

            {formError && (
                <div className="flex items-center gap-2 text-sm text-accent-red mt-3">
                    <AlertTriangle size={15} />
                    {formError}
                </div>
            )}

            <div className="flex items-center gap-2 mt-4">
                <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-sm font-semibold rounded-lg bg-primary-900 text-white hover:shadow-modern transition-all disabled:opacity-50"
                >
                    {submitting ? 'Adding…' : 'Add teammate'}
                </button>
                <button
                    type="button"
                    onClick={() => onDone(false)}
                    className="px-4 py-2 text-sm font-medium text-primary-600 hover:text-primary-900"
                >
                    Cancel
                </button>
            </div>
        </form>
    );
};

/* ------------------------------------------------------------------ */
/* Inline password reset                                               */
/* ------------------------------------------------------------------ */

const ResetPasswordRow = ({
    userId,
    onDone,
}: {
    userId: number;
    onDone: () => void;
}) => {
    const [password, setPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [rowError, setRowError] = useState<string | null>(null);

    const submit = async (e: FormEvent) => {
        e.preventDefault();
        setRowError(null);
        setSubmitting(true);
        try {
            await resetUserPassword(userId, password);
            onDone();
        } catch (err: any) {
            setRowError(err?.response?.data?.error || 'Could not reset the password.');
            setSubmitting(false);
        }
    };

    return (
        <tr className="bg-primary-50/60">
            <td colSpan={6} className="py-3 px-4">
                <form onSubmit={submit} className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-semibold text-primary-600">New password:</span>
                    <input
                        autoFocus
                        type="text"
                        required
                        minLength={8}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="At least 8 characters"
                        className="text-sm font-mono border border-primary-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-accent-blue/30 focus:border-accent-blue"
                    />
                    <button
                        type="button"
                        onClick={() => setPassword(randomPassword())}
                        className="text-xs font-semibold text-primary-500 hover:text-primary-900"
                    >
                        Generate
                    </button>
                    <button
                        type="submit"
                        disabled={submitting}
                        className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-primary-900 text-white disabled:opacity-50"
                    >
                        Save
                    </button>
                    <button
                        type="button"
                        onClick={onDone}
                        className="text-xs font-medium text-primary-500 hover:text-primary-900"
                    >
                        Cancel
                    </button>
                    {rowError && <span className="text-xs text-accent-red">{rowError}</span>}
                </form>
            </td>
        </tr>
    );
};

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export const Admin = () => {
    const { user: me } = useAuth();
    const [users, setUsers] = useState<AdminUser[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showAddForm, setShowAddForm] = useState(false);
    const [resettingId, setResettingId] = useState<number | null>(null);
    const [busyId, setBusyId] = useState<number | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const load = () => {
        setError(null);
        listUsers()
            .then(setUsers)
            .catch((err) => setError(err?.response?.data?.error || 'Could not load the team list.'));
    };

    useEffect(load, []);

    const withBusy = async (id: number, action: () => Promise<unknown>) => {
        setBusyId(id);
        setActionError(null);
        try {
            await action();
            load();
        } catch (err: any) {
            setActionError(err?.response?.data?.error || 'That action failed.');
        } finally {
            setBusyId(null);
        }
    };

    const toggleStatus = (u: AdminUser) =>
        withBusy(u.id, () =>
            updateUserAccess(u.id, { status: u.status === 'active' ? 'revoked' : 'active' })
        );

    const toggleRole = (u: AdminUser) =>
        withBusy(u.id, () => updateUserAccess(u.id, { role: u.role === 'admin' ? 'member' : 'admin' }));

    const removeUser = (u: AdminUser) => {
        if (!window.confirm(`Delete ${u.email}? This cannot be undone.`)) return;
        withBusy(u.id, () => deleteUser(u.id));
    };

    // DashboardLayout renders the Sidebar, which reads useSelection() unconditionally
    // (it drives the client/network switcher on the Dashboard page) — without this
    // Provider as an ancestor, that hook throws the instant the Sidebar mounts, and
    // with no error boundary anywhere in the app, React silently unmounts the whole
    // tree. That's what a blank white page on /admin actually was: not "nothing
    // rendered," but "something threw and React gave up quietly."
    if (error) {
        return (
            <SelectionProvider>
                <DashboardLayout>
                    <ErrorPanel message={error} onRetry={load} />
                </DashboardLayout>
            </SelectionProvider>
        );
    }
    if (!users) {
        return (
            <SelectionProvider>
                <DashboardLayout>
                    <LoadingPanel label="Loading team…" />
                </DashboardLayout>
            </SelectionProvider>
        );
    }

    const activeAdminCount = users.filter((u) => u.role === 'admin' && u.status === 'active').length;

    return (
        <SelectionProvider>
        <DashboardLayout>
            <div className="max-w-5xl mx-auto animate-fade-in">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6 lg:mb-8">
                    <div>
                        <h1 className="text-2xl sm:text-3xl font-bold text-primary-900 tracking-tight">
                            Team Access
                        </h1>
                        <p className="text-sm text-primary-600 mt-1">
                            Whitelist who can sign in to Social Flow.
                        </p>
                    </div>
                    {!showAddForm && (
                        <button
                            onClick={() => setShowAddForm(true)}
                            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-xl bg-primary-900 text-white hover:shadow-modern-lg transition-all active:scale-95"
                        >
                            <UserPlus size={16} />
                            Add teammate
                        </button>
                    )}
                </div>

                <Panel title={`${users.length} account${users.length === 1 ? '' : 's'}`}>
                    {showAddForm && (
                        <AddUserForm
                            onDone={(created) => {
                                setShowAddForm(false);
                                if (created) load();
                            }}
                        />
                    )}

                    {actionError && (
                        <div className="flex items-center justify-between gap-2 bg-accent-red/10 border border-accent-red/30 rounded-xl px-4 py-3 mb-4">
                            <div className="flex items-center gap-2 text-sm text-accent-red">
                                <AlertTriangle size={15} />
                                {actionError}
                            </div>
                            <button onClick={() => setActionError(null)}>
                                <X size={15} className="text-accent-red" />
                            </button>
                        </div>
                    )}

                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="border-b border-primary-200">
                                <tr className="text-left text-xs text-primary-600 uppercase tracking-wide">
                                    <th className="pb-3 font-semibold">Email</th>
                                    <th className="pb-3 font-semibold">Role</th>
                                    <th className="pb-3 font-semibold">Status</th>
                                    <th className="pb-3 font-semibold">Last active</th>
                                    <th className="pb-3 font-semibold">Joined</th>
                                    <th className="pb-3 font-semibold text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {users.map((u) => {
                                    const isSelf = u.id === me?.id;
                                    const isBusy = busyId === u.id;
                                    // Mirrors the server's last-admin guard so the button is
                                    // disabled rather than clicked-then-rejected — the server
                                    // still enforces this regardless of what this check shows.
                                    const isLastActiveAdmin =
                                        u.role === 'admin' && u.status === 'active' && activeAdminCount <= 1;
                                    const locked = isSelf || isBusy;

                                    return (
                                        <Fragment key={u.id}>
                                            <tr className="border-b border-primary-100 hover:bg-primary-50/40 transition-colors">
                                                <td className="py-3.5">
                                                    <div className="text-sm font-medium text-primary-900">
                                                        {u.email}
                                                    </div>
                                                    {isSelf && (
                                                        <div className="text-xs text-primary-400 mt-0.5">You</div>
                                                    )}
                                                </td>
                                                <td className="py-3.5">
                                                    <span
                                                        className={cn(
                                                            'text-xs font-semibold px-2.5 py-1 rounded-full',
                                                            u.role === 'admin'
                                                                ? 'bg-accent-purple/15 text-accent-purple'
                                                                : 'bg-primary-100 text-primary-600'
                                                        )}
                                                    >
                                                        {u.role === 'admin' ? 'Admin' : 'Member'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5">
                                                    <span
                                                        className={cn(
                                                            'text-xs font-semibold px-2.5 py-1 rounded-full',
                                                            u.status === 'active'
                                                                ? 'bg-accent-green/15 text-accent-green'
                                                                : 'bg-accent-red/15 text-accent-red'
                                                        )}
                                                    >
                                                        {u.status === 'active' ? 'Active' : 'Revoked'}
                                                    </span>
                                                </td>
                                                <td className="py-3.5 text-sm text-primary-700">
                                                    {formatDate(u.lastLoginAt)}
                                                </td>
                                                <td className="py-3.5 text-sm text-primary-700">
                                                    {formatDate(u.createdAt)}
                                                </td>
                                                <td className="py-3.5">
                                                    <div className="flex items-center justify-end gap-1">
                                                        <button
                                                            title={
                                                                isSelf
                                                                    ? "You can't change your own role here"
                                                                    : u.role === 'admin'
                                                                      ? 'Make member'
                                                                      : 'Make admin'
                                                            }
                                                            disabled={locked}
                                                            onClick={() => toggleRole(u)}
                                                            className="p-2 rounded-lg text-primary-500 hover:text-accent-purple hover:bg-accent-purple/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {u.role === 'admin' ? (
                                                                <ShieldOff size={16} />
                                                            ) : (
                                                                <ShieldCheck size={16} />
                                                            )}
                                                        </button>
                                                        <button
                                                            title={
                                                                isSelf
                                                                    ? "You can't revoke your own access here"
                                                                    : u.status === 'active'
                                                                      ? 'Revoke access'
                                                                      : 'Reactivate'
                                                            }
                                                            disabled={locked}
                                                            onClick={() => toggleStatus(u)}
                                                            className="p-2 rounded-lg text-primary-500 hover:text-accent-orange hover:bg-accent-orange/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            {u.status === 'active' ? (
                                                                <Ban size={16} />
                                                            ) : (
                                                                <RotateCcw size={16} />
                                                            )}
                                                        </button>
                                                        <button
                                                            title="Reset password"
                                                            disabled={isBusy}
                                                            onClick={() =>
                                                                setResettingId(resettingId === u.id ? null : u.id)
                                                            }
                                                            className="p-2 rounded-lg text-primary-500 hover:text-accent-blue hover:bg-accent-blue/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <KeyRound size={16} />
                                                        </button>
                                                        <button
                                                            title={
                                                                isSelf
                                                                    ? "You can't delete your own account here"
                                                                    : isLastActiveAdmin
                                                                      ? 'Promote another admin first'
                                                                      : 'Delete account'
                                                            }
                                                            disabled={locked || isLastActiveAdmin}
                                                            onClick={() => removeUser(u)}
                                                            className="p-2 rounded-lg text-primary-500 hover:text-accent-red hover:bg-accent-red/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                            {resettingId === u.id && (
                                                <ResetPasswordRow
                                                    userId={u.id}
                                                    onDone={() => setResettingId(null)}
                                                />
                                            )}
                                        </Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            </div>
        </DashboardLayout>
        </SelectionProvider>
    );
};
