import { useState, useRef, useEffect } from 'react';

export default function CustomDropdown({ value, options, onChange, placeholder }) {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    const selectedOption = options.find(o => o.value === value) || options[0];

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="custom-dropdown" ref={containerRef}>
            <div className="dropdown-trigger" onClick={() => setIsOpen(!isOpen)}>
                <span>{selectedOption?.label || placeholder}</span>
                <span className={`dropdown-arrow ${isOpen ? 'open' : ''}`}>▾</span>
            </div>
            {isOpen && (
                <div className="dropdown-menu">
                    {options.map(opt => (
                        <div 
                            key={opt.value}
                            className={`dropdown-opt ${value === opt.value ? 'active' : ''}`}
                            onClick={() => {
                                onChange(opt.value);
                                setIsOpen(false);
                            }}
                        >
                            {opt.label}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
