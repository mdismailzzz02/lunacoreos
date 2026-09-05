import { useState } from 'react';
import * as api from '../../services/api';
import { Plus, Trash2, Landmark, CreditCard, Banknote, TrendingUp } from 'lucide-react';

export default function AccountsPanel({ accounts, onAccountsChanged }) {
    const [showAdd, setShowAdd] = useState(false);
    const [accSearch, setAccSearch] = useState('');
    const [accFilter, setAccFilter] = useState('all');

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSaving(true);
        try {
            await api.saveFinanceAccount({
                ...formData,
                opening_balance: parseFloat(formData.opening_balance),
                current_balance: parseFloat(formData.opening_balance)
            });
            onAccountsChanged();
            setShowAdd(false);
            setFormData({ name: '', type: 'bank', opening_balance: '', currency: 'INR' });
        } catch (err) {
            console.error(err);
            alert('Failed to save account');
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this account? Transactions linked to it may be affected.')) return;
        try {
            await api.deleteFinanceAccount(id);
            onAccountsChanged();
        } catch (err) {
            console.error(err);
            alert('Failed to delete account');
        }
    };

    const getIconForType = (type) => {
        switch (type) {
            case 'bank': return <Landmark size={20} color="#3b82f6" />;
            case 'credit_card': return <CreditCard size={20} color="#f59e0b" />;
            case 'cash': return <Banknote size={20} color="#4ade80" />;
            case 'investment': return <TrendingUp size={20} color="#a29bfe" />;
            default: return <Landmark size={20} color="#fff" />;
        }
    };

    return (
        <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ margin: 0 }}>My Accounts & Portfolios</h3>
                <button 
                    onClick={() => setShowAdd(!showAdd)}
                    style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', padding: '0.5rem 1rem', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
                >
                    <Plus size={16} /> Add Account
                </button>
            </div>

            {showAdd && (
                <form onSubmit={handleSave} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ flex: 2, minWidth: '200px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Account Name</label>
                        <input type="text" required value={formData.name} placeholder="e.g. HDFC Checking" onChange={e => setFormData({ ...formData, name: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }} />
                    </div>
                    <div style={{ flex: 1, minWidth: '150px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Type</label>
                        <select value={formData.type} onChange={e => setFormData({ ...formData, type: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}>
                            <option value="bank">Bank Account</option>
                            <option value="credit_card">Credit Card</option>
                            <option value="cash">Cash / Wallet</option>
                            <option value="investment">Investment</option>
                            <option value="loan">Loan</option>
                        </select>
                    </div>
                    <div style={{ flex: 1, minWidth: '120px' }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem' }}>Current Balance (₹)</label>
                        <input type="number" step="0.01" required value={formData.opening_balance} onChange={e => setFormData({ ...formData, opening_balance: e.target.value })} style={{ width: '100%', padding: '0.6rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }} />
                    </div>
                    <button type="submit" disabled={isSaving} style={{ padding: '0.6rem 1.2rem', borderRadius: '8px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', height: '40px' }}>
                        Save
                    </button>
                </form>
            )}

            <div style={{ padding: '0 0 1.5rem 0', display: 'flex', gap: '1rem' }}>
                <input 
                    type="text" 
                    placeholder="Search accounts..." 
                    value={accSearch}
                    onChange={e => setAccSearch(e.target.value)}
                    style={{ flex: 1, padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                />
                <select 
                    value={accFilter}
                    onChange={e => setAccFilter(e.target.value)}
                    style={{ padding: '0.6rem 1rem', borderRadius: '8px', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff' }}
                >
                    <option value="all">All Types</option>
                    <option value="bank">Bank</option>
                    <option value="credit_card">Credit Card</option>
                    <option value="cash">Cash</option>
                    <option value="investment">Investment</option>
                </select>
            </div>

            {accounts.length === 0 ? (
                <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>You have no accounts set up. Add one to track its balance and link transactions.</div>
            ) : (() => {
                const filteredAccounts = accounts.filter(acc => {
                    const matchesSearch = acc.name.toLowerCase().includes(accSearch.toLowerCase());
                    const matchesType = accFilter === 'all' || acc.type === accFilter;
                    return matchesSearch && matchesType;
                });
                
                if (filteredAccounts.length === 0) return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.4 }}>No accounts match your search.</div>;
                
                return (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                        {filteredAccounts.map(acc => (
                            <div key={acc.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.2rem', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                    <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.8rem', borderRadius: '12px' }}>
                                        {getIconForType(acc.type)}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '600', fontSize: '1.1rem' }}>{acc.name}</div>
                                        <div style={{ fontSize: '0.8rem', opacity: 0.5, textTransform: 'capitalize' }}>{acc.type.replace('_', ' ')}</div>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '0.5rem', alignItems: 'flex-end' }}>
                                    <div style={{ fontWeight: 'bold', fontSize: '1.2rem' }}>
                                        ₹{parseFloat(acc.current_balance || acc.opening_balance).toFixed(2)}
                                    </div>
                                    <Trash2 size={16} color="#f43f5e" style={{ cursor: 'pointer', opacity: 0.6, transition: '0.2s' }} onClick={() => handleDelete(acc.id)} />
                                </div>
                            </div>
                        ))}
                    </div>
                );
            })()}
        </div>
    );
}
