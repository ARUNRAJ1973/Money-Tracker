import { useState, useEffect, useRef } from "react";
import { Shield, Download, Upload, Trash2, ChevronRight, Coins, Palette, ShieldCheck } from "lucide-react";
import { storage, type AppSettings } from "@/lib/storage";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

export default function Settings() {
  const [settings, setSettings] = useState<AppSettings>(storage.getSettings());
  const [mpinDialog, setMpinDialog] = useState(false);
  const [mpinStep, setMpinStep] = useState<'verify' | 'new' | 'confirm'>('new');
  const [mpinInput, setMpinInput] = useState('');
  const [newPin, setNewPin] = useState('');
  const [clearDialog, setClearDialog] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const s = storage.getSettings();
    setSettings(s);
    document.documentElement.classList.toggle('dark', s.theme === 'dark');
  }, []);

  const save = (updated: AppSettings) => {
    setSettings(updated);
    storage.setSettings(updated);
    document.documentElement.classList.toggle('dark', updated.theme === 'dark');
  };

  const toggleTheme = () => {
    save({ ...settings, theme: settings.theme === 'light' ? 'dark' : 'light' });
  };

  const handleMpinDigit = (d: string) => {
    const cur = mpinInput + d;
    if (cur.length > 4) return;
    setMpinInput(cur);

    if (cur.length === 4) {
      if (mpinStep === 'verify') {
        if (cur === settings.mpin) {
          setTimeout(() => { setMpinInput(''); setMpinStep('new'); }, 200);
        } else {
          setTimeout(() => { setMpinInput(''); toast({ title: 'Incorrect PIN', variant: 'destructive' }); }, 300);
        }
      } else if (mpinStep === 'new') {
        setNewPin(cur);
        setTimeout(() => { setMpinInput(''); setMpinStep('confirm'); }, 200);
      } else if (mpinStep === 'confirm') {
        if (cur === newPin) {
          const updated = { ...settings, mpinEnabled: true, mpin: newPin };
          save(updated);
          toast({ title: 'MPIN set successfully' });
          setMpinDialog(false);
          setMpinInput('');
          setNewPin('');
          setMpinStep('new');
        } else {
          setTimeout(() => { setMpinInput(''); toast({ title: 'PINs do not match', variant: 'destructive' }); setMpinStep('new'); setNewPin(''); }, 300);
        }
      }
    }
  };

  const handleMpinDelete = () => setMpinInput(prev => prev.slice(0, -1));

  const openMpinDialog = () => {
    setMpinInput('');
    setNewPin('');
    setMpinStep(settings.mpinEnabled && settings.mpin ? 'verify' : 'new');
    setMpinDialog(true);
  };

  const disableMpin = () => {
    save({ ...settings, mpinEnabled: false, mpin: '' });
    toast({ title: 'MPIN disabled' });
  };

  const handleBackup = () => {
    const data = storage.exportAll();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fintrack-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'Backup downloaded' });
  };

  const handleRestore = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string);
        if (!data.accounts || !data.transactions) throw new Error('Invalid backup');
        storage.importAll(data);
        toast({ title: 'Backup restored! Refresh to see changes.' });
        if (fileRef.current) fileRef.current.value = '';
      } catch {
        toast({ title: 'Invalid backup file', variant: 'destructive' });
      }
    };
    reader.readAsText(file);
  };

  const handleClearAll = () => {
    storage.clearAll();
    setClearDialog(false);
    toast({ title: 'All data cleared. Refresh the page.' });
  };

  const mpinStepLabel = {
    verify: 'Enter current PIN',
    new: 'Set new 4-digit PIN',
    confirm: 'Confirm new PIN',
  }[mpinStep];

  return (
    <div className="p-4 md:p-6 max-w-lg mx-auto pb-24 md:pb-10">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <div className="space-y-6">
        {/* Preferences Group */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 px-2">Preferences</p>
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden text-left">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors border-b border-border"
              data-testid="toggle-theme"
            >
              <div className="w-9 h-9 rounded-xl bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center shrink-0">
                <Palette className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground">Theme</p>
                <p className="text-xs text-muted-foreground truncate">{settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}</p>
              </div>
              <div className={cn("w-11 h-6 rounded-full transition-all relative shadow-inner shrink-0", settings.theme === 'dark' ? 'bg-primary' : 'bg-border')}>
                <div className={cn("w-4.5 h-4.5 rounded-full bg-white absolute top-0.75 transition-all shadow-sm", settings.theme === 'dark' ? 'left-5.5' : 'left-0.75')} />
              </div>
            </button>

            <div className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors">
              <div className="w-9 h-9 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5 text-green-600 dark:text-green-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground">Currency</p>
                <p className="text-xs text-muted-foreground truncate">Select your primary currency</p>
              </div>
              <div className="shrink-0 w-24">
                <Select value={settings.currency} onValueChange={v => save({ ...settings, currency: v })}>
                  <SelectTrigger className="h-8 bg-muted border-none shadow-none text-xs font-semibold focus:ring-0 justify-between px-3" data-testid="select-currency">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="₹">₹ INR</SelectItem>
                    <SelectItem value="$">$ USD</SelectItem>
                    <SelectItem value="S$">S$ SGD</SelectItem>
                    <SelectItem value="€">€ EUR</SelectItem>
                    <SelectItem value="£">£ GBP</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>

        {/* Security Group */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 px-2">Security</p>
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden text-left">
            <button
              onClick={openMpinDialog}
              className={cn("w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors", settings.mpinEnabled && "border-b border-border")}
              data-testid="setup-mpin"
            >
              <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground">MPIN Lock</p>
                <p className="text-xs text-muted-foreground truncate">Tap to {settings.mpinEnabled ? 'change PIN' : 'setup'}</p>
              </div>
              <div className={cn("w-11 h-6 rounded-full transition-all relative shadow-inner shrink-0", settings.mpinEnabled ? 'bg-primary' : 'bg-border')}>
                <div className={cn("w-4.5 h-4.5 rounded-full bg-white absolute top-0.75 transition-all shadow-sm", settings.mpinEnabled ? 'left-5.5' : 'left-0.75')} />
              </div>
            </button>

            {settings.mpinEnabled && (
              <button
                onClick={disableMpin}
                className="w-full flex items-center justify-center gap-2 px-4 py-3.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-destructive text-sm font-semibold"
                data-testid="disable-mpin"
              >
                Disable MPIN
              </button>
            )}
          </div>
        </div>

        {/* Data Group */}
        <div>
          <p className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mb-2.5 px-2">Data Management</p>
          <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden text-left">
            <button
              onClick={handleBackup}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors border-b border-border"
              data-testid="backup-data"
            >
              <div className="w-9 h-9 rounded-xl bg-cyan-100 dark:bg-cyan-900/30 flex items-center justify-center shrink-0">
                <Download className="w-5 h-5 text-cyan-600 dark:text-cyan-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground">Backup Data</p>
                <p className="text-xs text-muted-foreground truncate">Download all transactions & accounts</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 shrink-0" />
            </button>

            <button
              onClick={() => fileRef.current?.click()}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-muted/40 transition-colors border-b border-border"
              data-testid="restore-data"
            >
              <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                <Upload className="w-5 h-5 text-amber-600 dark:text-amber-400" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-foreground">Restore Data</p>
                <p className="text-xs text-muted-foreground truncate">Load from a backup JSON file</p>
              </div>
              <ChevronRight className="w-4 h-4 text-muted-foreground opacity-50 shrink-0" />
            </button>
            <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleRestore} data-testid="file-restore" />

            <button
              onClick={() => setClearDialog(true)}
              className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
              data-testid="clear-data"
            >
              <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5 text-destructive" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-semibold text-destructive">Delete All Data</p>
                <p className="text-xs text-muted-foreground truncate">Permanently delete everything</p>
              </div>
            </button>
          </div>
        </div>

        <div className="flex flex-col items-center justify-center pb-1">
          <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center mb-3">
            <span className="font-bold text-primary text-xl">F</span>
          </div>
          <p className="text-center text-xs font-semibold text-foreground">FinTrack v1.0</p>
          <p className="text-center text-[11px] text-muted-foreground mt-0.5">All data is stored locally on this device</p>
          <p className="text-center text-[10px] text-muted-foreground/70 mt-2 font-medium">Developed by - ARUNRAJ</p>
        </div>
      </div>

      {/* MPIN Dialog */}
      <Dialog open={mpinDialog} onOpenChange={v => { if (!v) { setMpinDialog(false); setMpinInput(''); setNewPin(''); setMpinStep('new'); } }}>
        <DialogContent className="max-w-xs rounded-2xl">
          <DialogHeader>
            <DialogTitle>MPIN Setup</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center gap-6 py-2">
            <p className="text-muted-foreground text-sm text-center">{mpinStepLabel}</p>
            <div className="flex gap-4">
              {[0, 1, 2, 3].map(i => (
                <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < mpinInput.length ? 'bg-primary border-primary' : 'border-border'}`} />
              ))}
            </div>
            <div className="grid grid-cols-3 gap-2 w-full">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map(key => (
                <button
                  key={key}
                  onClick={() => { if (key === 'del') handleMpinDelete(); else if (key) handleMpinDigit(key); }}
                  disabled={key === ''}
                  className={cn("h-14 rounded-xl text-lg font-semibold transition-all active:scale-95", key === '' ? 'invisible' : key === 'del' ? 'bg-muted text-muted-foreground' : 'bg-secondary text-foreground hover:bg-accent')}
                  data-testid={`mpin-key-${key}`}
                >
                  {key === 'del' ? '⌫' : key}
                </button>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Clear all confirm */}
      <Dialog open={clearDialog} onOpenChange={setClearDialog}>
        <DialogContent className="rounded-2xl">
          <DialogHeader><DialogTitle>Clear All Data</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">This will permanently delete all your transactions, accounts, notes, and settings. This cannot be undone.</p>
          <DialogFooter className="flex flex-row justify-center gap-2">
            <Button className="w-1/2" variant="outline" onClick={() => setClearDialog(false)}>Cancel</Button>
            <Button className="w-1/2" variant="destructive" onClick={handleClearAll} data-testid="confirm-clear">Delete All</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
