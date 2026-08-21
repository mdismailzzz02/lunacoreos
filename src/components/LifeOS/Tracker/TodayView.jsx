import React, { useState, useEffect } from 'react';
import { fetchAllTasks, fetchTaskCompletions, toggleTaskCompletion, fetchCompletionsForTask } from '../../../services/lifeosApi';
import { isDueOn, toDateString } from '../../../services/recurrenceEngine';
import TaskFormModal from './TaskFormModal';
import TaskDetailModal from './TaskDetailModal';
import IconRenderer from './IconRenderer';
import './TodayView.css';

export default function TodayView() {
  const [tasks, setTasks] = useState([]);
  const [completions, setCompletions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Detail Modal states
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewingTask, setViewingTask] = useState(null);
  const [viewingTaskCompletions, setViewingTaskCompletions] = useState([]);

  // Filter state
  const [selectedCategory, setSelectedCategory] = useState('All');

  // Date nav state (defaults to today)
  const [currentDateObj, setCurrentDateObj] = useState(new Date());
  const currentDateStr = toDateString(currentDateObj);
  const isToday = currentDateStr === toDateString(new Date());
  const isPast = currentDateObj < new Date(new Date().setHours(0,0,0,0));

  useEffect(() => {
    loadData();
  }, []); // Initial load

  useEffect(() => {
    // Re-fetch completions when date changes (if we were optimizing, we'd fetch a month at a time)
    loadCompletionsForDate(currentDateStr);
  }, [currentDateStr]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const fetchedTasks = await fetchAllTasks();
      setTasks(fetchedTasks);
      await loadCompletionsForDate(currentDateStr);
    } catch (err) {
      console.error("Failed to load tasks:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompletionsForDate = async (dateStr) => {
    try {
      const comps = await fetchTaskCompletions(dateStr, dateStr);
      setCompletions(comps);
    } catch (err) {
      console.error("Failed to load completions:", err);
    }
  };

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      // Don't navigate if user is typing in an input/modal
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || isModalOpen || isDetailOpen) return;
      
      if (e.key === 'ArrowLeft') {
        prevDay();
      } else if (e.key === 'ArrowRight' && !isToday) {
        nextDay();
      }
    };

    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [currentDateObj, isToday, isModalOpen, isDetailOpen]);

  const handleToggle = async (task, isCompletedLocally) => {
    const newValue = !isCompletedLocally;
    
    // Optimistic UI update
    if (newValue) {
      setCompletions([...completions, { task_id: task.id, date: currentDateStr }]);
    } else {
      setCompletions(completions.filter(c => !(c.task_id === task.id && c.date === currentDateStr)));
    }

    try {
      await toggleTaskCompletion(task.id, currentDateStr, newValue);
    } catch (err) {
      console.error("Failed to toggle completion:", err);
      // Revert on error
      await loadCompletionsForDate(currentDateStr);
    }
  };

  const openDetails = async (task) => {
    setViewingTask(task);
    setIsDetailOpen(true);
    try {
      const comps = await fetchCompletionsForTask(task.id);
      setViewingTaskCompletions(comps);
    } catch (err) {
      console.error('Failed to fetch details:', err);
    }
  };

  const handleAddNote = async (task, existingNote) => {
    const note = window.prompt("Add a note for today's completion:", existingNote || "");
    if (note === null) return; // cancelled

    // Ensure it's completed first if they are adding a note
    const isCompletedLocally = completions.some(c => c.task_id === task.id && c.date === currentDateStr);
    
    // Update local state
    setCompletions(prev => {
      const next = prev.filter(c => !(c.task_id === task.id && c.date === currentDateStr));
      next.push({ task_id: task.id, date: currentDateStr, note: note });
      return next;
    });

    try {
      await toggleTaskCompletion(task.id, currentDateStr, true, note);
    } catch (err) {
      console.error('Failed to add note:', err);
    }
  };

  const handleTaskSaved = (savedTask) => {
    setTasks(prev => {
      const idx = prev.findIndex(t => t.id === savedTask.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = savedTask;
        return next;
      }
      return [savedTask, ...prev];
    });
  };

  // Nav helpers
  const prevDay = () => {
    const d = new Date(currentDateObj);
    d.setDate(d.getDate() - 1);
    setCurrentDateObj(d);
  };

  const nextDay = () => {
    const d = new Date(currentDateObj);
    d.setDate(d.getDate() + 1);
    setCurrentDateObj(d);
  };

  const goToToday = () => {
    setCurrentDateObj(new Date());
  };

  // Filter tasks due on this date
  let dueTasks = tasks.filter(t => isDueOn(t, currentDateObj));
  if (selectedCategory !== 'All') {
    dueTasks = dueTasks.filter(t => t.category === selectedCategory);
  }

  // Get unique categories for the dropdown from ALL tasks
  const allCategories = ['All', ...new Set(tasks.map(t => t.category))];

  return (
    <div className="today-view">
      <div className="today-header">
        <div className="date-nav">
          <button onClick={prevDay}>&lt;</button>
          <h2>
            {isToday ? "Today" : currentDateObj.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
          </h2>
          <button onClick={nextDay} disabled={isToday}>&gt;</button>
          {!isToday && <button className="btn-today" onClick={goToToday}>Back to Today</button>}
        </div>
        
        <div className="header-actions" style={{ display: 'flex', gap: '12px' }}>
          <select 
            className="category-filter"
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            style={{ 
              background: 'rgba(255,255,255,0.05)', 
              color: 'white', 
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              padding: '8px 12px',
              outline: 'none'
            }}
          >
            {allCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          <button 
            className="btn-create-task"
            onClick={() => { setEditingTask(null); setIsModalOpen(true); }}
          >
            + New Task
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-state">Loading tasks...</div>
      ) : dueTasks.length === 0 ? (
        <div className="empty-state">
          <h3>No tasks due!</h3>
          <p>Enjoy your free time, or create a new habit.</p>
        </div>
      ) : (
        <div className="task-list">
          {dueTasks.map(task => {
            const isCompleted = completions.some(c => c.task_id === task.id && c.date === currentDateStr);
            const isMissed = !isCompleted && isPast;

            return (
              <div 
                key={task.id} 
                className={`task-row ${isCompleted ? 'completed' : ''} ${isMissed ? 'missed' : ''}`}
                onClick={() => handleToggle(task, isCompleted)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle(task, isCompleted);
                  }
                }}
              >
                <div className="task-row-top" style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
                  <div className="task-checkbox-wrap">
                    <input type="checkbox" checked={isCompleted} readOnly />
                    <span className="task-custom-checkbox"></span>
                  </div>
                  <div className="task-icon"><IconRenderer icon={task.icon} /></div>
                  <div className="task-info">
                    <span className="task-title" title={task.title}>{task.title}</span>
                    <span className="task-category">{task.category}</span>
                  </div>
                  {isMissed && <span className="missed-badge">Missed</span>}
                </div>
                
                <div className="task-actions">
                  <button 
                    className="btn-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      const existingComp = completions.find(c => c.task_id === task.id && c.date === currentDateStr);
                      handleAddNote(task, existingComp ? existingComp.note : "");
                    }}
                  >
                    Note
                  </button>
                  <button 
                    className="btn-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      openDetails(task);
                    }}
                  >
                    Insights
                  </button>
                  <button 
                    className="btn-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingTask(task);
                      setIsModalOpen(true);
                    }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <TaskFormModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)}
        existingTask={editingTask}
        onSave={handleTaskSaved}
      />

      <TaskDetailModal
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        task={viewingTask}
        completions={viewingTaskCompletions}
      />
    </div>
  );
}
