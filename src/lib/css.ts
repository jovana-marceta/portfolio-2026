import type { CSSProperties } from "react";

/** Inline CSS custom properties, e.g. style={vars({ "--i": 2 })} */
export const vars = (v: Record<string, string | number>) => v as CSSProperties;
