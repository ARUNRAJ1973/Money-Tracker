import { useState, useEffect } from "react";
import { useLocation, useRoute } from "wouter";
import { ArrowLeft } from "lucide-react";
import { storage, generateId, type Account } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function AddTransaction() {
  const [, setLocation] = useLocation();
  const [match, params] = useRoute<{id: string}>("/edit-transaction/:id");
  const editId = match && params ? params.id : null;
  const { toast } = useToast();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [accountId, setAccountId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [loading, setLoading] = useState(false);

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
        setDate(txToEdit.date);
      } else {
        toast({ title: 'Transaction not found', variant: 'destructive' });
        setLocation('/transactions');
      }
    } else {
      if (accts.length > 0) setAccountId(accts[0].id);
    }
  }, [editId]);

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
          date,
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
        date,
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
      setLocation('/transactions');
    }, 300);
  };

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => setLocation('/')} className="w-9 h-9 rounded-xl bg-muted flex items-center justify-center hover:bg-accent transition-colors">
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

        {/* Date */}
        <div className="space-y-1.5">
          <Label htmlFor="date">Date</Label>
          <Input
            id="date"
            type="date"
            value={date}
            onChange={e => setDate(e.target.value)}
            data-testid="input-date"
          />
        </div>



        <Button type="submit" className="w-full h-12 text-base font-semibold" disabled={loading} data-testid="submit-transaction">
          {loading ? 'Saving...' : editId ? 'Update Transaction' : 'Save Transaction'}
        </Button>
      </form>
    </div>
  );
}
