import React from 'react';
import { LucideIcon, Sparkles } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  iconColor?: string;
  title: string;
  description: string;
  quote?: {
    text: string;
    author: string;
  };
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    variant?: 'primary' | 'secondary' | 'indigo';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
  };
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  iconColor = 'text-emerald-600',
  title,
  description,
  quote,
  action,
  secondaryAction,
  className = '',
}) => {
  const getActionBg = () => {
    switch (action?.variant) {
      case 'indigo':
        return 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-xs';
      case 'secondary':
        return 'bg-slate-100 hover:bg-slate-200 text-slate-700';
      case 'primary':
      default:
        return 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-xs';
    }
  };

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 p-8 sm:p-12 text-center flex flex-col items-center justify-center relative overflow-hidden group shadow-2xs ${className}`}
    >
      {/* Subtle decorative background circles */}
      <div className="absolute -top-12 -right-12 w-44 h-44 rounded-full bg-slate-50/70 pointer-events-none" />
      <div className="absolute -bottom-10 -left-10 w-36 h-36 rounded-full bg-slate-50/50 pointer-events-none" />

      {/* Floating illustration badge with soft halo */}
      <div className="relative mb-4">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-b from-slate-50 to-slate-100 border border-slate-200/70 flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform duration-300">
          <Icon className={`w-8 h-8 ${iconColor} stroke-[1.65]`} />
        </div>
        <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center shadow-2xs">
          <Sparkles className="w-3 h-3 text-amber-500 fill-amber-400" />
        </div>
      </div>

      {/* Title & Description */}
      <h3 className="text-base font-bold text-slate-800 tracking-tight mb-1.5 max-w-md">
        {title}
      </h3>
      <p className="text-xs text-slate-500 leading-relaxed max-w-md mb-5">
        {description}
      </p>

      {/* Action buttons */}
      {(action || secondaryAction) && (
        <div className="flex flex-wrap items-center justify-center gap-2.5 mb-6 z-10">
          {action && (
            <button
              type="button"
              onClick={action.onClick}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${getActionBg()}`}
            >
              {action.icon && <action.icon className="w-3.5 h-3.5" />}
              <span>{action.label}</span>
            </button>
          )}

          {secondaryAction && (
            <button
              type="button"
              onClick={secondaryAction.onClick}
              className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {secondaryAction.icon && <secondaryAction.icon className="w-3.5 h-3.5" />}
              <span>{secondaryAction.label}</span>
            </button>
          )}
        </div>
      )}

      {/* Educational Inspiring Quote */}
      {quote && (
        <div className="pt-4 border-t border-slate-100/90 max-w-lg mx-auto">
          <blockquote className="text-[11px] italic text-slate-500 font-serif leading-relaxed">
            "{quote.text}"
          </blockquote>
          <cite className="block text-[10px] not-italic font-bold tracking-wider text-slate-400 uppercase mt-1">
            — {quote.author}
          </cite>
        </div>
      )}
    </div>
  );
};
