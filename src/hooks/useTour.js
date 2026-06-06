import { useState, useCallback } from 'react';

const TOUR_KEY = 'pokebattle_tour_done';

export function useTour() {
  const [tourActive, setTourActive] = useState(false);

  const startTour = useCallback(() => {
    setTourActive(true);
  }, []);

  const endTour = useCallback(() => {
    localStorage.setItem(TOUR_KEY, 'true');
    setTourActive(false);
  }, []);

  const isTourDone = useCallback(() => {
    return localStorage.getItem(TOUR_KEY) === 'true';
  }, []);

  const resetTour = useCallback(() => {
    localStorage.removeItem(TOUR_KEY);
  }, []);

  return { tourActive, startTour, endTour, isTourDone, resetTour };
}
