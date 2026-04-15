import { useState, useEffect } from "react";
import { Plus, Trash2, Check, StickyNote, ListTodo, Bell, BellOff, Folder, ChevronLeft, Edit2 } from "lucide-react";
import { storage, migrateFolders, generateId, type Note, type Todo, type NoteFolder, type TodoFolder } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Notes() {
  const [tab, setTab] = useState<'notes' | 'todos'>('notes');
  const [noteFolders, setNoteFolders] = useState<NoteFolder[]>([]);
  const [todoFolders, setTodoFolders] = useState<TodoFolder[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);

  const [activeNoteFolderId, setActiveNoteFolderId] = useState<string | null>(null);
  const [activeTodoFolderId, setActiveTodoFolderId] = useState<string | null>(null);

  const [folderDialog, setFolderDialog] = useState<{ open: boolean, type: 'note' | 'todo', editId?: string }>({ open: false, type: 'note' });
  const [folderName, setFolderName] = useState('');
  const [deleteFolderId, setDeleteFolderId] = useState<{ id: string, type: 'note' | 'todo' } | null>(null);

  const [noteDialog, setNoteDialog] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', body: '' });
  const [todoInput, setTodoInput] = useState('');
  const [todoDueDate, setTodoDueDate] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);

  const { toast } = useToast();

  const load = () => {
    migrateFolders();
    setNoteFolders(storage.getNoteFolders());
    setTodoFolders(storage.getTodoFolders());
    setNotes(storage.getNotes());
    setTodos(storage.getTodos());
  };

  useEffect(() => { load(); }, []);

  const saveFolder = () => {
    if (!folderName.trim()) return;
    const now = new Date().toISOString();

    if (folderDialog.editId) {
      if (folderDialog.type === 'note') {
        storage.setNoteFolders(noteFolders.map(f => f.id === folderDialog.editId ? { ...f, name: folderName.trim() } : f));
      } else {
        storage.setTodoFolders(todoFolders.map(f => f.id === folderDialog.editId ? { ...f, name: folderName.trim() } : f));
      }
    } else {
      const newFolder = { id: generateId(), name: folderName.trim(), createdAt: now };
      if (folderDialog.type === 'note') {
        storage.setNoteFolders([...noteFolders, newFolder]);
      } else {
        storage.setTodoFolders([...todoFolders, newFolder]);
      }
    }

    setFolderDialog({ open: false, type: 'note' });
    setFolderName('');
    load();
  };

  const deleteFolder = () => {
    if (!deleteFolderId) return;
    if (deleteFolderId.type === 'note') {
      storage.setNoteFolders(noteFolders.filter(f => f.id !== deleteFolderId.id));
      storage.setNotes(notes.filter(n => n.folderId !== deleteFolderId.id));
      if (activeNoteFolderId === deleteFolderId.id) setActiveNoteFolderId(null);
    } else {
      storage.setTodoFolders(todoFolders.filter(f => f.id !== deleteFolderId.id));
      storage.setTodos(todos.filter(t => t.folderId !== deleteFolderId.id));
      if (activeTodoFolderId === deleteFolderId.id) setActiveTodoFolderId(null);
    }
    setDeleteFolderId(null);
    load();
    toast({ title: 'Directory removed' });
  };

  const openAddNote = () => {
    setEditNote(null);
    setNoteForm({ title: '', body: '' });
    setNoteDialog(true);
  };

  const openEditNote = (n: Note) => {
    setEditNote(n);
    setNoteForm({ title: n.title, body: n.body });
    setNoteDialog(true);
  };

  const saveNote = () => {
    if (!noteForm.title.trim() && !noteForm.body.trim()) {
      toast({ title: 'Note is empty', variant: 'destructive' });
      return;
    }
    if (!activeNoteFolderId) return;

    const all = storage.getNotes();
    const now = new Date().toISOString();
    if (editNote) {
      storage.setNotes(all.map(n => n.id === editNote.id ? { ...n, title: noteForm.title, body: noteForm.body, updatedAt: now } : n));
    } else {
      storage.setNotes([...all, { id: generateId(), folderId: activeNoteFolderId, title: noteForm.title || 'Untitled', body: noteForm.body, createdAt: now, updatedAt: now }]);
    }
    setNoteDialog(false);
    load();
  };

  const deleteNote = (id: string) => {
    storage.setNotes(storage.getNotes().filter(n => n.id !== id));
    setDeleteNoteId(null);
    load();
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoInput.trim() || !activeTodoFolderId) return;
    const all = storage.getTodos();
    const newTodo: Todo = {
      id: generateId(),
      folderId: activeTodoFolderId,
      text: todoInput.trim(),
      completed: false,
      dueDate: todoDueDate || undefined,
      reminderEnabled: false,
      createdAt: new Date().toISOString(),
    };
    storage.setTodos([...all, newTodo]);
    setTodoInput('');
    setTodoDueDate('');
    load();
  };

  const toggleTodo = (id: string) => {
    storage.setTodos(storage.getTodos().map(t => t.id === id ? { ...t, completed: !t.completed } : t));
    load();
  };

  const toggleReminder = (id: string) => {
    storage.setTodos(storage.getTodos().map(t => t.id === id ? { ...t, reminderEnabled: !t.reminderEnabled } : t));
    load();
  };

  const deleteTodo = (id: string) => {
    storage.setTodos(storage.getTodos().filter(t => t.id !== id));
    load();
  };

  const activeNoteFolder = noteFolders.find(f => f.id === activeNoteFolderId);
  const activeTodoFolder = todoFolders.find(f => f.id === activeTodoFolderId);

  const folderNotes = notes.filter(n => n.folderId === activeNoteFolderId);
  const folderTodos = todos.filter(t => t.folderId === activeTodoFolderId);
  const pendingTodos = folderTodos.filter(t => !t.completed);
  const completedTodos = folderTodos.filter(t => t.completed);

  const visibleTodoFolders = todoFolders.filter(f => f.name.toLowerCase() !== 'general' && f.id !== 'default-todos');

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-5">Notes & To-Do</h1>

      <div className="flex bg-muted rounded-2xl p-1 gap-1 mb-5">
        <button onClick={() => setTab('notes')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all", tab === 'notes' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
          <StickyNote className="w-4 h-4" /> Notes
        </button>
        <button onClick={() => setTab('todos')} className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all", tab === 'todos' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}>
          <ListTodo className="w-4 h-4" /> To-Do
        </button>
      </div>

      {tab === 'notes' && !activeNoteFolderId && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {noteFolders.map(folder => {
              const count = notes.filter(n => n.folderId === folder.id).length;
              return (
                <div key={folder.id} onClick={() => setActiveNoteFolderId(folder.id)} className="bg-card border border-card-border rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all group relative">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setFolderName(folder.name); setFolderDialog({ open: true, type: 'note', editId: folder.id }); }} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteFolderId({ id: folder.id, type: 'note' }) }} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <Folder className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground text-sm truncate">{folder.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{count} note{count !== 1 ? 's' : ''}</p>
                </div>
              );
            })}
          </div>
          {noteFolders.length === 0 && (
            <div className="text-center py-10">
              <Folder className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No folders created yet</p>
            </div>
          )}
          <button onClick={() => { setFolderName(''); setFolderDialog({ open: true, type: 'note' }); }} className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 z-40">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {tab === 'notes' && activeNoteFolderId && (
        <div>
          <button onClick={() => setActiveNoteFolderId(null)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Folders
          </button>
          <div className="flex items-center gap-2 mb-4">
            <Folder className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{activeNoteFolder?.name}</h2>
          </div>

          <div className="columns-1 sm:columns-2 gap-3 space-y-3">
            {folderNotes.map(n => (
              <div key={n.id} className="break-inside-avoid bg-card border border-card-border rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => openEditNote(n)}>
                <div className="flex items-start justify-between gap-2 mb-2">
                  <h3 className="font-semibold text-foreground text-sm leading-tight">{n.title}</h3>
                  <button onClick={e => { e.stopPropagation(); setDeleteNoteId(n.id); }} className="shrink-0 text-muted-foreground hover:text-destructive p-1 transition-colors">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
                {n.body && <p className="text-muted-foreground text-sm whitespace-pre-wrap line-clamp-6">{n.body}</p>}
                <p className="text-xs text-muted-foreground mt-2">{format(new Date(n.updatedAt), 'd MMM yyyy')}</p>
              </div>
            ))}
          </div>

          {folderNotes.length === 0 && (
            <div className="text-center py-10 bg-card border border-card-border rounded-2xl">
              <StickyNote className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">Folder is empty</p>
            </div>
          )}

          <button onClick={openAddNote} className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 z-40">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {tab === 'todos' && !activeTodoFolderId && (
        <div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {visibleTodoFolders.map(folder => {
              const count = todos.filter(t => t.folderId === folder.id && !t.completed).length;
              return (
                <div key={folder.id} onClick={() => setActiveTodoFolderId(folder.id)} className="bg-card border border-card-border rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-all group relative">
                  <div className="absolute top-2 right-2 flex gap-1">
                    <button onClick={(e) => { e.stopPropagation(); setFolderName(folder.name); setFolderDialog({ open: true, type: 'todo', editId: folder.id }); }} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-primary hover:bg-primary/10 transition-colors">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); setDeleteFolderId({ id: folder.id, type: 'todo' }) }} className="p-1.5 rounded-lg text-muted-foreground/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <ListTodo className="w-8 h-8 text-primary mb-3" />
                  <h3 className="font-semibold text-foreground text-sm truncate">{folder.name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{count} pending</p>
                </div>
              );
            })}
          </div>
          {visibleTodoFolders.length === 0 && (
            <div className="text-center py-10">
              <Folder className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground mb-3">No lists created yet</p>
            </div>
          )}
          <button onClick={() => { setFolderName(''); setFolderDialog({ open: true, type: 'todo' }); }} className="fixed bottom-24 md:bottom-10 right-6 md:right-10 w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg shadow-primary/30 flex items-center justify-center hover:bg-primary/90 transition-all active:scale-95 z-40">
            <Plus className="w-6 h-6" />
          </button>
        </div>
      )}

      {tab === 'todos' && activeTodoFolderId && (
        <div>
          <button onClick={() => setActiveTodoFolderId(null)} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors mb-4">
            <ChevronLeft className="w-4 h-4" /> Back to Lists
          </button>
          <div className="flex items-center gap-2 mb-4">
            <ListTodo className="w-5 h-5 text-primary" />
            <h2 className="text-lg font-bold text-foreground">{activeTodoFolder?.name}</h2>
          </div>

          <form onSubmit={addTodo} className="bg-card border border-card-border rounded-2xl p-3 shadow-sm flex flex-col gap-3 relative focus-within:ring-2 focus-within:ring-primary/20 transition-all mb-4">
            <div className="flex items-center gap-3">
              <div className="w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex shrink-0 ml-1" />
              <input placeholder="What needs to be done?" value={todoInput} onChange={e => setTodoInput(e.target.value)} className="flex-1 bg-transparent border-none shadow-none focus:outline-none text-foreground text-sm font-semibold placeholder:text-muted-foreground/60 h-8" />
            </div>
            <div className="flex items-center justify-between pl-9 pr-1">
              <input placeholder="Due date" id="todo-due" type="date" value={todoDueDate} onChange={e => setTodoDueDate(e.target.value)} className="bg-muted text-muted-foreground hover:text-foreground text-xs font-semibold rounded-lg px-2.5 py-1.5 border-none focus:outline-none cursor-pointer transition-colors" />
              <Button className="h-8 rounded-xl px-4 text-xs font-bold shadow-sm" type="submit" disabled={!todoInput.trim()}>
                Add Task
              </Button>
            </div>
          </form>

          {pendingTodos.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pending</p>
              <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
                {pendingTodos.map((todo, idx) => (
                  <div key={todo.id} className={`group flex items-center gap-3 px-4 py-3 ${idx < pendingTodos.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/30 transition-colors`}>
                    <button onClick={() => toggleTodo(todo.id)} className="relative w-5 h-5 rounded-full border-2 border-muted-foreground/30 flex items-center justify-center shrink-0 hover:border-primary transition-colors group-active:scale-95"></button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{todo.text}</p>
                      {todo.dueDate && <p className="text-[11px] font-medium text-muted-foreground/80 mt-0.5">Due: {format(new Date(todo.dueDate + 'T00:00:00'), 'd MMM yyyy')}</p>}
                    </div>
                    <div className="flex gap-1.5 shrink-0 transition-opacity">
                      <button onClick={() => toggleReminder(todo.id)} className={cn("w-8 h-8 rounded-xl flex items-center justify-center transition-colors", todo.reminderEnabled ? "bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400" : "text-muted-foreground hover:bg-muted hover:text-foreground")}>
                        {todo.reminderEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                      </button>
                      <button onClick={() => deleteTodo(todo.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-red-100 hover:text-destructive dark:hover:bg-red-900/30 transition-colors">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {completedTodos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Completed</p>
              <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm opacity-70">
                {completedTodos.map((todo, idx) => (
                  <div key={todo.id} className={`group flex items-center gap-3 px-4 py-3 ${idx < completedTodos.length - 1 ? 'border-b border-border' : ''} hover:bg-muted/30 transition-colors`}>
                    <button onClick={() => toggleTodo(todo.id)} className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0 group-active:scale-95 transition-transform">
                      <Check className="w-3 h-3 text-white" />
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-muted-foreground line-through truncate">{todo.text}</p>
                    </div>
                    <button onClick={() => deleteTodo(todo.id)} className="w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:bg-red-100 hover:text-destructive dark:hover:bg-red-900/30 transition-all shrink-0">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {folderTodos.length === 0 && (
            <div className="text-center py-10 bg-card border border-card-border rounded-2xl">
              <ListTodo className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-sm text-muted-foreground">List is empty</p>
            </div>
          )}
        </div>
      )}

      {/* Create Folder Dialog */}
      <Dialog open={folderDialog.open} onOpenChange={(v) => { if (!v) setFolderDialog({ ...folderDialog, open: false }) }}>
        <DialogContent className="max-w-sm rounded-2xl">
          <DialogHeader><DialogTitle>{folderDialog.editId ? 'Edit' : 'New'} {folderDialog.type === 'note' ? 'Folder' : 'List'}</DialogTitle></DialogHeader>
          <Input placeholder="Name..." value={folderName} onChange={e => setFolderName(e.target.value)} autoFocus />
          <DialogFooter className="flex flex-row justify-center gap-2">
            <Button className="w-1/2" variant="outline" onClick={() => setFolderDialog({ ...folderDialog, open: false })}>Cancel</Button>
            <Button className="w-1/2" onClick={saveFolder}>{folderDialog.editId ? 'Save' : 'Create'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Folder Dialog */}
      <Dialog open={!!deleteFolderId} onOpenChange={() => setDeleteFolderId(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Delete {deleteFolderId?.type === 'note' ? 'Folder' : 'List'}</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">Are you sure? This will delete all items inside it.</p>
          <DialogFooter className="flex flex-row justify-center gap-2">
            <Button className="w-1/2" variant="outline" onClick={() => setDeleteFolderId(null)}>Cancel</Button>
            <Button className="w-1/2" variant="destructive" onClick={deleteFolder}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Note Edit Dialog */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="max-w-lg rounded-2xl w-[90vw] sm:w-[80vw] h-[80vh] flex flex-col">
          <DialogHeader><DialogTitle>{editNote ? 'Edit Note' : 'New Note'}</DialogTitle></DialogHeader>
          <div className="flex flex-col flex-1 space-y-3 min-h-0 mt-2">
            <Input placeholder="Title" value={noteForm.title} onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))} />
            <Textarea className="flex-1 resize-none" placeholder="Write your note here..." value={noteForm.body} onChange={e => setNoteForm(f => ({ ...f, body: e.target.value }))} />
          </div>
          <DialogFooter className="flex flex-row justify-center gap-2 mt-4">
            <Button className="w-1/2" variant="outline" onClick={() => setNoteDialog(false)}>Cancel</Button>
            <Button className="w-1/2" onClick={saveNote}>Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Note Dialog */}
      <Dialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader><DialogTitle>Delete Note</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">Are you sure you want to delete this note?</p>
          <DialogFooter className="flex flex-row justify-center gap-2">
            <Button className="w-1/2" variant="outline" onClick={() => setDeleteNoteId(null)}>Cancel</Button>
            <Button className="w-1/2" variant="destructive" onClick={() => deleteNote(deleteNoteId!)}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
