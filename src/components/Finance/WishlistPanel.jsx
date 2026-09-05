import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import * as api from '../../services/api';
import { Plus, X, Upload, Calendar, IndianRupee, Image as ImageIcon, Trash2, Edit2, CheckCircle } from 'lucide-react';
import AppleLoader from '../Layout/AppleLoader';

export default function WishlistPanel({ accounts, onTransactionCreated }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editTarget, setEditTarget] = useState(null);

    useEffect(() => {
        loadWishlist();
    }, []);

    const loadWishlist = async () => {
        setLoading(true);
        try {
            const data = await api.getWishlistItems();
            setItems(data);
        } catch (ex) {
            console.error('Error loading wishlist:', ex);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        await loadWishlist();
        setShowModal(false);
        setEditTarget(null);
    };

    const handleDelete = async (id) => {
        if (!confirm('Are you sure you want to delete this wishlist item?')) return;
        try {
            await api.deleteWishlistItem(id);
            setItems(items.filter(i => i.id !== id));
        } catch (ex) {
            console.error('Error deleting item:', ex);
        }
    };

    const handleMarkPurchased = async (id) => {
        try {
            const item = items.find(i => i.id === id);
            
            // Mark as purchased
            await api.updateWishlistItem(id, { status: 'purchased' });
            setItems(items.map(i => i.id === id ? { ...i, status: 'purchased' } : i));

            // Extract R2 key from the full public URL (e.g. media-library/finance_wishlist/123.png)
            let receipt_r2_key = null;
            if (item.image_url) {
                const match = item.image_url.match(/media-library\/.*/);
                if (match) {
                    receipt_r2_key = match[0];
                }
            }

            // Create a transaction
            const tx = {
                date: new Date().toISOString().split('T')[0],
                type: 'expense',
                amount: parseFloat(item.approx_cost || 0),
                category: item.category || 'General',
                account_id: accounts?.length ? accounts[0].id : null,
                currency: accounts?.length ? accounts[0].currency : 'INR',
                note: `Wishlist: ${item.item_name}`,
                tags: ['wishlist'],
                receipt_r2_key: receipt_r2_key,
                user_id: item.user_id,
            };
            await api.saveFinance(tx);
            if (onTransactionCreated) onTransactionCreated();
            
        } catch (ex) {
            console.error('Error marking as purchased & creating transaction:', ex);
            alert('Marked as purchased, but failed to automatically create a transaction.');
        }
    };

    const handleMarkActive = async (id) => {
        try {
            await api.updateWishlistItem(id, { status: 'active' });
            setItems(items.map(i => i.id === id ? { ...i, status: 'active' } : i));
        } catch (ex) {
            console.error('Error marking as active:', ex);
        }
    };

    const getDaysLeft = (targetDate) => {
        if (!targetDate) return null;
        const diffTime = new Date(targetDate) - new Date();
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return diffDays;
    };

    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('active'); // 'all', 'active', 'purchased'

    const filteredItems = items.filter(item => {
        const matchesSearch = item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) || item.description?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'all' || item.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 'bold' }}>Wishlist & Upcoming Purchases</h2>
                
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <input 
                        type="text" 
                        placeholder="Search items..." 
                        value={searchTerm} 
                        onChange={e => setSearchTerm(e.target.value)} 
                        style={{ padding: '0.6rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', width: '200px' }}
                    />
                    <select 
                        value={statusFilter} 
                        onChange={e => setStatusFilter(e.target.value)} 
                        style={{ padding: '0.6rem 1rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', outline: 'none', cursor: 'pointer' }}
                    >
                        <option value="all" style={{ background: '#1c1c1e' }}>All Status</option>
                        <option value="active" style={{ background: '#1c1c1e' }}>Active</option>
                        <option value="purchased" style={{ background: '#1c1c1e' }}>Purchased</option>
                    </select>
                    <button 
                        onClick={() => { setEditTarget(null); setShowModal(true); }}
                        style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', border: 'none', color: 'white', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                    >
                        <Plus size={16} /> Add Item
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{ height: '96px', background: 'rgba(255,255,255,0.02)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.03)', display: 'flex', alignItems: 'center', gap: '1.25rem', padding: '1rem', animation: 'pulse 1.5s infinite' }}>
                            <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)' }} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                                <div style={{ width: '150px', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                                <div style={{ width: '250px', height: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }} />
                            </div>
                            <div style={{ width: '100px', height: '16px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                            <div style={{ width: '80px', height: '24px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }} />
                        </div>
                    ))}
                </div>
            ) : items.length === 0 ? (
                <div style={{ padding: '4rem', textAlign: 'center', opacity: 0.5, border: '1px dashed rgba(255,255,255,0.2)', borderRadius: '20px' }}>
                    <ImageIcon size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>Your wishlist is empty. Add items, travels, or services you want to purchase.</p>
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    {filteredItems.length === 0 && (
                        <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>No items match your filters.</div>
                    )}
                    {filteredItems.map(item => {
                        const daysLeft = getDaysLeft(item.target_date);
                        const isPurchased = item.status === 'purchased';
                        
                        return (
                            <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)', opacity: isPurchased ? 0.6 : 1, transition: '0.2s' }}>
                                {/* Thumbnail */}
                                <div style={{ width: '64px', height: '64px', borderRadius: '12px', background: item.image_url ? `url(${item.image_url}) center/cover` : 'rgba(255,255,255,0.05)', flexShrink: 0, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                                    {!item.image_url && <ImageIcon size={20} opacity={0.3} />}
                                </div>
                                
                                {/* Info */}
                                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                                        <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                            {item.item_name}
                                        </h3>
                                        {item.category && <span style={{ fontSize: '0.65rem', background: 'rgba(162,155,254,0.15)', color: '#a29bfe', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(162,155,254,0.3)' }}>{item.category}</span>}
                                        {isPurchased && <span style={{ fontSize: '0.65rem', background: 'rgba(34,197,94,0.2)', color: '#4ade80', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>PURCHASED</span>}
                                    </div>
                                    <p style={{ margin: 0, fontSize: '0.85rem', color: 'rgba(255,255,255,0.5)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {item.description || 'No description'}
                                    </p>
                                </div>

                                {/* Target Date */}
                                <div style={{ width: '140px', display: 'flex', flexDirection: 'column', gap: '0.25rem', flexShrink: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'rgba(255,255,255,0.7)', fontSize: '0.85rem' }}>
                                        <Calendar size={14} />
                                        {item.target_date ? new Date(item.target_date).toLocaleDateString('en-GB') : 'No Date'}
                                    </div>
                                    <div style={{ fontSize: '0.75rem', color: daysLeft !== null && daysLeft < 30 && !isPurchased ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>
                                        {daysLeft !== null && !isPurchased ? (daysLeft < 0 ? 'Overdue' : daysLeft === 0 ? 'Today' : `${daysLeft} days left`) : ''}
                                    </div>
                                </div>

                                {/* Cost */}
                                <div style={{ width: '120px', fontSize: '1.1rem', fontWeight: 'bold', color: '#4ade80', textAlign: 'right', flexShrink: 0 }}>
                                    ₹{item.approx_cost ? Number(item.approx_cost).toLocaleString() : '0'}
                                </div>

                                {/* Actions */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0, marginLeft: '1rem' }}>
                                    {isPurchased ? (
                                        <button onClick={() => handleMarkActive(item.id)} title="Mark Active (Undo Purchase)" style={{ background: 'rgba(245,158,11,0.1)', border: 'none', color: '#f59e0b', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
                                            <X size={16} />
                                        </button>
                                    ) : (
                                        <button onClick={() => handleMarkPurchased(item.id)} title="Mark Purchased" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'white', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
                                            <CheckCircle size={16} />
                                        </button>
                                    )}
                                    <button onClick={() => { setEditTarget(item); setShowModal(true); }} title="Edit" style={{ background: 'rgba(255,255,255,0.05)', border: 'none', color: 'rgba(255,255,255,0.6)', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
                                        <Edit2 size={16} />
                                    </button>
                                    <button onClick={() => handleDelete(item.id)} title="Delete" style={{ background: 'rgba(220,38,38,0.1)', border: 'none', color: '#ef4444', padding: '0.4rem', borderRadius: '8px', cursor: 'pointer', display: 'flex' }}>
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {showModal && (
                <WishlistModal 
                    entry={editTarget} 
                    onClose={() => setShowModal(false)} 
                    onSave={handleSave} 
                />
            )}
        </div>
    );
}

function WishlistModal({ entry, onClose, onSave }) {
    const isEdit = !!entry;
    const [loading, setLoading] = useState(false);
    const [itemName, setItemName] = useState(entry?.item_name || '');
    const [approxCost, setApproxCost] = useState(entry?.approx_cost || '');
    const [category, setCategory] = useState(entry?.category || 'General');
    const [targetDate, setTargetDate] = useState(entry?.target_date || '');
    const [description, setDescription] = useState(entry?.description || '');
    const [imageUrl, setImageUrl] = useState(entry?.image_url || '');
    
    const [imageFile, setImageFile] = useState(null);
    const [previewUrl, setPreviewUrl] = useState(entry?.image_url || '');
    const [uploadProgress, setUploadProgress] = useState(0);
    const fileRef = useRef(null);

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setImageFile(file);
        setPreviewUrl(URL.createObjectURL(file));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            let finalImageUrl = imageUrl;
            
            // Handle new image upload via existing R2 uploadMedia flow
            if (imageFile) {
                const res = await api.uploadMedia({
                    file: imageFile,
                    media_type: 'image',
                    uploaded_from: 'finance_wishlist',
                    display_name: itemName
                }, (prog) => setUploadProgress(prog));
                
                finalImageUrl = res.drive_link || res.r2_public_url;
            }

            const { data: { session } } = await api.supabase.auth.getSession();
            if (!session?.user?.id) throw new Error("No active session");

            const payload = {
                user_id: session.user.id,
                item_name: itemName,
                approx_cost: approxCost || 0,
                target_date: targetDate || null,
                description,
                category,
                image_url: finalImageUrl,
                status: entry?.status || 'active'
            };

            if (isEdit) {
                await api.updateWishlistItem(entry.id, payload);
            } else {
                await api.createWishlistItem(payload);
            }
            onSave();
        } catch (ex) {
            console.error('Error saving wishlist item:', ex);
            alert('Failed to save wishlist item.');
        } finally {
            setLoading(false);
        }
    };

    return ReactDOM.createPortal(
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(12px)', zIndex: 999999, display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '1rem' }}>
            <div className="fade-in" style={{ background: 'rgba(28, 28, 30, 0.85)', backdropFilter: 'blur(24px)', border: '1px solid rgba(255,255,255,0.1)', width: '100%', maxWidth: '500px', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 20px 60px rgba(0,0,0,0.6)', display: 'flex', flexDirection: 'column', maxHeight: '90vh' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.05)', flexShrink: 0 }}>
                    <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#fff' }}>{isEdit ? 'Edit Wishlist Item' : 'New Wishlist Item'}</h3>
                    <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: '0.2s' }}><X size={16} /></button>
                </div>
                
                <form onSubmit={handleSubmit} style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', overflowY: 'auto' }}>
                    
                    {/* Image Dropzone */}
                    <div 
                        onClick={() => fileRef.current?.click()}
                        style={{ width: '100%', height: '180px', borderRadius: '16px', border: '2px dashed rgba(255,255,255,0.15)', display: 'flex', justifyContent: 'center', alignItems: 'center', cursor: 'pointer', backgroundImage: previewUrl ? `url(${previewUrl})` : 'none', backgroundSize: 'cover', backgroundPosition: 'center', position: 'relative', overflow: 'hidden', backgroundColor: 'rgba(0,0,0,0.2)', transition: '0.2s', flexShrink: 0 }}
                    >
                        {!previewUrl && (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.6, color: '#fff' }}>
                                <Upload size={28} style={{ marginBottom: '0.75rem', color: 'var(--brand-color, #a29bfe)' }} />
                                <span style={{ fontWeight: 500 }}>Upload Image</span>
                            </div>
                        )}
                        {previewUrl && (
                            <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, rgba(0,0,0,0.8), transparent)', padding: '1rem 0.5rem 0.5rem 0.5rem', textAlign: 'center', fontSize: '0.85rem', color: '#fff', fontWeight: 500 }}>
                                Click to Change Image
                            </div>
                        )}
                        <input type="file" accept="image/*" ref={fileRef} onChange={handleFileChange} style={{ display: 'none' }} />
                    </div>

                    <div style={{ flexShrink: 0 }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>Item Name *</label>
                        <input type="text" value={itemName} onChange={e => setItemName(e.target.value)} required style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', outline: 'none' }} />
                    </div>

                    <div style={{ display: 'flex', gap: '1rem', flexShrink: 0 }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem', color: '#fff' }}>Est. Cost (₹)</label>
                            <input type="number" placeholder="0" value={approxCost} onChange={e => setApproxCost(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }} />
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem', color: '#fff' }}>Target Date</label>
                            <input type="date" value={targetDate} onChange={e => setTargetDate(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', outline: 'none' }} />
                        </div>
                    </div>
                    
                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem', color: '#fff' }}>Category</label>
                        <select value={category} onChange={e => setCategory(e.target.value)} style={{ width: '100%', padding: '0.8rem', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', boxSizing: 'border-box' }}>
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
                            <option value="Investment">Investment</option>
                            <option value="Transfer">Transfer</option>
                            <option value="Other">Other</option>
                        </select>
                    </div>

                    <div>
                        <label style={{ display: 'block', fontSize: '0.8rem', opacity: 0.7, marginBottom: '0.5rem', color: '#fff' }}>Description / Notes</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} style={{ width: '100%', padding: '0.85rem 1rem', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: '#fff', resize: 'vertical', outline: 'none' }} />
                    </div>

                    <div style={{ marginTop: '0.5rem', flexShrink: 0 }}>
                        <button 
                            type="submit" 
                            disabled={loading} 
                            style={{ width: '100%', padding: '1rem', background: 'linear-gradient(135deg, var(--brand-color, #a29bfe), #6c5ce7)', color: 'white', border: 'none', borderRadius: '14px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1, boxShadow: '0 8px 20px rgba(162, 155, 254, 0.3)', transition: '0.2s', fontSize: '1rem' }}
                        >
                            {loading ? (uploadProgress > 0 ? `Uploading Image ${uploadProgress}%...` : 'Saving...') : 'Save Wishlist Item'}
                        </button>
                    </div>
                </form>
            </div>
        </div>,
        document.body
    );
}
