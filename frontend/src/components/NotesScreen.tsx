import {
  Check,
  ChevronDown,
  ChevronLeft,
  Lock,
  Menu,
  MoreVertical,
  Pin,
  Plus,
  Search,
  Share2,
  Trash2,
  Users,
  X,
} from 'lucide-react';
import { useEffect, useRef, useState, type RefObject } from 'react';
import { AppNotificationsBell } from './HomeNotificationsBell';
import { VoiceChatOrb } from './VoiceChatOrb';
import { useTheme } from './ThemeProvider';
import { AuthSessionExpiredError } from '@/services/auth';
import {
  createNote,
  deleteNote,
  fetchNoteCollaborators,
  fetchNotes,
  patchNote,
  shareNote,
  updateNoteCollaboratorRole,
  type Note,
  type NoteCollaborator,
} from '@/services/notes';
import { fetchFriends, type Friend } from '@/services/friends';

interface NotesScreenProps {
  onOpenMenu?: () => void;
  onNavigateToNotifications?: () => void;
  onNavigateToHome?: () => void;
  onSessionExpired?: () => void;
  userName?: string;
}

type NoteSection = {
  title: string;
  notes: Note[];
};

export function NotesScreen({
  onOpenMenu,
  onNavigateToNotifications,
  onNavigateToHome,
  onSessionExpired,
}: NotesScreenProps) {
  const { themeColor } = useTheme();
  const [notes, setNotes] = useState<Note[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showNoteMenu, setShowNoteMenu] = useState<string | null>(null);
  const [showSharePanel, setShowSharePanel] = useState(false);
  const [friends, setFriends] = useState<Friend[]>([]);
  const [collaborators, setCollaborators] = useState<NoteCollaborator[]>([]);
  const [shareFriendId, setShareFriendId] = useState('');
  const [shareFriendSearch, setShareFriendSearch] = useState('');
  const [shareRole, setShareRole] = useState<'editor' | 'viewer'>('editor');
  const [showRoleMenu, setShowRoleMenu] = useState(false);
  const [collaboratorRoleMenuId, setCollaboratorRoleMenuId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const sharePanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      setIsLoading(true);
      setLoadError(null);
      try {
        const list = await fetchNotes();
        if (!cancelled) setNotes(list);
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) {
          onSessionExpired?.();
          return;
        }
        if (!cancelled) setLoadError(e instanceof Error ? e.message : 'Erro ao carregar notas.');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [onSessionExpired]);

  useEffect(() => {
    void (async () => {
      try {
        setFriends(await fetchFriends());
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      }
    })();
  }, [onSessionExpired]);

  useEffect(() => {
    if (!editingNote?.id || editingNote.permissionRole !== 'owner') {
      setCollaborators([]);
      return;
    }
    void (async () => {
      try {
        setCollaborators(await fetchNoteCollaborators(editingNote.id));
      } catch (e) {
        if (e instanceof AuthSessionExpiredError) onSessionExpired?.();
      }
    })();
  }, [editingNote?.id, editingNote?.permissionRole, onSessionExpired]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (showNoteMenu !== null && menuRef.current && !menuRef.current.contains(target)) {
        setShowNoteMenu(null);
      }
      if (showSharePanel && sharePanelRef.current && !sharePanelRef.current.contains(target)) {
        setShowSharePanel(false);
        setShowRoleMenu(false);
        setCollaboratorRoleMenuId(null);
      }
    };

    if (showNoteMenu !== null || showSharePanel) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNoteMenu, showSharePanel]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      if (showSharePanel) {
        setShowSharePanel(false);
        setShowRoleMenu(false);
        setCollaboratorRoleMenuId(null);
        return;
      }
      if (editingNote) {
        handleCloseEditor();
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [editingNote, showSharePanel]);

  const filteredNotes = notes
    .filter((note) => {
      const q = searchQuery.trim().toLowerCase();
      if (!q) return true;
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q)
      );
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const unpinnedNotes = filteredNotes.filter((note) => !note.isPinned);
  const noteSections = groupNotesBySection(unpinnedNotes);
  const canEditCurrentNote = !editingNote || editingNote.permissionRole !== 'viewer';
  const shareFriendQuery = shareFriendSearch.trim().toLowerCase();
  const filteredShareFriends = shareFriendQuery
    ? friends.filter((friend) =>
        [friend.name, friend.nickname, friend.email]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(shareFriendQuery)),
      )
    : [];

  const handleCreateNote = () => {
    const newNote: Note = {
      id: '',
      title: '',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: false,
      tags: [],
      isLocked: false,
      permissionRole: 'owner',
      isShared: false,
    };
    setEditingNote(newNote);
    setIsCreatingNew(true);
    setActionError(null);
    setShowNoteMenu(null);
    setShowSharePanel(false);
    setShareFriendSearch('');
    setShowRoleMenu(false);
    setCollaboratorRoleMenuId(null);
  };

  const handleEditNote = (note: Note) => {
    if (note.isLocked) {
      const unlock = window.confirm('Esta nota está protegida. Desbloquear?');
      if (!unlock) return;
    }
    setEditingNote({ ...note });
    setIsCreatingNew(false);
    setShareFriendId('');
    setShareFriendSearch('');
    setActionError(null);
    setShowNoteMenu(null);
    setShowSharePanel(false);
    setShowRoleMenu(false);
    setCollaboratorRoleMenuId(null);
  };

  function handleCloseEditor() {
    setEditingNote(null);
    setIsCreatingNew(false);
    setShareFriendId('');
    setShareFriendSearch('');
    setActionError(null);
    setShowNoteMenu(null);
    setShowSharePanel(false);
    setShowRoleMenu(false);
    setCollaboratorRoleMenuId(null);
  }

  const handleSaveNote = async () => {
    if (!editingNote) return;

    setActionError(null);
    try {
      if (isCreatingNew) {
        const created = await createNote({
          title: editingNote.title,
          content: editingNote.content,
          isPinned: editingNote.isPinned,
          isLocked: editingNote.isLocked,
          tags: [],
        });
        setNotes((prev) => [created, ...prev]);
      } else {
        const updated = await patchNote(editingNote.id, {
          title: editingNote.title,
          content: editingNote.content,
          isPinned: editingNote.isPinned,
          isLocked: editingNote.isLocked,
          tags: editingNote.tags,
        });
        setNotes((prev) => prev.map((n) => (n.id === updated.id ? updated : n)));
      }

      handleCloseEditor();
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Não foi possível salvar.');
    }
  };

  const handleDeleteNote = async (id: string) => {
    if (!id) return;
    const confirmDelete = window.confirm('Excluir esta nota permanentemente?');
    if (!confirmDelete) return;

    setActionError(null);
    try {
      await deleteNote(id);
      setNotes((prev) => prev.filter((n) => n.id !== id));
      if (editingNote?.id === id) {
        handleCloseEditor();
      }
      setShowNoteMenu(null);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Não foi possível excluir.');
    }
  };

  const togglePinNote = async (id: string) => {
    if (!id) {
      setEditingNote((prev) => (prev ? { ...prev, isPinned: !prev.isPinned } : null));
      setShowNoteMenu(null);
      return;
    }

    const current = notes.find((n) => n.id === id);
    if (!current) return;

    setActionError(null);
    setShowNoteMenu(null);
    try {
      const updated = await patchNote(id, { isPinned: !current.isPinned });
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingNote((prev) => (prev?.id === id ? updated : prev));
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    }
  };

  const toggleLockNote = async (id: string) => {
    if (!id) {
      setEditingNote((prev) => (prev ? { ...prev, isLocked: !prev.isLocked } : null));
      setShowNoteMenu(null);
      return;
    }

    const current = notes.find((n) => n.id === id);
    if (!current) return;

    setActionError(null);
    setShowNoteMenu(null);
    try {
      const updated = await patchNote(id, { isLocked: !current.isLocked });
      setNotes((prev) => prev.map((n) => (n.id === id ? updated : n)));
      setEditingNote((prev) => (prev?.id === id ? updated : prev));
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Não foi possível atualizar.');
    }
  };

  const handleShareNote = async () => {
    if (!editingNote?.id) {
      setActionError('Salve a nota antes de compartilhar.');
      return;
    }
    if (!shareFriendId) return;

    setActionError(null);
    try {
      await shareNote(editingNote.id, shareFriendId, shareRole);
      setShareFriendId('');
      setShareFriendSearch('');
      setShowRoleMenu(false);
      setCollaboratorRoleMenuId(null);
      setCollaborators(await fetchNoteCollaborators(editingNote.id));
      setNotes((prev) => prev.map((n) => (n.id === editingNote.id ? { ...n, isShared: true } : n)));
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Não foi possível compartilhar.');
    }
  };

  const handleUpdateCollaboratorRole = async (
    collaborator: NoteCollaborator,
    nextRole: 'editor' | 'viewer',
  ) => {
    if (!editingNote?.id || collaborator.role === 'owner' || collaborator.role === nextRole) {
      setCollaboratorRoleMenuId(null);
      return;
    }

    setActionError(null);
    try {
      const updated = await updateNoteCollaboratorRole(editingNote.id, collaborator.userId, nextRole);
      setCollaborators((prev) =>
        prev.map((collab) => (collab.id === updated.id ? updated : collab)),
      );
      setCollaboratorRoleMenuId(null);
    } catch (e) {
      if (e instanceof AuthSessionExpiredError) {
        onSessionExpired?.();
        return;
      }
      setActionError(e instanceof Error ? e.message : 'Não foi possível alterar a permissão.');
    }
  };

  if (editingNote) {
    return (
      <>
        <div className="flex-1 flex flex-col bg-background overflow-hidden">
          <div className="relative flex-shrink-0 border-b border-border bg-background">
            <div className="flex h-14 items-center justify-between px-3">
              <button
                type="button"
                onClick={handleCloseEditor}
                className="btn-apple inline-flex h-10 items-center gap-1 rounded-full px-2 pr-3 text-sm font-medium text-purple-600 hover:bg-muted"
              >
                <ChevronLeft className="h-5 w-5" />
                Notas
              </button>

              <div className="flex items-center gap-1.5">
                {!isCreatingNew && editingNote.permissionRole === 'owner' ? (
                  <button
                    type="button"
                    onClick={() => {
                      setShowSharePanel((prev) => !prev);
                      setShowRoleMenu(false);
                    }}
                    className={`btn-apple flex h-9 w-9 items-center justify-center rounded-full transition-colors ${
                      showSharePanel
                        ? `bg-gradient-to-br ${themeColor} text-white shadow-md`
                        : 'hover:bg-muted text-muted-foreground'
                    }`}
                    aria-label="Compartilhar nota"
                  >
                    <Share2 className="h-4 w-4" />
                  </button>
                ) : null}

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setShowNoteMenu(showNoteMenu === 'editor' ? null : 'editor')}
                    className="btn-apple flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-muted"
                    aria-label="Mais opções"
                  >
                    <MoreVertical className="h-4 w-4" />
                  </button>

                  {showNoteMenu === 'editor' ? (
                    <NoteActionsMenu
                      refNode={menuRef}
                      isPinned={editingNote.isPinned}
                      isLocked={editingNote.isLocked}
                      canDelete={!isCreatingNew && editingNote.permissionRole === 'owner'}
                      canLock={editingNote.permissionRole === 'owner'}
                      onTogglePin={() => void togglePinNote(editingNote.id)}
                      onToggleLock={() => void toggleLockNote(editingNote.id)}
                      onDelete={() => void handleDeleteNote(editingNote.id)}
                    />
                  ) : null}
                </div>

                {canEditCurrentNote ? (
                  <button
                    type="button"
                    onClick={() => void handleSaveNote()}
                    disabled={!editingNote.title.trim() && !editingNote.content.trim()}
                    className={`btn-apple-gradient inline-flex h-9 items-center gap-1.5 rounded-full bg-gradient-to-br ${themeColor} px-3 text-sm font-semibold text-white shadow-md disabled:cursor-not-allowed disabled:opacity-45`}
                  >
                    <Check className="h-4 w-4" />
                    Salvar
                  </button>
                ) : null}
              </div>
            </div>

            {showSharePanel && !isCreatingNew && editingNote.permissionRole === 'owner' ? (
              <div
                ref={sharePanelRef}
                className="absolute right-3 top-12 z-50 w-[min(22rem,calc(100vw-1.5rem))] rounded-2xl border border-border bg-background shadow-xl"
              >
                <div className="flex items-center justify-between border-b border-border px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">Compartilhar nota</p>
                    <p className="text-xs text-muted-foreground">Enviar para um amigo da Kiki</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setShowSharePanel(false);
                      setShowRoleMenu(false);
                      setCollaboratorRoleMenuId(null);
                    }}
                    className="btn-apple flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:bg-muted"
                    aria-label="Fechar compartilhamento"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <div className="space-y-3 p-4">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      value={shareFriendSearch}
                      onChange={(e) => {
                        setShareFriendSearch(e.target.value);
                        setShareFriendId('');
                      }}
                      placeholder="Buscar amigo"
                      className="input-apple w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-3 text-sm focus:border-purple-500 focus:outline-none"
                    />

                    {shareFriendQuery && !shareFriendId && filteredShareFriends.length > 0 ? (
                      <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-10 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                        {filteredShareFriends.map((friend) => (
                          <button
                            key={friend.friendUserId}
                            type="button"
                            onClick={() => {
                              setShareFriendId(friend.friendUserId);
                              setShareFriendSearch(friend.name);
                            }}
                            className="btn-apple flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/45"
                          >
                            <span className="min-w-0">
                              <span className="block truncate font-medium">{friend.name}</span>
                              <span className="block truncate text-xs text-muted-foreground">
                                @{friend.nickname}
                              </span>
                            </span>
                            <Users className="h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>

                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setCollaboratorRoleMenuId(null);
                          setShowRoleMenu((prev) => !prev);
                        }}
                        className="btn-apple flex w-full items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm hover:bg-muted/30"
                      >
                        <span>{shareRole === 'editor' ? 'Pode editar' : 'Pode ler'}</span>
                        <ChevronDown
                          className={`h-4 w-4 text-muted-foreground transition-transform ${
                            showRoleMenu ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      {showRoleMenu ? (
                        <div className="absolute left-0 right-0 top-[calc(100%+0.375rem)] z-10 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                          {(['editor', 'viewer'] as const).map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => {
                                setShareRole(role);
                                setShowRoleMenu(false);
                              }}
                              className={`btn-apple flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/45 ${
                                shareRole === role ? 'text-purple-600' : ''
                              }`}
                            >
                              <span>{role === 'editor' ? 'Pode editar' : 'Pode ler'}</span>
                              {shareRole === role ? <Check className="h-4 w-4" /> : null}
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleShareNote()}
                      disabled={!shareFriendId}
                      className={`btn-apple-gradient rounded-xl bg-gradient-to-br ${themeColor} px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50`}
                    >
                      Enviar
                    </button>
                  </div>

                  {collaborators.length > 1 ? (
                    <div className="space-y-2 border-t border-border pt-3">
                      {collaborators.map((collab) => (
                        <div key={collab.id} className="flex items-center justify-between gap-3 text-xs">
                          <span className="min-w-0 truncate text-muted-foreground">
                            @{collab.nickname || collab.email}
                          </span>
                          <div className="relative shrink-0">
                            {collab.role === 'owner' ? (
                              <span className="inline-flex min-h-8 items-center rounded-full border border-transparent px-3 text-muted-foreground">
                                owner
                              </span>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setShowRoleMenu(false);
                                    setCollaboratorRoleMenuId((current) =>
                                      current === collab.id ? null : collab.id,
                                    );
                                  }}
                                  className="btn-apple inline-flex min-h-8 items-center gap-1.5 rounded-full border border-border bg-background px-3 text-muted-foreground hover:bg-muted/30"
                                >
                                  {collab.role === 'editor' ? 'editor' : 'leitor'}
                                  {!collab.acceptedAt ? ' · pendente' : ''}
                                  <ChevronDown
                                    className={`h-3.5 w-3.5 transition-transform ${
                                      collaboratorRoleMenuId === collab.id ? 'rotate-180' : ''
                                    }`}
                                  />
                                </button>

                                {collaboratorRoleMenuId === collab.id ? (
                                  <div className="absolute right-0 top-[calc(100%+0.375rem)] z-20 min-w-36 overflow-hidden rounded-xl border border-border bg-background shadow-lg">
                                    {(['editor', 'viewer'] as const).map((role) => (
                                      <button
                                        key={role}
                                        type="button"
                                        onClick={() => void handleUpdateCollaboratorRole(collab, role)}
                                        className={`btn-apple flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-muted/45 ${
                                          collab.role === role ? 'text-purple-600' : 'text-foreground'
                                        }`}
                                      >
                                        <span>{role === 'editor' ? 'Editor' : 'Leitor'}</span>
                                        {collab.role === role ? <Check className="h-4 w-4" /> : null}
                                      </button>
                                    ))}
                                  </div>
                                ) : null}
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>

          {actionError ? (
            <p className="mx-5 mt-3 rounded-xl bg-red-500/10 px-4 py-2 text-sm text-red-600" role="alert">
              {actionError}
            </p>
          ) : null}

          <div className="flex-1 overflow-y-auto px-5 py-4">
            <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col">
              <textarea
                value={editingNote.title}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                disabled={!canEditCurrentNote}
                placeholder="Título"
                rows={2}
                className="w-full resize-none overflow-hidden bg-transparent px-0 py-3 text-3xl font-bold leading-tight placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-70"
                autoFocus={isCreatingNew}
              />

              <div className="mb-5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                <span>{formatFullDate(editingNote.updatedAt)}</span>
                {editingNote.isPinned ? (
                  <span className="inline-flex items-center gap-1">
                    <Pin className="h-3 w-3" />
                    Fixada
                  </span>
                ) : null}
                {editingNote.isShared ? (
                  <span className="inline-flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    Compartilhada
                  </span>
                ) : null}
                {editingNote.isLocked ? (
                  <span className="inline-flex items-center gap-1">
                    <Lock className="h-3 w-3" />
                    Bloqueada
                  </span>
                ) : null}
              </div>

              <textarea
                value={editingNote.content}
                onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                disabled={!canEditCurrentNote}
                placeholder="Comece a escrever"
                className="min-h-[55vh] flex-1 resize-none bg-transparent px-0 pb-10 text-[17px] leading-7 placeholder:text-muted-foreground/60 focus:outline-none disabled:opacity-70"
              />
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        <div className="px-5 pt-6 pb-3 border-b border-border bg-background">
          <div className="mb-4 flex items-center justify-between">
            <button
              onClick={onOpenMenu}
              className="btn-apple flex h-10 w-10 items-center justify-center rounded-xl transition-colors hover:bg-muted/50"
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <button
              onClick={onNavigateToHome}
              className="btn-apple text-base font-medium text-muted-foreground transition-colors hover:text-foreground"
            >
              Kiki
            </button>
            <AppNotificationsBell onNavigateToAll={onNavigateToNotifications} />
          </div>

          <div className="mb-4 flex items-end justify-between gap-4">
            <div>
              <h2 className="text-[34px] font-bold leading-none tracking-normal">Notas</h2>
              <p className="mt-1 text-sm text-muted-foreground">{notes.length} notas</p>
            </div>
            <button
              onClick={handleCreateNote}
              className={`btn-apple-gradient flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${themeColor} text-white shadow-lg transition-all hover:shadow-xl`}
              aria-label="Criar nota"
            >
              <Plus className="h-5 w-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-apple w-full rounded-xl border border-border bg-background py-2.5 pl-10 pr-4 text-sm focus:border-purple-500 focus:outline-none"
            />
          </div>
          {loadError ? (
            <p className="mt-2 text-sm text-red-500" role="alert">
              {loadError}
            </p>
          ) : null}
          {actionError ? (
            <p className="mt-2 text-sm text-red-500" role="alert">
              {actionError}
            </p>
          ) : null}
        </div>

        <div className="flex-1 overflow-y-auto bg-background">
          {isLoading ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="h-10 w-10 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-purple-500" />
              <span className="text-sm">Carregando notas...</span>
            </div>
          ) : filteredNotes.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center px-8 text-center">
              <div className={`mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${themeColor} opacity-20`}>
                <Search className="h-10 w-10 text-white" />
              </div>
              <h3 className="mb-2 text-lg font-medium">
                {searchQuery ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
              </h3>
              <p className="mb-6 text-sm text-muted-foreground">
                {searchQuery ? 'Tente buscar por outro termo' : 'Crie sua primeira nota para começar'}
              </p>
              {!searchQuery ? (
                <button
                  onClick={handleCreateNote}
                  className={`btn-apple-gradient flex items-center gap-2 rounded-full bg-gradient-to-br ${themeColor} px-6 py-3 text-white shadow-lg transition-all hover:shadow-xl`}
                >
                  <Plus className="h-5 w-5" />
                  <span className="font-medium">Nova nota</span>
                </button>
              ) : null}
            </div>
          ) : (
            <div className="px-5 py-5">
              {pinnedNotes.length > 0 ? (
                <NotesSection
                  title="Fixadas"
                  notes={pinnedNotes}
                  showPin
                  onEdit={handleEditNote}
                />
              ) : null}

              {noteSections.map((section) => (
                <NotesSection
                  key={section.title}
                  title={section.title}
                  notes={section.notes}
                  onEdit={handleEditNote}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      <VoiceChatOrb />
    </>
  );
}

function NotesSection({
  title,
  notes,
  showPin = false,
  onEdit,
}: {
  title: string;
  notes: Note[];
  showPin?: boolean;
  onEdit: (note: Note) => void;
}) {
  return (
    <section className="mb-6">
      <h3 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </h3>
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        {notes.map((note, index) => (
          <div key={note.id} className="relative">
            <button
              type="button"
              onClick={() => onEdit(note)}
              className="btn-apple w-full px-4 py-3 text-left transition-colors hover:bg-muted/45"
            >
              <div className="grid grid-cols-[1fr_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 items-center gap-1.5">
                    {showPin ? <Pin className="h-3.5 w-3.5 shrink-0 text-muted-foreground" /> : null}
                    <h4 className="truncate text-base font-semibold">
                      {note.title || 'Sem título'}
                    </h4>
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">
                    <span className="text-foreground/75">{formatDate(note.updatedAt)}</span>
                    <span className="mx-1.5 text-muted-foreground/60">-</span>
                    {note.isLocked ? 'Nota bloqueada' : noteExcerpt(note)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-1.5 pt-0.5">
                  {note.isShared ? <Users className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                  {note.isLocked ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : null}
                </div>
              </div>
            </button>

            {index < notes.length - 1 ? <div className="mx-4 border-b border-border" /> : null}
          </div>
        ))}
      </div>
    </section>
  );
}

function NoteActionsMenu({
  refNode,
  isPinned,
  isLocked,
  canLock,
  canDelete,
  onTogglePin,
  onToggleLock,
  onDelete,
}: {
  refNode: RefObject<HTMLDivElement | null>;
  isPinned: boolean;
  isLocked: boolean;
  canLock: boolean;
  canDelete: boolean;
  onTogglePin: () => void;
  onToggleLock?: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      ref={refNode}
      className="absolute right-2 top-11 z-50 min-w-44 overflow-hidden rounded-xl border border-border bg-background shadow-lg"
    >
      <button
        type="button"
        onClick={onTogglePin}
        className="btn-apple flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
      >
        <Pin className="h-4 w-4" />
        {isPinned ? 'Desfixar' : 'Fixar'}
      </button>
      {canLock ? (
        <button
          type="button"
          onClick={onToggleLock}
          className="btn-apple flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm hover:bg-muted"
        >
          <Lock className="h-4 w-4" />
          {isLocked ? 'Desbloquear' : 'Bloquear'}
        </button>
      ) : null}
      {canDelete ? (
        <button
          type="button"
          onClick={onDelete}
          className="btn-apple flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm text-red-500 hover:bg-red-500/10"
        >
          <Trash2 className="h-4 w-4" />
          Excluir
        </button>
      ) : null}
    </div>
  );
}

function groupNotesBySection(notes: Note[]): NoteSection[] {
  const groups = new Map<string, Note[]>();
  notes.forEach((note) => {
    const label = sectionTitleForDate(note.updatedAt);
    groups.set(label, [...(groups.get(label) ?? []), note]);
  });

  return Array.from(groups.entries()).map(([title, groupedNotes]) => ({
    title,
    notes: groupedNotes,
  }));
}

function sectionTitleForDate(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return 'Hoje';
  if (diffDays === 1) return 'Ontem';
  if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString('pt-BR', { month: 'long' });
  }
  return date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

function formatDate(date: Date) {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diffDays = Math.round((startOfToday - startOfDate) / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }
  if (diffDays === 1) return 'Ontem';
  if (diffDays < 7) return date.toLocaleDateString('pt-BR', { weekday: 'short' });

  return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
}

function formatFullDate(date: Date) {
  return date.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function noteExcerpt(note: Note) {
  const firstLine = note.content
    .split('\n')
    .map((line) => line.trim())
    .find(Boolean);

  return firstLine || 'Sem conteúdo';
}
