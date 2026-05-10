import {
  ArrowLeft,
  Menu,
  Plus,
  Pencil,
  Trash2,
  Users,
  Shield,
  X,
  Loader2,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { useTheme } from './ThemeProvider';
import { backNavIconButtonClassName } from '@/lib/backNavButton';
import { AuthSessionExpiredError } from '@/services/auth';
import {
  listAdminUsers,
  createAdminUser,
  updateAdminUser,
  deleteAdminUser,
  type AdminUser,
} from '@/services/adminUsers';

interface AdminUsersScreenProps {
  onOpenMenu: () => void;
  onNavigateBack: () => void;
  currentUserId: string;
  onSessionExpired: () => void;
}

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString('pt-BR', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export function AdminUsersScreen({
  onOpenMenu,
  onNavigateBack,
  currentUserId,
  onSessionExpired,
}: AdminUsersScreenProps) {
  const { themeColor } = useTheme();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<AdminUser | null>(null);
  const [deleting, setDeleting] = useState<AdminUser | null>(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPassword, setCreatePassword] = useState('');
  const [createRole, setCreateRole] = useState<'admin' | 'user'>('user');

  const [editName, setEditName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'user'>('user');
  const [editActive, setEditActive] = useState(true);

  const load = useCallback(async () => {
    setListError('');
    setLoading(true);
    try {
      setUsers(await listAdminUsers());
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setListError(e instanceof Error ? e.message : 'Erro ao carregar usuários');
    } finally {
      setLoading(false);
    }
  }, [onSessionExpired]);

  useEffect(() => {
    void load();
  }, [load]);

  const openCreate = () => {
    setFormError('');
    setCreateName('');
    setCreateEmail('');
    setCreatePassword('');
    setCreateRole('user');
    setCreateOpen(true);
  };

  const openEdit = (u: AdminUser) => {
    setFormError('');
    setEditing(u);
    setEditName(u.name);
    setEditEmail(u.email);
    setEditPassword('');
    setEditRole(u.role);
    setEditActive(u.is_active);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    setSaving(true);
    try {
      await createAdminUser({
        name: createName.trim(),
        email: createEmail.trim(),
        password: createPassword,
        role: createRole,
      });
      setCreateOpen(false);
      await load();
    } catch (err) {
      if (err instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setFormError(err instanceof Error ? err.message : 'Erro ao criar');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setFormError('');
    setSaving(true);
    const patch: Parameters<typeof updateAdminUser>[1] = {};
    if (editName.trim() !== editing.name) patch.name = editName.trim();
    if (editEmail.trim().toLowerCase() !== editing.email.toLowerCase()) patch.email = editEmail.trim();
    if (editPassword.length > 0) patch.password = editPassword;
    if (editRole !== editing.role) patch.role = editRole;
    if (editActive !== editing.is_active) patch.is_active = editActive;

    if (Object.keys(patch).length === 0) {
      setEditing(null);
      setSaving(false);
      return;
    }

    try {
      await updateAdminUser(editing.id, patch);
      setEditing(null);
      await load();
    } catch (err) {
      if (err instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setFormError(err instanceof Error ? err.message : 'Erro ao salvar');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    setSaving(true);
    setFormError('');
    try {
      await deleteAdminUser(deleting.id);
      setDeleting(null);
      await load();
    } catch (err) {
      if (err instanceof AuthSessionExpiredError) {
        onSessionExpired();
        return;
      }
      setFormError(err instanceof Error ? err.message : 'Erro ao excluir');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col min-h-0 bg-background">
      <header className="shrink-0 px-4 pt-6 pb-3 border-b border-border flex items-center gap-3">
        <button type="button" onClick={onNavigateBack} className={backNavIconButtonClassName}>
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-semibold flex items-center gap-2">
            <Users className="w-5 h-5 text-muted-foreground shrink-0" />
            <span className="truncate">Usuários</span>
          </h1>
          <p className="text-xs text-muted-foreground">Criar, editar e remover contas</p>
        </div>
        <button type="button" onClick={onOpenMenu} className={backNavIconButtonClassName}>
          <Menu className="w-5 h-5" />
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 py-4 scrollbar-hide pb-24">
        {listError && (
          <div className="mb-3 rounded-xl border border-red-200 bg-red-50 text-red-800 text-sm px-3 py-2">{listError}</div>
        )}

        <button
          type="button"
          onClick={openCreate}
          className={`w-full mb-4 flex items-center justify-center gap-2 py-3 rounded-xl text-white font-medium bg-gradient-to-br ${themeColor} shadow-md btn-apple`}
        >
          <Plus className="w-5 h-5" />
          Novo usuário
        </button>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin" />
            <p className="text-sm">Carregando…</p>
          </div>
        ) : (
          <ul className="space-y-2">
            {users.map((u) => (
              <li
                key={u.id}
                className="rounded-2xl border border-border bg-card p-3.5 card-apple flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium truncate">{u.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                    <p className="text-[10px] text-muted-foreground mt-1">Criado em {formatCreatedAt(u.created_at)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 ${
                        u.role === 'admin'
                          ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-200'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {u.role === 'admin' ? <Shield className="w-3 h-3" /> : null}
                      {u.role === 'admin' ? 'Admin' : 'Usuário'}
                    </span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full ${
                        u.is_active ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950' : 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800'
                      }`}
                    >
                      {u.is_active ? 'Ativo' : 'Inativo'}
                    </span>
                  </div>
                </div>
                <div className="flex gap-2 pt-1 border-t border-border">
                  <button
                    type="button"
                    onClick={() => openEdit(u)}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium bg-muted hover:opacity-90 btn-apple"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                    Editar
                  </button>
                  <button
                    type="button"
                    disabled={u.id === currentUserId}
                    onClick={() => setDeleting(u)}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-medium btn-apple ${
                      u.id === currentUserId
                        ? 'opacity-40 cursor-not-allowed bg-muted'
                        : 'bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 dark:bg-red-950/40 dark:border-red-900'
                    }`}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Excluir
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Modal criar */}
      {createOpen && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={() => !saving && setCreateOpen(false)} />
          <div
            role="dialog"
            className="relative w-full max-w-md rounded-3xl bg-background border border-border shadow-2xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Novo usuário</h2>
              <button type="button" disabled={saving} onClick={() => setCreateOpen(false)} className="p-2 rounded-xl hover:bg-muted btn-apple">
                <X className="w-4 h-4" />
              </button>
            </div>
            {formError && <div className="mb-3 text-sm text-red-600">{formError}</div>}
            <form onSubmit={handleCreate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <input
                  required
                  minLength={2}
                  value={createName}
                  onChange={(ev) => setCreateName(ev.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm input-apple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                <input
                  required
                  type="email"
                  value={createEmail}
                  onChange={(ev) => setCreateEmail(ev.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm input-apple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Senha</label>
                <input
                  required
                  type="password"
                  value={createPassword}
                  onChange={(ev) => setCreatePassword(ev.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm input-apple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Função</label>
                <select
                  value={createRole}
                  onChange={(ev) => setCreateRole(ev.target.value as 'admin' | 'user')}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm input-apple"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3 rounded-xl text-white font-medium bg-gradient-to-br ${themeColor} btn-apple flex items-center justify-center gap-2`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Criar conta
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal editar */}
      {editing && (
        <div className="fixed inset-0 z-[60] flex items-end sm:items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={() => !saving && setEditing(null)} />
          <div
            role="dialog"
            className="relative w-full max-w-md rounded-3xl bg-background border border-border shadow-2xl p-5 max-h-[90vh] overflow-y-auto"
            onClick={(ev) => ev.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold">Editar usuário</h2>
              <button type="button" disabled={saving} onClick={() => setEditing(null)} className="p-2 rounded-xl hover:bg-muted btn-apple">
                <X className="w-4 h-4" />
              </button>
            </div>
            {formError && <div className="mb-3 text-sm text-red-600">{formError}</div>}
            <form onSubmit={handleUpdate} className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nome</label>
                <input
                  required
                  minLength={2}
                  value={editName}
                  onChange={(ev) => setEditName(ev.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm input-apple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">E-mail</label>
                <input
                  required
                  type="email"
                  value={editEmail}
                  onChange={(ev) => setEditEmail(ev.target.value)}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm input-apple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Nova senha (opcional)</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(ev) => setEditPassword(ev.target.value)}
                  placeholder="Deixe em branco para não alterar"
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm input-apple"
                />
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Função</label>
                <select
                  value={editRole}
                  onChange={(ev) => setEditRole(ev.target.value as 'admin' | 'user')}
                  className="mt-1 w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm input-apple"
                >
                  <option value="user">Usuário</option>
                  <option value="admin">Administrador</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={editActive} onChange={(ev) => setEditActive(ev.target.checked)} className="rounded border-border" />
                Conta ativa
              </label>
              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3 rounded-xl text-white font-medium bg-gradient-to-br ${themeColor} btn-apple flex items-center justify-center gap-2`}
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Salvar alterações
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Confirmar exclusão */}
      {deleting && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <button type="button" className="absolute inset-0 bg-black/45" aria-label="Fechar" onClick={() => !saving && setDeleting(null)} />
          <div
            role="dialog"
            className="relative w-full max-w-sm rounded-3xl bg-background border border-border shadow-2xl p-5"
            onClick={(ev) => ev.stopPropagation()}
          >
            <h2 className="text-base font-semibold mb-2">Excluir usuário?</h2>
            <p className="text-sm text-muted-foreground mb-4">
              Esta ação remove <span className="font-medium text-foreground">{deleting.name}</span> ({deleting.email}) permanentemente.
            </p>
            {formError && <div className="mb-3 text-sm text-red-600">{formError}</div>}
            <div className="flex gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => setDeleting(null)}
                className="flex-1 py-2.5 rounded-xl border border-border text-sm font-medium btn-apple"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleDelete()}
                className="flex-1 py-2.5 rounded-xl bg-red-600 text-white text-sm font-medium btn-apple flex items-center justify-center gap-2"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
