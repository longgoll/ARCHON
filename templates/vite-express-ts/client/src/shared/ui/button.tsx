import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export function Button({ variant = 'primary', children, ...props }: ButtonProps) {
  const baseStyle: React.CSSProperties = {
    padding: '8px 16px',
    borderRadius: '6px',
    fontWeight: 500,
    cursor: 'pointer',
    border: 'none',
    backgroundColor: variant === 'primary' ? '#2563eb' : '#e5e7eb',
    color: variant === 'primary' ? '#ffffff' : '#111827',
  };

  return (
    <button style={baseStyle} {...props}>
      {children}
    </button>
  );
}
