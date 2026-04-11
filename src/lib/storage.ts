export type AccountType = 'cash' | 'bank' | 'wallet' | 'credit' | 'other';

export interface Account {
  id: string;
  name: string;
  type: AccountType;
  balance: number;
  color: string;
  createdAt: string;
}

export interface Transaction {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  accountId: string;
  date: string;
  createdAt: string;
}

export interface Note {
  id: string;
  title: string;
  body: string;
  createdAt: string;
  updatedAt: string;
}

export interface Todo {
  id: string;
  text: string;
  completed: boolean;
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
  notes: 'cashbook_notes',
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

  getNotes: (): Note[] => getItem<Note>(KEYS.notes),
  setNotes: (data: Note[]) => setItem(KEYS.notes, data),

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
    notes: getItem<Note>(KEYS.notes),
    todos: getItem<Todo>(KEYS.todos),
    settings: JSON.parse(localStorage.getItem(KEYS.settings) || '{}'),
    exportedAt: new Date().toISOString(),
  }),

  importAll: (data: ReturnType<typeof storage.exportAll>) => {
    if (data.accounts) setItem(KEYS.accounts, data.accounts);
    if (data.transactions) setItem(KEYS.transactions, data.transactions);
    if (data.notes) setItem(KEYS.notes, data.notes);
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

export function seedDefaultData() {
  if (storage.isInitialized()) return;

  const now = new Date();
  const accountId1 = generateId();
  const accountId2 = generateId();
  const accountId3 = generateId();

  const accounts: Account[] = [
    { id: accountId1, name: 'Cash', type: 'cash', balance: 5000, color: '#10b981', createdAt: now.toISOString() },
    { id: accountId2, name: 'Bank Account', type: 'bank', balance: 25000, color: '#3b82f6', createdAt: now.toISOString() },
    { id: accountId3, name: 'Wallet', type: 'wallet', balance: 1200, color: '#f59e0b', createdAt: now.toISOString() },
  ];

  const fmt = (d: Date) => d.toISOString().split('T')[0];
  const d0 = fmt(now);
  const d1 = fmt(new Date(now.getTime() - 86400000));
  const d2 = fmt(new Date(now.getTime() - 2 * 86400000));
  const d3 = fmt(new Date(now.getTime() - 3 * 86400000));

  const transactions: Transaction[] = [
    { id: generateId(), type: 'income', amount: 45000, description: 'Monthly salary', accountId: accountId2, date: d3, createdAt: new Date(now.getTime() - 3 * 86400000).toISOString() },
    { id: generateId(), type: 'expense', amount: 800, description: 'Groceries', accountId: accountId1, date: d2, createdAt: new Date(now.getTime() - 2 * 86400000).toISOString() },
    { id: generateId(), type: 'expense', amount: 1500, description: 'Monthly bus pass', accountId: accountId2, date: d2, createdAt: new Date(now.getTime() - 2 * 86400000 + 1000).toISOString() },
    { id: generateId(), type: 'income', amount: 2000, description: 'Design project', accountId: accountId2, date: d1, createdAt: new Date(now.getTime() - 86400000).toISOString() },
    { id: generateId(), type: 'expense', amount: 350, description: 'Dinner', accountId: accountId3, date: d1, createdAt: new Date(now.getTime() - 86400000 + 1000).toISOString() },
    { id: generateId(), type: 'expense', amount: 200, description: 'Movie tickets', accountId: accountId1, date: d0, createdAt: now.toISOString() },
    { id: generateId(), type: 'income', amount: 500, description: 'Cash from family', accountId: accountId1, date: d0, createdAt: new Date(now.getTime() + 1000).toISOString() },
  ];

  const notes: Note[] = [
    { id: generateId(), title: 'Monthly Budget Plan', body: 'Rent: 8000\nFood: 5000\nTransport: 2000\nEntertainment: 1000\nSavings: 10000', createdAt: d3, updatedAt: d3 },
  ];

  const todos: Todo[] = [
    { id: generateId(), text: 'Pay electricity bill', completed: false, dueDate: fmt(new Date(now.getTime() + 5 * 86400000)), reminderEnabled: false, createdAt: now.toISOString() },
    { id: generateId(), text: 'Transfer rent money', completed: false, dueDate: fmt(new Date(now.getTime() + 10 * 86400000)), reminderEnabled: false, createdAt: now.toISOString() },
    { id: generateId(), text: 'Review monthly expenses', completed: true, reminderEnabled: false, createdAt: now.toISOString() },
  ];

  storage.setAccounts(accounts);
  storage.setTransactions(transactions);
  storage.setNotes(notes);
  storage.setTodos(todos);
  storage.setInitialized();
}

