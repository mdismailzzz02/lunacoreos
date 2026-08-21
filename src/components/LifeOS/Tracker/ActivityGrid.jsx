import React from 'react';
import './TaskDetailModal.css'; // Reusing the same grid styles

export default function ActivityGrid({ heatmap, timeWindow }) {
  if (!heatmap || heatmap.length === 0) return null;

  // If there's literally 0 completions ever, we show empty state if not all-time
  const hasCompletions = heatmap.some(d => d.isCompleted);

  return (
    <div className="heatmap-section">
      <div className="activity-heatmap-grid">
        {!hasCompletions && timeWindow !== 'all' ? (
          <div className="heatmap-empty-state">
            <p>No activity yet — mark this done to start your streak.</p>
          </div>
        ) : (
          heatmap.map((day, i) => {
            let classes = 'heatmap-cell';
            let statusText = 'Not due';
            
            if (day.isPreStart) {
              classes += ' pre-start';
              statusText = 'Not started yet';
            } else if (day.isFuture) {
              classes += ' future';
              statusText = 'Future';
            } else if (!day.isDue) {
              classes += ' not-due';
            } else if (day.isCompleted) {
              classes += ' completed';
              statusText = 'Done';
            } else {
              classes += ' missed';
              statusText = 'Missed';
            }
            
            const dateFormatted = new Date(day.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
            
            return (
              <div 
                key={i} 
                className={classes}
                title={`${dateFormatted} — ${statusText}`}
              ></div>
            );
          })
        )}
      </div>
      <div className="heatmap-legend">
        <div className="legend-item"><div className="heatmap-cell completed"></div> Done</div>
        <div className="legend-item"><div className="heatmap-cell missed"></div> Missed</div>
        <div className="legend-item"><div className="heatmap-cell not-due"></div> Not due</div>
        <div className="legend-item"><div className="heatmap-cell pre-start"></div> Before start</div>
      </div>
    </div>
  );
}
