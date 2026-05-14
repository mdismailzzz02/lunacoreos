import { useState, useEffect, useCallback } from 'react';
import * as api from '../services/api';
import { OfflineCache } from '../services/offlineCache';
import { useToast } from '../context/ToastContext';

export function useJournal() {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const { addToast } = useToast();

    const load = useCallback(async () => {
        try {
            const data = await api.getEntries();
            setEntries(data || []);
        } catch (e) {
            addToast('Failed to load journal entries', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { load(); }, [load]);

    const create = async (params) => {
        setSaving(true);
        try {
            const entry = await api.createEntry(params);
            setEntries(prev => [entry, ...prev]);
            addToast('Entry created', 'success');
            return entry;
        } catch (e) {
            addToast('Failed to create entry', 'error');
            throw e;
        } finally { setSaving(false); }
    };

    const update = async (params) => {
        setSaving(true);
        try {
            await api.updateEntry(params);
            setEntries(prev => prev.map(e => e.entry_id === params.entry_id ? { ...e, ...params } : e));
            addToast('Entry saved', 'success');
        } catch (e) {
            addToast('Failed to save entry', 'error');
        } finally { setSaving(false); }
    };

    const remove = async (entry_id) => {
        try {
            await api.deleteEntry(entry_id);
            setEntries(prev => prev.filter(e => e.entry_id !== entry_id));
            // Invalidate journal cache so fresh data is fetched on page refresh
            OfflineCache.invalidate('journal');
            addToast('Entry deleted', 'info');
        } catch (e) {
            addToast('Failed to delete entry', 'error');
        }
    };

    return { entries, loading, saving, create, update, remove, refresh: load };
}
