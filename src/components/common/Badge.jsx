import React from 'react';

export function Badge({
  children,
  variant = 'default', // 'default' | 'primary' | 'success' | 'warning' | 'danger' | 'purple' | 'outline'
  size = 'md', // 'sm' | 'md' | 'lg'
  icon = null,
  className = '',
  ...props
}) {
  return (
    <span className={`sf-badge sf-badge-${variant} sf-badge-${size} ${className}`} {...props}>
      {icon && <span className="sf-badge-icon">{icon}</span>}
      <span>{children}</span>
    </span>
  );
}
