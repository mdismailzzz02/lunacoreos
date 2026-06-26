import { useDashboard } from '../../hooks/useDashboard';
import { SkeletonCard } from '../Shared/Skeleton';
import StatsRow from './StatsRow';
import TodayTodos from './TodayTodos';
import TodayHabits from './TodayHabits';
import RecentJournal from './RecentJournal';
import WeeklyStrip from './WeeklyStrip';
import InsightsToReview from './InsightsToReview';
import RecentVideos from './RecentVideos';
import ToBeViewedVideos from './ToBeViewedVideos';
import DashboardActivityGraph from './DashboardActivityGraph';
import TwitchRecent from './TwitchRecent';
import DelegationWidget from './DelegationWidget';

const DAILY_PROMPTS = [
    "What's one thing you want to focus on today?",
    "What are you grateful for this morning?",
    "What would make today great?",
    "What's on your mind right now?",
    "What's one small step you can take today?",
    "What drained you yesterday, and how will you protect your energy today?",
    "What's something you're looking forward to?",
    "What lesson from yesterday can you carry into today?",
];

function greeting(name) {
    const h = new Date().getHours();
    if (h < 12) return `Good morning, ${name} ☀️`;
    if (h < 17) return `Good afternoon, ${name} 🌤`;
    return `Good evening, ${name} 🌙`;
}

function todayDate() {
    return new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}

function dailyPrompt() {
    const day = new Date().getDate();
    return DAILY_PROMPTS[day % DAILY_PROMPTS.length];
}

export default function Dashboard({ onNavigate }) {
    const { stats, loading } = useDashboard();

    if (loading) return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[...Array(4)].map((_, i) => <SkeletonCard key={i} />)}
        </div>
    );

    const cfg = stats?.config || {};

    return (
        <div className="fade-in dashboard-container">
            {/* Greeting */}
            <div className="dashboard-header">
                <img src="/profile.jpg" alt="Profile" className="dashboard-avatar" />
                <div>
                    <div className="greeting-h1">{greeting(cfg.user_name || 'Friend')}</div>
                    <div className="greeting-date">{todayDate()}</div>
                    <div className="daily-prompt">"{dailyPrompt()}"</div>
                </div>
            </div>

            {/* Stats */}
            <StatsRow stats={stats} onNavigate={onNavigate} />

            {/* Rollover banner */}
            {(stats?.today_todos || []).some(t => parseInt(t.rollover_count) > 0) && (
                <div className="rollover-banner">
                    ↩ Tasks carried over from previous days are in your list below
                </div>
            )}

            {/* Todos + Habits */}
            <div className="two-col">
                <TodayTodos todos={stats?.today_todos || []} onRefresh={() => { }} onNavigate={onNavigate} />
                <TodayHabits habits={stats?.active_habits || []} logs={stats?.today_habit_logs || []} />
            </div>

            {/* Recent Journal */}
            <RecentJournal entry={stats?.latest_entry} onNavigate={onNavigate} />

            {/* Insights to review */}
            <InsightsToReview insights={stats?.overdue_insights || []} onNavigate={onNavigate} />



            {/* Delegation */}
            <DelegationWidget onNavigate={onNavigate} />

            {/* Recent Videos from subscribed channels */}
            <RecentVideos onNavigate={onNavigate} />

            {/* To be viewed (Saved library) */}
            <ToBeViewedVideos onNavigate={onNavigate} />

            {/* Weekly Strip + Activity Summary */}
            <div className="dashboard-footer-section">
                <div className="dashboard-footer-layout">
                    <div>
                        <div className="section-title">This Week</div>
                        <WeeklyStrip days={stats?.weekly_strip || []} />
                    </div>
                    <div className="dashboard-activity-side">
                        <DashboardActivityGraph
                            title="Streak activity"
                            activity={stats?.streak_activity || []}
                            color="#ff7675"
                        />
                        <DashboardActivityGraph
                            title="Mind Activity"
                            activity={stats?.thought_activity || []}
                            color="var(--accent)"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
