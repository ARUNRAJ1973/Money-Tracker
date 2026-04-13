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

