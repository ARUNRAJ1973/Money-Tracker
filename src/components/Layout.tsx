import { useLocation, Link } from "wouter";
import { LayoutDashboard, ArrowLeftRight, Plus, Wallet, StickyNote, Calculator, Settings, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

interface LayoutProps {
  children: React.ReactNode;
}

const navItems = [
  { path: '/', icon: LayoutDashboard, label: 'Dashboard' },
  // { path: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
  { path: '/accounts', icon: Wallet, label: 'Accounts' },
  { path: '/notes', icon: StickyNote, label: 'Notes' },
  { path: '/calculator', icon: Calculator, label: 'Calculator' },
  { path: '/settings', icon: Settings, label: 'Settings' },
];

export default function Layout({ children }: LayoutProps) {
  const [location] = useLocation();

  return (
    <div className="flex h-screen bg-background">
      {/* Sidebar - desktop */}
      <aside className="hidden md:flex flex-col w-60 border-r border-sidebar-border bg-sidebar shrink-0">
        <div className="flex items-center gap-3 px-5 py-5 border-b border-sidebar-border">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center shrink-0">
            <Banknote className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-base text-sidebar-foreground leading-tight">FinTrack</h1>
            <p className="text-xs text-muted-foreground">Money Manager</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {navItems.map(({ path, icon: Icon, label }) => {
            const isActive = location === path;
            return (
              <Link
                key={path}
                href={path}
                data-testid={`nav-${label.toLowerCase()}`}
                className={cn(
                  "flex items-center rounded-xl text-sm font-medium transition-all duration-150",
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                )}
              >
                <Icon className="w-4 h-4 shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <Link
            href="/add-transaction"
            className="flex items-center justify-center gap-2 w-full py-2.5 bg-primary text-primary-foreground rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
            data-testid="nav-add-transaction"
          >
            <Plus className="w-4 h-4" />
            Add Transaction
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto pb-20 md:pb-0">
        {children}
      </main>

      {/* Bottom nav - mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border flex items-center justify-around px-1 py-2 z-40">
        {navItems.slice(0, 5).map(({ path, icon: Icon, label }) => {
          const isActive = location === path;
          return (
            <Link
              key={path}
              href={path}
              data-testid={`mobile-nav-${label.toLowerCase()}`}
              className={cn(
                "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <Icon className={cn("w-5 h-5", isActive && "stroke-[2.5]")} />
              <span className="text-[10px] font-medium">{label}</span>
            </Link>
          );
        })}
        {/* <Link
          href="/settings"
          data-testid="mobile-nav-settings"
          className={cn(
            "flex flex-col items-center gap-0.5 px-3 py-1 rounded-xl transition-all duration-150",
            location === '/settings' ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Settings className={cn("w-5 h-5", location === '/settings' && "stroke-[2.5]")} />
          <span className="text-[10px] font-medium">Settings</span>
        </Link> */}
      </nav>

      {/* Mobile FAB */}
      {/* <Link
        href="/add-transaction"
        className="md:hidden fixed bottom-20 right-5 w-14 h-14 bg-primary text-primary-foreground rounded-2xl flex items-center justify-center shadow-xl z-50 active:scale-95 transition-transform"
        data-testid="fab-add-transaction"
      >
        <Plus className="w-6 h-6" />
      </Link> */}
    </div>
  );
}
