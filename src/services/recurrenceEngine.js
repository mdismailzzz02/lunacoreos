/**
 * Recurrence Engine
 * Pure functions to determine if a task is due on a specific date based on its recurrence rule.
 */

/**
 * Normalizes a date to YYYY-MM-DD string for comparison to ignore timezones/time.
 */
export const toDateString = (dateObj) => {
  const d = new Date(dateObj);
  // Adjust for timezone offset so we get the correct local date string
  const offset = d.getTimezoneOffset() * 60000; 
  return new Date(d.getTime() - offset).toISOString().split('T')[0];
};

/**
 * Determines if a task is due on a given targetDate.
 * 
 * @param {Object} task - The task object from the DB
 * @param {String|Date} targetDate - The date to check
 * @returns {Boolean}
 */
export const isDueOn = (task, targetDate) => {
  if (task.is_paused || task.is_archived) return false;

  const target = new Date(targetDate);
  const start = new Date(task.start_date);

  // Strip times for accurate day comparisons
  target.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);

  // If the target date is before the task even started, it's not due
  if (target < start) return false;

  const rule = typeof task.recurrence_rule === 'string' 
    ? JSON.parse(task.recurrence_rule) 
    : task.recurrence_rule;

  if (!rule || !rule.type) return false;

  switch (rule.type) {
    case 'daily':
      return true;

    case 'weekly':
      // rule.days = [0, 1, 2, 3, 4, 5, 6] (0 = Sunday, 1 = Monday...)
      if (Array.isArray(rule.days)) {
        return rule.days.includes(target.getDay());
      }
      return false;

    case 'every_n_days':
      // e.g. every 3 days. We calculate days elapsed since start_date.
      if (rule.interval > 0) {
        const diffTime = Math.abs(target - start);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        return diffDays % rule.interval === 0;
      }
      return false;

    case 'monthly_date':
      // e.g. 15th of every month
      if (rule.date > 0 && rule.date <= 31) {
        // Handle edge case where target month has fewer days than rule.date (e.g. Feb 30)
        // For now, strict matching:
        return target.getDate() === rule.date;
      }
      return false;

    case 'monthly_nth_weekday':
      // e.g. 2nd Tuesday of the month
      // rule.weekNumber (1-5, or -1 for last), rule.dayOfWeek (0-6)
      if (rule.dayOfWeek === target.getDay()) {
        const d = target.getDate();
        const weekNum = Math.ceil(d / 7);
        if (rule.weekNumber === weekNum) return true;
        
        // Handle last week of month logic if weekNumber is -1
        if (rule.weekNumber === -1) {
          const nextWeek = new Date(target);
          nextWeek.setDate(target.getDate() + 7);
          if (nextWeek.getMonth() !== target.getMonth()) {
            return true;
          }
        }
      }
      return false;

    default:
      return false;
  }
};
