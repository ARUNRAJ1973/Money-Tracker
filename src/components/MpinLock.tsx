import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Delete } from "lucide-react";

interface MpinLockProps {
  mpin: string;
  onUnlock: () => void;
}

export default function MpinLock({ mpin, onUnlock }: MpinLockProps) {
  const [input, setInput] = useState('');
  const [error, setError] = useState('');

  const handleDigit = (d: string) => {
    if (input.length >= 4) return;
    const newInput = input + d;
    setInput(newInput);
    setError('');
    if (newInput.length === 4) {
      if (newInput === mpin) {
        onUnlock();
      } else {
        setTimeout(() => {
          setInput('');
          setError('Incorrect PIN. Please try again.');
        }, 300);
      }
    }
  };

  const handleDelete = () => {
    setInput(prev => prev.slice(0, -1));
    setError('');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex flex-col items-center gap-8 p-8">
        <div className="flex flex-col items-center gap-2">
          <div className="w-14 h-14 rounded-2xl bg-primary flex items-center justify-center mb-2">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect width="18" height="11" x="3" y="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-foreground">CashBook</h1>
          <p className="text-muted-foreground text-sm">Enter your PIN to unlock</p>
        </div>

        <div className="flex gap-4">
          {[0, 1, 2, 3].map(i => (
            <div
              key={i}
              className={`w-4 h-4 rounded-full border-2 transition-all duration-200 ${
                i < input.length
                  ? 'bg-primary border-primary'
                  : 'border-border bg-transparent'
              }`}
            />
          ))}
        </div>

        {error && (
          <p className="text-destructive text-sm font-medium">{error}</p>
        )}

        <div className="grid grid-cols-3 gap-3">
          {['1','2','3','4','5','6','7','8','9','','0','del'].map((key) => (
            <button
              key={key}
              data-testid={`pin-key-${key}`}
              onClick={() => {
                if (key === 'del') handleDelete();
                else if (key !== '') handleDigit(key);
              }}
              disabled={key === ''}
              className={`w-16 h-16 rounded-2xl text-xl font-semibold transition-all duration-150 active:scale-95 ${
                key === ''
                  ? 'invisible'
                  : key === 'del'
                  ? 'bg-muted text-muted-foreground hover:bg-accent'
                  : 'bg-card border border-border text-foreground hover:bg-accent shadow-sm'
              }`}
            >
              {key === 'del' ? <Delete className="w-5 h-5 mx-auto" /> : key}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
