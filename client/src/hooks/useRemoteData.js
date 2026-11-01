import { useEffect, useState } from "react";
import { api } from "../utils/api";
export function useRemoteData(path, version, onSessionExpired) {
  const [result, setResult] = useState(null);
  const key = `${path}|${version}`;
  useEffect(() => {
     const controller = new AbortController();
     api(path, { signal: controller.signal })
       .then((data) => {
         if (!controller.signal.aborted) setResult({ key, data });
       })
      .catch((error) => {
          if (controller.signal.aborted) return;
          if (error.status === 401) onSessionExpired();
          else setResult({ key, error: error.message });
      });
    return () => controller.abort();
  }, [key, path, onSessionExpired]);
  return result?.key === key ? result : { loading: true };
}
