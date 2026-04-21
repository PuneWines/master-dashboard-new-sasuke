import React from 'react';

const LoadingSpinner = ({ size = "h-5 w-5", color = "text-purple-600", className = "" }) => {
    return (
        <div className={`flex items-center space-x-2 ${className}`}>
            <div className={`${size} animate-spin rounded-full border-2 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite] ${color}`} role="status">
                <span className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]">
                    Loading...
                </span>
            </div>
            <span className={`text-sm font-medium ${color}`}>Processing...</span>
        </div>
    );
};

export default LoadingSpinner;
