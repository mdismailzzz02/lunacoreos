import React, { useState, useEffect, useRef } from 'react';
import { fetchAllTasks, fetchTaskCompletions } from '../../../services/lifeosApi';
import { isDueOn, toDateString } from '../../../services/recurrenceEngine';
import { calculateStreaks, generateHeatmap } from '../../../services/derivedStateEngine';
import ActivityGrid from './ActivityGrid';
import IconRenderer from './IconRenderer';
import './DashboardOverview.css';

const CATEGORY_ICONS = {
  Health: 'tabler-barbell',
  Work: 'tabler-briefcase',
  Learning: 'tabler-book',
  Finance: 'tabler-chart-line',
  Social: 'tabler-heart',
  General: 'tabler-clipboard'
};

export default function DashboardOverview() {
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // 'week', 'month', 'year'
  const [gridRange, setGridRange] = useState(() => localStorage.getItem('luna_dashboard_range') || 'week');
  const [gridFilter, setGridFilter] = useState(() => localStorage.getItem('luna_dashboard_filter') || 'all');

  // Carousel State
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [isCarouselPaused, setIsCarouselPaused] = useState(false);
  const pauseTimeoutRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('luna_dashboard_range', gridRange);
    localStorage.setItem('luna_dashboard_filter', gridFilter);
  }, [gridRange, gridFilter]);

  useEffect(() => {
    loadData();
  }, []);

  const activeTasks = tasks.filter(t => !t.is_paused && !t.is_archived);

  // Reset carousel index if filter or active tasks length changes
  useEffect(() => {
    setCarouselIndex(0);
  }, [gridFilter, activeTasks.length]);

  // Auto-advance logic
  useEffect(() => {
    if (gridFilter !== 'all' || activeTasks.length <= 1) return;
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion || isCarouselPaused) return;

    const interval = setInterval(() => {
      setCarouselIndex(prev => (prev + 1) % activeTasks.length);
    }, 4500);

    return () => clearInterval(interval);
  }, [gridFilter, activeTasks.length, isCarouselPaused]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fetchedTasks = await fetchAllTasks();
      setTasks(fetchedTasks);
      
      const yearAgo = new Date();
      yearAgo.setDate(yearAgo.getDate() - 365);
      const comps = await fetchTaskCompletions(toDateString(yearAgo), toDateString(new Date()));
      setCompletions(comps);
    } catch (err) {
      console.error("Failed to load dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return <div className="loading-state">Loading your dashboard...</div>;
  }

  // --- Calculations ---
  const today = new Date();
  const todayStr = toDateString(today);
  const tasksDueToday = activeTasks.filter(t => isDueOn(t, today));
  const tasksCompletedToday = tasksDueToday.filter(t => 
    completions.some(c => c.task_id === t.id && c.date === todayStr)
  );

  const todaysProgress = tasksDueToday.length > 0 
    ? Math.round((tasksCompletedToday.length / tasksDueToday.length) * 100)
    : 100;

  let longestActiveStreak = 0;
  const streaksAtRisk = [];

  const domainScores = {
    Health: 0, Work: 0, Learning: 0, Finance: 0, Social: 0, General: 0
  };

  const thirtyDaysAgoStr = toDateString(new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000)));

  activeTasks.forEach(task => {
    const taskComps = completions.filter(c => c.task_id === task.id);
    const recentComps = taskComps.filter(c => c.date >= thirtyDaysAgoStr);
    const streaks = calculateStreaks(task, taskComps, today);
    
    let cat = task.category ? task.category.charAt(0).toUpperCase() + task.category.slice(1).toLowerCase() : 'General';
    if (!domainScores.hasOwnProperty(cat)) cat = 'General';
    domainScores[cat] += recentComps.length;

    task.displayIcon = (task.icon === '📝' || task.icon === '📋' || !task.icon) ? (CATEGORY_ICONS[cat] || 'tabler-clipboard') : task.icon;

    if (streaks.current > longestActiveStreak) longestActiveStreak = streaks.current;

    if (streaks.current > 1 && isDueOn(task, today)) {
      const doneToday = taskComps.some(c => c.date === todayStr);
      if (!doneToday) streaksAtRisk.push({ task, streak: streaks.current });
    }
  });

  const handleCarouselMouseEnter = () => {
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    setIsCarouselPaused(true);
  };

  const handleCarouselMouseLeave = () => {
    pauseTimeoutRef.current = setTimeout(() => {
      setIsCarouselPaused(false);
    }, 2000);
  };

  const handleCarouselNext = () => {
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    setCarouselIndex(prev => (prev + 1) % activeTasks.length);
    setIsCarouselPaused(true);
  };

  const handleCarouselPrev = () => {
    if (pauseTimeoutRef.current) clearTimeout(pauseTimeoutRef.current);
    setCarouselIndex(prev => (prev - 1 + activeTasks.length) % activeTasks.length);
    setIsCarouselPaused(true);
  };

  const renderGridSection = () => {
    const isSlideshow = gridFilter === 'all' && activeTasks.length > 1;
    const gridTasks = isSlideshow 
      ? [activeTasks[carouselIndex]] 
      : (gridFilter === 'all' ? activeTasks : activeTasks.filter(t => t.id === gridFilter));

    let content = null;

    if (gridRange === 'week') {
      content = (
        <div className="week-grid-table">
          <div className="week-grid-row header">
            <div className="grid-task-name">Task</div>
            {[6,5,4,3,2,1,0].map(daysAgo => {
              const d = new Date(today);
              d.setDate(d.getDate() - daysAgo);
              const label = d.toLocaleDateString(undefined, {weekday: 'short'}).slice(0,2);
              return <div key={daysAgo} className={`grid-day-label ${daysAgo === 0 ? 'today' : ''}`}>{label}</div>;
            })}
          </div>
          {gridTasks.map(task => (
            <div key={task.id} className="week-grid-row">
              <div className="grid-task-name">
                <span className="grid-task-icon"><IconRenderer icon={task.displayIcon} /></span> {task.title}
              </div>
              {[6,5,4,3,2,1,0].map(daysAgo => {
                const d = new Date(today);
                d.setDate(d.getDate() - daysAgo);
                const dStr = toDateString(d);
                const due = isDueOn(task, d);
                const done = completions.some(c => c.task_id === task.id && c.date === dStr);
                
                let dotClass = 'grid-dot';
                let statusText = 'Not due';
                if (done) { dotClass += ' done'; statusText = 'Done'; }
                else if (due && d < today) { dotClass += ' missed'; statusText = 'Missed'; }
                else if (!due) { dotClass += ' skipped'; }
                else { statusText = 'Future'; }
                
                const dateFormatted = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
                return (
                  <div key={daysAgo} className="grid-dot-container">
                    <div className={dotClass} title={`${dateFormatted} — ${statusText}`}></div>
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      );
    } else if (gridRange === 'month') {
      content = (
        <div className="month-grid-list">
          {gridTasks.map(task => {
            const taskComps = completions.filter(c => c.task_id === task.id);
            const heatmap = generateHeatmap(task, taskComps, 28, today);
            return (
              <div key={task.id} className="month-grid-item">
                <div className="month-grid-task-header">
                  <span className="grid-task-icon"><IconRenderer icon={task.displayIcon} /></span> {task.title}
                </div>
                <ActivityGrid heatmap={heatmap} timeWindow="month" />
              </div>
            );
          })}
        </div>
      );
    } else if (gridRange === 'year') {
      const yearMap = [];
      const iterDate = new Date(today);
      iterDate.setDate(iterDate.getDate() - 363);
      iterDate.setHours(0,0,0,0);
      
      for(let i=0; i<364; i++) {
        const dStr = toDateString(iterDate);
        let compsOnDay = 0;
        
        gridTasks.forEach(task => {
          if (completions.some(c => c.task_id === task.id && c.date === dStr)) {
            compsOnDay++;
          }
        });
        
        yearMap.push({
          date: new Date(iterDate),
          comps: compsOnDay
        });
        iterDate.setDate(iterDate.getDate() + 1);
      }

      content = (
        <div className="year-grid-container">
          {isSlideshow && gridTasks[0] && (
            <div className="month-grid-task-header">
              <span className="grid-task-icon"><IconRenderer icon={gridTasks[0].displayIcon} /></span> {gridTasks[0].title}
            </div>
          )}
          <div className="year-grid">
            {yearMap.map((day, i) => {
              let level = '';
              if (day.comps > 0) {
                // If it's a slideshow, there's only 1 task, so make it bright green
                if (isSlideshow || gridFilter !== 'all') {
                  level = 'level-4'; 
                } else {
                  if (day.comps === 1) level = 'level-1';
                  else if (day.comps === 2) level = 'level-2';
                  else if (day.comps === 3) level = 'level-3';
                  else level = 'level-4';
                }
              }
              const dateFormatted = day.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
              return (
                <div 
                  key={i} 
                  className={`year-cell ${level}`}
                  title={`${dateFormatted} — ${day.comps} completions`}
                ></div>
              );
            })}
          </div>
        </div>
      );
    }

    if (isSlideshow) {
      return (
        <div 
          className="carousel-wrapper"
          onMouseEnter={handleCarouselMouseEnter}
          onMouseLeave={handleCarouselMouseLeave}
        >
          <button className="carousel-btn prev" onClick={handleCarouselPrev}>‹</button>
          
          <div className="carousel-content-viewport">
            <div key={carouselIndex} className="carousel-slide-animation">
              {content}
            </div>
          </div>

          <button className="carousel-btn next" onClick={handleCarouselNext}>›</button>

          <div className="carousel-indicator">
            {carouselIndex + 1} of {activeTasks.length}
          </div>
        </div>
      );
    }

    return content;
  };

  return (
    <div className="dashboard-overview">
      <div className="dashboard-header">
        <h2>Dashboard Overview</h2>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <span className="metric-value">{todaysProgress}%</span>
          <span className="metric-label">Today's Progress</span>
          <div className="progress-bar">
            <div className="progress-fill" style={{ width: `${todaysProgress}%` }}></div>
          </div>
        </div>
        <div className="metric-card">
          <span className="metric-value">{longestActiveStreak} 🔥</span>
          <span className="metric-label">Best Active Streak</span>
        </div>
        <div className="metric-card">
          <span className="metric-value">{activeTasks.length}</span>
          <span className="metric-label">Active Habits</span>
        </div>
      </div>

      <div className="dashboard-sections">
        <div className="risk-section">
          {streaksAtRisk.length === 0 ? (
            <>
              <h3 className="safe-header">Streaks</h3>
              <p className="safe-state">All streaks on track.</p>
            </>
          ) : (
            <>
              <h3 className="risk-header">⚠️ Streaks at Risk</h3>
              <div className="risk-list">
                {streaksAtRisk.map(risk => (
                  <div key={risk.task.id} className="risk-item">
                    <span className="risk-icon"><IconRenderer icon={risk.task.displayIcon} /></span>
                    <div className="risk-info">
                      <span className="risk-title">{risk.task.title}</span>
                      <span className="risk-warn">A {risk.streak}-day streak is on the line!</span>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="week-grid-section">
          <div className="dashboard-range-header">
            <h3>
              Activity Grid
              {gridFilter !== 'all' && activeTasks.find(t => t.id === gridFilter) 
                ? ` — ${activeTasks.find(t => t.id === gridFilter).title}` 
                : ''}
            </h3>
            <div className="dashboard-controls-cluster">
              <select 
                className="task-filter-select"
                value={gridFilter}
                onChange={e => setGridFilter(e.target.value)}
              >
                <option value="all">All habits</option>
                {activeTasks.map(t => (
                  <option key={t.id} value={t.id}>{t.title}</option>
                ))}
              </select>
              <div className="range-selector">
                <button className={gridRange === 'week' ? 'active' : ''} onClick={() => setGridRange('week')}>Week</button>
                <button className={gridRange === 'month' ? 'active' : ''} onClick={() => setGridRange('month')}>Month</button>
                <button className={gridRange === 'year' ? 'active' : ''} onClick={() => setGridRange('year')}>Year</button>
              </div>
            </div>
          </div>
          {renderGridSection()}
        </div>

        <div className="domain-section">
          <h3>Domain Linkage (30 Days)</h3>
          <div className="domain-grid">
            {Object.entries(domainScores).map(([domain, score]) => (
              <div key={domain} className="domain-card">
                <span className="domain-name">{domain}</span>
                <span className="domain-score">{score}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
