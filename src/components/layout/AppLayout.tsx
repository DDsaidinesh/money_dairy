import { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import Header from './Header';
import Sidebar from './Sidebar';
import MobileNav from './MobileNav';
import TransactionDialog from '@/components/transactions/TransactionDialog';
import { Loader2 } from 'lucide-react';

export default function AppLayout() {
  const { user, isLoading } = useAuth();
  const [showAddTransaction, setShowAddTransaction] = useState(false);

  if (isLoading) {
    return (
      <div className="flex h-dvh items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background">
      <Header />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto max-w-5xl px-4 py-4 pb-20 md:px-6 md:py-6 md:pb-6">
            <Outlet context={{ openAddTransaction: () => setShowAddTransaction(true) }} />
          </div>
        </main>
      </div>
      <MobileNav onAddClick={() => setShowAddTransaction(true)} />
      <TransactionDialog
        open={showAddTransaction}
        onOpenChange={setShowAddTransaction}
      />
    </div>
  );
}
