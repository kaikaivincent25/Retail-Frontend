import { useEffect, useMemo, useState } from "react";
import { liveQuery } from "dexie";

export function useLiveQuery(query, defaultResult) {
  const observable = useMemo(() => liveQuery(query), [query]);
  const [result, setResult] = useState(defaultResult);

  useEffect(() => {
    const subscription = observable.subscribe({
      next: setResult,
      error: (error) => {
        console.error("Failed to observe local database changes.", error);
      },
    });
    return () => subscription.unsubscribe();
  }, [observable]);

  return result;
}
