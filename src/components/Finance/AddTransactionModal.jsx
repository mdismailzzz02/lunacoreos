import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import * as api from '../../services/api';
import { supabase } from '../../services/supabaseClient';

export default function AddTransactionModal({ onClose, onSaved, accounts, editTx = null }) {
    const [formData, setFormData] = useState({
        date: editTx ? editTx.date.split('T')[0] : new Date().toISOString().split('T')[0],
        type: editTx ? editTx.type : 'expense',
        amount: editTx ? editTx.amount : '',
        category: editTx ? editTx.category : 'General',
        account_id: editTx ? (editTx.account_id || '') : (accounts?.length ? accounts[0].id : ''),
        currency: editTx ? editTx.currency : (accounts?.length ? accounts[0].currency : 'INR'),
        note: editTx ? (editTx.note || '') : '',
        tags: editTx ? (editTx.tags ? editTx.tags.join(', ') : '') : '',
        is_recurring: editTx ? editTx.is_recurring : false
    });
    
    const [receiptFile, setReceiptFile] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileInputRef = useRef(null);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setReceiptFile(e.target.files[0]);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setReceiptFile(e.dataTransfer.files[0]);
        }
    };

    const handleSave = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            const user = session?.user;
            if (!user) throw new Error("Not logged in");

            let receipt_r2_key = editTx ? editTx.receipt_r2_key : null;

            if (receiptFile) {
                setUploadProgress(10);
                const ext = receiptFile.name.split('.').pop();
                const r2Key = `vault/${user.id}/media-library/transaction/${Date.now()}-receipt.${ext}`;
                const { url: putUrl } = await api.getR2PresignedPut(r2Key, receiptFile.type || 'application/octet-stream');
                
                setUploadProgress(40);
                await fetch(putUrl, {
                    method: 'PUT',
                    headers: { 'Content-Type': receiptFile.type || 'application/octet-stream' },
                    body: receiptFile
                });
                receipt_r2_key = r2Key;
                setUploadProgress(80);
            }

            const tx = {
                ...formData,
                ...(editTx ? { id: editTx.id } : {}),
                amount: parseFloat(formData.amount),
                tags: formData.tags ? formData.tags.split(',').map(t => t.trim()).filter(Boolean) : [],
                account_id: formData.account_id || null,
                user_id: user.id,
                receipt_r2_key,
            };

            await api.saveFinance(tx);
            setUploadProgress(100);
            onSaved();
        } catch (err) {
            console.error(err);
            alert('Failed to save transaction');
        } finally {
            setIsSubmitting(false);
        }
    };

    return createPortal(
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(10px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 99999 }}>
            <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '2rem', borderRadius: '24px', width: '90%', maxWidth: '500px', border: '1px solid rgba(255,255,255,0.1)', maxHeight: '90vh', overflowY: 'auto' }}>
                <h2 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#fff' }}>Add Transaction</h2>
                
                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                    <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255,255,255,0.05)', padding: '0.3rem', borderRadius: '12px' }}>
                        <button type="button" onClick={() => setFormData({ ...formData, type: 'expense' })} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: formData.type === 'expense' ? '#ff4757' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', transition: '0.2s' }}>Expense</button>
                        <button type="button" onClick={() => setFormData({ ...formData, type: 'income' })} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: formData.type === 'income' ? '#2ecc71' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', transition: '0.2s' }}>Income</button>
                        <button type="button" onClick={() => setFormData({ ...formData, type: 'transfer' })} style={{ flex: 1, padding: '0.6rem', borderRadius: '10px', background: formData.type === 'transfer' ? '#3b82f6' : 'transparent', border: 'none', color: 'white', cursor: 'pointer', transition: '0.2s' }}>Transfer</button>
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem', color: '#fff' }}>Amount</label>
                            <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                required
                                autoFocus
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1.5rem', boxSizing: 'border-box' }}
                                value={formData.amount}
                                onChange={e => setFormData({ ...formData, amount: e.target.value })}
                            />
                        </div>
                        <div style={{ width: '100px' }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem', color: '#fff' }}>Currency</label>
                            <select 
                                value={formData.currency} 
                                onChange={e => setFormData({ ...formData, currency: e.target.value })} 
                                style={{ width: '100%', padding: '1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', fontSize: '1rem', boxSizing: 'border-box' }}
                            >
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="INR">INR</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem', color: '#fff' }}>Date</label>
                            <input type="date" value={formData.date} onChange={e => setFormData({ ...formData, date: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }} />
                        </div>
                        <div>
                            <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem', color: '#fff' }}>Category</label>
                            <select value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}>
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
                                <option value="Salary">Salary</option>
                                <option value="Investment">Investment</option>
                                <option value="Transfer">Transfer</option>
                                <option value="Other">Other</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem', color: '#fff' }}>Account</label>
                        <select 
                            value={formData.account_id} 
                            onChange={e => setFormData({ ...formData, account_id: e.target.value })} 
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}
                        >
                            <option value="">Select Account...</option>
                            {accounts?.map(acc => (
                                <option key={acc.id} value={acc.id}>{acc.name} ({acc.currency})</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem', color: '#fff' }}>Note (Optional)</label>
                        <input
                            type="text"
                            placeholder="What was this for?"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}
                            value={formData.note}
                            onChange={e => setFormData({ ...formData, note: e.target.value })}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.75rem', opacity: 0.5, marginBottom: '0.4rem', color: '#fff' }}>Tags (comma separated)</label>
                        <input
                            type="text"
                            placeholder="e.g. trip, office, fun"
                            style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}
                            value={formData.tags}
                            onChange={e => setFormData({ ...formData, tags: e.target.value })}
                        />
                    </div>

                    {/* Receipt Upload area */}
                    <div 
                        onDragOver={(e) => e.preventDefault()} 
                        onDrop={handleDrop}
                        onClick={() => fileInputRef.current?.click()}
                        style={{ 
                            border: '2px dashed rgba(255,255,255,0.2)', 
                            borderRadius: '12px', 
                            padding: '1.5rem', 
                            textAlign: 'center',
                            cursor: 'pointer',
                            background: receiptFile ? 'rgba(74, 222, 128, 0.1)' : 'transparent',
                            transition: 'all 0.2s'
                        }}
                    >
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} style={{ display: 'none' }} accept="image/*,application/pdf" />
                        {receiptFile ? (
                            <div style={{ color: '#4ade80' }}>
                                <div>📄 {receiptFile.name}</div>
                                <div style={{ fontSize: '0.8rem', opacity: 0.7 }}>Click to change</div>
                            </div>
                        ) : (
                            <div style={{ color: 'rgba(255,255,255,0.6)' }}>
                                <div style={{ marginBottom: '0.5rem' }}>📎 Drop receipt/invoice here</div>
                                <div style={{ fontSize: '0.8rem' }}>or click to browse</div>
                            </div>
                        )}
                    </div>

                    {isSubmitting && uploadProgress > 0 && uploadProgress < 100 && (
                        <div style={{ background: 'rgba(255,255,255,0.1)', height: '6px', borderRadius: '3px', overflow: 'hidden' }}>
                            <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#3b82f6', transition: 'width 0.2s' }} />
                        </div>
                    )}

                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.5rem' }}>
                        <button type="button" onClick={onClose} disabled={isSubmitting} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'transparent', border: '1px solid rgba(255,255,255,0.1)', color: 'white', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}>Cancel</button>
                        <button type="submit" disabled={isSubmitting} style={{ flex: 1, padding: '0.9rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', cursor: 'pointer', opacity: isSubmitting ? 0.5 : 1 }}>
                            {isSubmitting ? 'Saving...' : 'Save Transaction'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
