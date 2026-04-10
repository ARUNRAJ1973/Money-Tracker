import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowUpCircle, ArrowDownCircle, Trash2, Plus, Filter, Search, CheckSquare, Square } from "lucide-react";
import { storage, type Transaction, type Account } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format, startOfDay, startOfMonth, startOfYear } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type FilterPeriod = "all" | "day" | "month" | "year";

function formatCurrency(amount: number, currency: string) {
  return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function filterByPeriod(transactions: Transaction[], period: FilterPeriod): Transaction[] {
  if (period === "all") return transactions;
  const now = new Date();
  const today = startOfDay(now).getTime();
  const monthStart = startOfMonth(now).getTime();
  const yearStart = startOfYear(now).getTime();
  return transactions.filter(t => {
    const txTime = startOfDay(new Date(t.date)).getTime();
    if (period === "day") return txTime === today;
    if (period === "month") return txTime >= monthStart;
    if (period === "year") return txTime >= yearStart;
    return true;
  });
}

const PERIOD_TABS: { key: FilterPeriod; label: string }[] = [
  { key: "all", label: "All" },
  { key: "day", label: "Day" },
  { key: "month", label: "Month" },
  { key: "year", label: "Year" },
];

export default function Transactions() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState('₹');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [period, setPeriod] = useState<FilterPeriod>('all');
  const [selectMode, setSelectMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const { toast } = useToast();

  const load = () => {
    setAccounts(storage.getAccounts());
    setTransactions(storage.getTransactions());
    const s = storage.getSettings();
    setCurrency(s.currency || '₹');
  };

  useEffect(() => { load(); }, []);

  const getAccount = (id: string) => accounts.find(a => a.id === id);

  const filtered = filterByPeriod(transactions, period)
    .filter(t => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterAccount !== 'all' && t.accountId !== filterAccount) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.category.toLowerCase().includes(q) || (t.note || '').toLowerCase().includes(q) || (getAccount(t.accountId)?.name || '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const toggleSelect = (id: string) => {
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(t => t.id)));
    }
  };

  const confirmDelete = (id?: string) => {
    setDeleteTarget(id || null);
    setDeleteDialogOpen(true);
  };

  const doDelete = () => {
    const all = storage.getTransactions();
    let updated: Transaction[];
    let count: number;

    if (deleteTarget) {
      updated = all.filter(t => t.id !== deleteTarget);
      count = 1;
    } else {
      updated = all.filter(t => !selected.has(t.id));
      count = selected.size;
    }

    const deletedIds = new Set(all.filter(t => !updated.includes(t)).map(t => t.id));
    const deletedTxs = all.filter(t => deletedIds.has(t.id));

    const accts = storage.getAccounts();
    const updatedAccounts = accts.map(a => {
      let balance = a.balance;
      deletedTxs.forEach(tx => {
        if (tx.accountId === a.id) {
          if (tx.type === 'income') balance -= tx.amount;
          else balance += tx.amount;
        }
      });
      return { ...a, balance };
    });

    storage.setTransactions(updated);
    storage.setAccounts(updatedAccounts);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setSelected(new Set());
    setSelectMode(false);
    load();
    toast({ title: `${count} transaction${count > 1 ? 's' : ''} deleted` });
  };

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto pb-44 md:pb-28">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-foreground">Transactions</h1>
        <div className="flex gap-2">
          {selectMode ? (
            <>
              <Button variant="outline" size="sm" onClick={() => { setSelectMode(false); setSelected(new Set()); }}>Cancel</Button>
              {selected.size > 0 && (
                <Button variant="destructive" size="sm" onClick={() => confirmDelete()} data-testid="delete-selected">
                  <Trash2 className="w-4 h-4 mr-1" /> Delete ({selected.size})
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" size="sm" onClick={() => setSelectMode(true)} data-testid="select-mode">
                <CheckSquare className="w-4 h-4 mr-1" /> Select
              </Button>
              <Link href="/add-transaction" data-testid="add-transaction" className="inline-flex items-center gap-1 h-9 px-3 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
                <Plus className="w-4 h-4" /> Add
              </Link>
            </>
          )}
        </div>
      </div>

      {/* Period Filter Tabs */}
      <div className="flex gap-2 mb-4">
        {PERIOD_TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setPeriod(tab.key)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              period === tab.key
                ? "bg-primary text-primary-foreground shadow"
                : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Search + Type + Account Filters */}
      <div className="flex gap-2 mb-4 flex-wrap">
        <div className="relative flex-1 min-w-40">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
            data-testid="search-transactions"
          />
        </div>
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-32" data-testid="filter-type">
            <SelectValue placeholder="Type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="income">Income</SelectItem>
            <SelectItem value="expense">Expense</SelectItem>
          </SelectContent>
        </Select>
        <Select value={filterAccount} onValueChange={setFilterAccount}>
          <SelectTrigger className="w-36" data-testid="filter-account">
            <SelectValue placeholder="Account" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Accounts</SelectItem>
            {accounts.map(a => (
              <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Select-all bar */}
      {selectMode && filtered.length > 0 && (
        <div className="flex items-center gap-2 mb-3 px-1">
          <button onClick={selectAll} className="flex items-center gap-1.5 text-sm text-primary font-medium">
            {selected.size === filtered.length ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
            {selected.size === filtered.length ? 'Deselect All' : 'Select All'}
          </button>
          <span className="text-muted-foreground text-sm">{selected.size} selected</span>
        </div>
      )}

      {/* Transaction List */}
      {filtered.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-10 text-center">
          <Filter className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No transactions found</p>
          <Link href="/add-transaction" className="mt-3 inline-flex items-center gap-1.5 text-primary text-sm font-medium">
            <Plus className="w-4 h-4" /> Add transaction
          </Link>
        </div>
      ) : (
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
          {filtered.map((tx, idx) => {
            const account = getAccount(tx.accountId);
            const isSelected = selected.has(tx.id);
            return (
              <div
                key={tx.id}
                data-testid={`tx-row-${tx.id}`}
                onClick={() => selectMode && toggleSelect(tx.id)}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${idx < filtered.length - 1 ? 'border-b border-border' : ''} ${selectMode ? 'cursor-pointer' : ''} ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
              >
                {selectMode && (
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${isSelected ? 'bg-primary border-primary' : 'border-border'}`}>
                    {isSelected && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>}
                  </div>
                )}
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {tx.type === 'income'
                    ? <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    : <ArrowDownCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{tx.category}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {account?.name} · {format(new Date(tx.date + 'T00:00:00'), 'd MMM yyyy')}{tx.note ? ` · ${tx.note}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                  </p>
                  {!selectMode && (
                    <button
                      onClick={(e) => { e.stopPropagation(); confirmDelete(tx.id); }}
                      className="text-muted-foreground hover:text-destructive transition-colors p-1"
                      data-testid={`delete-tx-${tx.id}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Sticky Bottom Summary */}
      <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-60 z-30 pointer-events-none">
        <div className="max-w-3xl mx-auto px-4 pb-3 md:pb-4 pointer-events-auto">
          <div className="bg-card/95 backdrop-blur border border-card-border rounded-2xl shadow-lg px-5 py-3 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Income</p>
                <p className="text-sm font-bold text-green-600 dark:text-green-400">{formatCurrency(totalIncome, currency)}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-border" />

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <ArrowDownCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground leading-none mb-0.5">Expense</p>
                <p className="text-sm font-bold text-red-500 dark:text-red-400">{formatCurrency(totalExpense, currency)}</p>
              </div>
            </div>

            <div className="h-8 w-px bg-border" />

            <div>
              <p className="text-xs text-muted-foreground leading-none mb-0.5">Balance</p>
              <p className={`text-sm font-bold ${totalIncome - totalExpense >= 0 ? 'text-primary' : 'text-red-500 dark:text-red-400'}`}>
                {totalIncome - totalExpense >= 0 ? '+' : ''}{formatCurrency(totalIncome - totalExpense, currency)}
              </p>
            </div>

            <span className="text-xs text-muted-foreground ml-auto">{filtered.length} txn{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget ? 'Transaction' : `${selected.size} Transactions`}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {deleteTarget
              ? 'Are you sure you want to delete this transaction? This will also adjust the account balance.'
              : `Are you sure you want to delete ${selected.size} transactions? Account balances will be adjusted.`}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={doDelete} data-testid="confirm-delete">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
