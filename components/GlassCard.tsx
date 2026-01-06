
import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  variant?: 'base' | 'purple' | 'orange';
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', variant = 'base' }) => {
  const variantClasses = {
    base: 'bg-white/5 border-white/10',
    purple: 'bg-purple-primary/15 border-purple-primary/30',
    orange: 'bg-orange-primary/15 border-orange-primary/30',
  };

  return (
    <div
      className={`backdrop-blur-xl shadow-2xl shadow-black/30 rounded-2xl ${variantClasses[variant]} border ${className}`}
    >
      {children}
    </div>
  );
};

export default GlassCard;
