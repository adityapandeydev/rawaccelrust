import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccelArgs } from '../types';
import { generateGraphData, GraphPoint } from '../math';
import { Zap, Activity, TrendingUp } from 'lucide-react';

interface CurveGraphProps {
  argsX: AccelArgs;
  argsY: AccelArgs;
  maxSpeed?: number;
  maxMultiplier?: number;
  maxVelocity?: number;
  maxGain?: number;
  showExtras: boolean;
}

export function CurveGraph({ 
  argsX, 
  argsY, 
  maxSpeed = 50, 
  maxMultiplier = 4,
  maxVelocity = 100,
  maxGain = 4,
  showExtras
}: CurveGraphProps) {

  const dataX = useMemo(() => generateGraphData(argsX, maxSpeed, 200), [argsX, maxSpeed]);
  const dataY = useMemo(() => generateGraphData(argsY, maxSpeed, 200), [argsY, maxSpeed]);

  const isSame = JSON.stringify(argsX) === JSON.stringify(argsY);

  const generatePath = (data: GraphPoint[], key: keyof GraphPoint, maxY: number) => {
    if (data.length === 0) return "";
    const mapPoint = (x: number, y: number) => {
      const px = (x / maxSpeed) * 100;
      const py = 100 - (y / maxY) * 100;
      return `${px},${py}`;
    };
    const start = mapPoint(data[0].x, data[0][key]);
    const path = [`M ${start}`];
    for (let i = 1; i < data.length; i++) {
      path.push(`L ${mapPoint(data[i].x, data[i][key])}`);
    }
    return path.join(" ");
  };

  const renderGraph = (
    title: string, 
    icon: React.ReactNode, 
    dataKey: keyof GraphPoint, 
    maxY: number, 
    yLabel: string, 
    color: string, 
    isFirst: boolean = false
  ) => {
    const pathX = generatePath(dataX, dataKey, maxY);
    const pathY = generatePath(dataY, dataKey, maxY);

    const ticks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];

    return (
      <motion.div 
        key={dataKey}
        layout
        initial={{ opacity: 0, scale: 0.95, y: -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: -20 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}
      >
        <div style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center", 
          gap: "0.5rem", 
          marginBottom: "0.4rem", 
          marginTop: isFirst ? 0 : "0.5rem",
          color: "var(--text-main)", 
          fontSize: "0.9rem", 
          fontWeight: 700 
        }}>
          {icon} <span style={{ letterSpacing: "0.02em" }}>{title}</span>
        </div>
        <div style={{ flex: 1, position: "relative", border: "1px solid var(--border)", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-input)", padding: "1rem 1.5rem 2.5rem 4rem", overflow: "hidden" }}>
          <svg width="100%" height="100%" style={{ overflow: "visible" }}>
            {/* Grid Lines & Labels */}
            {ticks.map(p => {
              const isZero = p === 0;
              const yPos = `${100 - (p * 100)}%`;
              return (
                <g key={`grid-y-${p}`}>
                  {!isZero && <line x1="0" y1={yPos} x2="100%" y2={yPos} stroke="var(--border)" strokeWidth="1" />}
                  <text x="-10" y={yPos} fill="var(--text-muted)" fontSize="10" fontWeight="500" dominantBaseline="middle" textAnchor="end">
                    {(p * maxY).toFixed(dataKey === 'sensitivity' ? 2 : 0)}
                  </text>
                </g>
              );
            })}
            
            {ticks.map(p => {
              const isZero = p === 0;
              const xPos = `${p * 100}%`;
              return (
                <g key={`grid-x-${p}`}>
                  {!isZero && <line x1={xPos} y1="0" x2={xPos} y2="100%" stroke="var(--border)" strokeWidth="1" />}
                  <text x={xPos} y="100%" dy="16" fill="var(--text-muted)" fontSize="10" fontWeight="500" textAnchor="middle">
                    {(p * maxSpeed).toFixed(0)}
                  </text>
                </g>
              );
            })}
            
            {/* Main Axes */}
            <line x1="0" y1="0" x2="0" y2="100%" stroke="var(--text-main)" strokeWidth="2.5" />
            <line x1="0" y1="100%" x2="100%" y2="100%" stroke="var(--text-main)" strokeWidth="2.5" />
            
            {/* The X Curve */}
            <path d={pathX} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            
            {/* The Y Curve */}
            {!isSame && (
              <path d={pathY} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 6" />
            )}
          </svg>
          
          {/* X-Axis Title */}
          <div style={{ position: "absolute", bottom: 6, left: "50%", transform: "translateX(-50%)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-main)", letterSpacing: "0.02em" }}>
            Input Speed (counts/ms)
          </div>
          
          {/* Y-Axis Title */}
          <div style={{ position: "absolute", top: "50%", left: 16, transform: "translate(-50%, -50%) rotate(-90deg)", transformOrigin: "center center", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-main)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
            {yLabel}
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", overflowY: "auto", minHeight: 0 }} className="custom-scrollbar">
        {renderGraph("Sensitivity", <Zap size={15} color="var(--color-sensitivity)" />, "sensitivity", maxMultiplier, "Ratio of Output to Input", "var(--color-sensitivity)", true)}
        
        <AnimatePresence mode="popLayout">
          {showExtras && renderGraph("Velocity", <Activity size={15} color="#10b981" />, "velocity", maxVelocity, "Output Velocity (counts/ms)", "#10b981")}
          {showExtras && renderGraph("Gain", <TrendingUp size={15} color="#f59e0b" />, "gain", maxGain, "Slope of Velocity", "#f59e0b")}
        </AnimatePresence>
      </div>

      {/* Legend */}
      {!isSame && (
        <div style={{ display: "flex", justifyContent: "center", gap: "1.5rem", marginTop: "1rem", fontSize: "0.75rem", color: "var(--text-muted)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "16px", height: "3px", backgroundColor: "var(--color-primary)" }} /> X Axis
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <div style={{ width: "16px", height: "3px", backgroundColor: "var(--color-accent)", borderBottom: "2px dashed var(--bg-app)" }} /> Y Axis
          </div>
        </div>
      )}
    </div>
  );
}
