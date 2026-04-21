"use client";

import { X } from "lucide-react";

function DeleteButton({ onClick, disabled, loading, className = "" }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      <div className="flex items-center">
        <X className="mr-1 w-4 h-4" />
        <span>{loading ? "Clearing..." : "Delete"}</span>
      </div>
    </button>
  );
}

export default DeleteButton;
