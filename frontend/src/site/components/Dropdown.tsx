import React, { useState, useEffect, useRef } from 'react';
import { dropdownItemBase } from '../styles/shared';
import { theme } from '../../configs/theme';

/* ─── Hook ─── */
export function useDropdown() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return { open, setOpen, ref };
}

/* ─── Panel ─── */
export function DropdownPanel({ isOpen, right = 0, minWidth = "220px", children }: {
  isOpen: boolean; right?: number; minWidth?: string; children: React.ReactNode;
}) {
  return (
    <div style={{
      position: "absolute", top: "calc(100% + 4px)", right,
      minWidth, background: theme.colors.bgDark, border: `1px solid ${theme.colors.border}`,
      borderRadius: "4px", padding: "8px 0",
      opacity: isOpen ? 1 : 0, transform: isOpen ? "translateY(0)" : "translateY(-8px)",
      pointerEvents: isOpen ? "all" : "none", transition: "all 0.2s ease",
      zIndex: 1000, boxShadow: "0 8px 32px rgba(0,0,0,0.6)",
    }}>
      {children}
    </div>
  );
}

/* ─── Item ─── */
export function DropdownItem({ icon: Icon, label, onClick }: {
  icon: React.FC<{ size?: number }>; label: string; onClick: () => void;
}) {
  return (
    <button
      style={dropdownItemBase}
      onClick={onClick}
      onMouseEnter={(e) => { 
        e.currentTarget.style.background = theme.colors.bgPanel; 
        e.currentTarget.style.color = theme.colors.gold; 
      }}
      onMouseLeave={(e) => { 
        e.currentTarget.style.background = "none"; 
        e.currentTarget.style.color = theme.colors.textSecondary; 
      }}
    >
      <Icon size={16} /> {label}
    </button>
  );
}