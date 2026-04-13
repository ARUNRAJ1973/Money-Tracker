import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { storage, generateId, type Account } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AddTransaction() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{ id: string }>("/edit-transaction/:id");
  const editId = match && params ? params.id : null;
  const initialAccountId = new URLSearchParams(window.location.search).get('accountId');
  const initialType = new URLSearchParams(window.location.search).get('type');
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [type, setType] = useState<'income' | 'expense'>(initialType === 'income' ? 'income' : 'expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().split('T')[0];
  });
  const [time, setTime] = useState(() => {
    const now = new Date();
    return new Date(now.getTime() - now.getTimezoneOffset() * 60000).toISOString().slice(11, 16);
  });
  const [loading, setLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const accts = storage.getAccounts();
    setAccounts(accts);

    if (editId) {
      const txs = storage.getTransactions();
      const txToEdit = txs.find(t => t.id === editId);
      if (txToEdit) {
        setType(txToEdit.type);
        setAmount(txToEdit.amount.toString());
        setDescription(txToEdit.description);
        setAccountId(txToEdit.accountId);
        if (txToEdit.date.includes('T')) {
          const [d, t] = txToEdit.date.split('T');
          setDate(d);
          setTime(t.slice(0, 5));
        } else {
          setDate(txToEdit.date);
          setTime('00:00');
        }
      } else {
        toast({ title: 'Transaction not found', variant: 'destructive' });
        setLocation('/transactions');
      }
    } else {
      if (initialAccountId && accts.some(a => a.id === initialAccountId)) {
        setAccountId(initialAccountId);
      } else if (accts.length > 0) {
        setAccountId(accts[0].id);
      }
    }
  }, [editId, initialAccountId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);
    if (!num || num <= 0) {
      toast({ title: 'Invalid amount', description: 'Please enter a valid amount', variant: 'destructive' });
      return;
    }
    if (!description.trim()) {
      toast({ title: 'Description required', description: 'Please enter a description', variant: 'destructive' });
      return;
    }
    if (!accountId) {
      toast({ title: 'Account required', description: 'Please select an account', variant: 'destructive' });
      return;
    }

    setLoading(true);
    const txs = storage.getTransactions();
    const accts = storage.getAccounts();

    if (editId) {
      const oldTxIndex = txs.findIndex(t => t.id === editId);
      if (oldTxIndex >= 0) {
        const oldTx = txs[oldTxIndex];

        let updatedAccounts = accts.map(a => {
          if (a.id === oldTx.accountId) {
            return { ...a, balance: oldTx.type === 'income' ? a.balance - oldTx.amount : a.balance + oldTx.amount };
          }
          return a;
        });

        updatedAccounts = updatedAccounts.map(a => {
          if (a.id === accountId) {
            return { ...a, balance: type === 'income' ? a.balance + num : a.balance - num };
          }
          return a;
        });

        storage.setAccounts(updatedAccounts);

        const updatedTx = {
          ...oldTx,
          type,
          amount: num,
          description: description.trim(),
          accountId,
          date: `${date}T${time}:00`,
        };
        txs[oldTxIndex] = updatedTx;
        storage.setTransactions(txs);
        toast({ title: 'Transaction updated!' });
      }
    } else {
      const newTx = {
        id: generateId(),
        type,
        amount: num,
        description: description.trim(),
        accountId,
        date: `${date}T${time}:00`,
        createdAt: new Date().toISOString(),
      };

      storage.setTransactions([...txs, newTx]);

      const updatedAccounts = accts.map(a => {
        if (a.id !== accountId) return a;
        return {
          ...a,
          balance: type === 'income' ? a.balance + num : a.balance - num,
        };
      });
      storage.setAccounts(updatedAccounts);
      toast({ title: 'Transaction added!' });
    }

    setTimeout(() => {
      setLoading(false);
      setLocation(initialAccountId ? `/accounts/${initialAccountId}` : '/accounts');
    }, 300);
  };

  const handleDelete = () => {
    if (!editId) return;
    setLoading(true);
    const txs = storage.getTransactions();
    const accts = storage.getAccounts();
    const oldTx = txs.find(t => t.id === editId);

    if (oldTx) {
      const updatedAccounts = accts.map(a => {
        if (a.id === oldTx.accountId) {
          return { ...a, balance: oldTx.type === 'income' ? a.balance - oldTx.amount : a.balance + oldTx.amount };
        }
        return a;
      });
      storage.setAccounts(updatedAccounts);
      storage.setTransactions(txs.filter(t => t.id !== editId));
      toast({ title: 'Transaction deleted' });
      setDeleteDialogOpen(false);
      setTimeout(() => {
        setLoading(false);
        setLocation(initialAccountId ? `/accounts/${initialAccountId}` : '/accounts');
      }, 300);
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setLocation(initialAccountId ? `/accounts/${initialAccountId}` : '/accounts')} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h1 className="text-xl font-bold text-foreground">{editId ? 'Edit Transaction' : 'Add Transaction'}</h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Type Toggle */}
        <div className="bg-muted rounded-2xl p-1 flex gap-1">
          <button
            type="button"
            onClick={() => { setType('expense'); }}
            className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all", type === 'expense' ? 'bg-red-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            data-testid="type-expense"
          >
            Expense
          </button>
          <button
            type="button"
            onClick={() => { setType('income'); }}
            className={cn("flex-1 py-2.5 rounded-xl text-sm font-semibold transition-all", type === 'income' ? 'bg-green-500 text-white shadow-sm' : 'text-muted-foreground hover:text-foreground')}
            data-testid="type-income"
          >
            Income
          </button>
        </div>

        {/* Amount */}
        <div className="space-y-1.5">
          <Label htmlFor="amount">Amount</Label>
          <Input
            id="amount"
            type="number"
            placeholder="0.00"
            value={amount}
            onChange={e => setAmount(e.target.value)}
            className="text-2xl h-14 font-bold"
            min="0"
            step="0.01"
            data-testid="input-amount"
          />
        </div>

        {/* Description */}
        <div className="space-y-1.5">
          <Label htmlFor="description">Description</Label>
          <Input
            id="description"
            placeholder="e.g. Salary, Groceries"
            value={description}
            onChange={e => setDescription(e.target.value)}
            data-testid="input-description"
          />
        </div>

        {/* Account */}
        {!initialAccountId && (
          <div className="space-y-1.5">
            <Label>Account</Label>
            <Select value={accountId} onValueChange={setAccountId}>
              <SelectTrigger data-testid="select-account">
                <SelectValue placeholder="Select account" />
              </SelectTrigger>
              <SelectContent>
                {accounts.map(a => (
                  <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Date and Time */}
        <div className="flex gap-3">
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              data-testid="input-date"
            />
          </div>
          <div className="space-y-1.5 flex-1">
            <Label htmlFor="time">Time</Label>
            <Input
              id="time"
              type="time"
              value={time}
              onChange={e => setTime(e.target.value)}
              data-testid="input-time"
            />
          </div>
        </div>



        {editId ? (
          <div className="flex gap-3">
            <Button type="button" variant="destructive" className="flex-1 h-12 text-base font-semibold" disabled={loading} onClick={() => setDeleteDialogOpen(true)}>
              Delete
            </Button>
            <Button type="submit" className="flex-1 h-12 text-base font-semibold" disabled={loading} data-testid="submit-transaction">
              {loading ? 'Saving...' : 'Update'}
            </Button>
          </div>
        ) : (
          <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading} data-testid="submit-transaction">
            {loading ? 'Saving...' : 'Save Transaction'}
          </Button>
        )}
      </form>

      {/* Delete Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Transaction</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Are you sure you want to delete this transaction? This will also adjust the account balance.
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleDelete}>Delete</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
