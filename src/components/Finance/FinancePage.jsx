import { useState, useEffect, useMemo } from 'react';
import * as api from '../../services/api';
import { Wallet, Plus, Download, ArrowRightLeft, Target, Settings, Receipt, Edit2, Trash2 } from 'lucide-react';
import { TrendBarChart, CategoryDonutChart, NetWorthLineChart } from './FinanceCharts';
import AddTransactionModal from './AddTransactionModal';
import BudgetPanel from './BudgetPanel';
import RecurringPanel from './RecurringPanel';
import AccountsPanel from './AccountsPanel';
import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";

export default function FinancePage() {
    const [activeTab, setActiveTab] = useState('overview'); // overview, transactions, budgets, recurring, goals, accounts
    const [loading, setLoading] = useState(true);
    
    // Data State
    const [transactions, setTransactions] = useState([]);
    const [accounts, setAccounts] = useState([]);
    const [budgets, setBudgets] = useState([]);
    const [recurring, setRecurring] = useState([]);
    const [goals, setGoals] = useState([]);
    const [netWorthHistory, setNetWorthHistory] = useState([]);

    // UI State
    const [showAdd, setShowAdd] = useState(false);
    const [editTx, setEditTx] = useState(null);
    const [lightboxIndex, setLightboxIndex] = useState(-1);
    const [receipts, setReceipts] = useState([]);
    const [txSearch, setTxSearch] = useState('');
    const [txFilter, setTxFilter] = useState('all');
    const [txTimeFilter, setTxTimeFilter] = useState('all');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const [txs, accs, budg, rec, gls, nw] = await Promise.all([
                api.getFinance(),
                api.getFinanceAccounts(),
                api.getFinanceBudgets(),
                api.getFinanceRecurring(),
                api.getFinanceGoals(),
                api.getFinanceNetWorthHistory()
            ]);
            setTransactions(txs || []);
            setAccounts(accs || []);
            setBudgets(budg || []);
            setRecurring(rec || []);
            setGoals(gls || []);
            setNetWorthHistory(nw || []);

            // Process receipts for Lightbox (presigned URLs via VITE_R2_PUBLIC_URL or custom edge proxy)
            const publicR2 = import.meta.env.VITE_R2_PUBLIC_URL;
            const validReceipts = (txs || []).filter(t => t.receipt_r2_key).map(t => ({
                src: publicR2 ? `${publicR2}/${t.receipt_r2_key}` : `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/r2-presign?op=get&key=${encodeURIComponent(t.receipt_r2_key)}`,
                title: t.note || t.category,
                txId: t.id
            }));
            setReceipts(validReceipts);
        } catch (err) {
            console.error('Failed to load finance data', err);
        } finally {
            setLoading(false);
        }
    };

    const deleteTransaction = async (id) => {
        if (!confirm('Delete this transaction?')) return;
        try {
            await api.deleteFinanceItem(id);
            loadData();
        } catch (err) {
            alert('Failed to delete transaction');
        }
    };

    const handleExport = () => {
        api.exportFinanceCSV(transactions);
    };

    // Calculate Summary Metrics
    const summary = useMemo(() => {
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        let totalBalance = accounts.reduce((sum, a) => sum + parseFloat(a.current_balance || a.opening_balance), 0);
        
        let monthlyIncome = 0;
        let monthlyExpense = 0;

        transactions.forEach(tx => {
            const txMonth = tx.date.substring(0, 7);
            if (txMonth === currentMonthStr) {
                if (tx.type === 'income') monthlyIncome += parseFloat(tx.amount);
                if (tx.type === 'expense') monthlyExpense += parseFloat(tx.amount);
            }
        });

        // Fallback for balance if no accounts feature is used yet
        if (accounts.length === 0) {
            const allIncome = transactions.filter(t => t.type === 'income').reduce((s, t) => s + parseFloat(t.amount), 0);
            const allExpense = transactions.filter(t => t.type === 'expense').reduce((s, t) => s + parseFloat(t.amount), 0);
            totalBalance = allIncome - allExpense;
        }

        const savingsRate = monthlyIncome > 0 ? ((monthlyIncome - monthlyExpense) / monthlyIncome) * 100 : 0;

        return { balance: totalBalance, monthlyIncome, monthlyExpense, savingsRate };
    }, [transactions, accounts]);

    if (loading && transactions.length === 0) {
        return <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}><div className="spinner" /></div>;
    }

    return (
        <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem', height: '100%', overflowY: 'auto' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem' }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <Wallet size={32} color="var(--accent, #a29bfe)" strokeWidth={2} />
                        <h1 style={{ margin: 0, fontSize: '2rem', color: '#fff' }}>Wealth Command</h1>
                    </div>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6, color: '#fff' }}>Control your capital. Direct your destiny.</p>
                </div>
                <div style={{ display: 'flex', gap: '1rem' }}>
                    <button onClick={handleExport} style={{ padding: '0.8rem 1.2rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
                        <Download size={16} /> Export CSV
                    </button>
                    <button onClick={() => setShowAdd(true)} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(162, 155, 254, 0.3)' }}>
                        <Plus size={18} /> Transaction
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.5rem', overflowX: 'auto' }}>
                {['overview', 'transactions', 'budgets', 'recurring', 'goals', 'accounts'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                            color: activeTab === tab ? '#fff' : 'rgba(255,255,255,0.5)',
                            border: 'none',
                            padding: '0.6rem 1.2rem',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            textTransform: 'capitalize',
                            fontWeight: activeTab === tab ? '600' : '400',
                            transition: '0.2s'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Tab Content */}
            <div style={{ flex: 1 }}>
                
                {activeTab === 'overview' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {/* Summary Cards */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.5rem' }}>
                            <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                                <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Net Balance</div>
                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: summary.balance >= 0 ? '#1e90ff' : '#ff4757' }}>₹{summary.balance.toFixed(2)}</div>
                            </div>
                            <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Income (This Month)</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#4ade80' }}>₹{summary.monthlyIncome.toFixed(2)}</div>
                            </div>
                            <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Expenses (This Month)</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f43f5e' }}>₹{summary.monthlyExpense.toFixed(2)}</div>
                            </div>
                            <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Savings Rate</div>
                                <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: summary.savingsRate > 20 ? '#a29bfe' : '#f59e0b' }}>{summary.savingsRate.toFixed(1)}%</div>
                            </div>
                        </div>

                        {/* Charts Section */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '1.5rem' }}>
                            <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Cash Flow Trend</h3>
                                <TrendBarChart transactions={transactions} />
                            </div>
                            <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Spending by Category</h3>
                                <CategoryDonutChart transactions={transactions} />
                            </div>
                            {netWorthHistory.length > 0 && (
                                <div style={{ gridColumn: '1 / -1', background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                    <h3 style={{ marginTop: 0, marginBottom: '1rem', fontSize: '1.1rem' }}>Net Worth Over Time</h3>
                                    <NetWorthLineChart history={netWorthHistory} />
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'transactions' && (() => {
                    const filteredTxs = transactions.filter(tx => {
                        const matchesSearch = (tx.note || '').toLowerCase().includes(txSearch.toLowerCase()) || 
                                              (tx.category || '').toLowerCase().includes(txSearch.toLowerCase()) ||
                                              (tx.tags || []).join(' ').toLowerCase().includes(txSearch.toLowerCase());
                        const matchesType = txFilter === 'all' || tx.type === txFilter;
                        
                        let matchesTime = true;
                        if (txTimeFilter !== 'all') {
                            const txDate = new Date(tx.date);
                            const now = new Date();
                            
                            if (txTimeFilter === 'this_month') {
                                matchesTime = txDate.getMonth() === now.getMonth() && txDate.getFullYear() === now.getFullYear();
                            } else if (txTimeFilter === 'last_month') {
                                const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                                matchesTime = txDate.getMonth() === lastMonth.getMonth() && txDate.getFullYear() === lastMonth.getFullYear();
                            } else if (txTimeFilter === 'this_year') {
                                matchesTime = txDate.getFullYear() === now.getFullYear();
                            }
                        }
                        
                        return matchesSearch && matchesType && matchesTime;
                    });
                    
                    return (
                        <div style={{ background: 'var(--card-bg, #1a1a1a)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                            <div style={{ padding: '1rem 1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', display: 'flex', gap: '1rem', background: 'rgba(255,255,255,0.01)', flexWrap: 'wrap' }}>
                                <input 
                                    type="text" 
                                    placeholder="Search transactions..." 
                                    value={txSearch}
                                    onChange={e => setTxSearch(e.target.value)}
                                    style={{ flex: 1, minWidth: '200px', padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                />
                                <select 
                                    value={txFilter}
                                    onChange={e => setTxFilter(e.target.value)}
                                    style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                >
                                    <option value="all">All Types</option>
                                    <option value="expense">Expenses</option>
                                    <option value="income">Income</option>
                                    <option value="transfer">Transfers</option>
                                </select>
                                <select 
                                    value={txTimeFilter}
                                    onChange={e => setTxTimeFilter(e.target.value)}
                                    style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                                >
                                    <option value="all">All Time</option>
                                    <option value="this_month">This Month</option>
                                    <option value="last_month">Last Month</option>
                                    <option value="this_year">This Year</option>
                                </select>
                            </div>
                            
                            {filteredTxs.length === 0 ? (
                                <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.4 }}>No transactions match your search.</div>
                            ) : (
                                <div style={{ overflowX: 'auto' }}>
                                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr style={{ background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                                            <th style={{ padding: '1rem 1.5rem', opacity: 0.7, fontWeight: 500 }}>Date</th>
                                            <th style={{ padding: '1rem 1.5rem', opacity: 0.7, fontWeight: 500 }}>Details</th>
                                            <th style={{ padding: '1rem 1.5rem', opacity: 0.7, fontWeight: 500 }}>Tags</th>
                                            <th style={{ padding: '1rem 1.5rem', opacity: 0.7, fontWeight: 500 }}>Account</th>
                                            <th style={{ padding: '1rem 1.5rem', opacity: 0.7, fontWeight: 500, textAlign: 'right' }}>Amount</th>
                                            <th style={{ padding: '1rem 1.5rem', opacity: 0.7, fontWeight: 500, textAlign: 'center' }}>Receipt</th>
                                            <th style={{ padding: '1rem 1.5rem', opacity: 0.7, fontWeight: 500 }}></th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filteredTxs.map(tx => (
                                            <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)', transition: '0.2s', ':hover': { background: 'rgba(255,255,255,0.02)' } }}>
                                                <td style={{ padding: '1rem 1.5rem', opacity: 0.6, fontSize: '0.9rem' }}>{new Date(tx.date).toLocaleDateString()}</td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <div style={{ fontWeight: '500', color: '#fff' }}>{tx.note || tx.category}</div>
                                                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{tx.category} {tx.account_id ? '• Linked Acc' : ''}</div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.3rem', flexWrap: 'wrap', marginBottom: '0.3rem' }}>
                                                        {(tx.tags || []).map(t => <span key={t} style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.1)', borderRadius: '12px' }}>{t}</span>)}
                                                    </div>
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', opacity: 0.8 }}>
                                                    {tx.account_id ? accounts.find(a => a.id === tx.account_id)?.name || 'Unknown' : '-'}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right', fontWeight: 'bold', color: tx.type === 'income' ? '#4ade80' : tx.type === 'transfer' ? '#3b82f6' : '#f43f5e' }}>
                                                    {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}{tx.currency === 'USD' ? '$' : tx.currency === 'INR' ? '₹' : tx.currency || '₹'}{parseFloat(tx.amount).toFixed(2)}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'center' }}>
                                                    {tx.receipt_r2_key ? (
                                                        <button 
                                                            onClick={() => setLightboxIndex(receipts.findIndex(r => r.txId === tx.id))}
                                                            style={{ background: 'rgba(162,155,254,0.15)', border: 'none', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', color: '#a29bfe' }}
                                                            title="View Receipt"
                                                        >
                                                            <Receipt size={16} />
                                                        </button>
                                                    ) : (
                                                        <span style={{ opacity: 0.2 }}>-</span>
                                                    )}
                                                </td>
                                                <td style={{ padding: '1rem 1.5rem', textAlign: 'right' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                                        <button onClick={() => { setEditTx(tx); setShowAdd(true); }} style={{ background: 'transparent', border: 'none', color: '#a29bfe', opacity: 0.7, cursor: 'pointer', padding: '0.3rem' }} title="Edit"><Edit2 size={16} /></button>
                                                        <button onClick={() => deleteTransaction(tx.id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', opacity: 0.7, cursor: 'pointer', padding: '0.3rem' }} title="Delete"><Trash2 size={16} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                    );
                })()}

                {activeTab === 'budgets' && (
                    <BudgetPanel budgets={budgets} transactions={transactions} onBudgetsChanged={loadData} />
                )}

                {activeTab === 'recurring' && (
                    <RecurringPanel recurring={recurring} accounts={accounts} onRecurringChanged={loadData} />
                )}

                {activeTab === 'goals' && (
                    <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5, background: 'var(--card-bg, #1a1a1a)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                        <Settings size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                        <h2>Goals Module</h2>
                        <p>This module is available in the data layer but the UI is under construction.</p>
                    </div>
                )}

                {activeTab === 'accounts' && (
                    <AccountsPanel accounts={accounts} onAccountsChanged={loadData} />
                )}
            </div>

            {showAdd && (
                <AddTransactionModal 
                    accounts={accounts} 
                    editTx={editTx}
                    onClose={() => { setShowAdd(false); setEditTx(null); }} 
                    onSaved={() => { setShowAdd(false); setEditTx(null); loadData(); }} 
                />
            )}

            <Lightbox
                open={lightboxIndex >= 0}
                close={() => setLightboxIndex(-1)}
                index={lightboxIndex}
                slides={receipts}
            />
        </div>
    );
}
