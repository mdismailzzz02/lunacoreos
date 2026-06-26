import { useState, useEffect } from 'react';
import * as api from '../../services/api';

export default function FinancePage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showAdd, setShowAdd] = useState(false);
    const [formData, setFormData] = useState({ date: new Date().toISOString().split('T')[0], category: 'General', amount: '', type: 'expense', note: '' });

    useEffect(() => {
        loadFinance();
    }, []);

    const loadFinance = async () => {
        try {
            const data = await api.getFinance();
            setTransactions(data || []);
        } catch (err) {
            console.error('Failed to load finance data', err);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        const amt = parseFloat(formData.amount);
        if (isNaN(amt)) return;

        const newTx = {
            id: Date.now().toString(),
            ...formData,
            amount: amt,
            created_at: new Date().toISOString()
        };

        try {
            await api.saveFinance(newTx);
            setTransactions([newTx, ...transactions]);
            setShowAdd(false);
            setFormData({ date: new Date().toISOString().split('T')[0], category: 'General', amount: '', type: 'expense', note: '' });
        } catch (err) {
            alert('Failed to save transaction');
        }
    };

    const calculateSummary = () => {
        const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + parseFloat(t.amount), 0);
        return { income, expense, balance: income - expense };
    };

    const summary = calculateSummary();

    return (
        <div className="fade-in" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h1 style={{ margin: 0, fontSize: '2rem' }}>💰 Finance Tracker</h1>
                    <p style={{ margin: '5px 0 0 0', opacity: 0.6 }}>Mindful spending. Wealth building. Peace of mind.</p>
                </div>
                <button
                    onClick={() => setShowAdd(true)}
                    style={{ padding: '0.8rem 1.5rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}
                >
                    + Add Transaction
                </button>
            </div>

            {/* Summary Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Income</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#2ecc71' }}>${summary.income.toFixed(2)}</div>
                </div>
                <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', textAlign: 'center' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Expenses</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#ff4757' }}>${summary.expense.toFixed(2)}</div>
                </div>
                <div style={{ background: 'var(--card-bg)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.1)', textAlign: 'center', boxShadow: '0 10px 30px rgba(0,0,0,0.2)' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Balance</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: summary.balance >= 0 ? '#1e90ff' : '#ff7f50' }}>${summary.balance.toFixed(2)}</div>
                </div>
            </div>

            {/* List */}
            <div style={{ background: 'var(--card-bg)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden' }}>
                <div style={{ padding: '1.2rem 1.5rem', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid rgba(255,255,255,0.05)', fontWeight: 'bold' }}>
                    Recent Transactions
                </div>
                {loading ? (
                    <div style={{ padding: '3rem', display: 'flex', justifyContent: 'center' }}><div className="spinner" /></div>
                ) : (
                    <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
                        {transactions.length === 0 ? (
                            <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.4 }}>No transactions logged yet.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                <tbody>
                                    {transactions.map(tx => (
                                        <tr key={tx.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.03)' }}>
                                            <td style={{ padding: '1.2rem', fontSize: '0.9rem', opacity: 0.5 }}>{new Date(tx.date).toLocaleDateString()}</td>
                                            <td style={{ padding: '1.2rem' }}>
                                                <div style={{ fontWeight: '500' }}>{tx.note || tx.category}</div>
                                                <div style={{ fontSize: '0.75rem', opacity: 0.4 }}>{tx.category}</div>
                                            </td>
                                            <td style={{ padding: '1.2rem', textAlign: 'right', fontWeight: 'bold', color: tx.type === 'income' ? '#2ecc71' : '#ff4757' }}>
                                                {tx.type === 'income' ? '+' : '-'}${parseFloat(tx.amount).toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                )}
            </div>

            {showAdd && (
                <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }}>
                    <div style={{ background: 'var(--card-bg)', padding: '2rem', borderRadius: '24px', width: '400px', border: '1px solid rgba(255,255,255,0.1)' }}>
                        <h2 style={{ marginTop: 0 }}>Add Transaction</h2>
                        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                            <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: '12px' }}>
                                <button type="button" onClick={() => setFormData({ ...formData, type: 'expense' })} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: formData.type === 'expense' ? '#ff4757' : 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>Expense</button>
                                <button type="button" onClick={() => setFormData({ ...formData, type: 'income' })} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: formData.type === 'income' ? '#2ecc71' : 'transparent', border: 'none', color: 'white', cursor: 'pointer' }}>Income</button>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="Amount ($0.00)"
                                required
                                autoFocus
                                style={{ padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1.5rem', textAlign: 'center' }}
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Date</label>
                                    <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Category</label>
                                    <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                                        <option value="General">General</option>
                                        <option value="Food">Food & Dining</option>
                                        <option value="Transport">Transport</option>
                                        <option value="Housing">Housing</option>
                                        <option value="Shopping">Shopping</option>
                                        <option value="Salary">Salary</option>
                                        <option value="Investment">Investment</option>
                                        <option value="Other">Other</option>
                                    </select>
                                </div>
                            </div>
                            <input
                                type="text"
                                placeholder="Note (optional)"
                                style={{ padding: '0.9rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                                value={formData.note}
                                onChange={e => setFormData({ ...formData, note: e.target.value })}
                            />
                            <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                                <button type="button" onClick={() => setShowAdd(false)} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>Save</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
