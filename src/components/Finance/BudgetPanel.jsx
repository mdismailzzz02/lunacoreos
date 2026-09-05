import { useState, useMemo } from 'react';
import * as api from '../../services/api';
import { Plus, Trash2, Edit2 } from 'lucide-react';

export default function BudgetPanel({ budgets, transactions, onBudgetsChanged }) {
    const [showAdd, setShowAdd] = useState(false);
    const [budgSearch, setBudgSearch] = useState('');
    const [editBudget, setEditBudget] = useState(null);
    const [formData, setFormData] = useState({ category: 'Food', monthly_limit: '', alert_threshold_pct: 80 });
    const [isSaving, setIsSaving] = useState(false);

    // Calculate progress for current month
    const budgetProgress = useMemo(() => {
        const now = new Date();
        const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        
        // Sum expenses for current month per category
        const spentByCategory = {};
        transactions.forEach(tx => {
            if (tx.type !== 'expense') return;
            const txMonth = tx.date.substring(0, 7); // YYYY-MM
            if (txMonth === currentMonthStr) {
                spentByCategory[tx.category] = (spentByCategory[tx.category] || 0) + parseFloat(tx.amount);
            }
        });

        return budgets.map(budget => {
            const spent = spentByCategory[budget.category] || 0;
            const limit = parseFloat(budget.monthly_limit);
            const pct = limit > 0 ? (spent / limit) * 100 : 0;
            const threshold = parseInt(budget.alert_threshold_pct) || 80;
            const isWarning = pct >= threshold && pct < 100;
            const isDanger = pct >= 100;

            let color = '#4ade80'; // Green
            if (isWarning) color = '#f59e0b'; // Yellow
            if (isDanger) color = '#f43f5e'; // Red

            return { ...budget, spent, pct, color };
        }).sort((a, b) => b.pct - a.pct);
    }, [budgets, transactions]);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { data: { session } } = await api.supabase.auth.getSession();
            await api.saveFinanceBudget({
                ...formData,
                ...(editBudget ? { id: editBudget.id } : {}),
                user_id: session?.user?.id,
                monthly_limit: parseFloat(formData.monthly_limit)
            });
            onBudgetsChanged();
            setShowAdd(false);
            setEditBudget(null);
            setFormData({ category: 'Food', monthly_limit: '', alert_threshold_pct: 80 });
        } catch (err) {
            console.error(err);
            alert('Failed to save budget');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Delete this budget limit?')) return;
        try {
            await api.deleteFinanceBudget(id);
            onBudgetsChanged();
        } catch (err) {
            console.error(err);
            alert('Failed to delete budget');
        }
    };

    return (
        <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>Monthly Budgets</h3>
                <button 
                    onClick={() => {
                        if (showAdd) {
                            setEditBudget(null);
                            setFormData({ category: 'Food', monthly_limit: '', alert_threshold_pct: 80 });
                        }
                        setShowAdd(!showAdd);
                    }}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={16} /> {showAdd ? 'Cancel' : 'New Budget'}
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleSave} style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Category</label>
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}>
                            <option value="General">General</option>
                            <option value="Food">Food & Dining</option>
                            <option value="Groceries">Groceries</option>
                            <option value="Transport">Transport</option>
                            <option value="Housing">Housing</option>
                            <option value="Utilities">Utilities</option>
                            <option value="Clothing">Clothing</option>
                            <option value="Electronics">Electronics</option>
                            <option value="Personal Care">Personal Care</option>
                            <option value="Hobbies">Hobbies</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Limit (₹)</label>
                        <input type="number" step="1" required value={formData.monthly_limit} onChange={e => setFormData({ ...formData, monthly_limit: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                    </div>
                    <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Alert at %</label>
                        <input type="number" min="1" max="100" required value={formData.alert_threshold_pct} onChange={e => setFormData({ ...formData, alert_threshold_pct: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }} />
                    </div>
                    <button type="submit" disabled={isSaving} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', height: '40px' }}>
                        Save
                    </button>
                </form>
            )}

            <div style={{ padding: '0 0 1.5rem 0' }}>
                <input 
                    type="text" 
                    placeholder="Search budgets..." 
                    value={budgSearch}
                    onChange={e => setBudgSearch(e.target.value)}
                    style={{ width: '100%', maxWidth: '400px', padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', boxSizing: 'border-box' }}
                />
            </div>

            {budgets.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>You have no budgets set up. Add one to track spending.</div>
            ) : (() => {
                const filteredBudgets = budgetProgress.filter(b => b.category.toLowerCase().includes(budgSearch.toLowerCase()));
                if (filteredBudgets.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>No budgets match your search.</div>;
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1rem' }}>
                        {filteredBudgets.map(budget => (
                            <div key={budget.id} style={{ padding: '1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.8rem' }}>
                                    <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{budget.category}</div>
                                    <div style={{ display: 'flex', gap: '0.8rem' }}>
                                        <Edit2 size={16} color="#a29bfe" style={{ cursor: 'pointer', opacity: 0.7, transition: '0.2s' }} onClick={() => {
                                            setEditBudget(budget);
                                            setFormData({ category: budget.category, monthly_limit: budget.monthly_limit, alert_threshold_pct: budget.alert_threshold_pct });
                                            setShowAdd(true);
                                        }} />
                                        <Trash2 size={16} color="#f43f5e" style={{ cursor: 'pointer', opacity: 0.5, transition: '0.2s' }} onClick={() => handleDelete(budget.id)} />
                                    </div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
                                    <span>Spent: ₹{budget.spent.toFixed(2)}</span>
                                    <span>Limit: ₹{parseFloat(budget.monthly_limit).toFixed(2)}</span>
                                </div>
                                <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${Math.min(budget.pct, 100)}%`, background: budget.color, transition: 'width 0.3s ease' }}></div>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.5rem', fontSize: '0.75rem', opacity: 0.5 }}>
                                    <span>{budget.pct.toFixed(1)}% Used</span>
                                    <span>{budget.pct >= budget.alert_threshold_pct ? '⚠️ Warning' : '✅ Good'}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
}
