import { useState, useEffect, useMemo } from 'react';
import * as api from '../../services/api';
import { Target, Plus, Wrench, Calendar, DollarSign, Trash2, Edit2, ChevronDown, ChevronUp } from 'lucide-react';

export default function GoalsPanel() {
    const [goals, setGoals] = useState([]);
    const [maintenance, setMaintenance] = useState({}); // goal_id -> [maintenance logs]
    const [loading, setLoading] = useState(true);

    const [showAddGoal, setShowAddGoal] = useState(false);
    const [showAddMaintenance, setShowAddMaintenance] = useState(null); // goal_id
    const [expandedGoal, setExpandedGoal] = useState(null);

    // Form state for Goals
    const [goalForm, setGoalForm] = useState({ productName: '', price: '', purchaseDate: new Date().toISOString().split('T')[0], lifespanYears: 5 });
    
    // Form state for Maintenance
    const [maintForm, setMaintForm] = useState({ amount: '', serviceDate: new Date().toISOString().split('T')[0], note: '' });

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const data = await api.getProductGoals();
            setGoals(data || []);
            
            // Load maintenance for all goals
            const maintMap = {};
            await Promise.all((data || []).map(async (g) => {
                const mLogs = await api.getProductMaintenance(g.id);
                maintMap[g.id] = mLogs || [];
            }));
            setMaintenance(maintMap);
        } catch (err) {
            console.error('Failed to load goals data', err);
            // Ignore error so user can still see UI if table missing
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGoal = async (e) => {
        e.preventDefault();
        try {
            await api.createProductGoal({
                product_name: goalForm.productName,
                purchase_price: parseFloat(goalForm.price),
                purchase_date: goalForm.purchaseDate,
                lifespan_goal_years: parseFloat(goalForm.lifespanYears)
            });
            setShowAddGoal(false);
            setGoalForm({ productName: '', price: '', purchaseDate: new Date().toISOString().split('T')[0], lifespanYears: 5 });
            loadData();
        } catch (err) {
            alert('Failed to save goal. Did you run the SQL schema update?');
            console.error(err);
        }
    };

    const handleDeleteGoal = async (id) => {
        if (!confirm('Are you sure you want to delete this product and all its maintenance history?')) return;
        try {
            await api.deleteProductGoal(id);
            loadData();
        } catch (err) {
            console.error(err);
        }
    };

    const handleSaveMaintenance = async (e, goalId) => {
        e.preventDefault();
        try {
            await api.createProductMaintenance({
                goal_id: goalId,
                amount: parseFloat(maintForm.amount),
                service_date: maintForm.serviceDate,
                note: maintForm.note
            });
            setShowAddMaintenance(null);
            setMaintForm({ amount: '', serviceDate: new Date().toISOString().split('T')[0], note: '' });
            
            // Reload just this goal's maintenance
            const mLogs = await api.getProductMaintenance(goalId);
            setMaintenance(prev => ({...prev, [goalId]: mLogs || []}));
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteMaintenance = async (mId, goalId) => {
        try {
            await api.deleteProductMaintenance(mId);
            const mLogs = await api.getProductMaintenance(goalId);
            setMaintenance(prev => ({...prev, [goalId]: mLogs || []}));
        } catch (err) {
            console.error(err);
        }
    };

    const calculateMetrics = () => {
        let totalPurchase = 0;
        let totalMaintenance = 0;
        
        goals.forEach(g => {
            totalPurchase += parseFloat(g.purchase_price || 0);
            const logs = maintenance[g.id] || [];
            logs.forEach(l => {
                totalMaintenance += parseFloat(l.amount || 0);
            });
        });

        return { totalPurchase, totalMaintenance, grandTotal: totalPurchase + totalMaintenance };
    };

    const metrics = useMemo(() => calculateMetrics(), [goals, maintenance]);

    if (loading) {
        return <div style={{ padding: '2rem', textAlign: 'center', opacity: 0.5 }}>Loading...</div>;
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
            
            {/* Dashboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Asset Value</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#fff' }}>₹{metrics.totalPurchase.toFixed(2)}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Service Costs</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#f59e0b' }}>₹{metrics.totalMaintenance.toFixed(2)}</div>
                </div>
                <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ fontSize: '0.85rem', opacity: 0.5, textTransform: 'uppercase', marginBottom: '0.5rem' }}>Total Lifetime Cost</div>
                    <div style={{ fontSize: '1.8rem', fontWeight: 'bold', color: '#a29bfe' }}>₹{metrics.grandTotal.toFixed(2)}</div>
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0 }}>Product Goals</h2>
                <button onClick={() => setShowAddGoal(true)} style={{ padding: '0.6rem 1.2rem', borderRadius: '12px', background: 'var(--brand-color, #a29bfe)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Plus size={16} /> Add Product
                </button>
            </div>

            {showAddGoal && (
                <div style={{ background: 'var(--card-bg, #1a1a1a)', padding: '1.5rem', borderRadius: '24px', border: '1px solid rgba(162,155,254,0.3)', marginBottom: '1rem' }}>
                    <h3 style={{ marginTop: 0 }}>Track New Product</h3>
                    <form onSubmit={handleSaveGoal} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '150px' }}>
                            <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Product Name</label>
                            <input required type="text" value={goalForm.productName} onChange={e => setGoalForm({...goalForm, productName: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Purchase Price</label>
                            <input required type="number" step="0.01" value={goalForm.price} onChange={e => setGoalForm({...goalForm, price: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Purchase Date</label>
                            <input required type="date" value={goalForm.purchaseDate} onChange={e => setGoalForm({...goalForm, purchaseDate: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1, minWidth: '120px' }}>
                            <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Lifespan Goal (Years)</label>
                            <input required type="number" step="0.1" value={goalForm.lifespanYears} onChange={e => setGoalForm({...goalForm, lifespanYears: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button type="button" onClick={() => setShowAddGoal(false)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                            <button type="submit" style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: '#a29bfe', color: '#fff', cursor: 'pointer', fontWeight: 'bold' }}>Save</button>
                        </div>
                    </form>
                </div>
            )}

            {goals.length === 0 && !showAddGoal && (
                <div style={{ padding: '3rem', textAlign: 'center', opacity: 0.5, border: '1px dashed rgba(255,255,255,0.1)', borderRadius: '24px' }}>
                    <Target size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                    <p>No products tracked yet.</p>
                </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {goals.map(goal => {
                    const logs = maintenance[goal.id] || [];
                    const maintTotal = logs.reduce((sum, l) => sum + parseFloat(l.amount), 0);
                    
                    const purchaseDate = new Date(goal.purchase_date);
                    const now = new Date();
                    
                    // Calculate years and days elapsed
                    const totalDaysElapsed = Math.floor((now - purchaseDate) / (1000 * 60 * 60 * 24));
                    const displayYears = Math.floor(totalDaysElapsed / 365.25);
                    const displayDays = Math.floor(totalDaysElapsed % 365.25);
                    const yearsElapsed = totalDaysElapsed / 365.25;
                    const targetYears = parseFloat(goal.lifespan_goal_years);
                    
                    const progressPct = Math.min(100, Math.max(0, (yearsElapsed / targetYears) * 100));
                    const isCompleted = yearsElapsed >= targetYears;

                    const isExpanded = expandedGoal === goal.id;

                    return (
                        <div key={goal.id} style={{ background: 'var(--card-bg, #1a1a1a)', borderRadius: '24px', border: '1px solid rgba(255,255,255,0.05)', overflow: 'hidden', transition: '0.3s' }}>
                            {/* Header / Summary */}
                            <div style={{ padding: '1.5rem', display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', cursor: 'pointer', ':hover': { background: 'rgba(255,255,255,0.02)' } }} onClick={() => setExpandedGoal(isExpanded ? null : goal.id)}>
                                <div style={{ flex: '1 1 200px' }}>
                                    <h3 style={{ margin: '0 0 0.3rem 0', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        {goal.product_name}
                                        {isCompleted && <span style={{ fontSize: '0.7rem', padding: '0.2rem 0.5rem', background: 'rgba(74, 222, 128, 0.1)', color: '#4ade80', borderRadius: '12px' }}>Goal Reached</span>}
                                    </h3>
                                    <div style={{ fontSize: '0.85rem', opacity: 0.6 }}>Purchased {purchaseDate.toLocaleDateString()}</div>
                                </div>

                                <div style={{ flex: '1 1 150px' }}>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Purchase Price</div>
                                    <div style={{ fontWeight: 'bold' }}>₹{parseFloat(goal.purchase_price).toFixed(2)}</div>
                                </div>

                                <div style={{ flex: '1 1 150px' }}>
                                    <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>Service / Maint.</div>
                                    <div style={{ fontWeight: 'bold', color: maintTotal > 0 ? '#f59e0b' : '#fff' }}>₹{maintTotal.toFixed(2)}</div>
                                </div>

                                <div style={{ flex: '2 1 250px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.3rem', opacity: 0.7 }}>
                                        <span>{displayYears > 0 ? `${displayYears} yrs, ` : ''}{displayDays} {displayDays === 1 ? 'day' : 'days'}</span>
                                        <span>{targetYears} yrs goal</span>
                                    </div>
                                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden' }}>
                                        <div style={{ width: `${progressPct}%`, height: '100%', background: isCompleted ? '#4ade80' : '#a29bfe', transition: 'width 1s' }} />
                                    </div>
                                </div>

                                <div>
                                    {isExpanded ? <ChevronUp size={20} opacity={0.5} /> : <ChevronDown size={20} opacity={0.5} />}
                                </div>
                            </div>

                            {/* Expanded Details - Maintenance Log */}
                            {isExpanded && (
                                <div style={{ padding: '0 1.5rem 1.5rem 1.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', background: 'rgba(0,0,0,0.1)' }}>
                                    
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '1.5rem 0 1rem 0' }}>
                                        <h4 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Wrench size={16} /> Service & Maintenance Log</h4>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button onClick={() => setShowAddMaintenance(goal.id)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'rgba(162,155,254,0.1)', color: '#a29bfe', border: 'none', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 'bold' }}>
                                                + Add Record
                                            </button>
                                            <button onClick={() => handleDeleteGoal(goal.id)} style={{ padding: '0.4rem 0.8rem', borderRadius: '8px', background: 'transparent', color: '#f43f5e', border: '1px solid rgba(244, 63, 94, 0.3)', cursor: 'pointer', fontSize: '0.8rem' }}>
                                                Delete Product
                                            </button>
                                        </div>
                                    </div>

                                    {showAddMaintenance === goal.id && (
                                        <form onSubmit={(e) => handleSaveMaintenance(e, goal.id)} style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'flex-end', background: 'rgba(255,255,255,0.02)', padding: '1rem', borderRadius: '12px', marginBottom: '1rem' }}>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', flex: 1 }}>
                                                <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Description</label>
                                                <input required type="text" placeholder="e.g. Battery replacement" value={maintForm.note} onChange={e => setMaintForm({...maintForm, note: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '120px' }}>
                                                <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Amount</label>
                                                <input required type="number" step="0.01" value={maintForm.amount} onChange={e => setMaintForm({...maintForm, amount: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', width: '150px' }}>
                                                <label style={{ fontSize: '0.8rem', opacity: 0.7 }}>Date</label>
                                                <input required type="date" value={maintForm.serviceDate} onChange={e => setMaintForm({...maintForm, serviceDate: e.target.value})} style={{ padding: '0.6rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(0,0,0,0.2)', color: '#fff' }} />
                                            </div>
                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                <button type="button" onClick={() => setShowAddMaintenance(null)} style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'transparent', color: '#fff', cursor: 'pointer' }}>Cancel</button>
                                                <button type="submit" style={{ padding: '0.6rem 1rem', borderRadius: '8px', border: 'none', background: '#a29bfe', color: '#fff', cursor: 'pointer' }}>Add</button>
                                            </div>
                                        </form>
                                    )}

                                    {logs.length === 0 ? (
                                        <div style={{ padding: '1rem', textAlign: 'center', opacity: 0.5, fontSize: '0.9rem' }}>No maintenance records yet.</div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                            {logs.map(log => (
                                                <div key={log.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '12px' }}>
                                                    <div>
                                                        <div style={{ fontWeight: 'bold', fontSize: '0.9rem' }}>{log.note || 'Service'}</div>
                                                        <div style={{ fontSize: '0.8rem', opacity: 0.5 }}>{new Date(log.service_date).toLocaleDateString()}</div>
                                                    </div>
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                                        <div style={{ fontWeight: 'bold', color: '#f59e0b' }}>₹{parseFloat(log.amount).toFixed(2)}</div>
                                                        <button onClick={() => handleDeleteMaintenance(log.id, goal.id)} style={{ background: 'transparent', border: 'none', color: '#f43f5e', cursor: 'pointer', opacity: 0.7 }}><Trash2 size={14} /></button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
