import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

interface Option {
  value: string | number;
  label: string;
}

interface CustomSelectProps {
  value: string | number;
  options: Option[];
  onChange: (val: any) => void;
  width?: string;
}

export function CustomSelect({ value, options, onChange, width = "120px" }: CustomSelectProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((o) => o.value === value) || options[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} style={{ position: "relative", width }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="input-field selectable"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          cursor: "pointer",
          paddingRight: "0.5rem",
          paddingLeft: "0.75rem",
          textAlign: "left",
          border: isOpen ? "1px solid var(--color-primary)" : "1px solid var(--border)",
          boxShadow: isOpen ? "0 0 0 2px var(--color-primary-bg)" : "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selectedOption?.label}
        </span>
        <ChevronDown 
          size={16} 
          style={{ 
            color: "var(--text-muted)", 
            transform: isOpen ? "rotate(180deg)" : "rotate(0deg)",
            transition: "transform 0.2s ease"
          }} 
        />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -5 }}
            transition={{ duration: 0.15 }}
            style={{
              position: "absolute",
              top: "calc(100% + 4px)",
              left: 0,
              width: "100%",
              backgroundColor: "var(--bg-panel)",
              border: "1px solid var(--border)",
              borderRadius: "var(--radius-sm)",
              boxShadow: "var(--shadow-panel)",
              zIndex: 100,
              overflow: "hidden",
            }}
          >
            {options.map((option) => (
              <div
                key={option.value}
                onClick={() => {
                  onChange(option.value);
                  setIsOpen(false);
                }}
                style={{
                  padding: "0.5rem 0.75rem",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                  color: value === option.value ? "var(--color-primary)" : "var(--text-main)",
                  backgroundColor: value === option.value ? "var(--color-primary-bg)" : "transparent",
                  fontFamily: "'Inter', sans-serif",
                  fontWeight: value === option.value ? 600 : 500,
                  transition: "background-color 0.15s",
                }}
                onMouseEnter={(e) => {
                  if (value !== option.value) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "var(--bg-input)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (value !== option.value) {
                    (e.currentTarget as HTMLDivElement).style.backgroundColor = "transparent";
                  }
                }}
              >
                {option.label}
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
