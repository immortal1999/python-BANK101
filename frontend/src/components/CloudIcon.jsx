import { useId } from "react";

// Same cloud as the favicon (public/cloud.svg), inline so it can size and theme with CSS.
function CloudIcon({ size = 26 }) {
  const gradient = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <defs>
        <linearGradient id={gradient} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f4d98a" />
          <stop offset="1" stopColor="#4da8ff" />
        </linearGradient>
      </defs>
      <path
        fill={`url(#${gradient})`}
        d="M48 50H18C10.3 50 4 43.9 4 36.3c0-6.6 4.7-12.1 11-13.4C17.3 15.3 24.3 10 32.5 10c9.3 0 17 6.8 18.3 15.7C57 26.7 62 31.9 62 38.2 62 44.8 56.2 50 48 50z"
      />
    </svg>
  );
}

export default CloudIcon;
