// injectTransactions.js
// Script to inject transaction history for Mary.Cheatham

import mongoose from 'mongoose';
import dotenv from 'dotenv';
dotenv.config({ path: '../../.env' });

import User from '../models/User.js';
import Account from '../models/Account.js';
import Transaction from '../models/Transaction.js';
import connectDB from '../config/db.js';

// Generate a realistic transaction history for Mary.Cheatham from Oct 2021 to Dec 2024
// Format: { date, time, type, description, amount, balanceAfter }
const TRANSACTIONS = [];
let balance = 20000.00; // Starting balance
const descriptions = [
  'Deposit', 'Withdrawal', 'Groceries', 'Salary', 'Online Shopping', 'ATM Withdrawal',
  'Transfer In', 'Transfer Out', 'Bill Payment', 'Interest', 'Refund', 'Dining', 'Utilities',
  'Subscription', 'Bonus', 'Gift', 'Medical', 'Travel', 'Cashback', 'Fee'
];

function randomAmount(type) {
  if (type === 'deposit') return (Math.random() * 5000 + 500).toFixed(2);
  if (type === 'withdrawal') return (Math.random() * 1500 + 50).toFixed(2);
  return (Math.random() * 1000 + 10).toFixed(2);
}

function randomTime() {
  const hour = Math.floor(Math.random() * 24).toString().padStart(2, '0');
  const min = Math.floor(Math.random() * 60).toString().padStart(2, '0');
  return `${hour}:${min}`;
}

function randomDescription(type) {
  if (type === 'deposit') return descriptions[Math.floor(Math.random() * 5)];
  if (type === 'withdrawal') return descriptions[Math.floor(Math.random() * descriptions.length)];
  return 'Transaction';
}

let currentDate = new Date('2021-10-01T09:00:00');
const endDate = new Date('2024-12-31T18:00:00');

while (currentDate <= endDate) {
  // Randomly choose deposit or withdrawal
  const type = Math.random() < 0.45 ? 'deposit' : 'withdrawal';
  let amount = parseFloat(randomAmount(type));
  let description = randomDescription(type);
  let time = randomTime();
  if (type === 'deposit') {
    balance += amount;
  } else {
    // Prevent negative balance
    if (balance - amount < 0) amount = balance > 0 ? balance : 0;
    balance -= amount;
  }
  TRANSACTIONS.push({
    date: currentDate.toISOString().slice(0, 10),
    time,
    type,
    description,
    amount: (type === 'deposit' ? '' : '-') + amount.toFixed(2),
    balanceAfter: balance.toFixed(2)
  });
  // Advance date by 7-20 days
  currentDate.setDate(currentDate.getDate() + Math.floor(Math.random() * 14) + 7);
}

const USER_EMAIL = 'Ashleypowell051@gmail.com';
const ACCOUNT_NUMBER = '7142529836'; // Checking account

async function inject() {
  await connectDB();
  console.log('Connected to DB');

  const user = await User.findOne({ email: USER_EMAIL });
  if (!user) throw new Error('User not found');
  console.log('User found:', user.fullName);

  const account = await Account.findOne({ userId: user._id, accountNumber: ACCOUNT_NUMBER });
  if (!account) throw new Error('Account not found');
  console.log('Account found:', account.accountNumber);

  for (const tx of TRANSACTIONS) {
    // Remove +/- from amount for Decimal128
    const amt = tx.amount.replace('+', '').replace('-', '');
    const amountDecimal = mongoose.Types.Decimal128.fromString(amt);
    const balanceDecimal = mongoose.Types.Decimal128.fromString(tx.balanceAfter);
    const isDeposit = tx.type === 'deposit';
    const transactionDate = new Date(`${tx.date}T${tx.time}:00`);

    await Transaction.create({
      accountId: account._id,
      userId: user._id,
      type: tx.type,
      amount: amountDecimal,
      description: tx.description,
      balanceAfter: balanceDecimal,
      transactionDate,
      withdrawalMethod: !isDeposit ? tx.description : undefined,
    });
    console.log(`Injected ${tx.type} of ${tx.amount} on ${tx.date}`);
  }

  // Optionally update account balance to last transaction
  const lastBalance = TRANSACTIONS[0].balanceAfter;
  account.balance = mongoose.Types.Decimal128.fromString(lastBalance);
  await account.save();
  console.log('Account balance updated to', lastBalance);

  mongoose.connection.close();
  console.log('Done!');
}

inject().catch(err => {
  console.error('Error:', err);
  mongoose.connection.close();
});
