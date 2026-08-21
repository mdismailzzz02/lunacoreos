import { lifeosSupabase } from './lifeosSupabaseClient';

/**
 * Task Management API (LifeOS)
 */

export const fetchAllTasks = async () => {
  const { data, error } = await lifeosSupabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (error) throw error;
  return data;
};

export const fetchTaskCompletions = async (startDate, endDate) => {
  let query = lifeosSupabase.from('task_completions').select('*');
  
  if (startDate) query = query.gte('date', startDate);
  if (endDate) query = query.lte('date', endDate);
  
  const { data, error } = await query;
  if (error) throw error;
  return data;
};

export const fetchCompletionsForTask = async (taskId) => {
  const { data, error } = await lifeosSupabase
    .from('task_completions')
    .select('*')
    .eq('task_id', taskId);
    
  if (error) throw error;
  return data;
};

export const createTask = async (taskData) => {
  const { data, error } = await lifeosSupabase
    .from('tasks')
    .insert([taskData])
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const updateTask = async (taskId, updates) => {
  const { data, error } = await lifeosSupabase
    .from('tasks')
    .update(updates)
    .eq('id', taskId)
    .select()
    .single();
    
  if (error) throw error;
  return data;
};

export const toggleTaskCompletion = async (taskId, dateStr, isCompleted, note = null) => {
  if (isCompleted) {
    // Insert completion
    const { data, error } = await lifeosSupabase
      .from('task_completions')
      .upsert([{ task_id: taskId, date: dateStr, note }], { onConflict: 'task_id,date' })
      .select()
      .single();
    if (error) throw error;
    return data;
  } else {
    // Remove completion
    const { error } = await lifeosSupabase
      .from('task_completions')
      .delete()
      .match({ task_id: taskId, date: dateStr });
    if (error) throw error;
    return null;
  }
};
