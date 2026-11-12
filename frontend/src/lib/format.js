export const PLACEHOLDER = "–";

export const fmt = (value) => (value == null ? PLACEHOLDER : value.toLocaleString());
