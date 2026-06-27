import React from 'react';

interface LoadingSkeletonProps {
  count?: number;
}

export default function LoadingSkeleton({ count = 1 }: LoadingSkeletonProps) {
  return (
    <>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white border border-slate-100 rounded-2xl p-4 space-y-4 shadow-sm animate-fade-in"
        >
          {/* Image skeleton */}
          <div className="w-full h-48 bg-slate-100 rounded-xl shimmer" />
          
          {/* Text lines */}
          <div className="space-y-3 py-2">
            <div className="h-5 bg-slate-100 rounded-md w-3/4 shimmer" />
            <div className="h-3.5 bg-slate-100 rounded-md w-1/2 shimmer" />
            <div className="h-3.5 bg-slate-100 rounded-md w-5/6 shimmer" />
          </div>

          <div className="pt-2 border-t border-slate-50 flex items-center justify-between">
            <div className="h-4 bg-slate-100 rounded-md w-12 shimmer" />
            <div className="h-4 bg-slate-100 rounded-md w-16 shimmer" />
          </div>
        </div>
      ))}
    </>
  );
}
