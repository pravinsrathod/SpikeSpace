import React from 'react';
import { useMatches } from '../context/TournamentContext';
import { MatchCard } from './MatchCard';


interface BracketViewProps {
  onMatchSelect: (id: string) => void;
}

export const BracketView: React.FC<BracketViewProps> = ({ onMatchSelect }) => {
  const matches = useMatches();

  const maxRound = Math.max(...matches.map(m => m.round), 0);
  
  if (maxRound === 0) return null;

  return (
    <div className="flex gap-16 overflow-x-auto pb-8 pt-4 px-4 custom-scrollbar">
      {Array.from({ length: maxRound }).map((_, rIndex) => {
        const roundNum = rIndex + 1;
        const roundMatches = matches
          .filter(m => m.round === roundNum)
          .sort((a, b) => a.position - b.position);

        return (
          <div key={roundNum} className="flex flex-col justify-around min-w-[260px] relative">
            <h3 className="text-center font-bold text-slate-400 mb-8 uppercase tracking-widest text-sm">
              {roundNum === maxRound ? 'Finals' : 
               roundNum === maxRound - 1 ? 'Semi-Finals' : 
               roundNum === maxRound - 2 ? 'Quarter-Finals' : `Round ${roundNum}`}
            </h3>
            
            <div className="flex flex-col justify-around flex-1 gap-8">
              {roundMatches.map((match) => (
                <div key={match.id} className="relative">
                  <MatchCard match={match} onClick={() => onMatchSelect(match.id)} />
                  
                  {/* Visual Connection Lines */}
                  {roundNum < maxRound && (
                    <div className="absolute top-1/2 -right-16 w-16 h-px bg-slate-700 -z-10">
                      {match.position % 2 === 0 ? (
                        <div className="absolute right-0 top-0 w-px h-1/2 bg-slate-700 transform translate-y-full" style={{ height: 'calc(50% + 1rem)' }} />
                      ) : (
                        <div className="absolute right-0 bottom-0 w-px h-1/2 bg-slate-700 transform -translate-y-full" style={{ height: 'calc(50% + 1rem)' }} />
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
};
