import React, { useState, useEffect } from 'react';
import { lifeosSupabase } from '../../services/lifeosSupabaseClient';
import './HabitTracker.css';

export default function HabitTracker() {
  const [habits, setHabits] = useState([
    { id: '1', name: 'Work on Project LunaCore', type: 'project' },
    { id: '2', name: 'Read 10 Pages', type: 'habit' },
    { id: '3', name: 'Exercise', type: 'habit' }
  ]);
  const [todayLog, setTodayLog] = useState({});
  const [newHabit, setNewHabit] = useState('');
  const [loading, setLoading] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    // In the future, we will load this from the Supabase `habit_tracker` table
    const saved = localStorage.getItem(`lifeos_habits_${todayStr}`);
    if (saved) {
      setTodayLog(JSON.parse(saved));
    }
  }, [todayStr]);

  const toggleHabit = (id) => {
    const newState = { ...todayLog, [id]: !todayLog[id] };
    setTodayLog(newState);
    // Temporary offline save until SQL table is created
    localStorage.setItem(`lifeos_habits_${todayStr}`, JSON.stringify(newState));
  };

  const addHabit = (e) => {
    e.preventDefault();
    if (!newHabit.trim()) return;
    const newH = { id: Date.now().toString(), name: newHabit, type: 'project' };
    setHabits([...habits, newH]);
    setNewHabit('');
  };

  const deleteHabit = (id) => {
    setHabits(habits.filter(h => h.id !== id));
  };

  return (
    <div className="habit-tracker-container">
      <div className="tracker-header">
        <h2>Daily Project Tracker</h2>
        <span className="date-badge">{new Date().toDateString()}</span>
      </div>

      <div className="tracker-list">
        {habits.length === 0 ? (
          <p className="empty-state">No projects tracked yet. Add one below!</p>
        ) : (
          habits.map(habit => (
            <div 
              key={habit.id} 
              className={`habit-row ${todayLog[habit.id] ? 'completed' : ''}`}
              onClick={() => toggleHabit(habit.id)}
            >
              <div className="checkbox-wrap">
                <input 
                  type="checkbox" 
                  checked={!!todayLog[habit.id]}
                  readOnly
                />
                <span className="custom-checkbox"></span>
              </div>
              <span className="habit-name">{habit.name}</span>
              <button 
                className="delete-btn"
                onClick={(e) => { e.stopPropagation(); deleteHabit(habit.id); }}
              >✕</button>
            </div>
          ))
        )}
      </div>

      <form className="add-habit-form" onSubmit={addHabit}>
        <input 
          type="text" 
          placeholder="e.g. Work on AI features..." 
          value={newHabit}
          onChange={(e) => setNewHabit(e.target.value)}
        />
        <button type="submit">Add Tracker</button>
      </form>
    </div>
  );
}
