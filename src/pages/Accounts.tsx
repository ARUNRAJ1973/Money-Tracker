import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Wallet, Plus, Pencil, Trash2, Check, ArrowUpCircle, ArrowDownCircle, X, ChevronRight } from "lucide-react";
import { storage, generateId, type Account, type Transaction } from "@/lib/storage";
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
  const [, setLocation] = useLocation();
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
    setForm({ name: a.name, balance: a.balance.toString(), color: a.color });
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
      const oldAccount = all.find(a => a.id === editId);
      const preserveBalance = oldAccount ? oldAccount.balance : balance;
      const updated = all.map(a => a.id === editId ? { ...a, name: form.name.trim(), color: form.color, balance: preserveBalance } : a);
      storage.setAccounts(updated);
      toast({ title: 'Account updated' });
    } else {
      const newAccount: Account = {
        id: generateId(),
        name: form.name.trim(),
        balance,
        color: form.color,
        createdAt: new Date().toISOString(),
      };
      storage.setAccounts([...all, newAccount]);

      if (balance > 0) {
        const txs = storage.getTransactions();
        storage.setTransactions([...txs, {
          id: `ob-${newAccount.id}`,
          type: 'income',
          amount: balance,
          description: 'Opening Balance',
          accountId: newAccount.id,
          date: newAccount.createdAt.split('T')[0],
          createdAt: newAccount.createdAt
        }]);
      }

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
              onClick={() => setLocation(`/accounts/${account.id}`)}
            >
              <div className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: account.color + '20' }}>
                <Wallet className="w-5 h-5" style={{ color: account.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground">{account.name}</p>
                <p className="text-md font-bold mt-0.5" style={{ color: account.color }}><span className="text-muted-foreground text-sm">Balance : </span>{formatCurrency(account.balance, currency)}</p>
              </div>
              <div className="flex gap-1.5 items-center">
                <button
                  onClick={(e) => openEdit(account, e)}
                  className="w-8 h-8 rounded-lg bg-green-100 hover:bg-accent flex items-center justify-center transition-colors"
                  data-testid={`edit-account-${account.id}`}
                >
                  <Pencil className="w-3.5 h-3.5 text-muted-foreground" />
                </button>
                <button
                  onClick={(e) => handleDelete(account.id, e)}
                  className="w-8 h-8 rounded-lg bg-red-100 hover:bg-red-100 dark:hover:bg-red-900/30 flex items-center justify-center transition-colors"
                  data-testid={`delete-account-${account.id}`}
                >
                  <Trash2 className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive" />
                </button>
                {/* <ChevronRight className="w-4 h-4 text-muted-foreground ml-1" /> */}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl">
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

            {!editId && (
              <div className="space-y-1.5">
                <Label>Opening Balance</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={form.balance}
                  onChange={e => setForm(f => ({ ...f, balance: e.target.value }))}
                  data-testid="input-account-balance"
                />
              </div>
            )}
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
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Delete Account</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">Are you sure you want to delete this account?</p>
          <DialogFooter>
            <Button className="w-1/2" variant="outline" onClick={() => setDeleteId(null)}>Cancel</Button>
            <Button className="w-1/2" variant="destructive" onClick={confirmDelete} data-testid="confirm-delete-account">Delete</Button>
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
