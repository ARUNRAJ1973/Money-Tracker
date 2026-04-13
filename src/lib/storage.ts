export interface Account {
  id: string;
  name: string;
  balance: number;
  color: string;
  createdAt: string;
}

export type PaymentMode = 'cash' | 'upi' | 'other';

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  accountId: string;
  paymentMode?: PaymentMode;
  date: string;
  createdAt: string;
}

export interface NoteFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  folderId: string;
  createdAt: string;
  updatedAt: string;
}

export interface TodoFolder {
  id: string;
  name: string;
  createdAt: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
  folderId: string;
  dueDate?: string;
  reminderEnabled: boolean;
  createdAt: string;
}

export interface AppSettings {
  mpinEnabled: boolean;
  mpin: string;
  currency: string;
  theme: 'light' | 'dark';
}

const KEYS = {
  accounts: 'cashbook_accounts',
  transactions: 'cashbook_transactions',
  noteFolders: 'cashbook_note_folders',
  notes: 'cashbook_notes',
  todoFolders: 'cashbook_todo_folders',
  todos: 'cashbook_todos',
  settings: 'cashbook_settings',
  initialized: 'cashbook_initialized',
};

function getItem<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as T[];
  } catch {
    return [];
  }
}

function setItem<T>(key: string, data: T[]): void {
  localStorage.setItem(key, JSON.stringify(data));
  window.dispatchEvent(new Event('cashbook_storage_update'));
}

export const storage = {
  getAccounts: (): Account[] => getItem<Account>(KEYS.accounts),
  setAccounts: (data: Account[]) => setItem(KEYS.accounts, data),

  getTransactions: (): Transaction[] => getItem<Transaction>(KEYS.transactions),
  setTransactions: (data: Transaction[]) => setItem(KEYS.transactions, data),

  getNoteFolders: (): NoteFolder[] => getItem<NoteFolder>(KEYS.noteFolders),
  setNoteFolders: (data: NoteFolder[]) => setItem(KEYS.noteFolders, data),

  getNotes: (): Note[] => getItem<Note>(KEYS.notes),
  setNotes: (data: Note[]) => setItem(KEYS.notes, data),

  getTodoFolders: (): TodoFolder[] => getItem<TodoFolder>(KEYS.todoFolders),
  setTodoFolders: (data: TodoFolder[]) => setItem(KEYS.todoFolders, data),

  getTodos: (): Todo[] => getItem<Todo>(KEYS.todos),
  setTodos: (data: Todo[]) => setItem(KEYS.todos, data),

  getSettings: (): AppSettings => {
    try {
      const raw = localStorage.getItem(KEYS.settings);
      if (!raw) return defaultSettings();
      return JSON.parse(raw) as AppSettings;
    } catch {
      return defaultSettings();
    }
  },
  setSettings: (data: AppSettings) => {
    localStorage.setItem(KEYS.settings, JSON.stringify(data));
  },

  isInitialized: (): boolean => localStorage.getItem(KEYS.initialized) === 'true',
  setInitialized: () => localStorage.setItem(KEYS.initialized, 'true'),

  exportAll: () => ({
    accounts: getItem<Account>(KEYS.accounts),
    transactions: getItem<Transaction>(KEYS.transactions),
    noteFolders: getItem<NoteFolder>(KEYS.noteFolders),
    notes: getItem<Note>(KEYS.notes),
    todoFolders: getItem<TodoFolder>(KEYS.todoFolders),
    todos: getItem<Todo>(KEYS.todos),
    settings: JSON.parse(localStorage.getItem(KEYS.settings) || '{}'),
    exportedAt: new Date().toISOString(),
  }),

  importAll: (data: ReturnType<typeof storage.exportAll>) => {
    if (data.accounts) setItem(KEYS.accounts, data.accounts);
    if (data.transactions) setItem(KEYS.transactions, data.transactions);
    if (data.noteFolders) setItem(KEYS.noteFolders, data.noteFolders);
    if (data.notes) setItem(KEYS.notes, data.notes);
    if (data.todoFolders) setItem(KEYS.todoFolders, data.todoFolders);
    if (data.todos) setItem(KEYS.todos, data.todos);
    if (data.settings) localStorage.setItem(KEYS.settings, JSON.stringify(data.settings));
  },

  clearAll: () => {
    Object.values(KEYS).forEach(k => localStorage.removeItem(k));
  },
};

function defaultSettings(): AppSettings {
  return {
    mpinEnabled: false,
    mpin: '',
    currency: '₹',
    theme: 'light',
  };
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2);
}

export function migrateOpeningBalances() {
  if (localStorage.getItem('cashbook_ob_migrated') === 'true') return;

  const accounts = storage.getAccounts();
  const txs = storage.getTransactions();
  if (accounts.length === 0) {
    localStorage.setItem('cashbook_ob_migrated', 'true');
    return;
  }
  
  let changed = false;
  accounts.forEach(a => {
    const acctTxs = txs.filter(t => t.accountId === a.id);
    const inc = acctTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
    const exp = acctTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);
    const diff = a.balance - inc + exp;

    if (diff > 0) {
      txs.push({
        id: `ob-${a.id}`,
        type: 'income',
        amount: diff,
        description: 'Opening Balance',
        accountId: a.id,
        date: a.createdAt.split('T')[0] || new Date().toISOString().split('T')[0],
        createdAt: a.createdAt || new Date().toISOString()
      });
      changed = true;
    } else if (diff < 0) {
      txs.push({
        id: `ob-${a.id}`,
        type: 'expense',
        amount: Math.abs(diff),
        description: 'Opening Balance Adjustment',
        accountId: a.id,
        date: a.createdAt.split('T')[0] || new Date().toISOString().split('T')[0],
        createdAt: a.createdAt || new Date().toISOString()
      });
      changed = true;
    }
  });

  if (changed) {
    storage.setTransactions(txs);
  }
  localStorage.setItem('cashbook_ob_migrated', 'true');
}

export function migrateFolders() {
  if (localStorage.getItem('fintrack_folders_migrated') === 'true') return;

  const notes = storage.getNotes();
  const todos = storage.getTodos();

  const noteFolders = storage.getNoteFolders();
  if (notes.some(n => !n.folderId)) {
    const defaultNoteFolder: NoteFolder = { id: 'default-notes', name: 'General', createdAt: new Date().toISOString() };
    storage.setNoteFolders([...noteFolders, defaultNoteFolder]);
    storage.setNotes(notes.map(n => ({ ...n, folderId: n.folderId || 'default-notes' })));
  }

  const todoFolders = storage.getTodoFolders();
  if (todos.some(t => !t.folderId)) {
    const defaultTodoFolder: TodoFolder = { id: 'default-todos', name: 'General', createdAt: new Date().toISOString() };
    storage.setTodoFolders([...todoFolders, defaultTodoFolder]);
    storage.setTodos(todos.map(t => ({ ...t, folderId: t.folderId || 'default-todos' })));
  }

  localStorage.setItem('fintrack_folders_migrated', 'true');
}

