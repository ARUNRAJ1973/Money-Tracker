import { useState, useEffect } from "react";
import { Wallet, Plus, Pencil, Trash2, Check, ArrowUpCircle, ArrowDownCircle, X, ChevronRight } from "lucide-react";
import { storage, generateId, type Account, type AccountType, type Transaction } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";

function formatCurrency(amount: number, currency: string) {
  return `${currency}${amount.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`;
}

const ACCOUNT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ef4444', '#ec4899', '#06b6d4', '#84cc16'];

const defaultForm = () => ({
  name: '',
  type: 'cash' as AccountType,
  balance: '',
  color: '#10b981',
});

export default function Accounts() {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currency, setCurrency] = useState('₹');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [detailAccount, setDetailAccount] = useState<Account | null>(null);
  const { toast } = useToast();

  const load = () => {
    setAccounts(storage.getAccounts());
    setTransactions(storage.getTransactions());
    setCurrency(storage.getSettings().currency || '₹');
  };

  useEffect(() => { load(); }, []);

  const openAdd = () => {
    setEditId(null);
    setForm(defaultForm());
    setDialogOpen(true);
  };

  const openEdit = (a: Account, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditId(a.id);
    setForm({ name: a.name, type: a.type, balance: a.balance.toString(), color: a.color });
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name.trim()) {
      toast({ title: 'Name required', variant: 'destructive' });
      return;
    }
    const balance = parseFloat(form.balance) || 0;
    const all = storage.getAccounts();

    if (editId) {
      const updated = all.map(a => a.id === editId ? { ...a, name: form.name.trim(), type: form.type, color: form.color, balance } : a);
      storage.setAccounts(updated);
      toast({ title: 'Account updated' });
    } else {
      const newAccount: Account = {
        id: generateId(),
        name: form.name.trim(),
        type: form.type,
        balance,
        color: form.color,
        createdAt: new Date().toISOString(),
      };
      storage.setAccounts([...all, newAccount]);
      toast({ title: 'Account added' });
    }

    setDialogOpen(false);
    load();
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const txs = storage.getTransactions();
    if (txs.some(t => t.accountId === id)) {
      toast({ title: 'Cannot delete', description: 'This account has transactions. Delete them first.', variant: 'destructive' });
      return;
    }
    setDeleteId(id);
  };

  const confirmDelete = () => {
    const updated = storage.getAccounts().filter(a => a.id !== deleteId);
    storage.setAccounts(updated);
    setDeleteId(null);
    load();
    toast({ title: 'Account deleted' });
  };

  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);

  // Account detail helpers
  const accountTxs = detailAccount
    ? [...transactions.filter(t => t.accountId === detailAccount.id)]
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    : [];
  const detailIncome = accountTxs.filter(t => t.type === 'income').reduce((s, t) => s + t.amount, 0);
  const detailExpense = accountTxs.filter(t => t.type === 'expense').reduce((s, t) => s + t.amount, 0);

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-bold text-foreground">Accounts</h1>
        <Button size="sm" onClick={openAdd} data-testid="add-account">
          <Plus className="w-4 h-4 mr-1" /> Add Account
        </Button>
      </div>

      {/* Total */}
      <div className="bg-primary/10 border border-primary/20 rounded-2xl p-4 mb-5 flex items-center justify-between">
        <span className="text-sm text-muted-foreground font-medium">Total Balance</span>
        <span className="text-xl font-bold text-primary" data-testid="accounts-total">{formatCurrency(totalBalance, currency)}</span>
      </div>

      {accounts.length === 0 ? (
        <div className="bg-card border border-card-border rounded-2xl p-10 text-center">
          <Wallet className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
          <p className="text-muted-foreground text-sm">No accounts yet</p>
          <button onClick={openAdd} className="mt-3 text-primary text-sm font-medium flex items-center gap-1.5 mx-auto" data-testid="add-account-empty">
            <Plus className="w-4 h-4" /> Add your first account
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {accounts.map(account => (
            <div
              key={account.id}
              data-testid={`account-item-${account.id}`}
              className="bg-card border border-card-border rounded-2xl p-4 flex items-center gap-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setDetailAccount(account)}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ backgroundColor: account.color + '20' }}>
                <Wallet className="w-6 h-6" style={{ color: account.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-foreground">{account.name}</p>
                  <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{account.type}</span>
                </div>
                <p className="text-xl font-bold mt-0.5" style={{ color: account.color }}>{formatCurrency(account.balance, currency)}</p>
              </div>
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={(e) => openEdit(account, e)}
                  className="w-8 h-8 rounded-xl bg-muted hover:bg-accent flex items-center justify-center transition-colors"
                  data-testid={`edit-account-${account.id}`}
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => handleDelete(account.id, e)}
                  className="w-8 h-8 rounded-xl bg-muted hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
                  data-testid={`delete-account-${account.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
                <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Account Detail Dialog */}
      <Dialog open={!!detailAccount} onOpenChange={() => setDetailAccount(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] flex flex-col p-0 gap-0">
          {detailAccount && (
            <>
              {/* Header */}
              <div
                className="p-5 rounded-t-lg relative overflow-hidden"
                style={{ backgroundColor: detailAccount.color + '18', borderBottom: `2px solid ${detailAccount.color}30` }}
              >
                <button
                  onClick={() => setDetailAccount(null)}
                  className="absolute top-4 right-4 w-7 h-7 rounded-full bg-black/10 flex items-center justify-center"
                >
                  <X className="w-4 h-4 text-foreground" />
                </button>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ backgroundColor: detailAccount.color + '25' }}>
                    <Wallet className="w-6 h-6" style={{ color: detailAccount.color }} />
                  </div>
                  <div>
                    <p className="font-bold text-lg text-foreground">{detailAccount.name}</p>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground capitalize">{detailAccount.type}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">Current Balance</p>
                <p className="text-3xl font-bold" style={{ color: detailAccount.color }}>{formatCurrency(detailAccount.balance, currency)}</p>
              </div>

              {/* Income / Expense summary */}
              <div className="grid grid-cols-2 gap-3 p-4">
                <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                    <span className="text-xs font-medium text-green-700 dark:text-green-400">Total Income</span>
                  </div>
                  <p className="text-lg font-bold text-green-600 dark:text-green-400">{formatCurrency(detailIncome, currency)}</p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-2xl p-3">
                  <div className="flex items-center gap-1.5 mb-1">
                    <ArrowDownCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                    <span className="text-xs font-medium text-red-600 dark:text-red-400">Total Expense</span>
                  </div>
                  <p className="text-lg font-bold text-red-500 dark:text-red-400">{formatCurrency(detailExpense, currency)}</p>
                </div>
              </div>

              {/* Transactions List */}
              <div className="flex-1 overflow-y-auto px-4 pb-4">
                <p className="text-sm font-semibold text-foreground mb-2">
                  Transactions ({accountTxs.length})
                </p>
                {accountTxs.length === 0 ? (
                  <div className="text-center py-8">
                    <TrendingUp className="w-8 h-8 mx-auto text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No transactions yet for this account</p>
                  </div>
                ) : (
                  <div className="bg-card border border-card-border rounded-2xl overflow-hidden">
                    {accountTxs.map((tx, idx) => (
                      <div
                        key={tx.id}
                        className={`flex items-center gap-3 px-4 py-3 ${idx < accountTxs.length - 1 ? 'border-b border-border' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${tx.type === 'income' ? 'bg-green-100 dark:bg-green-900/30' : 'bg-red-100 dark:bg-red-900/30'}`}>
                          {tx.type === 'income'
                            ? <ArrowUpCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                            : <ArrowDownCircle className="w-4 h-4 text-red-500 dark:text-red-400" />
                          }
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">{tx.category}</p>
                          {tx.note && <p className="text-xs text-muted-foreground truncate">{tx.note}</p>}
                          <p className="text-xs text-muted-foreground">{format(new Date(tx.date), 'd MMM yyyy')}</p>
                        </div>
                        <p className={`text-sm font-semibold shrink-0 ${tx.type === 'income' ? 'text-green-600 dark:text-green-400' : 'text-red-500 dark:text-red-400'}`}>
                          {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount, currency)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editId ? 'Edit Account' : 'Add Account'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label>Account Name</Label>
              <Input
                placeholder="e.g. Cash, HDFC Bank"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                data-testid="input-account-name"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Type</Label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type: v as AccountType }))}>
                <SelectTrigger data-testid="select-account-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="bank">Bank</SelectItem>
                  <SelectItem value="wallet">Wallet</SelectItem>
                  <SelectItem value="credit">Credit Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>{editId ? 'Balance' : 'Opening Balance'}</Label>
              <Input
                type="number"
                placeholder="0.00"
                value={form.balance}
                onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                data-testid="input-account-balance"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Color</Label>
              <div className="flex gap-2 flex-wrap">
                {ACCOUNT_COLORS.map(c => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, color: c }))}
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-transform hover:scale-110"
                    style={{ backgroundColor: c }}
                    data-testid={`color-${c}`}
                  >
                    {form.color === c && <Check className="w-4 h-4 text-white" />}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} data-testid="save-account">{editId ? 'Update' : 'Add'} Account</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Delete Account</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">Are you sure you want to delete this account?</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button variant="destructive" onClick={confirmDelete} data-testid="confirm-delete-account">Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function TrendingUp({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
    </svg>
  );
}
