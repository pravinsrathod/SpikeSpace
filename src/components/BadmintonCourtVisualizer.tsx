import React from 'react';

interface BadmintonCourtVisualizerProps {
  teamAColor: string;
  teamBColor: string;
  serve: 'A' | 'B' | null;
  scoreA?: number;
  scoreB?: number;
}

export const BadmintonCourtVisualizer: React.FC<BadmintonCourtVisualizerProps> = ({ teamAColor, teamBColor, serve, scoreA = 0, scoreB = 0 }) => {
  return (
    <div className="relative w-full max-w-2xl mx-auto aspect-[2/1] bg-[#1c8558] rounded-sm shadow-inner border-[6px] border-[#136140] overflow-hidden">
      {/* Outer bounds lines (Doubles) */}
      <div className="absolute inset-4 border-[2px] border-white/80" />
      
      {/* Singles side lines */}
      <div className="absolute top-[15%] bottom-[15%] left-4 right-4 border-y-[2px] border-white/80 border-x-0" />
      
      {/* Center line (Net) */}
      <div className="absolute top-4 bottom-4 left-1/2 w-[3px] bg-white/80 transform -translate-x-1/2" />
      
      {/* Short service lines */}
      <div className="absolute top-4 bottom-4 left-[35%] w-[2px] bg-white/80" />
      <div className="absolute top-4 bottom-4 right-[35%] w-[2px] bg-white/80" />
      
      {/* Long service line for doubles (back lines) */}
      <div className="absolute top-4 bottom-4 left-[10%] w-[2px] bg-white/80" />
      <div className="absolute top-4 bottom-4 right-[10%] w-[2px] bg-white/80" />

      {/* Center service dividing line */}
      <div className="absolute left-[10%] right-[65%] top-1/2 h-[2px] bg-white/80 transform -translate-y-1/2" />
      <div className="absolute right-[10%] left-[65%] top-1/2 h-[2px] bg-white/80 transform -translate-y-1/2" />
      
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
          className="absolute w-4 h-4 rounded-full bg-white shadow-[0_0_10px_rgba(255,255,255,1)] transform -translate-y-1/2 z-10 transition-all duration-700 ease-in-out"
          style={{ 
            left: serve === 'A' ? '25%' : '75%',
            top: serve === 'A' ? (scoreA % 2 === 0 ? '75%' : '25%') : (scoreB % 2 === 0 ? '25%' : '75%'),
            transform: 'translate(-50%, -50%)' 
          }}
        >
          {/* Shuttlecock stylized */}
          <div className="absolute -top-1 -left-1 w-6 h-6 border-b-2 border-r-2 border-white/80 rounded-full transform rotate-45" />
        </div>
      )}
    </div>
  );
};
