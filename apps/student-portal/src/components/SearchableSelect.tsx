import { useState, useRef, useEffect } from 'react';
import './SearchableSelect.css';

interface SearchableSelectProps {
    id: string;
    label: string;
    value: string;
    options: string[];
    onChange: (value: string) => void;
    placeholder: string;
    required?: boolean;
    disabled?: boolean;
    error?: string;
}

export function SearchableSelect({
    id,
    label,
    value,
    options,
    onChange,
    placeholder,
    required = false,
    disabled = false,
    error,
}: SearchableSelectProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchTerm('');
            }
        }

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const filteredOptions = options.filter(option =>
        option.toLowerCase().includes(searchTerm.toLowerCase())
    );

    function handleSelect(option: string) {
        onChange(option);
        setIsOpen(false);
        setSearchTerm('');
    }

    function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
        if (disabled) return;
        setSearchTerm(e.target.value);
        if (!isOpen) {
            setIsOpen(true);
        }
    }

    function handleFocus() {
        if (disabled) return;
        setIsOpen(true);
        setSearchTerm(''); // Clear search term so user can easily type new search
    }

    return (
        <>
            <div className="form-group">
                <label htmlFor={id}>{label}</label>
                <div className="searchable-select-container" ref={containerRef}>
                    <input
                        id={id}
                        type="text"
                        value={isOpen ? searchTerm : value}
                        onChange={handleInputChange}
                        onFocus={handleFocus}
                        onClick={handleFocus}
                        placeholder={placeholder}
                        required={required}
                        disabled={disabled}
                        className={error ? 'input-error' : ''}
                        readOnly={disabled}
                    />
                    {!disabled && isOpen && filteredOptions.length > 0 && (
                        <div className="select-dropdown">
                            {filteredOptions.map((option) => (
                                <div
                                    key={option}
                                    className={`select-option ${value === option ? 'selected' : ''}`}
                                    onClick={() => handleSelect(option)}
                                >
                                    {option}
                                </div>
                            ))}
                        </div>
                    )}
                    {!disabled && isOpen && filteredOptions.length === 0 && searchTerm && (
                        <div className="select-dropdown">
                            <div className="select-option no-results">No results found</div>
                        </div>
                    )}
                </div>
                {error && <span className="error">{error}</span>}
            </div>
        </>
    );
}
