import { Plus, Search, Menu, Trash2, X, Pin, Share2, Lock, Hash, Calendar, Clock, MoreVertical, ChevronRight } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { VoiceChatOrb } from './VoiceChatOrb';
import { useTheme } from './ThemeProvider';

interface Note {
  id: number;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
  isPinned: boolean;
  tags: string[];
  isLocked: boolean;
}

interface NotesScreenProps {
  onOpenMenu?: () => void;
  onNavigateToProfile?: () => void;
  onNavigateToHome?: () => void;
  userName?: string;
}

interface GroupedNotes {
  [year: string]: {
    [month: string]: Note[];
  };
}

export function NotesScreen({ onOpenMenu, onNavigateToProfile, onNavigateToHome, userName = 'Maria Silva' }: NotesScreenProps) {
  const { themeColor } = useTheme();
  const [notes, setNotes] = useState<Note[]>([
    {
      id: 1,
      title: 'Ideias para o projeto',
      content: 'Implementar sistema de notificações push\nAdicionar dark mode\nMelhorar performance do calendário',
      createdAt: new Date('2026-05-01'),
      updatedAt: new Date('2026-05-03'),
      isPinned: true,
      tags: ['trabalho', 'projeto'],
      isLocked: false,
    },
    {
      id: 2,
      title: 'Lista de compras',
      content: 'Café\nLeite\nPão\nFrutas\nVerduras',
      createdAt: new Date('2026-05-02'),
      updatedAt: new Date('2026-05-02'),
      isPinned: false,
      tags: ['pessoal'],
      isLocked: false,
    },
    {
      id: 3,
      title: 'Reunião com cliente',
      content: 'Discutir novos requisitos\nApresentar protótipo\nDefinir cronograma\nOrçamento revisado',
      createdAt: new Date('2026-04-28'),
      updatedAt: new Date('2026-04-30'),
      isPinned: true,
      tags: ['trabalho', 'reunião'],
      isLocked: false,
    },
    {
      id: 4,
      title: 'Metas 2025',
      content: 'Aprender piano\nLer 24 livros\nViajar para 3 países\nMelhorar fitness',
      createdAt: new Date('2025-12-28'),
      updatedAt: new Date('2025-12-31'),
      isPinned: false,
      tags: ['pessoal', 'metas'],
      isLocked: false,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [showNoteMenu, setShowNoteMenu] = useState<number | null>(null);
  const [swipedNote, setSwipedNote] = useState<number | null>(null);
  const [searchInNote, setSearchInNote] = useState('');
  const [newTag, setNewTag] = useState('');
  const [showShareMenu, setShowShareMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setShowNoteMenu(null);
      }
    };

    if (showNoteMenu !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showNoteMenu]);

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (showShareMenu) {
          setShowShareMenu(false);
        } else if (editingNote) {
          handleCancelEdit();
        }
      }
    };

    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [editingNote, showShareMenu]);

  const filteredNotes = notes.filter(
    (note) =>
      note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      note.tags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const groupNotesByDate = (notesToGroup: Note[]): GroupedNotes => {
    const grouped: GroupedNotes = {};

    notesToGroup.forEach((note) => {
      const year = note.updatedAt.getFullYear().toString();
      const month = note.updatedAt.toLocaleDateString('pt-BR', { month: 'long' });

      if (!grouped[year]) {
        grouped[year] = {};
      }
      if (!grouped[year][month]) {
        grouped[year][month] = [];
      }
      grouped[year][month].push(note);
    });

    return grouped;
  };

  const pinnedNotes = filteredNotes.filter((note) => note.isPinned);
  const unpinnedNotes = filteredNotes.filter((note) => !note.isPinned);
  const groupedNotes = groupNotesByDate(unpinnedNotes);

  const handleCreateNote = () => {
    const newNote: Note = {
      id: Math.max(...notes.map((n) => n.id), 0) + 1,
      title: '',
      content: '',
      createdAt: new Date(),
      updatedAt: new Date(),
      isPinned: false,
      tags: [],
      isLocked: false,
    };
    setEditingNote(newNote);
    setIsCreatingNew(true);
  };

  const handleEditNote = (note: Note) => {
    if (note.isLocked) {
      // Simular autenticação
      const unlock = window.confirm('Esta nota está protegida. Desbloquear?');
      if (!unlock) return;
    }
    setEditingNote({ ...note });
    setIsCreatingNew(false);
    setSearchInNote('');
  };

  const handleSaveNote = () => {
    if (!editingNote) return;

    if (isCreatingNew) {
      setNotes((prev) => [editingNote, ...prev]);
    } else {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === editingNote.id ? { ...editingNote, updatedAt: new Date() } : n
        )
      );
    }

    setEditingNote(null);
    setIsCreatingNew(false);
    setSearchInNote('');
  };

  const handleDeleteNote = (id: number) => {
    const confirmDelete = window.confirm('Excluir esta nota permanentemente?');
    if (!confirmDelete) return;

    setNotes((prev) => prev.filter((n) => n.id !== id));
    if (editingNote?.id === id) {
      setEditingNote(null);
      setIsCreatingNew(false);
    }
    setShowNoteMenu(null);
  };

  const handleCancelEdit = () => {
    setEditingNote(null);
    setIsCreatingNew(false);
    setSearchInNote('');
  };

  const togglePinNote = (id: number) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isPinned: !n.isPinned } : n))
    );
    if (editingNote?.id === id) {
      setEditingNote((prev) => prev ? { ...prev, isPinned: !prev.isPinned } : null);
    }
    setShowNoteMenu(null);
  };

  const toggleLockNote = (id: number) => {
    setNotes((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isLocked: !n.isLocked } : n))
    );
    if (editingNote?.id === id) {
      setEditingNote((prev) => prev ? { ...prev, isLocked: !prev.isLocked } : null);
    }
  };

  const handleShareNote = () => {
    setShowShareMenu(true);
  };

  const addTagToNote = () => {
    if (!editingNote || !newTag.trim()) return;

    const tag = newTag.trim().toLowerCase().replace(/^#/, '');
    if (editingNote.tags.includes(tag)) {
      setNewTag('');
      return;
    }

    setEditingNote({
      ...editingNote,
      tags: [...editingNote.tags, tag],
    });
    setNewTag('');
  };

  const removeTagFromNote = (tag: string) => {
    if (!editingNote) return;

    setEditingNote({
      ...editingNote,
      tags: editingNote.tags.filter((t) => t !== tag),
    });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Hoje';
    if (diffDays === 1) return 'Ontem';
    if (diffDays < 7) return `${diffDays}d atrás`;

    return date.toLocaleDateString('pt-BR', { day: 'numeric', month: 'short' });
  };

  const formatFullDate = (date: Date) => {
    return date.toLocaleDateString('pt-BR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const highlightSearchText = (text: string, search: string) => {
    if (!search) return text;

    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === search.toLowerCase() ? (
        <mark key={i} className="bg-yellow-200 text-foreground rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <>
      <div className="flex-1 flex flex-col bg-background overflow-hidden">
        <div className="px-5 pt-6 pb-3 border-b border-border bg-background">
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={onOpenMenu}
              className="w-10 h-10 rounded-xl hover:bg-muted/50 flex items-center justify-center btn-apple transition-colors"
            >
              <Menu className="w-5 h-5 text-muted-foreground" />
            </button>
            <button
              onClick={onNavigateToHome}
              className="text-base font-medium text-muted-foreground hover:text-foreground transition-colors btn-apple"
            >
              Kiki
            </button>
            <button
              onClick={onNavigateToProfile}
              className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center text-sm btn-apple-gradient shadow-sm`}
            >
              <span className="text-white font-medium">{userName.charAt(0).toUpperCase()}</span>
            </button>
          </div>

          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold">Notas</h2>
            <button
              onClick={handleCreateNote}
              className={`w-11 h-11 rounded-full bg-gradient-to-br ${themeColor} text-white flex items-center justify-center btn-apple-gradient shadow-lg hover:shadow-xl transition-all`}
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Buscar por título, conteúdo ou tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center px-8">
              <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${themeColor} opacity-20 flex items-center justify-center mb-4`}>
                <Search className="w-10 h-10 text-white" />
              </div>
              <h3 className="text-lg font-medium mb-2">
                {searchQuery ? 'Nenhuma nota encontrada' : 'Nenhuma nota ainda'}
              </h3>
              <p className="text-sm text-muted-foreground mb-6">
                {searchQuery
                  ? 'Tente buscar por outro termo'
                  : 'Crie sua primeira nota para começar'}
              </p>
              {!searchQuery && (
                <button
                  onClick={handleCreateNote}
                  className={`flex items-center gap-2 px-6 py-3 bg-gradient-to-br ${themeColor} text-white rounded-full btn-apple-gradient shadow-lg hover:shadow-xl transition-all`}
                >
                  <Plus className="w-5 h-5" />
                  <span className="font-medium">Nova nota</span>
                </button>
              )}
            </div>
          ) : (
            <div className="py-4">
              {pinnedNotes.length > 0 && (
                <div className="mb-6">
                  <div className="px-5 mb-2 flex items-center gap-2">
                    <Pin className="w-3.5 h-3.5 text-muted-foreground" />
                    <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      Fixadas
                    </h3>
                  </div>
                  <div className="space-y-2 px-5">
                    {pinnedNotes.map((note) => (
                      <div key={note.id} className="relative">
                        <div
                          onClick={() => handleEditNote(note)}
                          className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:shadow-md transition-all btn-apple relative overflow-hidden cursor-pointer"
                        >
                          <div className="flex items-start justify-between gap-3 mb-1.5">
                            <h3 className="text-base font-semibold flex-1 line-clamp-1">
                              {note.title || 'Sem título'}
                            </h3>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {note.isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowNoteMenu(showNoteMenu === note.id ? null : note.id);
                                }}
                                className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center btn-apple"
                              >
                                <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                              </button>
                            </div>
                          </div>
                          <p className="text-sm text-muted-foreground/80 line-clamp-2 whitespace-pre-wrap mb-2">
                            {note.content || 'Sem conteúdo'}
                          </p>
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex flex-wrap gap-1.5">
                              {note.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground"
                                >
                                  <Hash className="w-2.5 h-2.5" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                            <span className="text-[10px] text-muted-foreground">
                              {formatDate(note.updatedAt)}
                            </span>
                          </div>
                        </div>

                        {showNoteMenu === note.id && (
                          <div
                            ref={menuRef}
                            className="absolute top-12 right-4 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50 min-w-[160px]"
                          >
                            <button
                              onClick={() => togglePinNote(note.id)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted btn-apple text-left"
                            >
                              <Pin className="w-4 h-4" />
                              Desfixar
                            </button>
                            <button
                              onClick={() => handleShareNote()}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted btn-apple text-left"
                            >
                              <Share2 className="w-4 h-4" />
                              Compartilhar
                            </button>
                            <button
                              onClick={() => handleDeleteNote(note.id)}
                              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-red-50 text-red-500 btn-apple text-left"
                            >
                              <Trash2 className="w-4 h-4" />
                              Excluir
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {Object.keys(groupedNotes)
                .sort((a, b) => parseInt(b) - parseInt(a))
                .map((year) => (
                  <div key={year} className="mb-6">
                    <div className="px-5 mb-2">
                      <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        {year}
                      </h3>
                    </div>
                    {Object.keys(groupedNotes[year])
                      .reverse()
                      .map((month) => (
                        <div key={month} className="mb-4">
                          <div className="px-5 mb-2">
                            <h4 className="text-xs font-medium text-muted-foreground capitalize">
                              {month}
                            </h4>
                          </div>
                          <div className="space-y-2 px-5">
                            {groupedNotes[year][month].map((note) => (
                              <div key={note.id} className="relative">
                                <div
                                  onClick={() => handleEditNote(note)}
                                  className="w-full bg-card border border-border rounded-2xl p-4 text-left hover:shadow-md transition-all btn-apple cursor-pointer"
                                >
                                  <div className="flex items-start justify-between gap-3 mb-1.5">
                                    <h3 className="text-base font-semibold flex-1 line-clamp-1">
                                      {note.title || 'Sem título'}
                                    </h3>
                                    <div className="flex items-center gap-2 flex-shrink-0">
                                      {note.isLocked && <Lock className="w-3.5 h-3.5 text-muted-foreground" />}
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setShowNoteMenu(showNoteMenu === note.id ? null : note.id);
                                        }}
                                        className="w-6 h-6 rounded-full hover:bg-muted flex items-center justify-center btn-apple"
                                      >
                                        <MoreVertical className="w-3.5 h-3.5 text-muted-foreground" />
                                      </button>
                                    </div>
                                  </div>
                                  <p className="text-sm text-muted-foreground/80 line-clamp-2 whitespace-pre-wrap mb-2">
                                    {note.content || 'Sem conteúdo'}
                                  </p>
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex flex-wrap gap-1.5">
                                      {note.tags.map((tag) => (
                                        <span
                                          key={tag}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-muted text-[10px] text-muted-foreground"
                                        >
                                          <Hash className="w-2.5 h-2.5" />
                                          {tag}
                                        </span>
                                      ))}
                                    </div>
                                    <span className="text-[10px] text-muted-foreground">
                                      {formatDate(note.updatedAt)}
                                    </span>
                                  </div>
                                </div>

                                {showNoteMenu === note.id && (
                                  <div
                                    ref={menuRef}
                                    className="absolute top-12 right-4 bg-background border border-border rounded-xl shadow-lg overflow-hidden z-50 min-w-[160px]"
                                  >
                                    <button
                                      onClick={() => togglePinNote(note.id)}
                                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted btn-apple text-left"
                                    >
                                      <Pin className="w-4 h-4" />
                                      Fixar
                                    </button>
                                    <button
                                      onClick={() => handleShareNote()}
                                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-muted btn-apple text-left"
                                    >
                                      <Share2 className="w-4 h-4" />
                                      Compartilhar
                                    </button>
                                    <button
                                      onClick={() => handleDeleteNote(note.id)}
                                      className="w-full flex items-center gap-2 px-3 py-2.5 text-sm hover:bg-red-50 text-red-500 btn-apple text-left"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                      Excluir
                                    </button>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                  </div>
                ))}
            </div>
          )}
        </div>
      </div>

      {editingNote && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4 transition-all duration-200 ease-out"
          onClick={handleCancelEdit}
          style={{ animation: 'fadeIn 200ms ease-out' }}
        >
          <div
            className="bg-background rounded-3xl w-full max-w-3xl max-h-[90vh] shadow-2xl flex flex-col transition-all duration-200 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scaleIn 200ms ease-out' }}
          >
            <div className="flex-shrink-0 bg-background border-b border-border px-5 py-4 rounded-t-3xl">
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={handleCancelEdit}
                  className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center btn-apple transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => togglePinNote(editingNote.id)}
                    className={`w-9 h-9 rounded-full flex items-center justify-center btn-apple transition-all ${
                      editingNote.isPinned
                        ? `bg-gradient-to-br ${themeColor} text-white shadow-md`
                        : 'hover:bg-muted'
                    }`}
                  >
                    <Pin className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleShareNote}
                    className="w-9 h-9 rounded-full hover:bg-muted flex items-center justify-center btn-apple transition-colors"
                  >
                    <Share2 className="w-4 h-4" />
                  </button>
                  {!isCreatingNew && (
                    <button
                      onClick={() => toggleLockNote(editingNote.id)}
                      className={`w-9 h-9 rounded-full flex items-center justify-center btn-apple transition-all ${
                        editingNote.isLocked
                          ? `bg-gradient-to-br ${themeColor} text-white shadow-md`
                          : 'hover:bg-muted'
                      }`}
                    >
                      <Lock className="w-4 h-4" />
                    </button>
                  )}
                  {!isCreatingNew && (
                    <button
                      onClick={() => handleDeleteNote(editingNote.id)}
                      className="w-9 h-9 rounded-full hover:bg-red-500/10 text-red-500 flex items-center justify-center btn-apple transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Buscar nesta nota..."
                  value={searchInNote}
                  onChange={(e) => setSearchInNote(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple transition-colors"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-5">
              <input
                type="text"
                value={editingNote.title}
                onChange={(e) => setEditingNote({ ...editingNote, title: e.target.value })}
                placeholder="Título da nota"
                className="w-full px-0 py-2 text-2xl font-bold bg-transparent border-0 focus:outline-none placeholder:text-muted-foreground mb-3"
                autoFocus={isCreatingNew}
              />

              <div className="flex items-center gap-3 mb-4 text-xs text-muted-foreground">
                <div className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  <span>{formatFullDate(editingNote.createdAt)}</span>
                </div>
                {!isCreatingNew && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    <span>Editado {formatDate(editingNote.updatedAt)}</span>
                  </div>
                )}
              </div>

              <div className="mb-5">
                <div className="flex flex-wrap gap-2 mb-2">
                  {editingNote.tags.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => removeTagFromNote(tag)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-br ${themeColor} text-white text-xs btn-apple hover:opacity-90 transition-opacity`}
                    >
                      <Hash className="w-3 h-3" />
                      {tag}
                      <X className="w-3 h-3" />
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addTagToNote();
                      }
                    }}
                    placeholder="Adicionar tag..."
                    className="flex-1 px-3 py-2 text-sm rounded-xl bg-muted border border-border focus:border-purple-500 focus:outline-none input-apple transition-colors"
                  />
                  <button
                    onClick={addTagToNote}
                    disabled={!newTag.trim()}
                    className="px-4 py-2 text-sm rounded-xl bg-muted hover:bg-muted/80 btn-apple disabled:opacity-50 transition-colors"
                  >
                    Adicionar
                  </button>
                </div>
              </div>

              <div className="border-t border-border pt-4">
                <textarea
                  value={editingNote.content}
                  onChange={(e) => setEditingNote({ ...editingNote, content: e.target.value })}
                  placeholder="Comece a escrever..."
                  rows={14}
                  className="w-full px-0 py-0 text-base leading-relaxed bg-transparent border-0 focus:outline-none resize-none placeholder:text-muted-foreground"
                >
                  {searchInNote
                    ? highlightSearchText(editingNote.content, searchInNote)
                    : editingNote.content}
                </textarea>
              </div>
            </div>

            <div className="flex-shrink-0 bg-background border-t border-border px-6 py-4 rounded-b-3xl">
              <div className="flex gap-3">
                <button
                  onClick={handleCancelEdit}
                  className="flex-1 px-4 py-3 text-sm font-medium rounded-xl bg-muted hover:bg-muted/80 btn-apple transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSaveNote}
                  disabled={!editingNote.title.trim() && !editingNote.content.trim()}
                  className={`flex-1 px-4 py-3 text-sm font-medium rounded-xl bg-gradient-to-br ${themeColor} text-white btn-apple-gradient disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl transition-all`}
                >
                  {isCreatingNew ? 'Criar nota' : 'Salvar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showShareMenu && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[110] flex items-center justify-center p-4 transition-all duration-200 ease-out"
          onClick={() => setShowShareMenu(false)}
          style={{ animation: 'fadeIn 200ms ease-out' }}
        >
          <div
            className="bg-background rounded-3xl w-full max-w-md p-6 shadow-2xl transition-all duration-200 ease-out"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'scaleIn 200ms ease-out' }}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-semibold">Compartilhar nota</h3>
              <button
                onClick={() => setShowShareMenu(false)}
                className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center btn-apple transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-2">
              <button
                onClick={() => {
                  // Copiar link
                  setShowShareMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 btn-apple text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Copiar link</span>
              </button>
              <button
                onClick={() => {
                  // Enviar email
                  setShowShareMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 btn-apple text-left transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center text-white">
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Enviar por e-mail</span>
              </button>
              <button
                onClick={() => {
                  // Exportar PDF
                  setShowShareMenu(false);
                }}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-muted hover:bg-muted/80 btn-apple text-left transition-colors"
              >
                <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${themeColor} flex items-center justify-center text-white`}>
                  <Share2 className="w-5 h-5" />
                </div>
                <span className="text-sm font-medium">Exportar como PDF</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <VoiceChatOrb />
    </>
  );
}
