/**
 * End-to-End Test Script
 * 
 * Tests the full user flow against the live Supabase backend:
 * 1. Register a test user
 * 2. Verify profile + default account auto-created
 * 3. Add more accounts with initial balances
 * 4. Add income/expense transactions
 * 5. Verify account balances update correctly
 * 6. Test transfers between accounts
 * 7. Test editing a transaction
 * 8. Test deleting a transaction
 * 9. Test categories
 * 10. Clean up test data
 * 
 * Usage:
 *   node scripts/e2e-test.mjs
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://bjgdsooivuuabswivzmo.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZ2Rzb29pdnV1YWJzd2l2em1vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkyOTYwODcsImV4cCI6MjA3NDg3MjA4N30.3Zco3N9EK9k-gOIUkAntgPbm4WqULycjYetJJzvJexc';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const TEST_EMAIL = `e2e-test-${Date.now()}@test.local`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'E2E Tester';

let passed = 0;
let failed = 0;
let userId = null;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  PASS: ${testName}`);
    passed++;
  } else {
    console.log(`  FAIL: ${testName} ${detail ? '-- ' + detail : ''}`);
    failed++;
  }
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

// ============================================================
// TEST SUITE
// ============================================================

async function testRegistration() {
  console.log('\n=== 1. Registration ===');
  
  const { data, error } = await supabase.auth.signUp({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    options: { data: { name: TEST_NAME } },
  });

  assert(!error, 'User registration succeeds', error?.message);
  assert(!!data.user, 'User object returned');
  
  if (data.user) {
    userId = data.user.id;
    console.log(`  User ID: ${userId}`);
  }

  // If email confirmation is required, try to sign in anyway
  if (!data.session) {
    console.log('  Note: Email confirmation may be required. Attempting direct login...');
    const { data: loginData, error: loginError } = await supabase.auth.signInWithPassword({
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });
    
    if (loginError) {
      console.log(`  Warning: Login failed (${loginError.message}). Email confirmation may be required.`);
      console.log('  Tip: Disable email confirmation in Supabase Dashboard > Auth > Settings for testing.');
      
      // Can't continue without a session
      return false;
    }
    
    userId = loginData.user.id;
  }
  
  return true;
}

async function testLogin() {
  console.log('\n=== 2. Login ===');
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });

  assert(!error, 'Login succeeds', error?.message);
  assert(!!data.session, 'Session returned');
  assert(data.user?.email === TEST_EMAIL, 'Correct email in session');
}

async function testAutoCreatedProfile() {
  console.log('\n=== 3. Auto-Created Profile (trigger) ===');
  
  await sleep(500); // Wait for trigger
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  assert(!error, 'Profile exists', error?.message);
  if (data) {
    assert(data.name === TEST_NAME, `Profile name is "${data.name}"`, `Expected "${TEST_NAME}"`);
    assert(data.currency === 'INR', 'Default currency is INR');
  }
}

async function testAutoCreatedAccount() {
  console.log('\n=== 4. Auto-Created Default Account (trigger) ===');
  
  const { data, error } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);

  assert(!error, 'Can fetch accounts', error?.message);
  assert(data?.length >= 1, `Has at least 1 account (found ${data?.length})`);
  
  if (data && data.length > 0) {
    const defaultAcc = data.find((a) => a.is_default);
    assert(!!defaultAcc, 'One account is default');
    assert(defaultAcc?.name === 'Cash', `Default account name is "${defaultAcc?.name}"`);
    assert(defaultAcc?.type === 'cash', `Default account type is "${defaultAcc?.type}"`);
    assert(Number(defaultAcc?.balance) === 0, `Balance starts at 0 (got ${defaultAcc?.balance})`);
  }
}

async function testDefaultCategories() {
  console.log('\n=== 5. Default Categories ===');
  
  const { data, error } = await supabase
    .from('categories')
    .select('*')
    .eq('is_default', true);

  assert(!error, 'Can fetch default categories', error?.message);
  assert(data && data.length >= 17, `Has at least 17 default categories (found ${data?.length})`);
  
  const incomeCount = data?.filter((c) => c.type === 'income').length || 0;
  const expenseCount = data?.filter((c) => c.type === 'expense').length || 0;
  
  assert(incomeCount >= 5, `Income categories: ${incomeCount}`);
  assert(expenseCount >= 12, `Expense categories: ${expenseCount}`);
}

async function testAddAccount() {
  console.log('\n=== 6. Add Account with Initial Balance ===');
  
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: 'HDFC Savings',
      type: 'bank',
      balance: 50000,
      initial_balance: 50000,
    })
    .select()
    .single();

  assert(!error, 'Account created', error?.message);
  assert(data?.name === 'HDFC Savings', 'Account name correct');
  assert(Number(data?.balance) === 50000, `Balance is 50000 (got ${data?.balance})`);
  assert(Number(data?.initial_balance) === 50000, `Initial balance is 50000`);
  
  return data?.id;
}

async function testAddExpense(accountId) {
  console.log('\n=== 7. Add Expense Transaction ===');
  
  // Find food category
  const { data: cats } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Food & Dining')
    .single();
  
  const categoryId = cats?.id;
  assert(!!categoryId, 'Found Food & Dining category');

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'expense',
      amount: 500,
      description: 'Lunch at restaurant',
      category_id: categoryId,
      account_id: accountId,
      date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  assert(!error, 'Expense created', error?.message);
  assert(Number(data?.amount) === 500, 'Amount is 500');
  assert(data?.type === 'expense', 'Type is expense');

  // Verify balance updated via trigger
  await sleep(300);
  const { data: acc } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();
  
  assert(Number(acc?.balance) === 49500, `Balance after expense: ${acc?.balance} (expected 49500)`);
  
  return data?.id;
}

async function testAddIncome(accountId) {
  console.log('\n=== 8. Add Income Transaction ===');
  
  const { data: cats } = await supabase
    .from('categories')
    .select('id')
    .eq('name', 'Salary')
    .single();

  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'income',
      amount: 75000,
      description: 'March salary',
      category_id: cats?.id,
      account_id: accountId,
      date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  assert(!error, 'Income created', error?.message);

  await sleep(300);
  const { data: acc } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();
  
  // 50000 - 500 + 75000 = 124500
  assert(Number(acc?.balance) === 124500, `Balance after income: ${acc?.balance} (expected 124500)`);
  
  return data?.id;
}

async function testTransfer(fromAccountId) {
  console.log('\n=== 9. Transfer Between Accounts ===');
  
  // Get the default Cash account
  const { data: accounts } = await supabase
    .from('accounts')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  const cashAccount = accounts?.find((a) => a.name === 'Cash');
  assert(!!cashAccount, 'Found Cash account');
  
  const cashBalanceBefore = Number(cashAccount?.balance);
  
  const { data, error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'transfer',
      amount: 10000,
      description: 'Emergency cash',
      account_id: fromAccountId,
      to_account_id: cashAccount?.id,
      date: new Date().toISOString().split('T')[0],
    })
    .select()
    .single();

  assert(!error, 'Transfer created', error?.message);
  assert(data?.type === 'transfer', 'Type is transfer');
  assert(data?.to_account_id === cashAccount?.id, 'To account set correctly');

  await sleep(300);
  
  // HDFC: 124500 - 10000 = 114500
  const { data: fromAcc } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', fromAccountId)
    .single();
  
  assert(Number(fromAcc?.balance) === 114500, `Source balance: ${fromAcc?.balance} (expected 114500)`);
  
  // Cash: 0 + 10000 = 10000
  const { data: toAcc } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', cashAccount?.id)
    .single();
  
  assert(Number(toAcc?.balance) === cashBalanceBefore + 10000, `Destination balance: ${toAcc?.balance} (expected ${cashBalanceBefore + 10000})`);
}

async function testTransferConstraint(accountId) {
  console.log('\n=== 10. Transfer Constraint: Same Account ===');
  
  const { error } = await supabase
    .from('transactions')
    .insert({
      user_id: userId,
      type: 'transfer',
      amount: 100,
      account_id: accountId,
      to_account_id: accountId,  // Same account -- should fail
      date: new Date().toISOString().split('T')[0],
    });

  assert(!!error, 'Transfer to same account rejected', error?.message || 'No error (BAD)');
}

async function testEditTransaction(transactionId, accountId) {
  console.log('\n=== 11. Edit Transaction ===');
  
  // Get balance before
  const { data: accBefore } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();
  
  const balanceBefore = Number(accBefore?.balance);
  
  // Change the income amount from 75000 to 80000
  const { error } = await supabase
    .from('transactions')
    .update({ amount: 80000 })
    .eq('id', transactionId)
    .eq('user_id', userId);

  assert(!error, 'Transaction updated', error?.message);

  await sleep(300);
  
  const { data: accAfter } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();
  
  // Balance should increase by 5000 (80000 - 75000)
  const expected = balanceBefore + 5000;
  assert(Number(accAfter?.balance) === expected, `Balance after edit: ${accAfter?.balance} (expected ${expected})`);
}

async function testDeleteTransaction(transactionId, accountId) {
  console.log('\n=== 12. Delete Transaction ===');
  
  const { data: accBefore } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();
  
  const balanceBefore = Number(accBefore?.balance);
  
  // Delete the expense of 500
  const { data: tx } = await supabase
    .from('transactions')
    .select('amount, type')
    .eq('id', transactionId)
    .single();
  
  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', transactionId)
    .eq('user_id', userId);

  assert(!error, 'Transaction deleted', error?.message);

  await sleep(300);
  
  const { data: accAfter } = await supabase
    .from('accounts')
    .select('balance')
    .eq('id', accountId)
    .single();
  
  // Deleting expense of 500 should increase balance by 500
  const expected = balanceBefore + Number(tx?.amount);
  assert(Number(accAfter?.balance) === expected, `Balance after delete: ${accAfter?.balance} (expected ${expected})`);
}

async function testCustomCategory() {
  console.log('\n=== 13. Custom Category ===');
  
  const { data, error } = await supabase
    .from('categories')
    .insert({
      user_id: userId,
      name: 'Petrol',
      type: 'expense',
      color: '#f59e0b',
    })
    .select()
    .single();

  assert(!error, 'Custom category created', error?.message);
  assert(data?.name === 'Petrol', 'Category name correct');
  assert(data?.is_default === false, 'Not a default category');

  // Delete it
  const { error: delError } = await supabase
    .from('categories')
    .delete()
    .eq('id', data?.id);

  assert(!delError, 'Custom category deleted', delError?.message);
}

async function testRLS() {
  console.log('\n=== 14. RLS: Cannot Delete Default Categories ===');
  
  const { data: defaults } = await supabase
    .from('categories')
    .select('id')
    .eq('is_default', true)
    .limit(1);
  
  if (defaults && defaults.length > 0) {
    const { error } = await supabase
      .from('categories')
      .delete()
      .eq('id', defaults[0].id);
    
    // RLS should prevent this (policy: user_id = auth.uid() AND is_default = false)
    // The delete won't error but won't affect any rows
    const { data: check } = await supabase
      .from('categories')
      .select('id')
      .eq('id', defaults[0].id);
    
    assert(check && check.length > 0, 'Default category still exists (RLS protected)');
  }
}

async function testUpdateProfile() {
  console.log('\n=== 15. Update Profile ===');
  
  const { error } = await supabase
    .from('profiles')
    .update({ name: 'Updated Name' })
    .eq('id', userId);

  assert(!error, 'Profile updated', error?.message);

  const { data } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', userId)
    .single();

  assert(data?.name === 'Updated Name', `Name is "${data?.name}"`);
}

async function testArchiveAccount() {
  console.log('\n=== 16. Archive Account (Soft Delete) ===');
  
  // Create a temp account
  const { data: acc } = await supabase
    .from('accounts')
    .insert({
      user_id: userId,
      name: 'Temp Account',
      type: 'wallet',
      balance: 0,
      initial_balance: 0,
    })
    .select()
    .single();

  // Soft delete
  const { error } = await supabase
    .from('accounts')
    .update({ is_active: false })
    .eq('id', acc?.id);

  assert(!error, 'Account archived', error?.message);

  // Verify not returned in active query
  const { data: active } = await supabase
    .from('accounts')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true);
  
  const found = active?.find((a) => a.id === acc?.id);
  assert(!found, 'Archived account not in active list');
}

async function testQueryWithJoins() {
  console.log('\n=== 17. Query Transactions with Joins ===');
  
  const { data, error } = await supabase
    .from('transactions')
    .select(`
      *,
      category:categories(name, icon, color),
      account:accounts!transactions_account_id_fkey(name, color),
      to_account:accounts!transactions_to_account_id_fkey(name, color)
    `)
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(10);

  assert(!error, 'Joined query succeeds', error?.message);
  assert(data && data.length > 0, `Returns transactions (found ${data?.length})`);
  
  if (data && data.length > 0) {
    const tx = data[0];
    assert(tx.account !== undefined, 'Account data joined');
    // Check if category is joined for non-transfer transactions
    const nonTransfer = data.find((t) => t.type !== 'transfer');
    if (nonTransfer) {
      assert(nonTransfer.category !== null, 'Category data joined for non-transfer');
    }
  }
}

async function cleanup() {
  console.log('\n=== Cleanup ===');
  
  // Delete all test transactions
  await supabase.from('transactions').delete().eq('user_id', userId);
  
  // Delete non-default accounts
  await supabase.from('accounts').delete().eq('user_id', userId);
  
  // Delete profile
  await supabase.from('profiles').delete().eq('id', userId);
  
  // Sign out
  await supabase.auth.signOut();
  
  console.log('  Test data cleaned up.');
  console.log('  Note: Test user remains in auth.users (requires admin to delete).');
}

// ============================================================
// RUNNER
// ============================================================

async function run() {
  console.log('==========================================');
  console.log('  Money Tracker E2E Tests');
  console.log(`  Supabase: ${SUPABASE_URL}`);
  console.log(`  Test user: ${TEST_EMAIL}`);
  console.log('==========================================');

  try {
    // Auth
    const canContinue = await testRegistration();
    if (!canContinue) {
      console.log('\nCannot continue without authentication. Aborting.');
      process.exit(1);
    }
    await testLogin();
    
    // Auto-created resources
    await testAutoCreatedProfile();
    await testAutoCreatedAccount();
    await testDefaultCategories();
    
    // Account operations
    const bankAccountId = await testAddAccount();
    
    // Transaction operations
    const expenseId = await testAddExpense(bankAccountId);
    const incomeId = await testAddIncome(bankAccountId);
    await testTransfer(bankAccountId);
    await testTransferConstraint(bankAccountId);
    await testEditTransaction(incomeId, bankAccountId);
    await testDeleteTransaction(expenseId, bankAccountId);
    
    // Category operations
    await testCustomCategory();
    await testRLS();
    
    // Profile operations
    await testUpdateProfile();
    
    // Account archiving
    await testArchiveAccount();
    
    // Complex queries
    await testQueryWithJoins();
    
    // Cleanup
    await cleanup();
    
  } catch (err) {
    console.error('\nUnexpected error:', err);
    failed++;
  }

  console.log('\n==========================================');
  console.log(`  Results: ${passed} passed, ${failed} failed`);
  console.log('==========================================');
  
  process.exit(failed > 0 ? 1 : 0);
}

run();
