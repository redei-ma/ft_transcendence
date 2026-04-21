import React from 'react';
import { theme } from '../../configs/theme';

export const navLinkBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: theme.spacing.sm,
  padding: `${theme.spacing.sm} ${theme.spacing.md}`,
  textDecoration: "none",
  fontFamily: theme.fonts.heading,
  fontSize: "13px",
  fontWeight: 600,
  letterSpacing: "1.5px",
  textTransform: "uppercase",
  cursor: "pointer",
  transition: "color 0.2s ease-in-out",
  height: "100%",
};

export const dropdownItemBase: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: theme.spacing.sm,
  padding: "10px 16px",
  color: theme.colors.textSecondary,
  fontFamily: theme.fonts.heading,
  fontSize: "12px",
  fontWeight: 500,
  letterSpacing: "0.5px",
  cursor: "pointer",
  transition: "all 0.15s ease-in-out",
  border: "none",
  background: "none",
  width: "100%",
  textAlign: "left",
};

export const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 16px",
  background: theme.colors.bgPanel,
  border: `1px solid ${theme.colors.border}`,
  borderRadius: "2px",
  color: theme.colors.textPrimary,
  fontFamily: theme.fonts.mono,
  fontSize: "14px",
  transition: "all 0.2s ease-in-out",
  outline: "none",
};

export const sectionTitleStyle: React.CSSProperties = {
  fontSize: "28px",
  fontWeight: 700,
  color: theme.colors.gold,
  letterSpacing: "4px",
  textTransform: "uppercase",
  marginBottom: theme.spacing.xl,
  textAlign: "center",
  fontFamily: theme.fonts.heading,
};