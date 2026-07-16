import React, { useState } from 'react';
import type { Team } from '../firebase/db';
import { Trash2, Edit2, Users, ChevronDown, ChevronUp } from 'lucide-react';

interface TeamCardProps {
  team: Team;
  onEdit?: (team: Team) => void;
  onDelete?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
}

export const TeamCard: React.FC<TeamCardProps> = ({ team, onEdit, onDelete, onApprove, onReject }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="card group relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-lg hover:shadow-black/50">
      {/* Top Color Bar */}
      <div 
        className="h-2 w-full" 
        style={{ backgroundColor: team.colorHex }}
      />
      
      <div className="p-5 flex flex-col h-full">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white truncate max-w-full">{team.name}</h3>
            {team.status === 'PENDING' && (
              <span className="inline-block px-2 py-0.5 mt-1 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full border border-amber-500/20">
                PENDING APPROVAL
              </span>
            )}
          </div>
          <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <button 
                onClick={() => onEdit(team)}
                className="text-slate-400 hover:text-primary transition-colors"
              >
                <Edit2 className="w-4 h-4" />
              </button>
            )}
            {onDelete && (
              <button 
                onClick={() => onDelete(team.id)}
                className="text-slate-400 hover:text-red-500 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
        
        <button 
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-sm text-slate-400 mb-3 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span>{team.players.length} Players</span>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        
        {isExpanded && (
          <div className="space-y-1 mb-4">
            {team.players.map((player, idx) => (
              <div key={idx} className="flex justify-between items-center text-sm text-slate-300 bg-white/5 rounded-md px-2 py-1">
                <span className="truncate">{player}</span>
                {idx === 0 && (
                  <span className="text-[10px] font-bold text-primary uppercase bg-primary/10 px-1.5 py-0.5 rounded ml-2 flex-shrink-0">
                    Captain
                  </span>
                )}
              </div>
            ))}
            {team.players.length === 0 && (
              <div className="text-sm text-slate-500 italic">No players added</div>
            )}
          </div>
        )}

        {/* Manager Actions for Pending Teams */}
        {(onApprove || onReject) && team.status === 'PENDING' && (
          <div className="mt-6 flex gap-2 pt-4 border-t border-white/5 mt-auto">
            {onApprove && (
              <button 
                onClick={() => onApprove(team.id)}
                className="flex-1 btn btn-sm bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500 hover:text-white"
              >
                Approve
              </button>
            )}
            {onReject && (
              <button 
                onClick={() => onReject(team.id)}
                className="flex-1 btn btn-sm bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500 hover:text-white"
              >
                Reject
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
