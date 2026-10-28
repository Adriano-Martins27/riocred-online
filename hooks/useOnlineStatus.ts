import { useEffect, useState } from "react";
import { Platform } from "react-native";

export function useOnlineStatus(): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (Platform.OS === "web" && typeof window !== "undefined") {
      setOnline(window.navigator.onLine);
      const on = () => setOnline(true);
      const off = () => setOnline(false);
      window.addEventListener("online", on);
      window.addEventListener("offline", off);
      return () => {
        window.removeEventListener("online", on);
        window.removeEventListener("offline", off);
      };
    }
    setOnline(true);
    return undefined;
  }, []);

  return online;
}
