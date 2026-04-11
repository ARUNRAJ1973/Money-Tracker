import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState } from "react";
import { storage, seedDefaultData } from "@/lib/storage";
import Layout from "@/components/Layout";
import MpinLock from "@/components/MpinLock";
import Dashboard from "@/pages/Dashboard";
import Transactions from "@/pages/Transactions";
import AddTransaction from "@/pages/AddTransaction";
import Accounts from "@/pages/Accounts";
import Notes from "@/pages/Notes";
import Calculator from "@/pages/Calculator";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";

const queryClient = new QueryClient();

function AppRoutes() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/transactions" component={Transactions} />
        <Route path="/add-transaction" component={AddTransaction} />
        <Route path="/edit-transaction/:id" component={AddTransaction} />
        <Route path="/accounts" component={Accounts} />
        <Route path="/notes" component={Notes} />
        <Route path="/calculator" component={Calculator} />
        <Route path="/settings" component={Settings} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  const [unlocked, setUnlocked] = useState(false);
  const [initialized, setInitialized] = useState(false);
  const [settings, setSettings] = useState(storage.getSettings());

  useEffect(() => {
    seedDefaultData();
    const s = storage.getSettings();
    setSettings(s);
    document.documentElement.classList.toggle('dark', s.theme === 'dark');
    if (!s.mpinEnabled) setUnlocked(true);
    setInitialized(true);
  }, []);

  const handleUnlock = () => setUnlocked(true);

  if (!initialized) return null;

  if (!unlocked && settings.mpinEnabled) {
    return (
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <MpinLock mpin={settings.mpin} onUnlock={handleUnlock} />
          <Toaster />
        </TooltipProvider>
      </QueryClientProvider>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <AppRoutes />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
