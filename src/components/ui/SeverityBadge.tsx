import React from 'react';

interface SeverityBadgeProps {
  severity: number; // 1-10
}

export default function SeverityBadge({ severity }: SeverityBadgeProps) {
  if (severity >= 8) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
        🔴 Critical · {severity}/10
      </span>
    );
  } else if (severity >= 5) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
        🟡 Moderate · {severity}/10
      </span>
    );
  } else {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 border border-blue-200">
        🔵 Minor · {severity}/10
      </span>
    );
  }
}
