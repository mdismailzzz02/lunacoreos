import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { useToast } from '../context/ToastContext';

export function useInsights() {
    const [insights, setInsights] = useState([]);
    const [loading, setLoading] = useState(true);
    const { addToast } = useToast();

    const load = useCallback(async (filters) => {
        try {
            const data = await api.getInsights(filters || {});
            setInsights(data || []);
        } catch (e) {
            addToast('Failed to load insights', 'error');
        } finally { setLoading(false); }
    }, []);

    useEffect(() => { load(); }, [load]);

    const create = async (params) => {
        try {
            const ins = await api.createInsight(params);
            setInsights(prev => [ins, ...prev]);
            addToast('Insight captured 💡', 'success');
            return ins;
        } catch (e) {
            addToast('Failed to create insight', 'error');
            throw e;
        }
    };

    const update = async (params) => {
        try {
            await api.updateInsight(params);
            setInsights(prev => prev.map(i => i.insight_id === params.insight_id ? { ...i, ...params } : i));
            addToast('Insight updated', 'success');
        } catch (e) { addToast('Failed to update insight', 'error'); }
    };

    const linkToTodo = async (params) => {
        try {
            const res = await api.linkInsightToTodo(params);
            addToast('Todo created from insight', 'success');
            return res;
        } catch (e) {
            addToast('Failed to create todo from insight', 'error');
            throw e;
        }
    };

    return { insights, loading, create, update, linkToTodo, refresh: load };
}
