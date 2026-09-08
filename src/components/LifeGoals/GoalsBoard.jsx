import React, { useState, useEffect } from 'react';
import { Plus, Target, CheckCircle2, Archive, AlertCircle } from 'lucide-react';
import GoalCard from './GoalCard';
import GoalModal from './GoalModal';
import { getLifeGoals, createLifeGoal, updateLifeGoal, deleteLifeGoal } from '../../services/api';

export default function GoalsBoard() {
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active'); // active, completed, abandoned
    
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);

    useEffect(() => {
        loadGoals();
    }, []);

    const loadGoals = async () => {
        setLoading(true);
        try {
            const data = await getLifeGoals();
            setGoals(data || []);
        } catch (err) {
            console.error("Failed to load goals", err);
        } finally {
            setLoading(false);
        }
    };

    const handleSaveGoal = async (goalData) => {
        try {
            if (goalData.id) {
                await updateLifeGoal(goalData.id, goalData);
            } else {
                await createLifeGoal({ ...goalData, id: `GL-${Date.now()}` });
            }
            await loadGoals();
            setIsModalOpen(false);
            setEditingGoal(null);
        } catch (err) {
            console.error("Failed to save goal", err);
            alert("Failed to save goal. Make sure you ran the SQL schema update.");
        }
    };

    const handleUpdateStatus = async (id, updates) => {
        try {
            await updateLifeGoal(id, updates);
            await loadGoals();
        } catch (err) {
            console.error("Failed to update status", err);
        }
    };

    const handleDelete = async (id) => {
        if (!confirm("Are you sure you want to permanently delete this goal?")) return;
        try {
            await deleteLifeGoal(id);
            await loadGoals();
        } catch (err) {
            console.error("Failed to delete goal", err);
        }
    };

    const openEdit = (goal) => {
        setEditingGoal(goal);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingGoal(null);
        setIsModalOpen(true);
    };

    const filteredGoals = goals.filter(g => {
        if (filter === 'active') return g.status === 'active' || g.status === 'paused';
        return g.status === filter;
    });

    // Stats
    const activeCount = goals.filter(g => g.status === 'active').length;
    const completedCount = goals.filter(g => g.status === 'completed').length;
    
    const today = new Date();
    const overdueCount = goals.filter(g => g.status === 'active' && g.target_date && new Date(g.target_date) < today).length;

    return (
        <div className="lifegoals-left">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Target size={20} color="var(--accent)" />
                    My Life Goals
                </h2>
                <button className="btn-glow" onClick={openAdd} style={{ padding: '10px 20px', fontSize: '0.9rem' }}>
                    <Plus size={18} /> New Goal
                </button>
            </div>

            <div style={{ display: 'flex', gap: '16px', overflowX: 'auto', paddingBottom: '8px' }}>
                <div className="lg-stats-card">
                    <div className="lg-stats-label" style={{ color: 'var(--text-secondary)' }}>Active Goals</div>
                    <div className="lg-stats-value" style={{ color: 'var(--text-primary)' }}>{activeCount}</div>
                </div>
                <div className="lg-stats-card">
                    <div className="lg-stats-label" style={{ color: '#34d399' }}>Completed</div>
                    <div className="lg-stats-value" style={{ color: '#34d399' }}>{completedCount}</div>
                </div>
                {overdueCount > 0 && (
                    <div className="lg-stats-card" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)' }}>
                        <div className="lg-stats-label" style={{ color: '#ef4444' }}>Overdue</div>
                        <div className="lg-stats-value" style={{ color: '#ef4444' }}>{overdueCount}</div>
                    </div>
                )}
            </div>

            <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '12px' }}>
                <button 
                    className={`lg-filter-btn ${filter === 'active' ? 'active' : ''}`}
                    onClick={() => setFilter('active')}
                >
                    <Target size={16} /> Active & Paused
                </button>
                <button 
                    className={`lg-filter-btn ${filter === 'completed' ? 'active' : ''}`}
                    onClick={() => setFilter('completed')}
                >
                    <CheckCircle2 size={16} /> Completed
                </button>
                <button 
                    className={`lg-filter-btn ${filter === 'abandoned' ? 'active' : ''}`}
                    onClick={() => setFilter('abandoned')}
                >
                    <Archive size={16} /> Abandoned
                </button>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-secondary)' }}>Loading goals...</div>
            ) : filteredGoals.length === 0 ? (
                <div style={{ padding: '3rem 2rem', textAlign: 'center', color: 'var(--text-secondary)', background: 'rgba(255,255,255,0.02)', borderRadius: '12px', border: '1px dashed rgba(255,255,255,0.1)' }}>
                    {filter === 'active' ? "You don't have any active goals right now. Time to set some?" : `No ${filter} goals yet.`}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', paddingBottom: '2rem' }}>
                    {filteredGoals.map(g => (
                        <GoalCard 
                            key={g.id} 
                            goal={g} 
                            onEdit={openEdit}
                            onUpdateStatus={handleUpdateStatus}
                            onDelete={handleDelete}
                        />
                    ))}
                </div>
            )}

            {isModalOpen && (
                <GoalModal 
                    goal={editingGoal} 
                    onClose={() => { setIsModalOpen(false); setEditingGoal(null); }}
                    onSave={handleSaveGoal}
                />
            )}
        </div>
    );
}
