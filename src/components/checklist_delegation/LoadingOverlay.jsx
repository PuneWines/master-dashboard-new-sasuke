import React from 'react';
import LoadingSpinner from './LoadingSpinner';

const LoadingOverlay = ({ loading, message = "Please Wait A Few Second" }) => {
    if (!loading) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
            <div className="flex flex-col items-center p-6 bg-white rounded-lg shadow-xl">
                <LoadingSpinner size="h-8 w-8" color="text-purple-600" />
                <p className="mt-4 text-lg font-medium text-gray-700 animate-pulse">{message}</p>
            </div>
        </div>
    );
};

export default LoadingOverlay;
