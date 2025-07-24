import React from 'react';

interface Button1Props extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: React.ReactNode;
}

const Button1: React.FC<Button1Props> = ({ children, ...props }) => {
  return (
    <button className="select-mode-btn px-4" {...props}>
      {children}
    </button>
  );
};

export default Button1; 