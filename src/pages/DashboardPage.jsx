import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
// Assuming api.js exports a function like getTransactionsForAccount
import api from '../services/api.js';
// ... other imports ...
import TransactionHistory from '../components/dashboard/TransactionHistory.jsx';
import { formatCurrency, formatDate } from '../utils/formatters.js';


// --- Main Dashboard Page Component ---
const DashboardPage = ({ onNavigateToProfile }) => {
    const { user, logout } = useAuth();
    const [accounts, setAccounts] = useState([]);
    const [isLoadingAccounts, setIsLoadingAccounts] = useState(true);
    const [accountError, setAccountError] = useState(null);
    // Store transactions per account or just the selected/first one
    const [transactions, setTransactions] = useState([]);
    const [isLoadingTransactions, setIsLoadingTransactions] = useState(false); // Start as false, load only after accounts
    const [transactionError, setTransactionError] = useState(null);
    const [selectedAccountId, setSelectedAccountId] = useState(null); // Track which account's transactions are shown

    // --- NEW State for fade-in effect ---
    const [isVisible, setIsVisible] = useState(false);

    // Fetch accounts function (Modified to trigger transaction fetch on success)
    const fetchAccounts = useCallback(async () => {
        console.log("Attempting to fetch accounts...");
        setIsLoadingAccounts(true);
        setAccountError(null);
        // Reset transactions state when starting account fetch
        setTransactions([]);
        setIsLoadingTransactions(true); // Start loading transactions indicator
        setTransactionError(null);
        try {
            const response = await api.getAccounts();
            if (response && response.success && Array.isArray(response.data)) {
                setAccounts(response.data);
                // --- CHANGE: Fetch transactions AFTER accounts are fetched ---
                if (response.data.length > 0) {
                    // *** FIX THIS LINE AGAIN: Use ._id ***
                    const firstAccountId = response.data[0]._id;
                    console.log(`Account fetch successful. Found account ID: ${firstAccountId}. Fetching its transactions...`); // Log the ID
                    // Fetch transactions for the *first* account by default
                    await fetchTransactionsForAccount(firstAccountId);
                } else {
                    // No accounts, so no transactions to fetch
                    console.log("No accounts found, stopping transaction fetch.");
                    setTransactions([]);
                    setIsLoadingTransactions(false); // Stop transaction loading indicator
                }
            } else {
                 // Handle potential non-success response structure
                throw new Error(response?.message || "Failed to fetch accounts or invalid format.");
            }
        } catch (error) {
            console.error("Fetch accounts error:", error);
            setAccountError(error.message || "Could not load accounts.");
            setAccounts([]);
            setIsLoadingTransactions(false); // Also stop transaction loading on account error
            setTransactions([]); // Clear transactions if accounts fail
            setTransactionError('Failed to load accounts, cannot fetch transactions.'); // Set transaction error too
        } finally {
            setIsLoadingAccounts(false);
            console.log("Finished fetching accounts process.");
            // Note: setIsLoadingTransactions is handled within fetchTransactionsForAccount or the error/no-accounts paths
        }
    }, [fetchTransactionsForAccount]); // Add fetchTransactionsForAccount as dependency

    // Fetch transactions function - MODIFIED to accept accountId
    const fetchTransactions = useCallback(async (accountId) => {
        if (!accountId) {
            console.log("No account ID provided, skipping transaction fetch.");
            setTransactions([]); // Clear transactions if no account is selected
            setIsLoadingTransactions(false);
            return;
        }
        console.log(`Attempting to fetch transactions for account: ${accountId}`);
        setIsLoadingTransactions(true);
        setTransactionError(null);
        try {
            // *** IMPORTANT: Ensure api.js has a function like this ***
            // *** that calls GET /api/accounts/${accountId}/transactions ***
            const response = await api.getTransactionsForAccount(accountId);

            // Assuming the response structure is { success: true, data: [...] }
            if (response.success && Array.isArray(response.data)) {
                setTransactions(response.data);
            } else {
                // Handle cases where response.success might be false or data is not array
                throw new Error(response.message || "Invalid response format for transactions.");
            }
        } catch (error) {
            console.error(`Fetch transactions error for account ${accountId}:`, error);
            setTransactionError(error.message || "Could not load transaction history.");
            setTransactions([]); // Clear transactions on error
        } finally {
            setIsLoadingTransactions(false);
            console.log(`Finished fetching transactions for account: ${accountId}`);
        }
    }, []); // Dependencies might be needed if api changes

    // Fetch initial accounts data on mount
    useEffect(() => {
        console.log("Dashboard mounted, fetching accounts.");
        fetchAccounts();
        // DO NOT fetch transactions here initially
    }, [fetchAccounts]);

    // --- NEW Effect to fetch transactions when selectedAccountId changes ---
    useEffect(() => {
        if (selectedAccountId) {
            // *** ADD THIS LOG ***
            console.log(`>>> useEffect[selectedAccountId]: Account ID changed to ${selectedAccountId}. Triggering fetchTransactions.`);
            fetchTransactions(selectedAccountId);
        } else {
            // Handle case where there's no selected account (e.g., no accounts yet)
            console.log(">>> useEffect[selectedAccountId]: No account selected. Clearing transactions."); // Optional log
            setTransactions([]);
            setIsLoadingTransactions(false);
        }
    }, [selectedAccountId, fetchTransactions]); // Run when selectedAccountId changes

    // --- NEW Effect for fade-in ---
    // ... (fade-in effect remains the same) ...
    useEffect(() => {
        const timer = setTimeout(() => setIsVisible(true), 50);
        return () => clearTimeout(timer);
    }, []);

    // Handler to refresh data after actions
    const handleActionSuccess = () => {
        console.log("Action successful, refreshing accounts...");
        fetchAccounts(); // This will trigger re-fetching accounts
        // The useEffect watching selectedAccountId will handle fetching transactions
        // If the selected account ID hasn't changed, you might need to manually trigger
        // fetchTransactions(selectedAccountId) if the action modified the current account's history.
        if (selectedAccountId) {
             console.log("Refreshing transactions for current account after action.");
             fetchTransactions(selectedAccountId);
        }
    };

    // --- Render Logic (no changes needed below) ---
    return (
        <div className={`container mx-auto p-4 md:p-6 bg-gray-50 min-h-screen transition-opacity duration-500 ease-in-out ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
            {/* ... Header Section (no changes needed) ... */}
            <header className="flex flex-wrap justify-between items-center gap-4 mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-4">
                     <h1 className="text-xl md:text-2xl font-semibold text-gray-800">Welcome, {user?.name}!</h1>
                     <Button onClick={onNavigateToProfile} variant="secondary" size="sm"> View Profile </Button>
                </div>
                <Button onClick={logout} variant="outline" size="sm">Logout</Button>
            </header>

            {/* Main Content Grid */}
            <main className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column */}
                <section className="lg:col-span-2 space-y-6">
                    <div>
                        <h2 className="text-lg font-semibold mb-4 text-gray-700">Your Accounts</h2>
                        {/* Pass selectedAccountId and a handler to change it */}
                        <AccountList
                            accounts={accounts}
                            isLoading={isLoadingAccounts}
                            error={accountError}
                            selectedAccountId={selectedAccountId}
                            onSelectAccount={setSelectedAccountId} // Pass the setter function
                        />
                    </div>
                     <div>
                        <h2 className="text-lg font-semibold mb-4 text-gray-700">
                            Transaction History {accounts.find(a => a._id === selectedAccountId) ? `for ${accounts.find(a => a._id === selectedAccountId).accountNumber}` : ''}
                        </h2>
                         {/* TransactionHistory now shows data for the selected account */}
                         <TransactionHistory
                             transactions={transactions}
                             isLoading={isLoadingTransactions}
                             error={transactionError}
                             // Pass the specific account details if needed, or let it just display the fetched transactions
                             account={accounts.find(a => a._id === selectedAccountId)}
                         />
                    </div>
                </section>
                {/* ... Right Column (aside) ... */}
                <aside className="lg:col-span-1 space-y-6">
                     <h2 className="text-lg font-semibold mb-4 text-gray-700">Actions</h2>
                    {isLoadingAccounts ? ( <div className="flex justify-center items-center p-4 text-gray-500"><Spinner className="mr-2"/> Loading actions...</div> )
                     : accountError ? ( <Alert variant="destructive"><AlertTitle>Cannot Load Actions</AlertTitle><AlertDescription>{accountError}</AlertDescription></Alert> )
                     : accounts.length === 0 ? ( <Alert><AlertTitle>No Accounts</AlertTitle><AlertDescription>Create an account to perform actions.</AlertDescription></Alert> ) // Handle no accounts case
                     : ( <>
                            {/* Pass selectedAccountId if forms need it, or ensure accounts list is sufficient */}
                            <TransactionForm title="Deposit" accounts={accounts} transactionType="deposit" onTransactionSuccess={handleActionSuccess}/>
                            <TransactionForm title="Withdrawal" accounts={accounts} transactionType="withdrawal" onTransactionSuccess={handleActionSuccess}/>
                            <UnifiedTransferForm accounts={accounts} onTransferSuccess={handleActionSuccess} />
                        </>
                     )}
                     <CreateAccountForm onAccountCreated={handleActionSuccess} />
                </aside>
            </main>
        </div>
    );
};

export default DashboardPage;
