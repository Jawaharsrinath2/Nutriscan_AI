import { useEffect, useState } from "react";
import { evaluatePlate } from "../api/nutritionApi";

const DEBOUNCE_MS = 150;

// Ask the backend to evaluate the plate whenever it (or anything in `deps`) changes.
// Rapid gram clicks are debounced, and an older in-flight request is aborted so it can't overwrite a newer one.
export function useEvaluate(items, enabled, deps) {
  const [evaluation, setEvaluation] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!enabled) return undefined;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      evaluatePlate(items, controller.signal)
        .then((result) => {
          setEvaluation(result);
          setError(null);
        })
        .catch((err) => {
          if (err.name !== "AbortError") setError(err);
        });
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [items, enabled, ...deps]);

  return { evaluation, error };
}
