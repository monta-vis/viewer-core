/**
 * Confetti Component
 *
 * Lightweight CSS-based celebration animation.
 * Shows confetti particles falling from the top of the screen.
 */
import { useEffect, useState } from 'react';
import './confetti.css';

interface ConfettiProps {
  /** Duration in milliseconds before auto-cleanup */
  duration?: number;
  /** Callback when animation completes */
  onComplete?: () => void;
}

// Brand-inspired colors for confetti
const COLORS = [
  '#00B4B4', // Primary teal
  '#00D4D4', // Light teal
  '#F5A623', // Amber/warning
  '#7ED321', // Success green
  '#4A90D9', // Blue
  '#FF6B6B', // Coral
  '#9B59B6', // Purple
];

interface Particle {
  id: number;
  x: number;
  color: string;
  delay: number;
  duration: number;
  size: number;
}

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * 100, // 0-100% horizontal position
    color: COLORS[Math.floor(Math.random() * COLORS.length)],
    delay: Math.random() * 0.5, // 0-0.5s delay
    duration: 1.5 + Math.random() * 1, // 1.5-2.5s fall duration
    size: 8 + Math.random() * 8, // 8-16px size
  }));
}

export function Confetti({ duration = 2000, onComplete }: ConfettiProps) {
  const [particles] = useState(() => generateParticles(30));
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      onComplete?.();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onComplete]);

  if (!visible) return null;

  return (
    <div className="confetti-container" aria-hidden="true">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="confetti-particle"
          style={{
            left: `${particle.x}%`,
            backgroundColor: particle.color,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
          }}
        />
      ))}
    </div>
  );
}
