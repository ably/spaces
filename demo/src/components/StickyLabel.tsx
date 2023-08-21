import React from 'react';

interface StickyLabelProps {
  visible: boolean;
  className?: string;
  children: React.ReactNode;
}
export const StickyLabel: React.FC<StickyLabelProps> = ({ visible, className, children }) => {
  if (!visible) return null;

  return (
    <div
      className={`absolute -top-[22px] -left-[2px] px-[10px] text-sm text-white rounded-t-lg normal-case ${className}`}
    >
      {children}
    </div>
  );
};
