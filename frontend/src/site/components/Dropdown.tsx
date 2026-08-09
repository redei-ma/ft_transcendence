import React, { useState, useEffect, useRef } from 'react';

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
  const stateCls = isOpen
    ? "opacity-100 translate-y-0 pointer-events-auto"
    : "opacity-0 -translate-y-2 pointer-events-none";

  return (
    <div
      style={{ right, minWidth }}
      className={
        "absolute top-[calc(100%+4px)] z-[1000] py-2 rounded " +
        "bg-[#060e14] border border-[rgba(200,170,100,0.15)] " +
        "shadow-[0_8px_32px_rgba(0,0,0,0.6)] " +
        "transition-all duration-200 " +
        stateCls
      }
    >
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
      onClick={onClick}
      className={
        "flex w-full items-center gap-2 px-4 py-2.5 text-left " +
        "font-[Cinzel,Palatino,serif] text-xs font-medium tracking-[0.5px] " +
        "cursor-pointer border-0 bg-transparent " +
        "text-[rgba(200,170,100,0.6)] " +
        "hover:bg-[#0d1a25] hover:text-[#e8d5a3] " +
        "transition-all duration-150 ease-in-out"
      }
    >
      <Icon size={16} /> {label}
    </button>
  );
}