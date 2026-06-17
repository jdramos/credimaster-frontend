import { useEffect, useRef } from "react";

const IDLE_TIME = 60 * 60 * 1000; // 1 hora

export default function IdleSessionHandler() {
  const timeoutRef = useRef(null);

  const logoutByInactivity = () => {
    localStorage.setItem(
      "sessionExpiredMessage",
      "Su sesión fue cerrada por inactividad. Debe iniciar sesión nuevamente.",
    );

    localStorage.removeItem("token");
    localStorage.removeItem("permissions");
    localStorage.removeItem("role_id");
    localStorage.removeItem("branches");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_name");
    localStorage.removeItem("full_name");
    localStorage.removeItem("tenant");

    window.location.replace("/login");
  };

  const resetTimer = () => {
    clearTimeout(timeoutRef.current);

    const token = localStorage.getItem("token");

    if (!token) return;

    timeoutRef.current = setTimeout(() => {
      logoutByInactivity();
    }, IDLE_TIME);
  };

  useEffect(() => {
    const events = [
      "mousemove",
      "mousedown",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    events.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timeoutRef.current);

      events.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  return null;
}
