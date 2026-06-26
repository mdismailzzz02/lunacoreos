import { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { Bell, RefreshCw } from 'lucide-react';
import './Notifications.css';

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [permissionStatus, setPermissionStatus] = useState(Notification.permission);
    const [isSyncRegistered, setIsSyncRegistered] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);

    useEffect(() => {
        loadNotifications();
        checkSyncStatus();
    }, []);

    const loadNotifications = async () => {
        try {
            setLoading(true);
            const data = await api.getNotifications();
            setNotifications(data || []);
        } catch (err) {
            console.error('Failed to load notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const checkSyncStatus = async () => {
        if ('serviceWorker' in navigator && 'periodicSync' in registration) {
            const registration = await navigator.serviceWorker.ready;
            const tags = await registration.periodicSync.getTags();
            setIsSyncRegistered(tags.includes('content-check'));
        }
    };

    const requestPermission = async () => {
        const permission = await Notification.requestPermission();
        setPermissionStatus(permission);
        if (permission === 'granted') {
            registerPeriodicSync();
        }
    };

    const registerPeriodicSync = async () => {
        if ('serviceWorker' in navigator && 'periodicSync' in registration) {
            try {
                setIsSyncing(true);
                const registration = await navigator.serviceWorker.ready;
                await registration.periodicSync.register('content-check', {
                    minInterval: 15 * 60 * 1000, 
                });
                
                // Keep spinning for 1s for visual feedback
                setTimeout(() => {
                    setIsSyncRegistered(true);
                    setIsSyncing(false);
                    alert('Background Sync Enabled! Checking every 15 mins.');
                }, 1000);
            } catch (err) {
                setIsSyncing(false);
                console.error('Periodic background sync failed:', err);
            }
        } else {
            // Fallback for browsers that don't support Periodic Sync
            // We can still trigger local notifications while the app is open
            alert('Your browser does not support full background sync, but notifications will still work while the app is open!');
        }
    };

    const toggleNotification = async (notif) => {
        try {
            const updated = { ...notif, enabled: !notif.enabled };
            await api.saveNotification(updated);
            setNotifications(notifications.map(n => n.id === notif.id ? updated : n));
        } catch (err) {
            alert('Failed to update: ' + err.message);
        }
    };

    const testNotification = () => {
        if (Notification.permission === 'granted') {
            new Notification('Md Ismaildiary Test', {
                body: 'This is a test notification! It works 🚀',
                icon: '/favicon.svg'
            });
        } else {
            alert('Please enable notifications first!');
        }
    };

    return (
        <div className="notifications-page main-container">
            <header className="page-header">
                <h1>Notification Management</h1>
                <p>Stay updated with reminders, new content, and memories.</p>
            </header>

            <section className="settings-section card">
                <div className="settings-header">
                    <h3>Service Status</h3>
                    <div className={`status-badge ${permissionStatus === 'granted' ? 'success' : 'warning'}`}>
                        {permissionStatus === 'granted' ? 'Permissions Granted' : 'Permissions Needed'}
                    </div>
                </div>
                
                <div className="sync-info">
                    <p>Current Sync Interval: <strong>15 Minutes</strong> (Chrome on Android only)</p>
                    {permissionStatus !== 'granted' ? (
                        <button className="primary-btn pulse" onClick={requestPermission}>
                            Enable Notifications
                        </button>
                    ) : (
                        <div className="action-row">
                            <button className="btn-test-alert" onClick={testNotification}>
                                <Bell size={18} />
                                <span>Test Alert</span>
                            </button>
                            {!isSyncRegistered && (
                                <button 
                                    className={`btn-force-sync ${isSyncing ? 'syncing' : ''}`} 
                                    onClick={registerPeriodicSync}
                                    disabled={isSyncing}
                                >
                                    <RefreshCw size={18} className={isSyncing ? 'spin' : ''} />
                                    <span>{isSyncing ? 'Syncing...' : 'Force Sync Start'}</span>
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </section>

            <div className="notifications-grid">
                {loading ? (
                    <div className="loader">Syncing with sheet...</div>
                ) : (
                    notifications.map(notif => (
                        <div key={notif.id} className={`notif-card card ${!notif.enabled ? 'disabled' : ''}`}>
                            <div className="notif-type-icon">
                                {notif.type === 'SYNC_YT' ? '📺' : 
                                 notif.type === 'SYNC_TWITCH' ? '🎮' : 
                                 notif.type === 'SYNC_CAPSULE' ? '⏳' : '⏰'}
                            </div>
                            <div className="notif-details">
                                <span className="notif-label">{notif.label}</span>
                                <span className="notif-message">{notif.message}</span>
                                {notif.time && <span className="notif-time">⏰ {notif.time}</span>}
                            </div>
                            <div className="notif-switch">
                                <label className="switch">
                                    <input 
                                        type="checkbox" 
                                        checked={notif.enabled} 
                                        onChange={() => toggleNotification(notif)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
