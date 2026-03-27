import React, { useEffect, useRef } from 'react'

/**
 * Animated SVG circular gauge for confidence score.
 */
export default function ConfidenceGauge({ value = 0, size = 120, strokeWidth = 10 }) {
  const circumference = Math.PI * (size / 2 - strokeWidth / 2) * 2 // full circle
  // We use a half-circle gauge (semicircle)
  const semiCircum = Math.PI * (size / 2 - strokeWidth / 2)
  const offset = semiCircum - (value / 100) * semiCircum

  const color = value >= 80 ? '#10b981' : value >= 50 ? '#f59e0b' : '#ef4444'
  const label = value >= 80 ? 'High' : value >= 50 ? 'Medium' : 'Low'

  const pathRef = useRef(null)

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size / 2 + strokeWidth }}>
        <svg
          width={size}
          height={size / 2 + strokeWidth}
          viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
          className="overflow-visible"
        >
          {/* Background arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} A ${size / 2 - strokeWidth / 2} ${size / 2 - strokeWidth / 2} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke="rgba(51,65,85,0.6)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            ref={pathRef}
            d={`M ${strokeWidth / 2} ${size / 2} A ${size / 2 - strokeWidth / 2} ${size / 2 - strokeWidth / 2} 0 0 1 ${size - strokeWidth / 2} ${size / 2}`}
            fill="none"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={semiCircum}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.2s ease-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 6px ${color}60)`,
            }}
          />
        </svg>
        {/* Center value */}
        <div className="absolute bottom-0 left-0 right-0 flex flex-col items-center">
          <span className="text-2xl font-bold" style={{ color }}>{value.toFixed(1)}%</span>
          <span className="text-xs text-slate-500 font-medium">{label} Confidence</span>
        </div>
      </div>
    </div>
  )
}
