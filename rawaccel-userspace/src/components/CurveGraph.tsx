import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AccelArgs } from '../types';
import { generateGraphData, GraphPoint } from '../math';
import { Zap, Activity, TrendingUp } from 'lucide-react';

interface CurveGraphProps {
  argsX: AccelArgs;
  argsY: AccelArgs;
  visibleGraphs: string[];
  isExpanded: boolean;
}

export function CurveGraph({ 
  argsX, 
  argsY, 
  visibleGraphs,
  isExpanded
}: CurveGraphProps) {

  const maxSpeed = useMemo(() => {
    let m = isExpanded ? 200 : 80;
    if (argsX.cap_mode === "in" && argsX.cap.x > 0) m = Math.max(m, argsX.cap.x * 1.2);
    if (argsY.cap_mode === "in" && argsY.cap.x > 0) m = Math.max(m, argsY.cap.x * 1.2);
    return Math.ceil(m / 20) * 20;
  }, [argsX, argsY, isExpanded]);

  const dataX = useMemo(() => generateGraphData(argsX, maxSpeed, 200), [argsX, maxSpeed]);
  const dataY = useMemo(() => generateGraphData(argsY, maxSpeed, 200), [argsY, maxSpeed]);

  const isSame = JSON.stringify(argsX) === JSON.stringify(argsY);

  const getBounds = (key: keyof GraphPoint, isVelocity: boolean = false) => {
    const allVals = [...dataX.map(d => d[key] as number), ...dataY.map(d => d[key] as number)].filter(n => isFinite(n) && !isNaN(n));
    if (allVals.length === 0) return { min: 0, max: 1 };
    
    let min = Math.min(...allVals);
    let max = Math.max(...allVals);
    
    if (isVelocity) {
      min = 0;
      max = Math.ceil(max / 20) * 20;
      if (max < 100) max = 100;
    } else {
      const pad = (max - min) * 0.15;
      min = min - pad;
      max = max + pad;
      
      if (min < 0) min = 0;
      if (min > 0.9 && min <= 1.0) min = 0.9;
      if (max <= min) max = min + 1;
    }
    
    return { min, max };
  };

  const bounds = {
    sensitivity: getBounds('sensitivity'),
    velocity: getBounds('velocity', true),
    gain: getBounds('gain')
  };

  const generatePath = (data: GraphPoint[], key: keyof GraphPoint, minY: number, maxY: number) => {
    if (data.length === 0) return "";
    const range = maxY - minY;
    if (range <= 0) return "";
    
    const mapPoint = (x: number, y: number) => {
      const px = (x / maxSpeed) * 100;
      let py = 100 - ((y - minY) / range) * 100;
      if (py < 0) py = 0;
      if (py > 100) py = 100;
      return `${px},${py}`;
    };
    
    const start = mapPoint(data[0].x, data[0][key] as number);
    const path = [`M ${start}`];
    for (let i = 1; i < data.length; i++) {
      path.push(`L ${mapPoint(data[i].x, data[i][key] as number)}`);
    }
    return path.join(" ");
  };

  const renderGraph = (
    title: string, 
    icon: React.ReactNode, 
    dataKey: keyof GraphPoint, 
    yLabel: string, 
    color: string, 
    isFirst: boolean = false
  ) => {
    const { min: minY, max: maxY } = bounds[dataKey as 'sensitivity' | 'velocity' | 'gain'];
    const pathX = generatePath(dataX, dataKey, minY, maxY);
    const pathY = generatePath(dataY, dataKey, minY, maxY);

    // Fixed Y ticks (5 intervals)
    const yTicks = [0, 0.2, 0.4, 0.6, 0.8, 1.0];
    
    // Dynamic X ticks based on maxSpeed (intervals of 20)
    const numXTicks = maxSpeed / 20;
    const xTicks = Array.from({ length: numXTicks + 1 }, (_, i) => i / numXTicks);

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
        <div style={{ flex: 1, border: "1px solid var(--border)", borderRadius: "var(--radius-md)", backgroundColor: "var(--bg-input)", padding: "1rem 1.5rem 2.5rem 4rem", display: "flex", flexDirection: "column" }}>
          
          <div style={{ flex: 1, position: "relative" }}>
            {/* Grid Lines & Labels (Unscaled) */}
            <svg width="100%" height="100%" style={{ overflow: "visible", position: "absolute", top: 0, left: 0 }}>
              {/* Y Axis Grid */}
              {yTicks.map(p => {
                const isZero = p === 0;
                const yPos = `${100 - (p * 100)}%`;
                const yVal = minY + p * (maxY - minY);
                return (
                  <g key={`grid-y-${p}`}>
                    {!isZero && <line x1="0" y1={yPos} x2="100%" y2={yPos} stroke="var(--border)" strokeWidth="1" />}
                    <text x="-10" y={yPos} fill="var(--text-muted)" fontSize="10" fontWeight="500" dominantBaseline="middle" textAnchor="end">
                      {yVal.toFixed(dataKey === 'velocity' ? 0 : 2)}
                    </text>
                  </g>
                );
              })}
              
              {/* X Axis Grid */}
              {xTicks.map((p, i) => {
                const isZero = p === 0;
                const xPos = `${p * 100}%`;
                // To prevent crowding on large domains, only label every 2nd tick if very expanded, or skip some
                const showLabel = numXTicks <= 10 || (i % 2 === 0);
                
                return (
                  <g key={`grid-x-${p}`}>
                    {!isZero && <line x1={xPos} y1="0" x2={xPos} y2="100%" stroke="var(--border)" strokeWidth="1" />}
                    {showLabel && (
                      <text x={xPos} y="100%" dy="16" fill="var(--text-muted)" fontSize="10" fontWeight="500" textAnchor="middle">
                        {(p * maxSpeed).toFixed(0)}
                      </text>
                    )}
                  </g>
                );
              })}
              
              {/* Main Axes */}
              <line x1="0" y1="0" x2="0" y2="100%" stroke="var(--text-main)" strokeWidth="2.5" />
              <line x1="0" y1="100%" x2="100%" y2="100%" stroke="var(--text-main)" strokeWidth="2.5" />
            </svg>

            {/* The Curve Layer (Scaled) */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ overflow: "visible", position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
              {/* The X Curve */}
              <path d={pathX} fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
              
              {/* The Y Curve */}
              {!isSame && (
                <path d={pathY} fill="none" stroke="var(--color-accent)" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="6 6" vectorEffect="non-scaling-stroke" />
              )}
            </svg>
            
            {/* X-Axis Title */}
            <div style={{ position: "absolute", bottom: "-2.5rem", left: "50%", transform: "translateX(-50%)", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-main)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
              Input Speed (counts/ms)
            </div>
            
            {/* Y-Axis Title */}
            <div style={{ position: "absolute", top: "50%", left: "-2.75rem", transform: "translate(-50%, -50%) rotate(-90deg)", transformOrigin: "center center", fontSize: "0.75rem", fontWeight: 600, color: "var(--text-main)", letterSpacing: "0.02em", whiteSpace: "nowrap" }}>
              {yLabel}
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", width: "100%", position: "relative" }}>
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "0.5rem", overflowY: "auto", minHeight: 0 }} className="custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {visibleGraphs.includes("sensitivity") && renderGraph("Sensitivity", <Zap size={15} color="var(--color-sensitivity)" />, "sensitivity", "Ratio of Output to Input", "var(--color-sensitivity)", true)}
          {visibleGraphs.includes("velocity") && renderGraph("Velocity", <Activity size={15} color="#10b981" />, "velocity", "Output Velocity (counts/ms)", "#10b981")}
          {visibleGraphs.includes("gain") && renderGraph("Gain", <TrendingUp size={15} color="#f59e0b" />, "gain", "Slope of Velocity", "#f59e0b")}
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
