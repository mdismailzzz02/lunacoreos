import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom';
import { createTask, updateTask } from '../../../services/lifeosApi';
import IconPicker from './IconPicker';
import './TaskFormModal.css';

export default function TaskFormModal({ isOpen, onClose, existingTask, onSave }) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('General');
  const [icon, setIcon] = useState('tabler-clipboard');
  const [hasManuallySetIcon, setHasManuallySetIcon] = useState(false);
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [recurrenceType, setRecurrenceType] = useState('daily');
  
  // Weekly states
  const [weeklyDays, setWeeklyDays] = useState([1, 2, 3, 4, 5]); // Mon-Fri default
  
  // Every N Days states
  const [interval, setIntervalDays] = useState(3);
  
  // Monthly states
  const [monthlyType, setMonthlyType] = useState('date'); // 'date' or 'nth_weekday'
  const [monthlyDate, setMonthlyDate] = useState(1);
  const [monthlyWeekNumber, setMonthlyWeekNumber] = useState(1);
  const [monthlyDayOfWeek, setMonthlyDayOfWeek] = useState(1);

  // Status states
  const [isPaused, setIsPaused] = useState(false);
  const [isArchived, setIsArchived] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (existingTask) {
      setTitle(existingTask.title);
      setCategory(existingTask.category);
      setIcon(existingTask.icon);
      setStartDate(existingTask.start_date);
      
      const rule = typeof existingTask.recurrence_rule === 'string' 
        ? JSON.parse(existingTask.recurrence_rule) 
        : existingTask.recurrence_rule;
        
      setRecurrenceType(rule.type);
      
      if (rule.type === 'weekly') setWeeklyDays(rule.days || []);
      if (rule.type === 'every_n_days') setIntervalDays(rule.interval || 3);
      if (rule.type === 'monthly_date') setMonthlyDate(rule.date || 1);
      if (rule.type === 'monthly_nth_weekday') {
        setMonthlyType('nth_weekday');
        setMonthlyWeekNumber(rule.weekNumber || 1);
        setMonthlyDayOfWeek(rule.dayOfWeek || 1);
      }
      
      setIsPaused(existingTask.is_paused || false);
      setIsArchived(existingTask.is_archived || false);
    } else {
      // Reset defaults
      setTitle('');
      setCategory('General');
      setIcon('tabler-clipboard');
      setHasManuallySetIcon(false);
      setStartDate(new Date().toISOString().split('T')[0]);
      setRecurrenceType('daily');
      setIsPaused(false);
      setIsArchived(false);
    }
  }, [existingTask, isOpen]);

  const CATEGORY_DEFAULT_ICONS = {
    Health: 'tabler-barbell',
    Work: 'tabler-briefcase',
    Learning: 'tabler-book',
    Finance: 'tabler-chart-line',
    Social: 'tabler-heart',
    General: 'tabler-clipboard'
  };

  const handleCategoryChange = (e) => {
    const newCat = e.target.value;
    setCategory(newCat);
    if (!hasManuallySetIcon && !existingTask) {
      setIcon(CATEGORY_DEFAULT_ICONS[newCat] || 'tabler-clipboard');
    }
  };

  const handleWeeklyToggle = (dayIndex) => {
    if (weeklyDays.includes(dayIndex)) {
      setWeeklyDays(weeklyDays.filter(d => d !== dayIndex));
    } else {
      setWeeklyDays([...weeklyDays, dayIndex].sort());
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    setIsSubmitting(true);
    setError(null);

    let recurrence_rule = { type: recurrenceType };
    
    if (recurrenceType === 'weekly') {
      if (weeklyDays.length === 0) {
        setError('Please select at least one day for weekly recurrence.');
        setIsSubmitting(false);
        return;
      }
      recurrence_rule.days = weeklyDays;
    } else if (recurrenceType === 'every_n_days') {
      recurrence_rule.interval = parseInt(interval, 10);
    } else if (recurrenceType === 'monthly_date') {
      recurrence_rule.date = parseInt(monthlyDate, 10);
    } else if (recurrenceType === 'monthly_nth_weekday') {
      recurrence_rule.weekNumber = parseInt(monthlyWeekNumber, 10);
      recurrence_rule.dayOfWeek = parseInt(monthlyDayOfWeek, 10);
    }

    const taskData = {
      title,
      category,
      icon,
      start_date: startDate,
      recurrence_rule,
      is_paused: isPaused,
      is_archived: isArchived
    };

    try {
      if (existingTask) {
        const updated = await updateTask(existingTask.id, taskData);
        onSave(updated);
      } else {
        const created = await createTask(taskData);
        onSave(created);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setError('Failed to save task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return ReactDOM.createPortal(
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{existingTask ? 'Edit Task' : 'Create New Task'}</h2>
          <button className="close-btn" onClick={onClose}>✕</button>
        </div>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit} className="task-form">
          <div className="form-row flex-row">
            <div className="form-group icon-group">
              <label>Icon</label>
              <IconPicker 
                value={icon} 
                onChange={(val) => {
                  setIcon(val);
                  setHasManuallySetIcon(true);
                }} 
              />
            </div>
            <div className="form-group flex-1">
              <label>Task Title</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} required />
            </div>
          </div>

          <div className="form-row flex-row">
            <div className="form-group flex-1">
              <label>Category</label>
              <select value={category} onChange={handleCategoryChange}>
                <option value="General">General</option>
                <option value="Health">Health</option>
                <option value="Work">Work</option>
                <option value="Learning">Learning</option>
                <option value="Finance">Finance</option>
                <option value="Social">Social</option>
              </select>
            </div>
            <div className="form-group flex-1">
              <label>Start Date (Backdate allowed)</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} required />
            </div>
          </div>

          <div className="divider"></div>

          <div className="form-group">
            <label className="accent-label">Recurrence Rule</label>
            <select value={recurrenceType} onChange={e => setRecurrenceType(e.target.value)}>
              <option value="daily">Every Day</option>
              <option value="weekdays">Specific Weekdays</option>
              <option value="every_n_days">Every N Days</option>
              <option value="monthly_date">Monthly (Specific Date)</option>
              <option value="monthly_nth_weekday">Monthly (Nth Weekday)</option>
            </select>
          </div>

          {recurrenceType === 'weekdays' && (
            <div className="form-group">
              <label>Select Days</label>
              <div className="weekday-selector">
                {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d, i) => (
                  <label key={i} className={`weekday-pill ${weeklyDays.includes(i) ? 'active' : ''}`}>
                    <input 
                      type="checkbox" 
                      checked={weeklyDays.includes(i)}
                      onChange={(e) => {
                        if (e.target.checked) setWeeklyDays([...weeklyDays, i]);
                        else setWeeklyDays(weeklyDays.filter(w => w !== i));
                      }}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
          )}

          {recurrenceType === 'every_n_days' && (
            <div className="form-row flex-row align-center">
              <span>Every</span>
              <input type="number" className="small-input" min="2" max="365" value={interval} onChange={e => setIntervalDays(parseInt(e.target.value))} />
              <span>Days</span>
            </div>
          )}

          {recurrenceType === 'monthly_date' && (
            <div className="form-row flex-row align-center">
              <span>On the</span>
              <input type="number" className="small-input" min="1" max="31" value={monthlyDate} onChange={e => setMonthlyDate(parseInt(e.target.value))} />
              <span>of the month</span>
            </div>
          )}

          {recurrenceType === 'monthly_nth_weekday' && (
            <div className="form-row flex-row align-center">
              <span>On the</span>
              <select className="small-select" value={monthlyWeekNumber} onChange={e => setMonthlyWeekNumber(parseInt(e.target.value))}>
                <option value={1}>1st</option>
                <option value={2}>2nd</option>
                <option value={3}>3rd</option>
                <option value={4}>4th</option>
                <option value={-1}>Last</option>
              </select>
              <select className="small-select" value={monthlyDayOfWeek} onChange={e => setMonthlyDayOfWeek(parseInt(e.target.value))}>
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
                <option value={2}>Tuesday</option>
                <option value={3}>Wednesday</option>
                <option value={4}>Thursday</option>
                <option value={5}>Friday</option>
                <option value={6}>Saturday</option>
              </select>
              <span>of the month</span>
            </div>
          )}

          {existingTask && (
            <>
              <div className="divider"></div>
              <h4>Status</h4>
              <div className="form-row">
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: isPaused ? '#ffb830' : '#fff' }}>
                  <input type="checkbox" checked={isPaused} onChange={e => setIsPaused(e.target.checked)} />
                  Pause this habit (stops it from appearing today, keeps history)
                </label>
              </div>
              <div className="form-row">
                <label className="checkbox-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', color: isArchived ? '#ff4444' : '#fff' }}>
                  <input type="checkbox" checked={isArchived} onChange={e => setIsArchived(e.target.checked)} />
                  Archive this habit (soft delete, hides from active lists entirely)
                </label>
              </div>
            </>
          )}

          <div className="modal-actions">
            <button type="button" className="btn-cancel" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-save" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Task'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}
