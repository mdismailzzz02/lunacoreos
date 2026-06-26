import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';

export function useHabits() {
    const [habits, setHabits] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    const load = useCallback(async () => {
        try {
            const data = await api.getHabits();
            setHabits(data || []);
        } catch (e) {
            addToast('Failed to load habits', 'error');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const create = async (params) => {
        try {
            const h = await api.createHabit(params);
            setHabits(prev => [...prev, h]);
            addToast('Habit created 🔥', 'success');
            return h;
        } catch (e) {
            addToast('Failed to create habit', 'error');
            throw e;
        }
    };

    const update = async (params) => {
        try {
            await api.updateHabit(params);
            setHabits(prev => prev.map(h => h.habit_id === params.habit_id ? { ...h, ...params } : h));
        } catch (e) { addToast('Failed to update habit', 'error'); }
    };

    const archive = async (habit_id) => {
        try {
            await api.archiveHabit(habit_id);
            setHabits(prev => prev.filter(h => h.habit_id !== habit_id));
            addToast('Habit archived', 'info');
        } catch (e) { addToast('Failed to archive habit', 'error'); }
    };

    const log = async (params) => {
        try {
            const res = await api.logHabit(params);
            // refresh to get updated streak
            load();
            addToast('Habit logged! 🔥', 'success');
            return res;
        } catch (e) {
            addToast('Failed to log habit', 'error');
            throw e;
        }
    };

    const getLogs = (habit_id, params) => api.getHabitLogs({ habit_id, ...params });

    // Today's habits (active only)
    const today = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayHabits = habits.filter(h => {
        if (h.frequency === 'daily') return true;
        if (h.frequency === 'weekdays') return today.getDay() >= 1 && today.getDay() <= 5;
        if (h.frequency === 'weekends') return today.getDay() === 0 || today.getDay() === 6;
        if (h.frequency === 'custom') {
            const days = String(h.custom_days).split(',').map(s => s.trim());
            return days.includes(dayNames[today.getDay()]);
        }
        return true;
    });

    return { habits, todayHabits, loading, create, update, archive, log, getLogs, refresh: load };
}
