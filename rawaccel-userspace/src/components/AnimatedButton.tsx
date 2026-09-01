import React, { useState } from "react";

interface AnimatedButtonProps {
  onClick: () => Promise<void> | void;
  defaultText: React.ReactNode;
  successText: React.ReactNode;
  className?: string;
}

export function AnimatedButton({ onClick, defaultText, successText, className = "btn btn-primary" }: AnimatedButtonProps) {
  const [isSuccess, setIsSuccess] = useState(false);

  const handleClick = async () => {
    if (isSuccess) return;
    try {
      await onClick();
      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2000);
    } catch (e) {
      // Error handled by parent
    }
  };

  return (
    <button
      className={`${className} ${isSuccess ? "btn-success-animated" : ""}`}
      onClick={handleClick}
      disabled={isSuccess}
    >
      {isSuccess ? successText : defaultText}
    </button>
  );
}
