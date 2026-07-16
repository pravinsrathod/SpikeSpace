import React from 'react';

interface CourtVisualizerProps {
  teamAColor: string;
  teamBColor: string;
  serve: 'A' | 'B' | null;
}

export const CourtVisualizer: React.FC<CourtVisualizerProps> = ({ teamAColor, teamBColor, serve }) => {
  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[2/1] bg-[#d97736] rounded-sm shadow-inner border-[6px] border-[#c06830] overflow-hidden">
      {/* Outer bounds lines */}
      <div className="absolute inset-4 border-2 border-white/80" />
      
      {/* Center line */}
      <div className="absolute top-4 bottom-4 left-1/2 w-[3px] bg-white/80 transform -translate-x-1/2" />
      
      {/* Attack lines (3m lines) */}
      <div className="absolute top-4 bottom-4 left-[35%] w-[2px] bg-white/80" />
      <div className="absolute top-4 bottom-4 right-[35%] w-[2px] bg-white/80" />
      
      {/* Net (Stylized) */}
      <div className="absolute top-2 bottom-2 left-1/2 w-3 bg-white/20 transform -translate-x-1/2 shadow-sm border-x border-white/40 flex flex-col justify-between overflow-hidden">
        {Array.from({length: 20}).map((_, i) => (
          <div key={i} className="w-full h-px bg-white/30" />
        ))}
      </div>

      {/* Team A Side Overlay */}
      <div 
        className="absolute inset-y-0 left-0 w-1/2 opacity-20 pointer-events-none transition-colors"
        style={{ backgroundColor: teamAColor }}
      />
      
      {/* Team B Side Overlay */}
      <div 
        className="absolute inset-y-0 right-0 w-1/2 opacity-20 pointer-events-none transition-colors"
        style={{ backgroundColor: teamBColor }}
      />

      {/* Serve Indicator Animation */}
      {serve && (
        <div 
          className="absolute top-1/2 w-6 h-6 rounded-full bg-white shadow-[0_0_15px_rgba(255,255,255,1)] transform -translate-y-1/2 z-10 transition-all duration-700 ease-in-out"
          style={{ 
            left: serve === 'A' ? '20%' : '80%',
            transform: 'translate(-50%, -50%)' 
          }}
        >
          <div className="absolute inset-1 rounded-full border border-slate-300" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-slate-300 transform -translate-y-1/2" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-slate-300 transform -translate-x-1/2" />
        </div>
      )}
    </div>
  );
};
