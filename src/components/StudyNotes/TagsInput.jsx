import { useState, useRef } from 'react';

export default function TagsInput({ tags, onChange }) {
    const [input, setInput] = useState('');
    const inputRef = useRef(null);

    const addTag = (raw) => {
        const tag = raw.trim().toLowerCase();
        if (!tag || tags.includes(tag)) return;
        onChange([...tags, tag]);
        setInput('');
    };

    const removeTag = (tag) => {
        onChange(tags.filter(t => t !== tag));
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(input);
        } else if (e.key === 'Backspace' && !input && tags.length > 0) {
            removeTag(tags[tags.length - 1]);
        }
    };

    return (
        <div className="sn-tags-input" onClick={() => inputRef.current?.focus()}>
            {tags.map(tag => (
                <span key={tag} className="sn-tag-pill">
                    {tag}
                    <button className="sn-tag-remove" onClick={e => { e.stopPropagation(); removeTag(tag); }}>×</button>
                </span>
            ))}
            <input
                ref={inputRef}
                className="sn-tag-text-input"
                placeholder={tags.length === 0 ? 'Add tag…' : ''}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                onBlur={() => { if (input.trim()) addTag(input); }}
            />
        </div>
    );
}
