import { useState, useEffect } from "react";
import { Plus, Trash2, Check, StickyNote, ListTodo, Bell, BellOff, X } from "lucide-react";
import { storage, generateId, type Note, type Todo } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import { format } from "date-fns";

export default function Notes() {
  const [tab, setTab] = useState<'notes' | 'todos'>('notes');
  const [notes, setNotes] = useState<Note[]>([]);
  const [todos, setTodos] = useState<Todo[]>([]);
  const [noteDialog, setNoteDialog] = useState(false);
  const [editNote, setEditNote] = useState<Note | null>(null);
  const [noteForm, setNoteForm] = useState({ title: '', body: '' });
  const [todoInput, setTodoInput] = useState('');
  const [todoDueDate, setTodoDueDate] = useState('');
  const [deleteNoteId, setDeleteNoteId] = useState<string | null>(null);
  const { toast } = useToast();

  const load = () => {
    setNotes(storage.getNotes());
    setTodos(storage.getTodos());
  };

  useEffect(() => { load(); }, []);

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
    const all = storage.getNotes();
    const now = new Date().toISOString();
    if (editNote) {
      storage.setNotes(all.map(n => n.id === editNote.id ? { ...n, title: noteForm.title, body: noteForm.body, updatedAt: now } : n));
    } else {
      storage.setNotes([...all, { id: generateId(), title: noteForm.title || 'Untitled', body: noteForm.body, createdAt: now, updatedAt: now }]);
    }
    setNoteDialog(false);
    load();
  };

  const deleteNote = (id: string) => {
    storage.setNotes(storage.getNotes().filter(n => n.id !== id));
    setDeleteNoteId(null);
    load();
    toast({ title: 'Note deleted' });
  };

  const addTodo = (e: React.FormEvent) => {
    e.preventDefault();
    if (!todoInput.trim()) return;
    const all = storage.getTodos();
    const newTodo: Todo = {
      id: generateId(),
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
    toast({ title: 'To-do removed' });
  };

  const pendingTodos = todos.filter(t => !t.completed);
  const completedTodos = todos.filter(t => t.completed);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-5">Notes & To-Do</h1>

      {/* Tabs */}
      <div className="flex bg-muted rounded-2xl p-1 gap-1 mb-5">
        <button
          onClick={() => setTab('notes')}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all", tab === 'notes' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}
          data-testid="tab-notes"
        >
          <StickyNote className="w-4 h-4" /> Notes
        </button>
        <button
          onClick={() => setTab('todos')}
          className={cn("flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-sm font-semibold transition-all", tab === 'todos' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}
          data-testid="tab-todos"
        >
          <ListTodo className="w-4 h-4" /> To-Do
        </button>
      </div>

      {tab === 'notes' && (
        <div>
          <div className="flex justify-end mb-4">
            <Button size="sm" onClick={openAddNote} data-testid="add-note">
              <Plus className="w-4 h-4 mr-1" /> New Note
            </Button>
          </div>
          {notes.length === 0 ? (
            <div className="bg-card border border-card-border rounded-2xl p-10 text-center">
              <StickyNote className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No notes yet</p>
              <button onClick={openAddNote} className="mt-3 text-primary text-sm font-medium flex items-center gap-1.5 mx-auto">
                <Plus className="w-4 h-4" /> Write your first note
              </button>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 gap-3 space-y-3">
              {notes.map(n => (
                <div
                  key={n.id}
                  data-testid={`note-card-${n.id}`}
                  className="break-inside-avoid bg-card border border-card-border rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => openEditNote(n)}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <h3 className="font-semibold text-foreground text-sm leading-tight">{n.title}</h3>
                    <button
                      onClick={e => { e.stopPropagation(); setDeleteNoteId(n.id); }}
                      className="shrink-0 text-muted-foreground hover:text-destructive p-1 transition-colors"
                      data-testid={`delete-note-${n.id}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {n.body && <p className="text-muted-foreground text-sm whitespace-pre-wrap line-clamp-6">{n.body}</p>}
                  <p className="text-xs text-muted-foreground mt-2">{format(new Date(n.updatedAt), 'd MMM yyyy')}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'todos' && (
        <div className="space-y-4">
          <form onSubmit={addTodo} className="bg-card border border-card-border rounded-2xl p-4 space-y-3 shadow-sm">
            <div className="flex gap-2">
              <Input
                placeholder="Add a new to-do..."
                value={todoInput}
                onChange={e => setTodoInput(e.target.value)}
                data-testid="input-todo"
              />
              <Button className="bg-primary px-4" type="submit" size="icon" data-testid="submit-todo">
                {/* <Plus className="w-4 h-4" /> */}
                Add
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="todo-due" className="text-xs shrink-0">Due date:</Label>
              <Input
                id="todo-due"
                type="date"
                value={todoDueDate}
                onChange={e => setTodoDueDate(e.target.value)}
                className="h-8 text-sm"
                data-testid="input-todo-due"
              />
            </div>
          </form>

          {pendingTodos.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Pending</p>
              <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
                {pendingTodos.map((todo, idx) => (
                  <div key={todo.id} className={`flex items-center gap-3 px-4 py-3 ${idx < pendingTodos.length - 1 ? 'border-b border-border' : ''}`} data-testid={`todo-item-${todo.id}`}>
                    <button onClick={() => toggleTodo(todo.id)} className="w-6 h-6 rounded-full border-2 border-border flex items-center justify-center shrink-0 hover:border-primary transition-colors" data-testid={`todo-check-${todo.id}`}>
                    </button>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">{todo.text}</p>
                      {todo.dueDate && <p className="text-xs text-muted-foreground">Due: {format(new Date(todo.dueDate + 'T00:00:00'), 'd MMM yyyy')}</p>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button onClick={() => toggleReminder(todo.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-muted transition-colors" data-testid={`todo-reminder-${todo.id}`}>
                        {todo.reminderEnabled ? <Bell className="w-3.5 h-3.5 text-primary" /> : <BellOff className="w-3.5 h-3.5 text-muted-foreground" />}
                      </button>
                      <button onClick={() => deleteTodo(todo.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors" data-testid={`todo-delete-${todo.id}`}>
                        <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
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
                  <div key={todo.id} className={`flex items-center gap-3 px-4 py-3 ${idx < completedTodos.length - 1 ? 'border-b border-border' : ''}`} data-testid={`todo-done-${todo.id}`}>
                    <button onClick={() => toggleTodo(todo.id)} className="w-6 h-6 rounded-full bg-primary border-2 border-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-white" />
                    </button>
                    <p className="flex-1 text-sm text-muted-foreground line-through">{todo.text}</p>
                    <button onClick={() => deleteTodo(todo.id)} className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors">
                      <X className="w-3.5 h-3.5 text-muted-foreground" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {todos.length === 0 && (
            <div className="bg-card border border-card-border rounded-2xl p-10 text-center">
              <ListTodo className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground text-sm">No to-dos yet. Add one above.</p>
            </div>
          )}
        </div>
      )}

      {/* Note edit dialog */}
      <Dialog open={noteDialog} onOpenChange={setNoteDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editNote ? 'Edit Note' : 'New Note'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              placeholder="Title"
              value={noteForm.title}
              onChange={e => setNoteForm(f => ({ ...f, title: e.target.value }))}
              data-testid="input-note-title"
            />
            <Textarea
              placeholder="Write your note here..."
              value={noteForm.body}
              onChange={e => setNoteForm(f => ({ ...f, body: e.target.value }))}
              rows={8}
              data-testid="input-note-body"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialog(false)}>Cancel</Button>
            <Button onClick={saveNote} data-testid="save-note">Save Note</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete note confirm */}
      <Dialog open={!!deleteNoteId} onOpenChange={() => setDeleteNoteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Note</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">Are you sure you want to delete this note?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteNoteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={() => deleteNote(deleteNoteId!)} data-testid="confirm-delete-note">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
