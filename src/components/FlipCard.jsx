import React, { useState } from 'react';
import '../assets/styles/FlipCard.css';

export default function FlipCard() {
  const [flipped, setFlipped] = useState(false);

  const toggle = () => setFlipped(f => !f);

  return (
    <div className="card-section">
      <div className="card-section-label">Your Digital Card</div>

      <div className="card-stage">
        <div
          className="flip-scene"
          onClick={toggle}
          title="Click to flip"
          role="button"
          aria-label={flipped ? 'Show front of card' : 'Show back of card'}
        >
          <div className={`flip-card${flipped ? ' flipped' : ''}`}>

            {/* FRONT */}
            <div className="flip-card-front">
              <img src="Front.svg" alt="Card front" className="card-face-img" />
            </div>

            {/* BACK */}
            <div className="flip-card-back">
              <img src="Back.svg" alt="Card back" className="card-face-img" />
            </div>

          </div>
        </div>
      </div>

      {/* Indicator dots */}
      <div className="flip-indicator">
        <div className={`flip-dot${!flipped ? ' active' : ''}`} />
        <div className={`flip-dot${flipped  ? ' active' : ''}`} />
      </div>

      <div className="flip-hint" style={{ opacity: 0.7 }}>
        <svg viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M2 7a5 5 0 0110 0"/>
          <path d="M10.5 4.5l1.5 2.5-2.5 0.5"/>
        </svg>
        Tap card to flip
      </div>
    </div>
  );
}
