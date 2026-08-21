import React, { useState, useEffect } from 'react';
import { calculateStreaks, calculateAdherence, generateHeatmap } from '../../../services/derivedStateEngine';
import ActivityGrid from './ActivityGrid';
import IconRenderer from './IconRenderer';
import './TaskDetailModal.css';

export default function TaskDetailModal({ isOpen, onClose, task, completions }) {
  const [timeWindow, setTimeWindow] = useState('month'); // 'week', 'month', 'all'
  const [streaks, setStreaks] = useState({ current: 0, longest: 0 });
  const [adherence, setAdherence] = useState(100);
  const [heatmap, setHeatmap] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  const loadInsights = () => {
    if (!task) return;
    try {
      const safeCompletions = Array.isArray(completions) ? completions : [];
      const s = calculateStreaks(task, safeCompletions);
      setStreaks(s);
      
      const today = new Date();
      today.setHours(0,0,0,0);
      const start = new Date(task.start_date);
      start.setHours(0,0,0,0);
      
      let days = 28;
      if (timeWindow === 'week') days = 7;
      if (timeWindow === 'all') {
        const diffDays = Math.floor((today - start) / (1000 * 60 * 60 * 24)) + 1;
        // Make it at least 7 days, and round up to a multiple of 7 to keep the grid aligned
        days = Math.max(7, Math.ceil(diffDays / 7) * 7);
        // Cap at 365 days to prevent massive grids killing the DOM
        if (days > 364) days = 364; 
      }

      const a = calculateAdherence(task, safeCompletions, days);
      setAdherence(a);

      const map = generateHeatmap(task, safeCompletions, days);
      setHeatmap(map);
      setError(null);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to calculate insights.");
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadInsights();
    }
  }, [isOpen, task, completions, timeWindow]);

  if (!isOpen) return null;

  const hasCompletions = completions && completions.length > 0;

  return (
    <div className="task-detail-overlay" onClick={onClose}>
      <div className="task-detail-content" onClick={e => e.stopPropagation()}>
        
        {!task ? (
          <div className="insights-error-state">
            <h3>Task data missing</h3>
            <button className="btn-retry" onClick={onClose}>Close</button>
          </div>
        ) : error ? (
          <div className="insights-error-state">
            <h3>Couldn't load insights</h3>
            <p>{error}</p>
            <button className="btn-retry" onClick={loadInsights}>Retry</button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="task-detail-header">
              <div className="detail-title-group">
                <span className="detail-icon"><IconRenderer icon={task.icon} /></span>
                <div className="detail-title-text">
                  <h3>{task.title}</h3>
                  <span className="detail-category">{task.category}</span>
                </div>
              </div>
              <button className="btn-close-modal" onClick={onClose}>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
              </button>
            </div>

            {/* Window Selector */}
            <div className="window-selector-container">
              <div className="window-selector">
                <button className={timeWindow === 'week' ? 'active' : ''} onClick={() => setTimeWindow('week')}>Week</button>
                <button className={timeWindow === 'month' ? 'active' : ''} onClick={() => setTimeWindow('month')}>Month</button>
                <button className={timeWindow === 'all' ? 'active' : ''} onClick={() => setTimeWindow('all')}>All-time</button>
              </div>
            </div>

            {/* Stat Row */}
            <div className="metrics-grid">
              <div className="metric-card">
                <span className="metric-value current-streak-val">
                  {streaks.current} 
                  <IconRenderer icon="tabler-flame" className="fire-svg" />
                </span>
                <span className="metric-label">Current streak</span>
              </div>
              <div className="metric-card">
                <span className="metric-value">{streaks.longest}</span>
                <span className="metric-label">Longest streak</span>
              </div>
              <div className="metric-card">
                <span className="metric-value">{adherence}%</span>
                <span className="metric-label">Adherence</span>
              </div>
            </div>

            {/* Activity Grid */}
            <ActivityGrid heatmap={heatmap} timeWindow={timeWindow} />

            {/* Footer */}
            <div className="task-detail-footer">
              Started {task.start_date ? new Date(task.start_date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' }) : 'Unknown'}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
