import React from 'react';
import '../styles/Loader.css';

export default function Loader({ isVisible, progress }) {
    if (!isVisible) return null;

    const percentage = Math.round(progress * 100);

    return (
        <div className="loader-overlay">
            <div className="loader-container">
                <div className="loader-spinner"></div>
                <h2 className="loader-text">Loading VR Scene</h2>
                <div className="progress-bar-container">
                    <div
                        className="progress-bar-fill"
                        style={{ width: `${percentage}%` }}
                    ></div>
                </div>
                <p className="loader-percentage">{percentage}%</p>
                <p className="loader-subtitle">Preloading panorama images...</p>
            </div>
        </div>
    );
}
