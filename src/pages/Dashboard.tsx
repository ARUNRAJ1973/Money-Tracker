import { useState, useEffect } from "react";
import { Link } from "wouter";
import { ArrowUpCircle, ArrowDownCircle, Wallet, Plus, TrendingUp } from "lucide-react";
import { storage, type Account, type Transaction } from "@/lib/storage";
import { format, startOfDay, startOfMonth, startOfYear } from "date-fns";

type FilterPeriod = "day" | "month" | "year";

function formatCurrency(amount: number, currency: string) {
  return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

function filterByPeriod(transactions: Transaction[], period: FilterPeriod): Transaction[] {
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

const PERIOD_LABELS: Record<FilterPeriod, string> = {
  day: "Today",
  month: "This Month",
  year: "This Year",
};

export default function Dashboard() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState('₹');
  const [period, setPeriod] = useState<FilterPeriod>("day");

  const load = () => {
    const s = storage.getSettings();
    setCurrency(s.currency || '₹');
    setAccounts(storage.getAccounts());
    setTransactions(storage.getTransactions());
  };

  useEffect(() => {
    load();
    window.addEventListener('cashbook_storage_update', load);
    return () => window.removeEventListener('cashbook_storage_update', load);
  }, []);

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const totalIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const filtered = filterByPeriod(transactions, period);
  const periodIncome = filtered.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const periodExpense = filtered.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  const recentTransactions = [...filtered]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 10);

  const getAccount = (id: string) => accounts.find(a => a.id === id);

  return (
    <div className="p-4 md:p-6 max-w-3xl mx-auto">
      <div className="mb-5">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground text-sm mt-0.5">{format(new Date(), 'EEEE, d MMMM yyyy')}</p>
      </div>

      {/* Total Balance */}
      <div className="bg-primary rounded-2xl p-6 mb-4 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute -top-8 -right-8 w-40 h-40 rounded-full bg-white" />
          <div className="absolute -bottom-12 -left-6 w-32 h-32 rounded-full bg-white" />
        </div>
        <p className="text-primary-foreground/80 text-sm font-medium mb-1">Total Balance</p>
        <p className="text-primary-foreground text-4xl font-bold" data-testid="total-balance">{formatCurrency(totalBalance, currency)}</p>
        <div className="flex gap-6 mt-4">
          <div>
            <p className="text-primary-foreground/70 text-xs">Total Income</p>
            <p className="text-primary-foreground font-semibold text-sm">{formatCurrency(totalIncome, currency)}</p>
          </div>
          <div>
            <p className="text-primary-foreground/70 text-xs">Total Expense</p>
            <p className="text-primary-foreground font-semibold text-sm">{formatCurrency(totalExpense, currency)}</p>
          </div>
        </div>
      </div>

      {/* Period Filter */}
      <div className="flex gap-2 mb-4">
        {(["day", "month", "year"] as FilterPeriod[]).map(p => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-colors ${
              period === p
                ? "bg-primary text-primary-foreground shadow"
                : "bg-card border border-card-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {p === "day" ? "Day" : p === "month" ? "Month" : "Year"}
          </button>
        ))}
      </div>

      {/* Period Income / Expense */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
              <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
            </div>
            <span className="text-muted-foreground text-xs font-medium">{PERIOD_LABELS[period]} Income</span>
          </div>
          <p className="text-xl font-bold text-green-600 dark:text-green-400" data-testid="today-income">{formatCurrency(periodIncome, currency)}</p>
        </div>
        <div className="bg-card border border-card-border rounded-2xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
              <ArrowDownCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
            </div>
            <span className="text-muted-foreground text-xs font-medium">{PERIOD_LABELS[period]} Expense</span>
          </div>
          <p className="text-xl font-bold text-red-500 dark:text-red-400" data-testid="today-expense">{formatCurrency(periodExpense, currency)}</p>
        </div>
      </div>

      {/* Accounts */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">Accounts</h2>
          <Link href="/accounts" className="text-primary text-sm font-medium">View all</Link>
        </div>
        <div className="flex gap-3 overflow-x-auto pb-1">
          {accounts.map(account => (
            <Link
              key={account.id}
              href="/accounts"
              data-testid={`account-card-${account.id}`}
              className="flex-shrink-0 bg-card border border-card-border rounded-2xl p-4 w-44 shadow-sm hover:shadow-md transition-shadow block"
            >
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: account.color + '20' }}>
                  <Wallet className="w-4 h-4" style={{ color: account.color }} />
                </div>
                <span className="text-xs text-muted-foreground font-medium capitalize">{account.type}</span>
              </div>
              <p className="text-xs text-muted-foreground mb-0.5">{account.name}</p>
              <p className="text-base font-bold text-foreground">{formatCurrency(account.balance, currency)}</p>
            </Link>
          ))}
          <Link
            href="/accounts"
            className="flex-shrink-0 bg-card border border-dashed border-border rounded-2xl p-4 w-44 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary hover:border-primary transition-colors"
          >
            <Plus className="w-5 h-5" />
            <span className="text-sm font-medium">Add Account</span>
          </Link>
        </div>
      </div>

      {/* Transactions for period */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-semibold text-foreground">
            {PERIOD_LABELS[period]}'s Transactions
          </h2>
          <Link href="/transactions" className="text-primary text-sm font-medium">View all</Link>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="bg-card border border-card-border rounded-2xl p-8 text-center">
            <TrendingUp className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
            <p className="text-muted-foreground text-sm">No transactions for {PERIOD_LABELS[period].toLowerCase()}</p>
            <Link href="/add-transaction" className="mt-3 inline-flex items-center gap-1.5 text-primary text-sm font-medium">
              <Plus className="w-4 h-4" /> Add a transaction
            </Link>
          </div>
        ) : (
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
            {recentTransactions.map((tx, idx) => {
              const account = getAccount(tx.accountId);
              return (
                <div
                  key={tx.id}
                  data-testid={`transaction-row-${tx.id}`}
                  className={`flex items-center gap-3 px-4 py-3 ${idx < recentTransactions.length - 1 ? 'border-b border-border' : ''}`}
                >
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                    {tx.type === 'income'
                      ? <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                      : <ArrowDownCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <p className="text-xs text-muted-foreground">{account?.name} · {format(new Date(tx.date), 'd MMM yyyy')}</p>
                  </div>
                  <p className={`text-sm font-semibold ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                    {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
