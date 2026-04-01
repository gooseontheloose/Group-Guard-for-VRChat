import React, { useState, useRef, useEffect, useMemo } from 'react';
import styles from './NeonSelect.module.css';
import { ChevronDown, Check } from 'lucide-react';

interface NeonSelectProps {
    value?: string | string[] | null;
    onChange: (value: any) => void;
    options: { value: string; label: string }[];
    placeholder?: string;
    className?: string;
    disabled?: boolean;
    direction?: 'up' | 'down';
    multiple?: boolean;
}

export const NeonSelect: React.FC<NeonSelectProps> = ({
    value,
    onChange,
    options,
    placeholder = 'Select...',
    className,
    disabled = false,
    direction = 'up',
    multiple = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Close on click outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (val: string) => {
        if (multiple) {
            const currentValues = Array.isArray(value) ? [...value] : [];
            const index = currentValues.indexOf(val);
            if (index > -1) {
                currentValues.splice(index, 1);
            } else {
                currentValues.push(val);
            }
            onChange(currentValues);
        } else {
            onChange(val);
            setIsOpen(false);
        }
    };

    const isSelected = (val: string) => {
        if (multiple) {
            return Array.isArray(value) && value.includes(val);
        }
        return value === val;
    };

    const selectedLabel = useMemo(() => {
        if (multiple) {
            const count = Array.isArray(value) ? value.length : 0;
            if (count === 0) return placeholder;
            if (count === 1) {
                const firstVal = (value as string[])[0];
                return options.find(o => o.value === firstVal)?.label || placeholder;
            }
            return `${count} GROUPS SELECTED`;
        }
        return options.find(o => o.value === value)?.label || placeholder;
    }, [value, multiple, options, placeholder]);

    return (
        <div ref={containerRef} className={`${styles.container} ${className || ''}`}>
            <button
                type="button"
                className={`${styles.trigger} ${isOpen ? styles.triggerActive : ''}`}
                onClick={() => !disabled && setIsOpen(!isOpen)}
                disabled={disabled}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selectedLabel}
                </span>
                <ChevronDown size={16} className={`${styles.chevron} ${isOpen ? styles.chevronRotated : ''}`} />
            </button>

            {isOpen && (
                <div className={`${styles.dropdown} ${direction === 'down' ? styles.dropdownOpenDown : ''}`}>
                    {options.map((option) => {
                        const checked = isSelected(option.value);
                        return (
                            <div
                                key={option.value}
                                className={`${styles.option} ${checked && !multiple ? styles.optionSelected : ''}`}
                                onClick={() => handleSelect(option.value)}
                            >
                                {multiple && (
                                    <div className={`${styles.checkbox} ${checked ? styles.checkboxSelected : ''}`}>
                                        {checked && <Check size={12} className={styles.checkIcon} />}
                                    </div>
                                )}
                                {option.label}
                            </div>
                        );
                    })}
                    {options.length === 0 && (
                        <div className={styles.option} style={{ opacity: 0.5, cursor: 'default' }}>
                            No options
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
