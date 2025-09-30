// Personal Finance Tracker - JavaScript
let currentUser = null;
let financeApp = null;

// Initialize when page loads
document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    checkConnection();
});

async function checkConnection() {
    const loadingScreen = document.getElementById('loadingScreen');
    const connectionStatusEl = document.getElementById('connectionStatus');
    try {
        const response = await fetch('http://127.0.0.1:5000/health');
        if (response.ok) {
            connectionStatusEl.textContent = 'Connected';
            connectionStatusEl.className = 'connection-status connected';
        } else {
            throw new Error('Backend offline');
        }
    } catch (error) {
        connectionStatusEl.textContent = 'Offline Mode';
        connectionStatusEl.className = 'connection-status disconnected';
    }
    loadingScreen.classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
}

function setupEventListeners() {
    document.getElementById('loginForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleLogin();
    });
    document.getElementById('registerForm').addEventListener('submit', (e) => {
        e.preventDefault();
        handleRegister();
    });
    document.getElementById('transactionForm').addEventListener('submit', (e) => {
        e.preventDefault();
        if (financeApp) financeApp.addTransaction();
    });
    document.getElementById('type').addEventListener('change', (e) => {
        if (financeApp) financeApp.updateCategories(e.target.value);
    });
    ['filterType', 'filterCategory', 'filterDateFrom', 'filterDateTo'].forEach(id => {
        document.getElementById(id).addEventListener('change', () => {
            if (financeApp) financeApp.filterTransactions();
        });
    });
}

function switchTab(tab) {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    const loginTab = document.querySelector('.auth-tab:first-child');
    const registerTab = document.querySelector('.auth-tab:last-child');
    hideMessages();
    if (tab === 'login') {
        loginForm.classList.remove('hidden');
        registerForm.classList.add('hidden');
        loginTab.classList.add('active');
        registerTab.classList.remove('active');
    } else {
        loginForm.classList.add('hidden');
        registerForm.classList.remove('hidden');
        loginTab.classList.remove('active');
        registerTab.classList.add('active');
    }
}

async function handleLogin() {
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value.trim();
    if (!email || !password) { showError('Please enter email and password'); return; }
    try {
        const response = await fetch('http://127.0.0.1:5000/login', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        if (response.ok) {
            currentUser = await response.json();
            showMainApp();
        } else {
            const error = await response.json();
            showError(error.error || 'Login failed');
        }
    } catch (error) {
        showError('Connection failed - using demo mode');
        if (email === 'demo@financetracker.com' && password === 'demo123') {
            currentUser = { id: '1', name: 'Demo User', email: email };
            showMainApp();
        }
    }
}

async function handleRegister() {
    const name = document.getElementById('registerName').value.trim();
    const email = document.getElementById('registerEmail').value.trim();
    const password = document.getElementById('registerPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;
    if (!name || !email || !password) { showError('Please fill all fields'); return; }
    if (password !== confirmPassword) { showError('Passwords do not match'); return; }
    if (password.length < 6) { showError('Password must be at least 6 characters'); return; }
    try {
        const response = await fetch('http://127.0.0.1:5000/register', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, email, password, confirmPassword })
        });
        if (response.ok) {
            showSuccess('Registration successful! Please login.');
            switchTab('login');
            document.getElementById('loginEmail').value = email;
        } else {
            const error = await response.json();
            showError(error.error || 'Registration failed');
        }
    } catch (error) {
        showError('Connection failed. Try again when backend is running.');
    }
}

function showMainApp() {
    document.getElementById('loginPage').classList.add('hidden');
    document.getElementById('mainApp').classList.remove('hidden');
    document.getElementById('userWelcome').textContent = `Welcome, ${currentUser.name}!`;
    financeApp = new FinanceApp(currentUser);
    window.financeApp = financeApp;
}

function logout() {
    currentUser = null;
    financeApp = null;
    document.getElementById('mainApp').classList.add('hidden');
    document.getElementById('loginPage').classList.remove('hidden');
    switchTab('login');
    document.getElementById('loginForm').reset();
    document.getElementById('registerForm').reset();
    document.getElementById('loginEmail').value = 'demo@financetracker.com';
    document.getElementById('loginPassword').value = 'demo123';
}

function clearFilters() {
    document.getElementById('filterType').value = '';
    document.getElementById('filterCategory').value = '';
    document.getElementById('filterDateFrom').value = '';
    document.getElementById('filterDateTo').value = '';
    if (financeApp) financeApp.filterTransactions();
}

function showError(message) {
    const errorEl = document.getElementById('errorMessage');
    errorEl.textContent = message;
    errorEl.classList.remove('hidden');
    setTimeout(() => errorEl.classList.add('hidden'), 5000);
}

function showSuccess(message) {
    const successEl = document.getElementById('successMessage');
    successEl.textContent = message;
    successEl.classList.remove('hidden');
    setTimeout(() => successEl.classList.add('hidden'), 4000);
}

function hideMessages() {
    document.getElementById('errorMessage').classList.add('hidden');
    document.getElementById('successMessage').classList.add('hidden');
}

function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => notification.remove(), 3000);
}

class FinanceApp {
    constructor(user) {
        this.user = user;
        this.transactions = [];
        this.categories = {
            income: ['Salary', 'Freelance', 'Investment', 'Gift', 'Other'],
            expense: ['Food', 'Transportation', 'Utilities', 'Entertainment', 'Healthcare', 'Shopping', 'Rent', 'Other']
        };
        this.init();
    }
    async init() {
        this.setupForm();
        this.updateCategories();
        this.populateFilters();
        await this.loadTransactions();
        this.render();
        showNotification('Welcome to Finance Tracker!', 'success');
    }
    setupForm() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }
    updateCategories(type = null) {
        const categorySelect = document.getElementById('category');
        categorySelect.innerHTML = '<option value="">Select Category</option>';
        if (type && this.categories[type]) {
            this.categories[type].forEach(cat => {
                categorySelect.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
        }
    }
    populateFilters() {
        const filterCategory = document.getElementById('filterCategory');
        filterCategory.innerHTML = '<option value="">All Categories</option>';
        const allCategories = [...this.categories.income, ...this.categories.expense];
        const uniqueCategories = [...new Set(allCategories)];
        uniqueCategories.forEach(cat => {
            filterCategory.innerHTML += `<option value="${cat}">${cat}</option>`;
        });
    }
    async loadTransactions() {
        try {
            const response = await fetch(`http://127.0.0.1:5000/transactions/${this.user.id}`);
            this.transactions = response.ok ? await response.json() : [];
        } catch (e) {
            this.transactions = [];
        }
    }
    async addTransaction() {
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const date = document.getElementById('date').value;
        if (!description || !amount || !type || !category || !date) { showNotification('Please fill all fields', 'error'); return; }
        if (amount <= 0) { showNotification('Amount must be positive', 'error'); return; }
        try {
            const response = await fetch(`http://127.0.0.1:5000/transactions/${this.user.id}`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ description, amount, type, category, date })
            });
            if (response.ok) {
                const newTransaction = await response.json();
                this.transactions.unshift(newTransaction);
                this.clearForm();
                this.render();
                showNotification('Transaction added successfully!', 'success');
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to add transaction', 'error');
            }
        } catch (e) { showNotification('Backend error', 'error'); }
    }
    async deleteTransaction(id) {
        if (!confirm('Delete this transaction?')) return;
        try {
            const response = await fetch(`http://127.0.0.1:5000/transactions/${this.user.id}?id=${id}`, { method: 'DELETE' });
            if (response.ok) {
                this.transactions = this.transactions.filter(t => t.id !== id);
                this.render();
                showNotification('Transaction deleted', 'success');
            } else {
                const error = await response.json();
                showNotification(error.error || 'Failed to delete', 'error');
            }
        } catch (e) { showNotification('Backend error', 'error'); }
    }
    clearForm() {
        document.getElementById('transactionForm').reset();
        document.getElementById('date').value = new Date().toISOString().split('T')[0];
        this.updateCategories();
    }
    filterTransactions() {
        this.render();
    }
    getFilteredTransactions() {
        let filtered = [...this.transactions];
        const typeFilter = document.getElementById('filterType').value;
        const categoryFilter = document.getElementById('filterCategory').value;
        const dateFromFilter = document.getElementById('filterDateFrom').value;
        const dateToFilter = document.getElementById('filterDateTo').value;
        if (typeFilter) filtered = filtered.filter(t => t.type === typeFilter);
        if (categoryFilter) filtered = filtered.filter(t => t.category === categoryFilter);
        if (dateFromFilter) filtered = filtered.filter(t => t.date >= dateFromFilter);
        if (dateToFilter) filtered = filtered.filter(t => t.date <= dateToFilter);
        return filtered;
    }
    render() {
        const filtered = this.getFilteredTransactions();
        this.renderStats(filtered);
        this.renderTransactions(filtered);
        this.renderChart(filtered);
    }
    renderStats(transactions) {
        const income = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
        const expenses = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
        const balance = income - expenses;
        const savingsRate = income > 0 ? (balance / income) * 100 : 0;
        document.getElementById('totalIncome').textContent = formatMoney(income);
        document.getElementById('totalExpenses').textContent = formatMoney(expenses);
        document.getElementById('netBalance').textContent = formatMoney(balance);
        document.getElementById('savingsRate').textContent = savingsRate.toFixed(1) + '%';
        const balanceEl = document.getElementById('netBalance');
        balanceEl.style.color = balance >= 0 ? '#4CAF50' : '#f44336';
    }
    renderTransactions(transactions) {
        const listEl = document.getElementById('transactionList');
        if (!transactions.length) { listEl.innerHTML = '<div class="no-data">No transactions found</div>'; return; }
        const sorted = transactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        listEl.innerHTML = sorted.map(t => `
            <div class="transaction-item">
                <div class="transaction-info">
                    <div class="transaction-description">${t.description}</div>
                    <div class="transaction-details">${t.category} • ${this.formatDate(t.date)}</div>
                </div>
                <div class="transaction-actions">
                    <div class="transaction-amount ${t.type}">
                        ${t.type === 'income' ? '+' : '-'}${formatMoney(t.amount)}
                    </div>
                    <button type="button" class="btn-delete" onclick="window.financeApp && window.financeApp.deleteTransaction('${t.id}')">Delete</button>
                </div>
            </div>
        `).join('');
    }
    renderChart(transactions) {
        const canvas = document.getElementById('expenseChart');
        const messageEl = document.getElementById('chartMessage');
        if (window.chartInstance) { window.chartInstance.destroy(); window.chartInstance = null; }
        const expenses = transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};
        expenses.forEach(t => { const a = parseFloat(t.amount); categoryTotals[t.category] = (categoryTotals[t.category] || 0) + a; });
        const labels = Object.keys(categoryTotals);
        const data = Object.values(categoryTotals);
        if (!labels.length) { messageEl.classList.remove('hidden'); canvas.style.display = 'none'; return; }
        messageEl.classList.add('hidden');
        canvas.style.display = 'block';
        if (typeof Chart === 'undefined') { messageEl.textContent = 'Chart library not loaded'; messageEl.classList.remove('hidden'); canvas.style.display = 'none'; return; }
        try {
            const ctx = canvas.getContext('2d');
            window.chartInstance = new Chart(ctx, {
                type: 'doughnut',
                data: { labels, datasets: [{ data, backgroundColor: ['#FF6384','#36A2EB','#FFCE56','#4BC0C0','#9966FF','#FF9F40','#FF8C00','#32CD32','#FFB6C1','#87CEEB'], borderWidth: 2, borderColor: '#fff' }] },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, font: { size: 12 } } }, tooltip: { callbacks: { label: function(context) { const total = context.dataset.data.reduce((a,b)=>a+b,0); const percentage = ((context.parsed/total)*100).toFixed(1); const inr = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(context.parsed); return `${context.label}: ${inr} (${percentage}%)`; } } } },
                    cutout: '50%',
                    elements: { arc: { borderWidth: 2 } }
                }
            });
        } catch (e) { messageEl.textContent = 'Failed to create chart'; messageEl.classList.remove('hidden'); canvas.style.display = 'none'; }
    }
    formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
}

function formatMoney(amount) {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

// Expose globals used by inline handlers
window.switchTab = switchTab;
window.logout = logout;
window.clearFilters = clearFilters;


