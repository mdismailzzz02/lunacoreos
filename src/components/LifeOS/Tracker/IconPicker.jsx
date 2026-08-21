import React, { useState, useEffect, useRef } from 'react';
import IconRenderer from './IconRenderer';
import './IconPicker.css';

const ICON_CATEGORIES = [
  {
    name: 'Learning',
    icons: [
      { char: 'tabler-book', tags: ['book', 'read', 'study'] },
      { char: 'tabler-school', tags: ['graduation', 'cap', 'degree', 'school'] },
      { char: 'tabler-pencil', tags: ['pencil', 'write', 'draw'] },
      { char: 'tabler-brain', tags: ['brain', 'mind', 'think', 'focus'] },
      { char: 'tabler-microscope', tags: ['microscope', 'science', 'research'] }
    ]
  },
  {
    name: 'Health',
    icons: [
      { char: 'tabler-barbell', tags: ['muscle', 'arm', 'gym', 'workout', 'fitness'] },
      { char: 'tabler-heart', tags: ['heart', 'love', 'health'] },
      { char: 'tabler-run', tags: ['run', 'runner', 'jog', 'cardio'] },
      { char: 'tabler-droplet', tags: ['water', 'drop', 'drink', 'hydrate'] },
      { char: 'tabler-yoga', tags: ['yoga', 'meditate', 'peace', 'calm'] },
      { char: 'tabler-salad', tags: ['salad', 'food', 'diet', 'eat'] }
    ]
  },
  {
    name: 'Work',
    icons: [
      { char: 'tabler-briefcase', tags: ['briefcase', 'job', 'business'] },
      { char: 'tabler-laptop', tags: ['laptop', 'computer', 'code', 'tech'] },
      { char: 'tabler-chart-line', tags: ['chart', 'graph', 'growth', 'stonks'] },
      { char: 'tabler-target', tags: ['target', 'goal', 'bullseye', 'focus'] },
      { char: 'tabler-folder', tags: ['folder', 'file', 'organize'] },
      { char: 'tabler-clock', tags: ['clock', 'time', 'schedule', 'alarm'] }
    ]
  },
  {
    name: 'Gaming & Hobby',
    icons: [
      { char: 'tabler-device-gamepad', tags: ['gamepad', 'controller', 'play'] },
      { char: 'tabler-dice', tags: ['dice', 'random', 'board', 'tabletop'] },
      { char: 'tabler-palette', tags: ['palette', 'art', 'paint', 'draw'] },
      { char: 'tabler-music', tags: ['music', 'note', 'listen', 'song'] },
      { char: 'tabler-camera', tags: ['camera', 'photo', 'picture'] },
      { char: 'tabler-guitar', tags: ['guitar', 'music', 'instrument'] }
    ]
  },
  {
    name: 'Life & Chores',
    icons: [
      { char: 'tabler-home', tags: ['home', 'house', 'family'] },
      { char: 'tabler-broom', tags: ['broom', 'clean', 'sweep', 'tidy'] },
      { char: 'tabler-shopping-cart', tags: ['cart', 'shopping', 'groceries', 'buy'] },
      { char: 'tabler-calendar', tags: ['calendar', 'date', 'plan', 'schedule'] },
      { char: 'tabler-plant', tags: ['plant', 'garden', 'nature'] },
      { char: 'tabler-car', tags: ['car', 'drive', 'travel', 'commute'] }
    ]
  },
  {
    name: 'General',
    icons: [
      { char: 'tabler-star', tags: ['star', 'favorite', 'special'] },
      { char: 'tabler-flag', tags: ['flag', 'milestone', 'mark'] },
      { char: 'tabler-check', tags: ['check', 'done', 'complete'] },
      { char: 'tabler-flame', tags: ['fire', 'flame', 'streak', 'hot'] },
      { char: 'tabler-bolt', tags: ['lightning', 'zap', 'fast', 'energy'] },
      { char: 'tabler-sparkles', tags: ['sparkles', 'magic', 'clean', 'new'] }
    ]
  }
];

export default function IconPicker({ value, onChange }) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [customEmoji, setCustomEmoji] = useState('');
  
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handleSelect = (char) => {
    onChange(char);
    setIsOpen(false);
    setSearchQuery('');
    setCustomEmoji('');
  };

  const handleCustomSubmit = (e) => {
    e.preventDefault();
    if (customEmoji.trim()) {
      handleSelect(customEmoji.trim());
    }
  };

  const filteredCategories = ICON_CATEGORIES.map(cat => ({
    ...cat,
    icons: cat.icons.filter(icon => 
      !searchQuery || 
      icon.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      cat.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
  })).filter(cat => cat.icons.length > 0);

  return (
    <div className="icon-picker-container" ref={popoverRef}>
      <button 
        type="button" 
        className="icon-picker-trigger" 
        onClick={() => setIsOpen(!isOpen)}
        title="Pick an icon"
      >
        <div style={{ width: '20px', height: '20px' }}>
          <IconRenderer icon={value} />
        </div>
      </button>

      {isOpen && (
        <div className="icon-picker-popover">
          <div className="icon-picker-search">
            <input 
              type="text" 
              placeholder="Search icons..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              autoFocus
            />
          </div>

          <div className="icon-picker-grid-container">
            {filteredCategories.length > 0 ? (
              filteredCategories.map(cat => (
                <div key={cat.name} className="icon-category">
                  <div className="icon-category-label">{cat.name}</div>
                  <div className="icon-grid">
                    {cat.icons.map((icon, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`icon-grid-btn ${value === icon.char ? 'selected' : ''}`}
                        onClick={() => handleSelect(icon.char)}
                        title={icon.tags[0]}
                      >
                        <div style={{ width: '20px', height: '20px' }}>
                          <IconRenderer icon={icon.char} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <div className="icon-picker-empty">No icons found.</div>
            )}
          </div>

          <div className="icon-picker-custom">
            <form onSubmit={handleCustomSubmit}>
              <input 
                type="text" 
                placeholder="Or paste any custom emoji..." 
                value={customEmoji}
                onChange={(e) => setCustomEmoji(e.target.value)}
                maxLength={4}
              />
              <button type="submit" disabled={!customEmoji.trim()}>Use</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
