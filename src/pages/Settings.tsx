import { useState, useEffect, useRef } from "react";
import { Moon, Sun, Shield, Download, Upload, Trash2, ChevronRight, Check } from "lucide-react";
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
    <div className="p-4 md:p-6 max-w-lg mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-6">Settings</h1>

      <div className="space-y-3">
        {/* Appearance */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-4 pb-2">Appearance</p>
          <button
            onClick={toggleTheme}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-t border-border"
            data-testid="toggle-theme"
          >
            {settings.theme === 'dark' ? <Moon className="w-5 h-5 text-primary" /> : <Sun className="w-5 h-5 text-primary" />}
            <span className="flex-1 text-left text-sm font-medium text-foreground">
              {settings.theme === 'dark' ? 'Dark Mode' : 'Light Mode'}
            </span>
            <div className={cn("w-11 h-6 rounded-full transition-all relative", settings.theme === 'dark' ? 'bg-primary' : 'bg-muted')}>
              <div className={cn("w-4.5 h-4.5 rounded-full bg-white absolute top-0.75 transition-all shadow-sm", settings.theme === 'dark' ? 'left-5.5' : 'left-0.75')} />
            </div>
          </button>
        </div>

        {/* Currency */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-4 pb-2">Currency</p>
          <div className="px-4 pb-4 border-t border-border">
            <Select value={settings.currency} onValueChange={v => save({ ...settings, currency: v })}>
              <SelectTrigger className="mt-3" data-testid="select-currency">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="₹">₹ Indian Rupee</SelectItem>
                <SelectItem value="$">$ US Dollar</SelectItem>
                <SelectItem value="€">€ Euro</SelectItem>
                <SelectItem value="£">£ British Pound</SelectItem>
                <SelectItem value="¥">¥ Japanese Yen</SelectItem>
                <SelectItem value="৳">৳ Bangladeshi Taka</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Security */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-4 pb-2">Security</p>
          <button
            onClick={openMpinDialog}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-t border-border"
            data-testid="setup-mpin"
          >
            <Shield className="w-5 h-5 text-primary" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">MPIN Lock</p>
              <p className="text-xs text-muted-foreground">{settings.mpinEnabled ? 'Enabled — tap to change' : 'Disabled — tap to enable'}</p>
            </div>
            {settings.mpinEnabled && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 font-medium">ON</span>}
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          {settings.mpinEnabled && (
            <button
              onClick={disableMpin}
              className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-t border-border text-destructive"
              data-testid="disable-mpin"
            >
              <Shield className="w-5 h-5" />
              <span className="text-sm font-medium">Disable MPIN</span>
            </button>
          )}
        </div>

        {/* Data */}
        <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide px-4 pt-4 pb-2">Data</p>
          <button
            onClick={handleBackup}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-t border-border"
            data-testid="backup-data"
          >
            <Download className="w-5 h-5 text-primary" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Backup Data</p>
              <p className="text-xs text-muted-foreground">Download all your data as JSON</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <button
            onClick={() => fileRef.current?.click()}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors border-t border-border"
            data-testid="restore-data"
          >
            <Upload className="w-5 h-5 text-primary" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-foreground">Restore Data</p>
              <p className="text-xs text-muted-foreground">Import from a backup file</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
          <input ref={fileRef} type="file" accept=".json" className="hidden" onChange={handleRestore} data-testid="file-restore" />
          <button
            onClick={() => setClearDialog(true)}
            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors border-t border-border"
            data-testid="clear-data"
          >
            <Trash2 className="w-5 h-5 text-destructive" />
            <div className="flex-1 text-left">
              <p className="text-sm font-medium text-destructive">Clear All Data</p>
              <p className="text-xs text-muted-foreground">Permanently delete everything</p>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </button>
        </div>

        <p className="text-center text-xs text-muted-foreground pt-2">FinTrack v1.0 — All data stored locally on your device</p>
        <p className="text-center text-xs text-muted-foreground ">Founder - Arunraj</p>
      </div>

      {/* MPIN Dialog */}
      <Dialog open={mpinDialog} onOpenChange={v => { if (!v) { setMpinDialog(false); setMpinInput(''); setNewPin(''); setMpinStep('new'); } }}>
        <DialogContent className="max-w-xs">
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
        <DialogContent>
          <DialogHeader><DialogTitle>Clear All Data</DialogTitle></DialogHeader>
          <p className="text-muted-foreground text-sm">This will permanently delete all your transactions, accounts, notes, and settings. This cannot be undone.</p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setClearDialog(false)}>Cancel</Button>
            <Button variant="destructive" onClick={handleClearAll} data-testid="confirm-clear">Clear Everything</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
