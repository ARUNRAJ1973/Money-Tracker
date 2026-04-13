import { useState, useEffect, useMemo } from "react";
import { Link, useRoute, useLocation } from "wouter";
import { ArrowUpCircle, ArrowDownCircle, Trash2, Plus, Filter, Search, Pencil, ArrowLeft, X, MoreVertical, SortAsc, SortDesc, Calendar, CheckSquare, Square } from "lucide-react";
import { storage, type Transaction, type Account } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuCheckboxItem } from "@/components/ui/dropdown-menu";
import { format, startOfDay, startOfMonth, startOfYear } from "date-fns";
import { useToast } from "@/hooks/use-toast";

type FilterPeriod = "all" | "day" | "month" | "year";

function formatCurrency(amount: number, currency: string) {
  return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function parseSafeDate(d: string) {
  return new Date(d.includes('T') ? d : `${d}T00:00:00`);
}

function filterByPeriod(transactions: Transaction[], period: FilterPeriod): Transaction[] {
  if (period === "all") return transactions;
  const now = new Date();
  const today = startOfDay(now).getTime();
  const monthStart = startOfMonth(now).getTime();
  const yearStart = startOfYear(now).getTime();
  return transactions.filter(t => {
    const txTime = startOfDay(parseSafeDate(t.date)).getTime();
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
  const [matchAccount, paramsAccount] = useRoute<{ id: string }>("/accounts/:id");
  const accountId = matchAccount && paramsAccount ? paramsAccount.id : null;
  const [, setLocation] = useLocation();

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currency, setCurrency] = useState('₹');
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterAccount, setFilterAccount] = useState('all');
  const [period, setPeriod] = useState<FilterPeriod>('all');
  const [showSearch, setShowSearch] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
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
      if (accountId && t.accountId !== accountId) return false;
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (!accountId && filterAccount !== 'all' && t.accountId !== filterAccount) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.description.toLowerCase().includes(q) || (getAccount(t.accountId)?.name || '').toLowerCase().includes(q);
      }
      return true;
    })
    .sort((a, b) => {
      const diff = parseSafeDate(b.date).getTime() - parseSafeDate(a.date).getTime() || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return sortOrder === 'desc' ? diff : -diff;
    });

  const totalIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const txBalances = useMemo(() => {
    const sorted = [...transactions].sort((a, b) => parseSafeDate(a.date).getTime() - parseSafeDate(b.date).getTime() || new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    const accBalances: Record<string, number> = {};
    let globalBalance = 0;
    const balanceMap = new Map<string, number>();

    sorted.forEach(t => {
      if (!accBalances[t.accountId]) accBalances[t.accountId] = 0;

      if (t.type === 'income') {
        accBalances[t.accountId] += t.amount;
        globalBalance += t.amount;
      } else {
        accBalances[t.accountId] -= t.amount;
        globalBalance -= t.amount;
      }

      balanceMap.set(`${t.id}-account`, accBalances[t.accountId]);
      balanceMap.set(`${t.id}-global`, globalBalance);
    });

    return balanceMap;
  }, [transactions]);

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

  const accountInfo = accountId ? getAccount(accountId) : null;

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
        <div className="flex items-center gap-3">
          {accountId && (
            <button onClick={() => setLocation('/accounts')} className="w-9 h-9 rounded-full bg-muted flex items-center justify-center hover:bg-accent transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <h1 className="text-2xl font-bold text-foreground">
            {accountInfo ? accountInfo.name : 'Transactions'}
            {/* <span className="hidden min-[300px]:block text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap shrink-0">{filtered.length} txn{filtered.length !== 1 ? 's' : ''}</span> */}
          </h1>
        </div>
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
              {showSearch ? (
                <Button variant="ghost" size="icon" onClick={() => { setShowSearch(false); setSearch(''); }} className="w-9 h-9">
                  <X className="w-4 h-4" />
                </Button>
              ) : (
                <Button variant="ghost" size="icon" onClick={() => setShowSearch(true)} className="w-9 h-9 bg-muted rounded-full" data-testid="search-mode-toggle">
                  <Search className="w-4 h-4" />
                </Button>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-9 h-9 bg-muted rounded-full">
                    <MoreVertical className="w-5 h-5 text-foreground" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuLabel>Filter</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={filterType === 'all'} onCheckedChange={() => setFilterType('all')}>All Types</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={filterType === 'income'} onCheckedChange={() => setFilterType('income')}>Income</DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={filterType === 'expense'} onCheckedChange={() => setFilterType('expense')}>Expense</DropdownMenuCheckboxItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setSelectMode(true)}>Select Transactions</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuLabel>Sort Order</DropdownMenuLabel>
                  <DropdownMenuCheckboxItem checked={sortOrder === 'desc'} onCheckedChange={() => setSortOrder('desc')}>
                    <SortDesc className="w-4 h-4 mr-2" /> Newest First
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem checked={sortOrder === 'asc'} onCheckedChange={() => setSortOrder('asc')}>
                    <SortAsc className="w-4 h-4 mr-2" /> Oldest First
                  </DropdownMenuCheckboxItem>
                </DropdownMenuContent>
              </DropdownMenu>
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
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${period === tab.key
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
        {showSearch && (
          <div className="relative w-full animate-in fade-in slide-in-from-top-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search transactions..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-9 bg-card border-card-border h-10 shadow-sm"
              data-testid="search-transactions"
              autoFocus
            />
          </div>
        )}

        <div className="flex w-full gap-2 overflow-x-auto pb-1">
          <Link
            href={accountId ? `/add-transaction?accountId=${accountId}&type=income` : `/add-transaction?type=income`}
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-600 text-white rounded-xl py-2 px-3 text-sm font-semibold transition-colors shadow-sm"
          >
            Income
          </Link>
          <Link
            href={accountId ? `/add-transaction?accountId=${accountId}&type=expense` : `/add-transaction?type=expense`}
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-600 text-white rounded-xl py-2 px-3 text-sm font-semibold transition-colors shadow-sm"
          >
            Expense
          </Link>
          <Link
            href={accountId ? `/add-transaction?accountId=${accountId}` : `/add-transaction`}
            className="flex-1 min-w-[100px] flex items-center justify-center gap-1.5 bg-green-900 hover:bg-primary/90 text-primary-foreground rounded-xl py-2 px-3 text-sm font-semibold transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add
          </Link>
        </div>

        {!accountId && (
          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="w-36 flex-1 sm:flex-none" data-testid="filter-account">
              <SelectValue placeholder="Account" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map(a => (
                <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
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
            const displayBalance = accountId ? txBalances.get(`${tx.id}-account`) : txBalances.get(`${tx.id}-global`);
            return (
              <div
                key={tx.id}
                data-testid={`tx-row-${tx.id}`}
                onClick={() => {
                  if (selectMode) toggleSelect(tx.id);
                  else setLocation(accountId ? `/edit-transaction/${tx.id}?accountId=${accountId}` : `/edit-transaction/${tx.id}`);
                }}
                className={`flex items-center gap-3 px-4 py-3 transition-colors ${idx < filtered.length - 1 ? 'border-b border-border' : ''} cursor-pointer ${selected.has(tx.id) ? 'bg-primary/5' : 'hover:bg-muted/30'}`}
              >
                {selectMode && (
                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center shrink-0 transition-colors ${selected.has(tx.id) ? 'bg-primary border-primary' : 'border-border'}`}>
                    {selected.has(tx.id) && <svg width="10" height="8" viewBox="0 0 10 8" fill="none"><path d="M1 4l2.5 2.5L9 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>}
                  </div>
                )}
                <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                  {tx.type === 'income'
                    ? <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    : <ArrowDownCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                  }
                </div>
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-foreground truncate">{tx.description}</p>
                    {account?.name && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-secondary text-secondary-foreground uppercase shrink-0 leading-none">
                        {tx.paymentMode || 'UPI'}{" "}
                        {/* - {account.name} */}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] font-medium text-muted-foreground/70 uppercase tracking-wider mt-0.5">
                    {format(parseSafeDate(tx.date), 'd MMM yyyy, h:mm a')}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1.5 shrink-0">
                  <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                  </p>
                  {!selectMode && displayBalance !== undefined && (
                    <p className="text-[11px] font-semibold text-muted-foreground mt-0.5 whitespace-nowrap">
                      Bal: {formatCurrency(displayBalance, currency)}
                    </p>
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
          <div className="bg-card/95 backdrop-blur border border-card-border rounded-xl shadow-lg p-2.5 sm:px-4 sm:py-3 flex items-center justify-between gap-2 sm:gap-4 overflow-x-auto">
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden min-[400px]:flex w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-green-100 dark:bg-green-900/30 items-center justify-center shrink-0">
                <ArrowUpCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-none mb-1">Income</p>
                <p className="text-xs sm:text-sm font-bold text-green-600 dark:text-green-400 truncate">{formatCurrency(totalIncome, currency)}</p>
              </div>
            </div>

            <div className="h-6 sm:h-8 w-px bg-border shrink-0" />

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <div className="hidden min-[400px]:flex w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-red-100 dark:bg-red-900/30 items-center justify-center shrink-0">
                <ArrowDownCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-red-500 dark:text-red-400" />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] sm:text-xs text-muted-foreground leading-none mb-1">Expense</p>
                <p className="text-xs sm:text-sm font-bold text-red-500 dark:text-red-400 truncate">{formatCurrency(totalExpense, currency)}</p>
              </div>
            </div>

            <div className="h-6 sm:h-8 w-px bg-border shrink-0" />

            <div className="min-w-0 shrink-0">
              <p className="text-[10px] sm:text-xs text-muted-foreground leading-none mb-1">Balance</p>
              <p className={`text-xs sm:text-sm font-bold truncate ${totalIncome - totalExpense >= 0 ? 'text-primary' : 'text-red-500 dark:text-red-400'}`}>
                {/* {totalIncome - totalExpense >= 0 ? '+' : ''} */}
                {formatCurrency(totalIncome - totalExpense, currency)}
              </p>
            </div>

            <span className="hidden min-[300px]:block text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap shrink-0">{filtered.length} txn{filtered.length !== 1 ? 's' : ''}</span>
          </div>
        </div>
      </div>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Delete {deleteTarget ? 'Transaction' : `${selected.size} Transactions`}</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            {deleteTarget
              ? 'Are you sure you want to delete this transaction? This will also adjust the account balance.'
              : `Are you sure you want to delete ${selected.size} transactions? Account balances will be adjusted.`}
          </p>
          <DialogFooter className="flex flex-row justify-center gap-2">
            <Button className="w-1/2" variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button className="w-1/2" variant="destructive" onClick={doDelete} data-testid="confirm-delete">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
