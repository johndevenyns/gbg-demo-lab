import { useEffect, useRef, useState } from 'react';

/**
 * Like useState but persists the value to localStorage under the given key
 * so it survives navigation away from the page (and full reloads).
 */
export function usePersistedState<T>(
  key: string,
  initialValue: T,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => {
    if (typeof window === 'undefined') return initialValue;
    try {
      const raw = window.localStorage.getItem(key);
      if (raw === null) return initialValue;
      return JSON.parse(raw) as T;
    } catch {
      return initialValue;
    }
  });

  const keyRef = useRef(key);
  useEffect(() => {
    keyRef.current = key;
  }, [key]);

  useEffect(() => {
    try {
      window.localStorage.setItem(keyRef.current, JSON.stringify(value));
    } catch {
      // ignore quota / serialization errors
    }
  }, [value]);

  return [value, setValue];
}

/**
 * Persisted Set<string> stored as a JSON array.
 */
export function usePersistedStringSet(
  key: string,
  initial: Iterable<string>,
): [Set<string>, React.Dispatch<React.SetStateAction<Set<string>>>] {
  const [arr, setArr] = usePersistedState<string[]>(key, Array.from(initial));
  const setValue = new Set(arr);
  const setSetValue: React.Dispatch<React.SetStateAction<Set<string>>> = (updater) => {
    setArr((prev) => {
      const prevSet = new Set(prev);
      const next =
        typeof updater === 'function'
          ? (updater as (s: Set<string>) => Set<string>)(prevSet)
          : updater;
      return Array.from(next);
    });
  };
  return [setValue, setSetValue];
}