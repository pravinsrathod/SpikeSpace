import { useState } from 'react';
import { Plus, Trash2, Save } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';
import type { TournamentPhase } from '../firebase/db';
import { clsx } from 'clsx';

export interface TournamentConfigData {
  name: string;
  expectedTeams: number;
  phases: TournamentPhase[];
  isAutoRules?: boolean;
  copyTeams?: boolean;
}

interface TournamentConfigFormProps {
  initialData?: Partial<TournamentConfigData>;
  onSubmit: (data: TournamentConfigData) => Promise<void>;
  submitLabel: string;
  onCancel?: () => void;
  allowCopyTeams?: boolean;
}

export function TournamentConfigForm({ initialData, onSubmit, submitLabel, onCancel, allowCopyTeams }: TournamentConfigFormProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState(initialData?.name || '');
  const [expectedTeams, setExpectedTeams] = useState(initialData?.expectedTeams || 8);
  const [phases, setPhases] = useState<TournamentPhase[]>(
    initialData?.phases && initialData.phases.length > 0
      ? initialData.phases
      : [{ id: uuidv4(), name: 'Group Stage', type: 'ROUND_ROBIN', teamsAdvancing: 4 }]
  );
  const [isAutoRules, setIsAutoRules] = useState(initialData?.isAutoRules ?? true);
  const [copyTeams, setCopyTeams] = useState(initialData?.copyTeams || false);
  const [loading, setLoading] = useState(false);

  const addPhase = () => {
    setPhases([...phases, { id: uuidv4(), name: `Phase ${phases.length + 1}`, type: 'KNOCKOUT', teamsAdvancing: 0 }]);
  };

  const removePhase = (id: string) => {
    setPhases(phases.filter(p => p.id !== id));
  };

  const updatePhase = (id: string, updates: Partial<TournamentPhase>) => {
    setPhases(phases.map(p => p.id === id ? { ...p, ...updates } : p));
  };

  const handleNext = () => {
    if (!name.trim()) return alert('Please enter a tournament name');
    
    if (isAutoRules) {
      handleSubmit(); // Skip step 2 if auto rules
    } else {
      setStep(2);
    }
  };

  const handleSubmit = async () => {
    let finalPhases = [...phases];
    
    if (isAutoRules) {
      finalPhases = []; // phases will be generated dynamically later
    } else {
      if (phases.length === 0) return alert('You must have at least one phase');
      // Ensure the last phase has 0 advancing teams
      finalPhases[finalPhases.length - 1].teamsAdvancing = 0;
    }

    setLoading(true);
    try {
      await onSubmit({ name, expectedTeams, phases: finalPhases, isAutoRules, copyTeams });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full text-left">
      {/* Wizard Progress Header */}
      <div className="flex items-center gap-2 mb-8 shrink-0">
        <div className={clsx("flex-1 h-2 rounded-full transition-colors", step >= 1 ? "bg-primary" : "bg-slate-800")} />
        <div className={clsx("flex-1 h-2 rounded-full transition-colors", step >= 2 ? "bg-primary" : "bg-slate-800")} />
      </div>

      <div className="flex-1 overflow-y-auto hide-scrollbar pb-6">
        {step === 1 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div>
              <h2 className="text-2xl font-bold text-white mb-2">Tournament Details</h2>
              <p className="text-slate-400 text-sm mb-6">Let's start with the basics.</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Tournament Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="input text-lg"
                placeholder="e.g. Summer Smash 2026"
                autoFocus
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Expected Number of Teams</label>
              <input
                type="number"
                min={2}
                value={expectedTeams || ''}
                onChange={(e) => setExpectedTeams(parseInt(e.target.value) || 0)}
                className="input"
              />
            </div>

            <div className="flex items-start gap-3 bg-slate-900/50 p-4 rounded-lg border border-primary/30">
              <input
                type="checkbox"
                id="isAutoRules"
                checked={isAutoRules}
                onChange={(e) => setIsAutoRules(e.target.checked)}
                className="w-5 h-5 mt-0.5 rounded border-white/10 bg-slate-950 text-primary focus:ring-primary focus:ring-offset-slate-900"
              />
              <label htmlFor="isAutoRules" className="cursor-pointer select-none">
                <div className="text-white font-bold mb-1">Use Standard Auto Rules</div>
                <div className="text-slate-400 text-sm leading-relaxed">
                  Automatically configure pools and IPL-style Page Playoffs (Qualifier, Eliminator) based on the number of teams.
                </div>
              </label>
            </div>

            {allowCopyTeams && (
              <div className="flex items-center gap-3 bg-slate-900/50 p-4 rounded-lg border border-white/5">
                <input
                  type="checkbox"
                  id="copyTeams"
                  checked={copyTeams}
                  onChange={(e) => setCopyTeams(e.target.checked)}
                  className="w-5 h-5 rounded border-white/10 bg-slate-950 text-primary focus:ring-primary focus:ring-offset-slate-900"
                />
                <label htmlFor="copyTeams" className="text-white cursor-pointer select-none">
                  Copy teams from original tournament
                </label>
              </div>
            )}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4 duration-300">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-2xl font-bold text-white mb-1">Phases Configuration</h2>
                <p className="text-slate-400 text-sm">Define how your tournament will be played.</p>
              </div>
              <button onClick={addPhase} className="btn btn-outline btn-sm">
                <Plus className="w-4 h-4 mr-1" /> Add Phase
              </button>
            </div>

            <div className="space-y-4">
              {phases.map((phase, idx) => (
                <div key={phase.id} className="p-4 bg-slate-900/50 border border-white/5 rounded-lg flex flex-col gap-4 relative group">
                  <div className="flex flex-col sm:flex-row gap-4">
                    <div className="flex-1">
                      <label className="block text-xs text-slate-500 mb-1">Phase Name</label>
                      <input
                        type="text"
                        value={phase.name}
                        onChange={(e) => updatePhase(phase.id, { name: e.target.value })}
                        className="input h-9 text-sm"
                      />
                    </div>
                    <div className="w-full sm:w-48">
                      <label className="block text-xs text-slate-500 mb-1">Type</label>
                      <select
                        value={phase.type}
                        onChange={(e) => updatePhase(phase.id, { type: e.target.value as 'ROUND_ROBIN' | 'KNOCKOUT' })}
                        className="input h-9 text-sm"
                      >
                        <option value="ROUND_ROBIN">Round Robin</option>
                        <option value="KNOCKOUT">Knockout</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {idx < phases.length - 1 ? (
                      <div>
                        <label className="block text-xs text-slate-500 mb-1">Teams advancing to next phase</label>
                        <input
                          type="number"
                          min={1}
                          value={phase.teamsAdvancing || ''}
                          onChange={(e) => updatePhase(phase.id, { teamsAdvancing: parseInt(e.target.value) || 0 })}
                          className="input h-9 text-sm w-32"
                        />
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 flex-1">Final Phase</div>
                    )}
                    
                    {phases.length > 1 && (
                      <button 
                        onClick={() => removePhase(phase.id)}
                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex gap-4 pt-4 shrink-0 border-t border-white/10 mt-auto">
        {step === 1 ? (
          <>
            {onCancel && (
              <button onClick={onCancel} className="btn btn-ghost flex-1 py-4">
                Cancel
              </button>
            )}
            <button 
              onClick={handleNext}
              disabled={loading}
              className="btn btn-primary flex-[2] py-4 font-bold"
            >
              {loading ? 'Saving...' : isAutoRules ? <><Save className="w-5 h-5 mr-2" /> {submitLabel}</> : 'Next Step'}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setStep(1)} disabled={loading} className="btn btn-ghost flex-1 py-4">
              Back
            </button>
            <button 
              onClick={handleSubmit}
              disabled={loading}
              className="btn btn-primary flex-[2] py-4 font-bold"
            >
              {loading ? 'Saving...' : <><Save className="w-5 h-5 mr-2" /> {submitLabel}</>}
            </button>
          </>
        )}
      </div>
    </div>
  );
}
