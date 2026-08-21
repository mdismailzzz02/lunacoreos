import React, { useState } from 'react';
import DashboardOverview from './Tracker/DashboardOverview';
import TodayView from './Tracker/TodayView';
import DailyLogPage from './DailyLog/DailyLogPage';
import WeeklyReviewPage from './WeeklyReview/WeeklyReviewPage';
import MonthlyStrategyPage from './MonthlyStrategy/MonthlyStrategyPage';
import GoalsPage from './Goals/GoalsPage';
import DecisionEnginePage from './DecisionEngine/DecisionEnginePage';
import ToolsPage from './Tools/ToolsPage';
import DataLogPage from './DataLog/DataLogPage';
import './LifeOS.css';

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'today',     label: '✅ Today' },
  { id: 'daily',     label: '☀️ Daily Log' },
  { id: 'weekly',    label: '📅 Weekly Review' },
  { id: 'monthly',   label: '🗓️ Monthly Strategy' },
  { id: 'goals',     label: '🎯 Goals / OKRs' },
  { id: 'decisions', label: '🧠 Decision Engine' },
  { id: 'tools',     label: '🔧 Tools Arsenal' },
  { id: 'data',      label: '🗃️ Data Log' },
];

export default function LifeOSPage() {
  const [activeTab, setActiveTab] = useState(
    () => localStorage.getItem('luna_lifeos_tab') || 'dashboard'
  );

  const switchTab = (id) => {
    setActiveTab(id);
    localStorage.setItem('luna_lifeos_tab', id);
  };

  return (
    <div className="lifeos-root">
      <nav className="los-tabs-bar">
        {TABS.map(tab => (
          <button
            key={tab.id}
            className={`los-tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => switchTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div className="los-panel">
        {activeTab === 'dashboard' && <DashboardOverview />}
        {activeTab === 'today'     && <TodayView />}
        {activeTab === 'daily'     && <DailyLogPage />}
        {activeTab === 'weekly'    && <WeeklyReviewPage />}
        {activeTab === 'monthly'   && <MonthlyStrategyPage />}
        {activeTab === 'goals'     && <GoalsPage />}
        {activeTab === 'decisions' && <DecisionEnginePage />}
        {activeTab === 'tools'     && <ToolsPage />}
        {activeTab === 'data'      && <DataLogPage />}
      </div>
    </div>
  );
}
