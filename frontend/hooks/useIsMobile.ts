import { useEffect, useState } from "react";

const MOBILE_BREAKPOINT_PX = 768;

/** Was copy-pasted (useState + resize-listener useEffect) into 20+ pages. */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < MOBILE_BREAKPOINT_PX);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  return isMobile;
}
