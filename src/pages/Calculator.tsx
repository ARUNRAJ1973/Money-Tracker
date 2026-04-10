import { useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";
import { storage } from "@/lib/storage";

const DENOMINATIONS = [2000, 500, 200, 100, 50, 20, 10, 5, 2, 1];

export default function Calculator() {
  const [tab, setTab] = useState<'standard' | 'cash'>('standard');
  const [display, setDisplay] = useState('0');
  const [expression, setExpression] = useState('');
  const [justCalculated, setJustCalculated] = useState(false);
  const [history, setHistory] = useState<string[]>([]);

  const [denomCounts, setDenomCounts] = useState<Record<number, string>>(
    Object.fromEntries(DENOMINATIONS.map(d => [d, '']))
  );

  const currency = storage.getSettings().currency || '₹';

  const cashTotal = DENOMINATIONS.reduce((sum, d) => {
    const count = parseInt(denomCounts[d] || '0') || 0;
    return sum + d * count;
  }, 0);

  const handleDigit = (digit: string) => {
    if (justCalculated) {
      setDisplay(digit);
      setExpression(digit);
      setJustCalculated(false);
      return;
    }
    if (display === '0' && digit !== '.') {
      setDisplay(digit);
      setExpression(digit);
    } else {
      if (digit === '.' && display.includes('.')) return;
      setDisplay(prev => prev + digit);
      setExpression(prev => prev + digit);
    }
  };

  const handleOp = (op: string) => {
    setJustCalculated(false);
    const last = expression.slice(-1);
    if (['+', '-', '*', '/'].includes(last)) {
      setExpression(prev => prev.slice(0, -1) + op);
    } else {
      setExpression(prev => prev + op);
    }
    setDisplay(op);
  };

  const handleEquals = () => {
    try {
      const result = Function('"use strict"; return (' + expression + ')')();
      const formatted = parseFloat(result.toFixed(10)).toString();
      setHistory(prev => [`${expression} = ${formatted}`, ...prev.slice(0, 9)]);
      setDisplay(formatted);
      setExpression(formatted);
      setJustCalculated(true);
    } catch {
      setDisplay('Error');
      setExpression('');
    }
  };

  const handleClear = () => {
    setDisplay('0');
    setExpression('');
    setJustCalculated(false);
  };

  const handlePercent = () => {
    try {
      const val = parseFloat(display) / 100;
      const formatted = val.toString();
      setDisplay(formatted);
      setExpression(expression.slice(0, expression.length - display.length) + formatted);
    } catch { /* ignore */ }
  };

  const handleBackspace = () => {
    if (justCalculated) { handleClear(); return; }
    if (display.length <= 1) {
      setDisplay('0');
      setExpression(expression.slice(0, -1));
    } else {
      setDisplay(prev => prev.slice(0, -1));
      setExpression(prev => prev.slice(0, -1));
    }
  };

  const CalcButton = ({ label, onClick, className }: { label: React.ReactNode; onClick: () => void; className?: string }) => (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center justify-center rounded-2xl text-lg font-semibold h-16 active:scale-95 transition-all duration-100 shadow-sm",
        className
      )}
      data-testid={`calc-${typeof label === 'string' ? label : 'del'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="p-4 md:p-6 max-w-sm mx-auto">
      <h1 className="text-2xl font-bold text-foreground mb-5">Calculator</h1>

      {/* Tabs */}
      <div className="flex bg-muted rounded-2xl p-1 gap-1 mb-5">
        <button
          onClick={() => setTab('standard')}
          className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all", tab === 'standard' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}
          data-testid="tab-standard"
        >
          Standard
        </button>
        <button
          onClick={() => setTab('cash')}
          className={cn("flex-1 py-2 rounded-xl text-sm font-semibold transition-all", tab === 'cash' ? 'bg-card shadow-sm text-foreground' : 'text-muted-foreground')}
          data-testid="tab-cash"
        >
          Cash Counter
        </button>
      </div>

      {tab === 'standard' && (
        <div className="bg-card border border-card-border rounded-3xl p-4 shadow-md">
          {/* Display */}
          <div className="bg-muted rounded-2xl px-4 py-3 mb-4 text-right min-h-[80px] flex flex-col justify-end">
            <p className="text-muted-foreground text-xs mb-1 truncate">{expression || ''}</p>
            <p className="text-4xl font-bold text-foreground truncate" data-testid="calc-display">{display}</p>
          </div>

          {/* History */}
          {history.length > 0 && (
            <div className="mb-3 max-h-20 overflow-y-auto">
              {history.map((h, i) => (
                <p key={i} className="text-xs text-muted-foreground text-right">{h}</p>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div className="grid grid-cols-4 gap-2">
            <CalcButton label="AC" onClick={handleClear} className="bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400" />
            <CalcButton label="%" onClick={handlePercent} className="bg-muted text-muted-foreground" />
            <CalcButton label={<Delete className="w-5 h-5" />} onClick={handleBackspace} className="bg-muted text-muted-foreground" />
            <CalcButton label="÷" onClick={() => handleOp('/')} className="bg-primary text-primary-foreground" />

            {['7','8','9'].map(d => <CalcButton key={d} label={d} onClick={() => handleDigit(d)} className="bg-secondary text-secondary-foreground" />)}
            <CalcButton label="×" onClick={() => handleOp('*')} className="bg-primary text-primary-foreground" />

            {['4','5','6'].map(d => <CalcButton key={d} label={d} onClick={() => handleDigit(d)} className="bg-secondary text-secondary-foreground" />)}
            <CalcButton label="-" onClick={() => handleOp('-')} className="bg-primary text-primary-foreground" />

            {['1','2','3'].map(d => <CalcButton key={d} label={d} onClick={() => handleDigit(d)} className="bg-secondary text-secondary-foreground" />)}
            <CalcButton label="+" onClick={() => handleOp('+')} className="bg-primary text-primary-foreground" />

            <CalcButton label="." onClick={() => handleDigit('.')} className="bg-secondary text-secondary-foreground" />
            <CalcButton label="0" onClick={() => handleDigit('0')} className="bg-secondary text-secondary-foreground" />
            <CalcButton label="=" onClick={handleEquals} className="bg-primary text-primary-foreground col-span-2" />
          </div>
        </div>
      )}

      {tab === 'cash' && (
        <div className="space-y-3">
          <div className="bg-card border border-card-border rounded-2xl overflow-hidden shadow-sm">
            {DENOMINATIONS.map((denom, idx) => (
              <div key={denom} className={`flex items-center gap-3 px-4 py-3 ${idx < DENOMINATIONS.length - 1 ? 'border-b border-border' : ''}`}>
                <div className="w-16 shrink-0">
                  <span className="text-sm font-semibold text-foreground">{currency}{denom}</span>
                </div>
                <span className="text-muted-foreground text-sm shrink-0">×</span>
                <input
                  type="number"
                  min="0"
                  placeholder="0"
                  value={denomCounts[denom]}
                  onChange={e => setDenomCounts(prev => ({ ...prev, [denom]: e.target.value }))}
                  className="flex-1 bg-transparent border-0 outline-none text-right text-sm font-medium text-foreground placeholder:text-muted-foreground w-0"
                  data-testid={`denom-${denom}`}
                />
                <span className="text-muted-foreground text-sm shrink-0 w-20 text-right">
                  = {currency}{((parseInt(denomCounts[denom] || '0') || 0) * denom).toLocaleString('en-IN')}
                </span>
              </div>
            ))}
          </div>

          <div className="bg-primary rounded-2xl p-4 flex items-center justify-between">
            <div>
              <p className="text-primary-foreground/80 text-sm">Total Cash</p>
              <p className="text-primary-foreground text-3xl font-bold" data-testid="cash-total">
                {currency}{cashTotal.toLocaleString('en-IN')}
              </p>
            </div>
            <button
              onClick={() => setDenomCounts(Object.fromEntries(DENOMINATIONS.map(d => [d, ''])))}
              className="text-primary-foreground/70 text-sm hover:text-primary-foreground"
              data-testid="cash-reset"
            >
              Reset
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
