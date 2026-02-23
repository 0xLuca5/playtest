'use client';

import React from 'react';

export function TreeSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      {/* Root level items */}
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
      
      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>

      {/* Nested items */}
      <div className="ml-6 space-y-2">
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
        
        <div className="flex items-center gap-2 px-2 py-1.5">
          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
          <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        </div>
      </div>

      <div className="flex items-center gap-2 px-2 py-1.5">
        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
        <div className="flex-1 h-4 bg-slate-200 dark:bg-slate-700 rounded"></div>
      </div>
    </div>
  );
}
