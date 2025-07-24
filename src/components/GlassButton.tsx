import React from 'react';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: string;
  children: React.ReactNode;
}

const GlassButton: React.FC<GlassButtonProps> = ({ icon, children, className = '', ...props }) => {
  return (
    <button
      className={`glass-btn d-flex align-items-center gap-2 ${className}`}
      {...props}
    >
      {icon && <span className="material-icons" style={{ fontSize: 20 }}>{icon}</span>}
      <span>{children}</span>
    </button>
  );
};

export default GlassButton; 