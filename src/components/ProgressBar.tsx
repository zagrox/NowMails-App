import React from 'react';

const ProgressBar = ({ percentage }: { percentage: number }) => {
    const getStatusClass = () => {
        if (percentage >= 75) return 'success';
        if (percentage >= 25) return 'warning';
        return ''; // default
    };

    return (
        <div className={`progress-bar-container ${getStatusClass()}`}>
            <div
                className="progress-bar-fill"
                style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
                role="progressbar"
                aria-valuenow={percentage}
                aria-valuemin={0}
                aria-valuemax={100}
            />
        </div>
    );
};

export default ProgressBar;
