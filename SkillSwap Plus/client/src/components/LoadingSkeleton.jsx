import React from 'react';

const LoadingSkeleton = ({ rows = 6 }) => {
  return (
    <div className="grid gap-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="animate-pulse bg-white rounded p-4 h-28" />
      ))}
    </div>
  );
};

export default LoadingSkeleton;
