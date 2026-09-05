import { useState } from 'react';
import * as api from '../../services/api';
import { Plus, Trash2, Repeat, CheckCircle } from 'lucide-react';

export default function RecurringPanel({ recurring, accounts, onRecurringChanged }) {
    const [showAdd, setShowAdd] = useState(false);
    const [recSearch, setRecSearch] = useState('');
    const [recFilter, setRecFilter] = useState('all');
    const [formData, setFormData] = useState({
        label: '',
        amount: '',
        category: 'Utilities',
        frequency: 'monthly',
        next_due_date: new Date().toISOString().split('T')[0],
        account_id: accounts?.length ? accounts[0].id : ''
    });
    const [isSaving, setIsSaving] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            const { data: { session } } = await api.supabase.auth.getSession();
            await api.saveFinanceRecurring({
                ...formData,
                user_id: session?.user?.id,
                amount: parseFloat(formData.amount)
            });
            onRecurringChanged();
            setShowAdd(false);
            setFormData({ ...formData, label: '', amount: '' });
        } catch (err) {
            console.error(err);
            alert('Failed to save recurring item');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Stop tracking this recurring expense?')) return;
        try {
            await api.deleteFinanceRecurring(id);
            onRecurringChanged();
        } catch (err) {
            console.error(err);
            alert('Failed to delete');
        }
    };

    const handleMarkPaid = async (item) => {
        setIsGenerating(true);
        try {
            const { data: { session } } = await api.supabase.auth.getSession();
            // 1. Generate real transaction
            await api.saveFinance({
                user_id: session?.user?.id,
                amount: item.amount,
                type: 'expense',
                category: item.category,
                date: item.next_due_date,
                note: `[Auto] ${item.label}`,
                is_recurring: true,
                recurring_id: item.id,
                account_id: item.account_id
            });

            // 2. Compute next due date
            const date = new Date(item.next_due_date);
            if (item.frequency === 'monthly') date.setMonth(date.getMonth() + 1);
            else if (item.frequency === 'weekly') date.setDate(date.getDate() + 7);
            else if (item.frequency === 'yearly') date.setFullYear(date.getFullYear() + 1);

            // 3. Update recurring item
            await api.saveFinanceRecurring({
                ...item,
                next_due_date: date.toISOString().split('T')[0]
            });
            
            onRecurringChanged();
        } catch(e) {
            console.error(e);
            alert('Failed to process payment');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Repeat size={20} color="#a29bfe"/> Subscriptions & Recurring</h3>
                <button 
                    onClick={() => setShowAdd(!showAdd)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={16} /> New Sub
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleSave} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Label</label>
                        <input type="text" required value={formData.label} placeholder="Netflix, Rent..." onChange={e => setFormData({ ...formData, label: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Amount (₹)</label>
                        <input type="number" step="0.01" required value={formData.amount} onChange={e => setFormData({ ...formData, amount: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Category</label>
                        <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}>
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
                            <option value="Insurance">Insurance</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Frequency</label>
                        <select value={formData.frequency} onChange={e => setFormData({ ...formData, frequency: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}>
                            <option value="weekly">Weekly</option>
                            <option value="monthly">Monthly</option>
                            <option value="yearly">Yearly</option>
                        </select>
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Next Due Date</label>
                        <input type="date" required value={formData.next_due_date} onChange={e => setFormData({ ...formData, next_due_date: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Pay from Account</label>
                        <select value={formData.account_id} onChange={e => setFormData({ ...formData, account_id: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}>
                            <option value="">None</option>
                            {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                        </select>
                    </div>
                    <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
                        <button type="submit" disabled={isSaving} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer' }}>
                            Save Subscription
                        </button>
                    </div>
                </form>
            )}

            <div style={{ padding: '0 0 1.5rem 0', display: 'flex', gap: '1rem' }}>
                <input 
                    type="text" 
                    placeholder="Search recurring bills..." 
                    value={recSearch}
                    onChange={e => setRecSearch(e.target.value)}
                    style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <select 
                    value={recFilter}
                    onChange={e => setRecFilter(e.target.value)}
                    style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                >
                    <option value="all">All Frequencies</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="yearly">Yearly</option>
                </select>
            </div>

            {recurring.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>No active subscriptions or recurring bills.</div>
            ) : (() => {
                const filteredRec = recurring.filter(item => {
                    const matchesSearch = item.label.toLowerCase().includes(recSearch.toLowerCase()) || item.category.toLowerCase().includes(recSearch.toLowerCase());
                    const matchesFreq = recFilter === 'all' || item.frequency === recFilter;
                    return matchesSearch && matchesFreq;
                });
                
                if (filteredRec.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>No recurring items match your search.</div>;
                
                return (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {filteredRec.map(item => {
                            const daysUntil = Math.ceil((new Date(item.next_due_date) - new Date()) / (1000 * 60 * 60 * 24));
                            const isDueSoon = daysUntil <= 7 && daysUntil >= 0;
                            const isOverdue = daysUntil < 0;

                            return (
                                <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: `1px solid ${isOverdue ? 'rgba(244,63,94,0.3)' : isDueSoon ? 'rgba(245,158,11,0.3)' : 'transparent'}` }}>
                                    <div>
                                        <div style={{ fontWeight: '600', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            {item.label}
                                            {(isDueSoon || isOverdue) && <span style={{ fontSize: '0.7rem', padding: '0.1rem 0.4rem', borderRadius: '10px', background: isOverdue ? '#f43f5e' : '#f59e0b', color: 'black' }}>{isOverdue ? 'Overdue' : 'Due Soon'}</span>}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.6 }}>
                                            {item.frequency.charAt(0).toUpperCase() + item.frequency.slice(1)} • {item.category}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.8, color: '#a29bfe' }}>Next: {new Date(item.next_due_date).toLocaleDateString()}</div>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>₹{parseFloat(item.amount).toFixed(2)}</div>
                                        <button 
                                            onClick={() => handleMarkPaid(item)}
                                            disabled={isGenerating}
                                            title="Mark as paid (Generates transaction)"
                                            style={{ background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
                                        >
                                            <CheckCircle size={16} />
                                        </button>
                                        <Trash2 size={16} color="#f43f5e" style={{ cursor: 'pointer', opacity: 0.7 }} onClick={() => handleDelete(item.id)} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                );
            })()}
        </div>
    );
}
