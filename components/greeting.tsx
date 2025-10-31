/**
 * Greeting Component
 * Displays time-based personalized greeting
 */

'use client';

import { useEffect, useState } from 'react';

export function Greeting() {
  const [greeting, setGreeting] = useState('');

  useEffect(() => {
    const hour = new Date().getHours();

    if (hour >= 5 && hour < 12) {
      setGreeting('Good morning');
    } else if (hour >= 12 && hour < 17) {
      setGreeting('Good afternoon');
    } else if (hour >= 17 && hour < 21) {
      setGreeting('Good evening');
    } else {
      setGreeting('Good night');
    }
  }, []);

  return (
    <h1 className="text-3xl font-light text-black mb-12 text-center">
      {greeting}
    </h1>
  );
}
