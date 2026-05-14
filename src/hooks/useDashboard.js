import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';

export function useDashboard() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    const load = useCallback(async () => {
        try {
            setLoading(true);
            const data = await api.getDashboardStats();
            setStats(data);
        } catch (e) {
            addToast('Failed to load dashboard', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    return { stats, loading, refresh: load };
}
