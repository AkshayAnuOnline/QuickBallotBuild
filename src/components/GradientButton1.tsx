import React from 'react';

interface GradientButton1Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const GradientButton1: React.FC<GradientButton1Props> = ({ children, className = '', style, ...props }) => {
  return (
    <button className={`create-btn ${className}`} style={style} {...props}>
      {children}
    </button>
  );
};

export default GradientButton1; 