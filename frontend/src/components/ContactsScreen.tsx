import { BookUser, Mail, Menu, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { useTheme } from './ThemeProvider';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthSessionExpiredError } from '@/services/auth';
import {
  createContact,
  deleteContact,
  fetchContacts,
  patchContact,
  type Contact,
} from '@/services/contacts';

interface ContactsScreenProps {
  onOpenMenu?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHome?: () => void;
  onSessionExpired?: () => void;
  userName?: string;
}

export function ContactsScreen({
  onOpenMenu,
  onNavigateToProfile,
  onNavigateToHome,
  onSessionExpired,
  userName = 'Maria Silva',
}: ContactsScreenProps) {
  const { themeColor } = useTheme();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formEmail, setFormEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const list = await fetchContacts();
        if (!cancelled) setContacts(list);
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) {
          onSessionExpired?.();
          return;
        }
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Erro ao carregar contatos.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onSessionExpired]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpenId(null);
      }
    };
    if (menuOpenId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuOpenId]);

  const openCreate = () => {
    setEditingId(null);
    setFormName('');
    setFormEmail('');
    setActionError(null);
    setDialogOpen(true);
  };

  const openEdit = (c: Contact) => {
    setEditingId(c.id);
    setFormName(c.name);
    setFormEmail(c.email);
    setActionError(null);
    setMenuOpenId(null);
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = formName.trim();
    const email = formEmail.trim();
    if (!name || !email) {
      setActionError('Preencha nome e e-mail.');
      return;
    }
    setIsSaving(true);
    setActionError(null);
    try {
      if (editingId) {
        const updated = await patchContact(editingId, { name, email });
        setContacts((prev) => prev.map((x) => (x.id === editingId ? updated : x)));
      } else {
        const created = await createContact(name, email);
        setContacts((prev) => [...prev, created].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')));
      }
      setDialogOpen(false);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Excluir este contato?')) return;
    setActionError(null);
    setMenuOpenId(null);
    try {
      await deleteContact(id);
      setContacts((prev) => prev.filter((c) => c.id !== id));
      if (editingId === id) {
        setDialogOpen(false);
        setEditingId(null);
      }
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  };

  const initials = (name: string) => {
    const parts = name.trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <>
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        <div className="px-5 pt-6 pb-3 border-b border-border bg-background">
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-xl hover:bg-muted/50 flex items-center justify-center btn-apple transition-colors"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              type="button"
              onClick={onNavigateToHome}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors btn-apple"
            >
              Kiki
            </button>
            <button
              type="button"
              onClick={onNavigateToProfile}
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center text-sm btn-apple-gradient shadow-sm`}
            >
              <span className="text-white font-medium">{userName.charAt(0).toUpperCase()}</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-2">
            <h2 className="text-2xl font-bold">Contatos</h2>
            <button
              type="button"
              onClick={openCreate}
              className={`w-11 h-11 rounded-full bg-gradient-to-br ${themeColor} text-white flex items-center justify-center btn-apple-gradient shadow-lg hover:shadow-xl transition-all`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
          <p className="text-sm text-muted-foreground mb-3">Nome e e-mail salvos só na sua conta.</p>
          {loadError ? (
            <p className="text-sm text-red-500" role="alert">
              {loadError}
            </p>
          ) : null}
          {actionError && !dialogOpen ? (
            <p className="text-sm text-red-500 mt-2" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-full gap-3 text-muted-foreground">
              <div
                className={`w-10 h-10 border-2 border-muted-foreground/30 border-t-purple-500 rounded-full animate-spin`}
              />
              <span className="text-sm">Carregando contatos…</span>
            </div>
          ) : contacts.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div
                className={`w-20 h-20 rounded-full bg-gradient-to-br ${themeColor} opacity-20 flex items-center justify-center mb-4`}
              >
                <BookUser className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2">Nenhum contato ainda</h3>
              <p className="text-sm text-muted-foreground mb-6">
                Adicione pessoas para consultar nome e e-mail quando precisar.
              </p>
              <button
                type="button"
                onClick={openCreate}
                className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-br ${themeColor} text-white rounded-full btn-apple-gradient shadow-lg hover:shadow-xl transition-all`}
              >
                <Plus className="w-5 h-5" />
                <span className="font-medium">Novo contato</span>
              </button>
            </div>
          ) : (
            <div className="py-4 px-5 space-y-2">
              {contacts.map((c) => (
                <div key={c.id} className="relative">
                  <button
                    type="button"
                    onClick={() => openEdit(c)}
                    className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:shadow-md transition-all btn-apple flex items-start gap-3"
                  >
                    <div
                      className={`w-11 h-11 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center text-white text-sm font-semibold shrink-0`}
                    >
                      {initials(c.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-base truncate">{c.name}</p>
                      <p className="text-sm text-muted-foreground truncate flex items-center gap-1.5 mt-0.5">
                        <Mail className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">{c.email}</span>
                      </p>
                    </div>
                    <div
                      className="relative shrink-0"
                      ref={menuOpenId === c.id ? menuRef : undefined}
                    >
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === c.id ? null : c.id);
                        }}
                        className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center btn-apple"
                      >
                        <MoreVertical className="w-4 h-4 text-muted-foreground" />
                      </button>
                      {menuOpenId === c.id ? (
                        <div className="absolute right-0 top-full mt-1 z-20 min-w-[140px] rounded-xl border border-border bg-popover shadow-lg py-1 text-sm">
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-muted flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEdit(c);
                            }}
                          >
                            <Pencil className="w-3.5 h-3.5" />
                            Editar
                          </button>
                          <button
                            type="button"
                            className="w-full px-3 py-2 text-left hover:bg-muted text-destructive flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDelete(c.id);
                            }}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            Excluir
                          </button>
                        </div>
                      ) : null}
                    </div>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setEditingId(null);
            setActionError(null);
          }
        }}
      >
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? 'Editar contato' : 'Novo contato'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label htmlFor="contact-name">Nome</Label>
              <Input
                id="contact-name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                placeholder="Nome completo"
                autoComplete="name"
                className="rounded-xl"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="contact-email">E-mail</Label>
              <Input
                id="contact-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                placeholder="email@exemplo.com"
                autoComplete="email"
                className="rounded-xl"
              />
            </div>
            {actionError ? (
              <p className="text-sm text-red-500" role="alert">
                {actionError}
              </p>
            ) : null}
          </div>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button type="button" variant="outline" onClick={() => setDialogOpen(false)} disabled={isSaving}>
              Cancelar
            </Button>
            <Button
              type="button"
              className={`bg-gradient-to-br ${themeColor} text-white border-0 hover:opacity-90`}
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? 'Salvando…' : 'Salvar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
