import { useState, useEffect } from 'react';

const TARGET = new Date('2027-12-31T23:59:59');
const GOLD = '#F6E7C1';

function pad(n) { return String(n).padStart(2, '0'); }

export default function Countdown() {
  const [timeLeft, setTimeLeft] = useState(getTimeLeft());

  function getTimeLeft() {
    const diff = TARGET - Date.now();
    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0 };
    const days    = Math.floor(diff / 86400000);
    const hours   = Math.floor((diff % 86400000) / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    return { days, hours, minutes, seconds };
  }

  useEffect(() => {
    const id = setInterval(() => setTimeLeft(getTimeLeft()), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center gap-0 mt-6">
      {/* Compte à rebours sur une ligne */}
      <div className="flex items-center gap-4">
        <span style={{
          fontSize: 34, fontWeight: 700, fontStyle: 'italic',
          fontFamily: 'Georgia, "Times New Roman", serif',
          color: GOLD,
          lineHeight: 1,
          fontVariantNumeric: 'tabular-nums',
          textShadow: '0 0 28px rgba(246,231,193,0.25)',
        }}>
          J-{timeLeft.days}
        </span>
        <span style={{
          width: 1, height: 30,
          background: 'linear-gradient(to bottom, transparent, rgba(246,231,193,0.30), transparent)',
          display: 'inline-block',
        }} />
        <span style={{
          fontSize: 13,
          color: 'rgba(246,231,193,0.45)',
          fontFamily: 'monospace',
          fontVariantNumeric: 'tabular-nums',
          letterSpacing: '0.10em',
        }}>
          {pad(timeLeft.hours)}h {pad(timeLeft.minutes)}m {pad(timeLeft.seconds)}s
        </span>
      </div>
    </div>
  );
}