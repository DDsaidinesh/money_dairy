-- ============================================================
-- Money Tracker: Complete Schema Rebuild
-- Run this on an existing Supabase project (drops all app tables)
-- ============================================================

-- Drop existing objects
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP TRIGGER IF EXISTS trigger_create_default_cash_account ON auth.users;
DROP TRIGGER IF EXISTS trg_balance_insert ON transactions;
DROP TRIGGER IF EXISTS trg_balance_delete ON transactions;
DROP TRIGGER IF EXISTS trg_balance_update ON transactions;

DROP TABLE IF EXISTS transactions CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS accounts CASCADE;
DROP TABLE IF EXISTS account_types CASCADE;
DROP TABLE IF EXISTS profiles CASCADE;

DROP FUNCTION IF EXISTS migrate_local_storage_data CASCADE;
DROP FUNCTION IF EXISTS create_default_accounts CASCADE;
DROP FUNCTION IF EXISTS create_default_accounts_for_existing_users CASCADE;
DROP FUNCTION IF EXISTS create_default_account_types CASCADE;
DROP FUNCTION IF EXISTS recalculate_account_balances CASCADE;
DROP FUNCTION IF EXISTS update_updated_at_column CASCADE;
DROP FUNCTION IF EXISTS handle_new_user CASCADE;
DROP FUNCTION IF EXISTS update_updated_at CASCADE;
DROP FUNCTION IF EXISTS update_balance_on_insert CASCADE;
DROP FUNCTION IF EXISTS update_balance_on_delete CASCADE;
DROP FUNCTION IF EXISTS update_balance_on_update CASCADE;
DROP FUNCTION IF EXISTS create_default_cash_account CASCADE;

DROP TYPE IF EXISTS transaction_type CASCADE;

-- ============================================================
-- Tables
-- ============================================================

CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL DEFAULT 'User',
  currency TEXT NOT NULL DEFAULT 'INR',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('cash','bank','credit_card','wallet','investment','loan','other')),
  balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  initial_balance NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'INR',
  icon TEXT,
  color TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('income','expense')),
  icon TEXT,
  color TEXT,
  is_default BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('income','expense','transfer')),
  amount NUMERIC(12,2) NOT NULL CHECK (amount > 0),
  description TEXT,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE RESTRICT,
  to_account_id UUID REFERENCES accounts(id) ON DELETE RESTRICT,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT transfer_requires_destination CHECK (
    (type = 'transfer' AND to_account_id IS NOT NULL AND account_id != to_account_id)
    OR (type != 'transfer' AND to_account_id IS NULL)
  )
);

-- ============================================================
-- Indexes
-- ============================================================

CREATE INDEX idx_transactions_user_date ON transactions(user_id, date DESC);
CREATE INDEX idx_transactions_user_type ON transactions(user_id, type);
CREATE INDEX idx_transactions_category ON transactions(category_id);
CREATE INDEX idx_accounts_user_active ON accounts(user_id) WHERE is_active = true;
CREATE INDEX idx_categories_lookup ON categories(user_id, type);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- Profiles
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (id = auth.uid());
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (id = auth.uid());

-- Accounts
CREATE POLICY "accounts_select" ON accounts FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "accounts_insert" ON accounts FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "accounts_update" ON accounts FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "accounts_delete" ON accounts FOR DELETE USING (user_id = auth.uid());

-- Categories: users see defaults + their own, can only modify their own
CREATE POLICY "categories_select" ON categories FOR SELECT USING (is_default = true OR user_id = auth.uid());
CREATE POLICY "categories_insert" ON categories FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "categories_update" ON categories FOR UPDATE USING (user_id = auth.uid() AND is_default = false);
CREATE POLICY "categories_delete" ON categories FOR DELETE USING (user_id = auth.uid() AND is_default = false);

-- Transactions
CREATE POLICY "transactions_select" ON transactions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "transactions_insert" ON transactions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "transactions_update" ON transactions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "transactions_delete" ON transactions FOR DELETE USING (user_id = auth.uid());

-- ============================================================
-- Functions & Triggers
-- ============================================================

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_profiles_updated BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_accounts_updated BEFORE UPDATE ON accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_transactions_updated BEFORE UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Auto-create profile + default Cash account on user signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', 'User'));

  INSERT INTO public.accounts (user_id, name, type, is_default, balance, initial_balance)
  VALUES (NEW.id, 'Cash', 'cash', true, 0, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Balance triggers: keep account.balance in sync with transactions
CREATE OR REPLACE FUNCTION update_balance_on_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.type = 'income' THEN
    UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
  ELSIF NEW.type = 'expense' THEN
    UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
  ELSIF NEW.type = 'transfer' THEN
    UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_balance_on_delete()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.type = 'income' THEN
    UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
  ELSIF OLD.type = 'expense' THEN
    UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
  ELSIF OLD.type = 'transfer' THEN
    UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION update_balance_on_update()
RETURNS TRIGGER AS $$
BEGIN
  -- Reverse the old transaction's effect
  IF OLD.type = 'income' THEN
    UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.account_id;
  ELSIF OLD.type = 'expense' THEN
    UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
  ELSIF OLD.type = 'transfer' THEN
    UPDATE accounts SET balance = balance + OLD.amount WHERE id = OLD.account_id;
    UPDATE accounts SET balance = balance - OLD.amount WHERE id = OLD.to_account_id;
  END IF;

  -- Apply the new transaction's effect
  IF NEW.type = 'income' THEN
    UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.account_id;
  ELSIF NEW.type = 'expense' THEN
    UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
  ELSIF NEW.type = 'transfer' THEN
    UPDATE accounts SET balance = balance - NEW.amount WHERE id = NEW.account_id;
    UPDATE accounts SET balance = balance + NEW.amount WHERE id = NEW.to_account_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER trg_balance_insert AFTER INSERT ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_balance_on_insert();
CREATE TRIGGER trg_balance_delete AFTER DELETE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_balance_on_delete();
CREATE TRIGGER trg_balance_update AFTER UPDATE ON transactions
  FOR EACH ROW EXECUTE FUNCTION update_balance_on_update();

-- ============================================================
-- Seed: Default Categories
-- ============================================================

INSERT INTO categories (name, type, icon, color, is_default) VALUES
  ('Salary',        'income',  'banknote',      '#22c55e', true),
  ('Freelance',     'income',  'laptop',        '#10b981', true),
  ('Investments',   'income',  'trending-up',   '#14b8a6', true),
  ('Gifts',         'income',  'gift',          '#06b6d4', true),
  ('Other Income',  'income',  'plus-circle',   '#64748b', true),
  ('Food & Dining', 'expense', 'utensils',      '#ef4444', true),
  ('Groceries',     'expense', 'shopping-cart',  '#84cc16', true),
  ('Housing & Rent','expense', 'home',          '#f97316', true),
  ('Transportation','expense', 'car',           '#eab308', true),
  ('Entertainment', 'expense', 'film',          '#a855f7', true),
  ('Utilities',     'expense', 'zap',           '#3b82f6', true),
  ('Healthcare',    'expense', 'heart-pulse',   '#ec4899', true),
  ('Shopping',      'expense', 'shopping-bag',  '#f43f5e', true),
  ('Education',     'expense', 'book-open',     '#8b5cf6', true),
  ('Personal Care', 'expense', 'user',          '#6366f1', true),
  ('Subscriptions', 'expense', 'repeat',        '#0ea5e9', true),
  ('Other Expense', 'expense', 'minus-circle',  '#64748b', true);
