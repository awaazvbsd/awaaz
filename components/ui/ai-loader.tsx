import { cn } from "@/lib/utils";
import { useState } from "react";

type AiLoaderProps = {
  className?: string;
};

export const Component = ({ className }: AiLoaderProps) => {
  const [count, setCount] = useState(0);

  return (
    <div className={cn("", className)}>
      <div className="loader-wrapper">
        <span className="loader-letter">G</span>
        <span className="loader-letter">e</span>
        <span className="loader-letter">n</span>
        <span className="loader-letter">e</span>
        <span className="loader-letter">r</span>
        <span className="loader-letter">a</span>
        <span className="loader-letter">t</span>
        <span className="loader-letter">i</span>
        <span className="loader-letter">n</span>
        <span className="loader-letter">g</span>

        <div className="loader"></div>
      </div>
    </div>
  );
};

export default Component;


