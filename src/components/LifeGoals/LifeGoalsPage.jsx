import React, { useState, useEffect } from 'react';
import { Target, Brain, History, Plus, CheckCircle2, Archive, Flame, AlertCircle } from 'lucide-react';
import GoalCard from './GoalCard';
import GoalModal from './GoalModal';
import DecisionAnalyzer from './DecisionAnalyzer';
import { getLifeGoals, createLifeGoal, updateLifeGoal, deleteLifeGoal, getDecisionAnalyses } from '../../services/api';
import './LifeGoalsPage.css';

const TABS = [
    { id: 'goals', label: 'My Goals', icon: Target },
    { id: 'analyzer', label: 'AI Analyzer', icon: Brain },
    { id: 'history', label: 'Past Decisions', icon: History },
];

export default function LifeGoalsPage() {
    const [activeTab, setActiveTab] = useState('goals');
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('active');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [history, setHistory] = useState([]);

    useEffect(() => {
        loadGoals();
        loadHistory();
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

    const loadHistory = async () => {
        try {
            const data = await getDecisionAnalyses();
            setHistory(data || []);
        } catch (err) {
            console.error("Failed to load history", err);
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

    // Stats
    const activeCount = goals.filter(g => g.status === 'active').length;
    const completedCount = goals.filter(g => g.status === 'completed').length;
    const pausedCount = goals.filter(g => g.status === 'paused').length;
    const today = new Date();
    const overdueCount = goals.filter(g => g.status === 'active' && g.target_date && new Date(g.target_date) < today).length;

    const filteredGoals = goals.filter(g => {
        if (filter === 'active') return g.status === 'active' || g.status === 'paused';
        return g.status === filter;
    });

    const openEdit = (goal) => {
        setEditingGoal(goal);
        setIsModalOpen(true);
    };

    const openAdd = () => {
        setEditingGoal(null);
        setIsModalOpen(true);
    };

    return (
        <div className="lg-root fade-in apple-page-loaded">
            {/* ─── Header ─── */}
            <div className="lg-header">
                <div className="lg-header-left">
                    <div className="lg-header-icon">
                        <Flame size={22} />
                    </div>
                    <h1>
                        Life Goals
                        <span>Track, analyze, decide with clarity</span>
                    </h1>
                </div>
                {activeTab === 'goals' && (
                    <button className="btn-glow" onClick={openAdd} style={{ padding: '10px 22px', fontSize: '0.88rem' }}>
                        <Plus size={18} /> New Goal
                    </button>
                )}
            </div>

            {/* ─── Tabs ─── */}
            <div className="lg-tabs">
                {TABS.map(tab => {
                    const Icon = tab.icon;
                    let count = null;
                    if (tab.id === 'goals') count = activeCount;
                    if (tab.id === 'history') count = history.length;
                    return (
                        <button
                            key={tab.id}
                            className={`lg-tab ${activeTab === tab.id ? 'active' : ''}`}
                            onClick={() => setActiveTab(tab.id)}
                        >
                            <Icon size={17} />
                            {tab.label}
                            {count !== null && <span className="tab-count">{count}</span>}
                        </button>
                    );
                })}
            </div>

            {/* ─── Tab Content ─── */}
            <div className="lg-tab-content">
                {/* ════ GOALS TAB ════ */}
                <div style={{ display: activeTab === 'goals' ? 'block' : 'none' }}>
                    {/* Stats */}
                    <div className="lg-stats-strip">
                        <div className="lg-stat-card accent">
                            <div className="lg-stat-label">Active</div>
                            <div className="lg-stat-value accent">{activeCount}</div>
                        </div>
                        <div className="lg-stat-card green">
                            <div className="lg-stat-label">Completed</div>
                            <div className="lg-stat-value green">{completedCount}</div>
                        </div>
                        <div className="lg-stat-card yellow">
                            <div className="lg-stat-label">Paused</div>
                            <div className="lg-stat-value yellow">{pausedCount}</div>
                        </div>
                        {overdueCount > 0 && (
                            <div className="lg-stat-card red">
                                <div className="lg-stat-label">Overdue</div>
                                <div className="lg-stat-value red">{overdueCount}</div>
                            </div>
                        )}
                    </div>

                    {/* Filters */}
                    <div className="lg-filters">
                        {[
                            { id: 'active', label: 'Active & Paused', icon: Target },
                            { id: 'completed', label: 'Completed', icon: CheckCircle2 },
                            { id: 'abandoned', label: 'Abandoned', icon: Archive },
                        ].map(f => {
                            const FIcon = f.icon;
                            return (
                                <button
                                    key={f.id}
                                    className={`lg-pill ${filter === f.id ? 'active' : ''}`}
                                    onClick={() => setFilter(f.id)}
                                >
                                    <FIcon size={15} /> {f.label}
                                </button>
                            );
                        })}
                    </div>

                    {/* Goals List */}
                    {loading ? (
                        <div className="lg-loading">
                            <div className="lg-skeleton" />
                            <div className="lg-skeleton" />
                            <div className="lg-skeleton" />
                        </div>
                    ) : filteredGoals.length === 0 ? (
                        <div className="lg-empty-state">
                            <div className="lg-empty-icon"><Target size={28} /></div>
                            <p>{filter === 'active' ? "No active goals yet. Set your first goal and start tracking your journey." : `No ${filter} goals to show.`}</p>
                            {filter === 'active' && (
                                <button className="btn-glow" onClick={openAdd} style={{ padding: '10px 22px', fontSize: '0.88rem' }}>
                                    <Plus size={18} /> Create First Goal
                                </button>
                            )}
                        </div>
                    ) : (
                        <div className="lg-goals-list">
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
                </div>

                {/* ════ AI ANALYZER TAB ════ */}
                <div style={{ display: activeTab === 'analyzer' ? 'block' : 'none' }}>
                    <DecisionAnalyzer onHistoryUpdate={loadHistory} />
                </div>

                {/* ════ HISTORY TAB ════ */}
                <div style={{ display: activeTab === 'history' ? 'block' : 'none' }}>
                    <div className="lg-history-list">
                        {history.length === 0 ? (
                            <div className="lg-empty-state">
                                <div className="lg-empty-icon"><History size={28} /></div>
                                <p>No past decisions analyzed yet. Use the AI Analyzer tab to evaluate a new activity.</p>
                            </div>
                        ) : (
                            history.map(h => (
                                <div
                                    key={h.id}
                                    className="lg-history-item"
                                    onClick={() => {
                                        setActiveTab('analyzer');
                                        // DecisionAnalyzer will pick it up via prop
                                        window.__lgLoadAnalysis = h;
                                    }}
                                >
                                    <div>
                                        <div className="h-name">{h.activity_name}</div>
                                        <div className="h-date">{new Date(h.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}</div>
                                    </div>
                                    <div className={`goal-badge ${h.verdict}`} style={{ fontSize: '0.72rem' }}>
                                        {h.verdict}
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            </div>

            {/* ─── Goal Modal ─── */}
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
