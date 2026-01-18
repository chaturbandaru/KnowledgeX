import React from 'react';

const SkillTag = ({ skill, type = 'primary', onRemove }) => {
    // If skill is an object, use skill.name, otherwise use string
    const name = typeof skill === 'string' ? skill : skill.name;

    const badgeColors = {
        primary: 'badge-primary',
        secondary: 'badge-success',
        accent: 'badge-pink',
        warning: 'badge-warning'
    };

    return (
        <div className={`badge ${badgeColors[type] || 'badge-primary'} px-3 py-1.5 text-sm flex items-center gap-2`}>
            <span>{name}</span>
            {onRemove && (
                <button
                    type="button"
                    onClick={() => onRemove(skill)}
                    className="hover:text-red-500 transition-colors ml-1 focus:outline-none"
                    aria-label={`Remove ${name}`}
                >
                    <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="12"
                        height="12"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    >
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            )}
        </div>
    );
};

export default SkillTag;
