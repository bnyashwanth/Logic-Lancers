import React, { useEffect, useState } from 'react';

function getPaddingTop(aspectRatio) {
  if (typeof aspectRatio !== 'string') {
    return '75%';
  }

  const cleaned = aspectRatio.replace(/\s+/g, '');
  const parts = cleaned.split(':');

  if (parts.length !== 2) {
    return '75%';
  }

  const width = Number(parts[0]);
  const height = Number(parts[1]);

  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return '75%';
  }

  return `${(height / width) * 100}%`;
}

export default function ImageCarousel({ images, intervalMs = 4000, aspectRatio = '4:3' }) {
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (!images?.length) {
      return undefined;
    }

    const timer = setInterval(() => {
      setActiveIndex((current) => (current + 1) % images.length);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [images, intervalMs]);

  const paddingTop = getPaddingTop(aspectRatio);

  return (
    <div className="relative w-full shadow-ambient border border-outline-variant/20 overflow-hidden" style={{ paddingTop }}>
      {images.map((src, index) => (
        <img
          key={src}
          src={src}
          alt={`Hero slide ${index + 1}`}
          className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-700 ease-in-out ${
            index === activeIndex ? 'opacity-100' : 'opacity-0'
          }`}
        />
      ))}
    </div>
  );
}
