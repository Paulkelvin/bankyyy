// src/services/api.js

// Configuration
const API_BASE_URL = 'http://localhost:5000/api'; // Ensure this is correct

// API Service Object
const api = {
  // Central request helper function
  async request(endpoint, options = {}) {
    const url = `${API_BASE_URL}${endpoint}`;
    const token = localStorage.getItem('authToken');
    console.log(`API Request to ${endpoint}: Token found in localStorage ('authToken'): ${token ? 'Yes (ending ' + token.slice(-6) + ')' : 'No'}`);
    const headers = { 'Content-Type': 'application/json', ...options.headers };
    if (token) { headers['Authorization'] = `Bearer ${token}`; }

    try {
      const response = await fetch(url, { ...options, headers });
      if (response.status === 204) { return null; }
      let data;
      try {
        const contentType = response.headers.get("content-type");
        if (contentType && contentType.indexOf("application/json") !== -1) {
          data = await response.json();
        } else {
          // Provide specific message for non-JSON errors based on status
          const responseText = await response.text();
          data = { message: responseText || `Received status ${response.status} with no body or non-JSON body.` };
          // Log the raw text for debugging 404s etc.
          console.log(`API non-JSON response text for ${endpoint}:`, responseText);
        }
      } catch (jsonError) {
        console.error('API JSON Parse Error:', jsonError, 'Response Status:', response.status);
        const parseError = new Error('Failed to parse server response.');
        parseError.status = response.status;
        throw parseError;
      }

      if (!response.ok) {
        // Use message from parsed data (even if it was originally non-JSON)
        const errorMessage = data?.message || `HTTP error! status: ${response.status}`;
        const error = new Error(errorMessage);
        error.status = response.status;
        error.data = data;
        console.error(`API Error Response for ${endpoint}: Status ${error.status}`, error);
        throw error;
      }
      return data; // Return successful data
    } catch (error) {
      // Log any error caught during fetch or processing
      console.error(`API Request/Processing Error for ${endpoint}:`, error);
      // Re-throw standardized errors
      if (error.status) { throw error; }
      if (error instanceof TypeError) { const networkError = new Error('Network error: Could not connect.'); networkError.isNetworkError = true; throw networkError; }
      const unexpectedError = new Error(error.message || 'An unexpected error occurred.'); throw unexpectedError;
    }
  },

  // --- Authentication ---
  login(credentials) { return this.request('/auth/login', { method: 'POST', body: JSON.stringify(credentials) }); },
  register(userData) { return this.request('/auth/register', { method: 'POST', body: JSON.stringify(userData) }); },

  // --- User Profile ---
  getUserProfile() { return this.request('/users/profile'); },
  updateUserProfile(profileData) { return this.request('/users/profile', { method: 'PUT', body: JSON.stringify(profileData) }); },
  deleteUserProfile() { return this.request('/users/profile', { method: 'DELETE' }); },

  // --- Accounts ---
  getAccounts() { return this.request('/accounts'); },
  createAccount(accountData) { return this.request('/accounts', { method: 'POST', body: JSON.stringify(accountData) }); },

  // --- Transactions ---
  createTransaction(transactionData) { return this.request('/transactions', { method: 'POST', body: JSON.stringify(transactionData) }); },

  // Transfers point to direct execution routes again
  transfer(transferData) { return this.request('/transactions/transfer', { method: 'POST', body: JSON.stringify(transferData) }); },
  transferToExternalAccount(transferData) { return this.request('/transactions/external-transfer', { method: 'POST', body: JSON.stringify(transferData) }); },

  // --- REMOVED verifyTransfer and verifyExternalTransfer ---

  // Get transactions
  getTransactions() { return this.request('/transactions'); },
  getTransactionsForAccount(accountId) { return this.request(`/transactions/account/${accountId}`); }
};

export default api;