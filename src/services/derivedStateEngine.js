import { isDueOn, toDateString } from './recurrenceEngine';

/**
 * Derived State Engine
 * Calculates streaks, adherence, and heatmaps on the fly.
 */

/**
 * Calculates current streak and longest streak for a task.
 * @param {Object} task - The task object
 * @param {Array} allCompletions - Array of ALL completions for this task
 * @param {Date} today - Current date
 */
export const calculateStreaks = (task, allCompletions, today = new Date()) => {
  if (!task || !allCompletions) return { current: 0, longest: 0 };

  const compSet = new Set(allCompletions.map(c => c.date));
  const start = new Date(task.start_date);
  start.setHours(0,0,0,0);
  
  let currentStreak = 0;
  let longestStreak = 0;
  let runningStreak = 0;

  // Start from today and go backwards to start date
  const iterDate = new Date(today);
  iterDate.setHours(0,0,0,0);

  let isCurrentStreakBroken = false;

  while (iterDate >= start) {
    const dateStr = toDateString(iterDate);
    
    if (isDueOn(task, iterDate)) {
      if (compSet.has(dateStr)) {
        runningStreak++;
        if (!isCurrentStreakBroken) {
          currentStreak++;
        }
      } else {
        // Missed a due date
        // If it's today, we don't break the current streak *yet* (grace window could go here)
        if (dateStr !== toDateString(today)) {
           isCurrentStreakBroken = true;
        }
        
        if (runningStreak > longestStreak) {
          longestStreak = runningStreak;
        }
        runningStreak = 0;
      }
    }
    
    iterDate.setDate(iterDate.getDate() - 1);
  }

  // Final check if the running streak at the start is the longest
  if (runningStreak > longestStreak) {
    longestStreak = runningStreak;
  }

  return { current: currentStreak, longest: longestStreak };
};

/**
 * Calculates adherence percentage over a window (e.g. 7 or 30 days)
 */
export const calculateAdherence = (task, allCompletions, windowDays = 30, today = new Date()) => {
  const compSet = new Set(allCompletions.map(c => c.date));
  let dueCount = 0;
  let completedCount = 0;

  const iterDate = new Date(today);
  iterDate.setHours(0,0,0,0);
  
  const start = new Date(task.start_date);
  start.setHours(0,0,0,0);

  for (let i = 0; i < windowDays; i++) {
    if (iterDate < start) break; // Don't count days before the task existed

    if (isDueOn(task, iterDate)) {
      dueCount++;
      if (compSet.has(toDateString(iterDate))) {
        completedCount++;
      }
    }
    iterDate.setDate(iterDate.getDate() - 1);
  }

  if (dueCount === 0) return 100;
  return Math.round((completedCount / dueCount) * 100);
};

/**
 * Generates a 30-day heatmap array
 * Returns array of objects: { date: 'YYYY-MM-DD', isDue: boolean, isCompleted: boolean }
 */
export const generateHeatmap = (task, allCompletions, days = 30, today = new Date()) => {
  const compSet = new Set(allCompletions.map(c => c.date));
  const heatmap = [];
  
  const iterDate = new Date(today);
  // Go back (days - 1) to start the map
  iterDate.setDate(iterDate.getDate() - (days - 1));
  iterDate.setHours(0,0,0,0);

  const start = new Date(task.start_date);
  start.setHours(0,0,0,0);

  for (let i = 0; i < days; i++) {
    const dateStr = toDateString(iterDate);
    const due = isDueOn(task, iterDate);
    const completed = compSet.has(dateStr);
    
    // Ignore days before task start date
    if (iterDate < start) {
      heatmap.push({ date: dateStr, isDue: false, isCompleted: false, isFuture: false, isPreStart: true });
    } else {
      heatmap.push({ 
        date: dateStr, 
        isDue: due, 
        isCompleted: completed,
        isFuture: iterDate > today,
        isPreStart: false
      });
    }
    
    iterDate.setDate(iterDate.getDate() + 1);
  }

  return heatmap;
};
