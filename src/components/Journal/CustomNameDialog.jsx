import { useState } from 'react';
import { X } from 'lucide-react';
import './CustomNameDialog.css';

export default function CustomNameDialog({ 
    isOpen, 
    onSubmit, 
    onCancel 
}) {
    const [customName, setCustomName] = useState('');

    const handleSubmit = () => {
        onSubmit(customName);
        setCustomName('');
    };

    const handleCancel = () => {
        setCustomName('');
        onCancel();
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter') {
            handleSubmit();
        } else if (e.key === 'Escape') {
            handleCancel();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="cnd-overlay" onClick={handleCancel}>
            <div className="cnd-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="cnd-header">
                    <h3>New Journal Entry</h3>
                    <button className="cnd-close" onClick={handleCancel}>
                        <X size={20} />
                    </button>
                </div>

                <div className="cnd-body">
                    <p>Enter an optional name for this entry:</p>
                    <input
                        autoFocus
                        type="text"
                        className="cnd-input"
                        placeholder="e.g., Work Meeting, Thoughts about..."
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        onKeyDown={handleKeyDown}
                    />
                    <p className="cnd-hint">
                        Leave blank to auto-generate: <code>journal-YYYY-MM-DD-HH-mm-ss</code>
                    </p>
                    {customName && (
                        <p className="cnd-preview">
                            Will be named: <code>{customName}-journal-YYYY-MM-DD-HH-mm-ss</code>
                        </p>
                    )}
                </div>

                <div className="cnd-footer">
                    <button className="cnd-btn cnd-btn-cancel" onClick={handleCancel}>
                        Cancel
                    </button>
                    <button className="cnd-btn cnd-btn-submit" onClick={handleSubmit}>
                        Create Entry
                    </button>
                </div>
            </div>
        </div>
    );
}
