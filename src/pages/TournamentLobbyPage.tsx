import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTournament, useTeams } from '../context/TournamentContext';
import { addTeam, deleteTeam, updateTeam, updateTournament, setMatchesBulk, deleteTournament, type Team } from '../firebase/db';
import { TeamCard } from '../components/TeamCard';
import { PRESET_COLORS } from '../utils/colors';
import { Loader2, Users, Play, Settings, UserPlus, ClipboardList, Clock, ChevronDown, ChevronUp, ArrowLeft, Share2 } from 'lucide-react';
import { clsx } from 'clsx';
import { useAuth } from '../context/AuthContext';
import { generateDynamicTournament } from '../utils/tournamentGenerator';
import { TournamentConfigForm, type TournamentConfigData } from '../components/TournamentConfigForm';
import { v4 as uuidv4 } from 'uuid';
export default function TournamentLobbyPage({ sport = 'volleyball' }: { sport?: 'volleyball' | 'badminton' }) {
  const navigate = useNavigate();
  const { tournament } = useTournament();
  const teams = useTeams();
  const { user, requireAuth } = useAuth();
  
  const [newTeamName, setNewTeamName] = useState('');
  const [playersInput, setPlayersInput] = useState('');
  const [newTeamColor, setNewTeamColor] = useState(PRESET_COLORS[0]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditingRules, setIsEditingRules] = useState(false);

  const [activeTab, setActiveTab] = useState<'register' | 'approved' | 'pending'>('register');
  const [isManualFormExpanded, setIsManualFormExpanded] = useState(false);

  // Pools state for auto rules (even teams)
  const [poolATeamIds, setPoolATeamIds] = useState<string[]>([]);
  const [poolBTeamIds, setPoolBTeamIds] = useState<string[]>([]);

  const currentUserId = user?.uid;
  const isManager = tournament?.managerId === currentUserId && !!currentUserId;
  
  const approvedTeams = teams.filter(t => t.status === 'APPROVED');
  const pendingTeams = teams.filter(t => t.status === 'PENDING');

  useEffect(() => {
    if (tournament?.isAutoRules && approvedTeams.length % 2 === 0 && approvedTeams.length >= 4) {
      if (poolATeamIds.length + poolBTeamIds.length !== approvedTeams.length) {
        const half = Math.ceil(approvedTeams.length / 2);
        setPoolATeamIds(approvedTeams.slice(0, half).map(t => t.id));
        setPoolBTeamIds(approvedTeams.slice(half).map(t => t.id));
      }
    }
  }, [approvedTeams, tournament?.isAutoRules]);

  // Edit Team State
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editName, setEditName] = useState('');
  const [editPlayers, setEditPlayers] = useState('');
  const [editColor, setEditColor] = useState('');

  if (!tournament) return null;

  // A captain is someone who has created a team
  const userTeam = teams.find(t => t.captainId === currentUserId);

  const handleAddTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTeamName.trim() || isSubmitting) return;

    requireAuth(async () => {
      setIsSubmitting(true);
      try {
        await addTeam(tournament.id, {
          name: newTeamName.trim(),
          players: playersInput.split(',').map(p => p.trim()).filter(Boolean),
          colorHex: newTeamColor,
          status: isManager ? 'APPROVED' : 'PENDING',
          captainId: user!.uid
        }, sport);
        setNewTeamName('');
        setPlayersInput('');
      } finally {
        setIsSubmitting(false);
      }
    });
  };

  const handleStartTournament = async () => {
    if (approvedTeams.length < 2) return;
    setIsSubmitting(true);
    try {
      let finalPhases = tournament.phases;

      if (tournament.isAutoRules) {
        if (approvedTeams.length < 4) {
          alert('You need at least 4 teams for Auto Rules (Page Playoffs).');
          setIsSubmitting(false);
          return;
        }
        
        if (approvedTeams.length % 2 === 0) {
          // Even teams: Pool A and Pool B + Playoffs
          if (poolATeamIds.length + poolBTeamIds.length !== approvedTeams.length) {
            alert('All teams must be assigned to a pool.');
            setIsSubmitting(false);
            return;
          }
          finalPhases = [
            { id: uuidv4(), name: 'Pool A', type: 'ROUND_ROBIN', teamsAdvancing: 2, teamIds: poolATeamIds },
            { id: uuidv4(), name: 'Pool B', type: 'ROUND_ROBIN', teamsAdvancing: 2, teamIds: poolBTeamIds },
            { id: uuidv4(), name: 'Playoffs', type: 'PAGE_PLAYOFFS', teamsAdvancing: 0 }
          ];
        } else {
          // Odd teams: One big Round Robin + Playoffs
          finalPhases = [
            { id: uuidv4(), name: 'Group Stage', type: 'ROUND_ROBIN', teamsAdvancing: 4 },
            { id: uuidv4(), name: 'Playoffs', type: 'PAGE_PLAYOFFS', teamsAdvancing: 0 }
          ];
        }
        
        const allMatches = generateDynamicTournament(tournament.id, approvedTeams, finalPhases);
        await setMatchesBulk(tournament.id, allMatches, sport);

        // Save the generated phases to DB so board page knows about them!
        await updateTournament(tournament.id, { 
          phases: finalPhases, 
          status: 'ACTIVE',
          expectedTeams: approvedTeams.length
        }, sport);
      } else {
        const allMatches = generateDynamicTournament(tournament.id, approvedTeams, finalPhases);
        await setMatchesBulk(tournament.id, allMatches, sport);

        await updateTournament(tournament.id, { status: 'ACTIVE' }, sport);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to start tournament');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteTournament = async () => {
    if (!confirm('Are you sure you want to permanently delete this tournament? This action cannot be undone.')) return;
    setIsSubmitting(true);
    try {
      await deleteTournament(tournament.id, sport);
      navigate(`/${sport}`);
    } catch (err) {
      console.error(err);
      alert('Failed to delete tournament');
      setIsSubmitting(false);
    }
  };

  const handleEditClick = (t: Team) => {
    setEditingTeam(t);
    setEditName(t.name);
    setEditPlayers(t.players.join(', '));
    setEditColor(t.colorHex);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTeam) return;
    setIsSubmitting(true);
    try {
      await updateTeam(tournament.id, editingTeam.id, {
        name: editName.trim(),
        players: editPlayers.split(',').map(p => p.trim()).filter(Boolean),
        colorHex: editColor,
      }, sport);
      setEditingTeam(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateRules = async (data: TournamentConfigData) => {
    try {
      await updateTournament(tournament.id, data, sport);
      setIsEditingRules(false);
    } catch (err) {
      console.error(err);
      alert('Failed to update tournament rules');
    }
  };

  if (isEditingRules) {
    return (
      <div className="max-w-3xl mx-auto w-full pt-8 pb-12 px-4 sm:px-6">
        <div className="card p-6 md:p-8">
          <div className="flex items-center justify-between mb-8">
            <h1 className="text-3xl font-bold text-white flex items-center gap-3">
              <Settings className="w-8 h-8 text-primary" />
              Edit Tournament Rules
            </h1>
          </div>
          <TournamentConfigForm
            initialData={{ name: tournament.name, expectedTeams: tournament.expectedTeams, phases: tournament.phases, isAutoRules: tournament.isAutoRules }}
            onSubmit={handleUpdateRules}
            onCancel={() => setIsEditingRules(false)}
            submitLabel="Save Changes"
          />

          <div className="mt-12 pt-8 border-t border-red-500/20">
            <h2 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h2>
            <p className="text-slate-400 text-sm mb-4">
              Permanently delete this tournament and all its data. This action cannot be undone.
            </p>
            <button 
              onClick={handleDeleteTournament}
              disabled={isSubmitting}
              className="btn btn-outline border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white w-full py-3"
            >
              Delete Tournament
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[100dvh] lg:h-auto pb-20 lg:pb-0 overflow-hidden lg:overflow-visible">
      
      <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-4 flex flex-col md:flex-row md:items-center justify-between gap-4 shrink-0 border-b border-white/5 lg:border-none">
        <div>
          <button onClick={() => navigate(`/${sport}`)} className="btn btn-ghost mb-2 text-sm">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
          </button>
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-white">{tournament.name}</h2>
            <button 
              onClick={() => {
                navigator.clipboard.writeText(window.location.href);
                alert('Tournament link copied to clipboard!');
              }}
              className="btn btn-ghost btn-sm p-2 text-slate-400 hover:text-white rounded-full bg-white/5 hover:bg-white/10 transition-colors"
              title="Share Tournament"
            >
              <Share2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-3 gap-8 flex-1 lg:flex-none overflow-y-auto lg:overflow-visible hide-scrollbar pt-4 lg:pt-0">
      
      {/* Sidebar Form / Status */}
      <div className={clsx("lg:col-span-1", activeTab !== 'register' && "hidden lg:block")}>
        <div className="card p-6 lg:sticky lg:top-24">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white">
              {isManager ? 'Manager Dashboard' : 'Team Registration'}
            </h2>
            {isManager && (
              <button onClick={() => setIsEditingRules(true)} className="btn btn-outline btn-sm text-slate-400 hover:text-white">
                <Settings className="w-4 h-4 mr-1" /> Edit Rules
              </button>
            )}
          </div>

          <div className="mb-8 p-4 bg-slate-900/50 rounded-lg border border-white/5">
            <div className="text-sm text-slate-400 mb-1">Approved Teams</div>
            <div className="text-3xl font-bold text-white">
              {approvedTeams.length} <span className="text-lg text-slate-500 font-normal">/ {tournament.expectedTeams}</span>
            </div>
            
            {/* Progress bar */}
            <div className="w-full h-2 bg-slate-800 rounded-full mt-3 overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500"
                style={{ width: `${Math.min(100, (approvedTeams.length / tournament.expectedTeams) * 100)}%` }}
              />
            </div>
          </div>

          {isManager && tournament.status === 'REGISTRATION' && (
            <div className="mb-8">
              <p className="text-sm text-slate-400 mb-6">
                You are the manager of this tournament. Once all teams have registered, you can generate the draws and start the tournament.
              </p>

              {tournament.isAutoRules && approvedTeams.length % 2 === 0 && approvedTeams.length >= 4 && (
                <div className="mb-6">
                  <h3 className="text-white font-bold mb-3 text-sm">Pool Assignments</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-white/5">
                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Pool A</div>
                      {poolATeamIds.map(id => {
                        const t = approvedTeams.find(x => x.id === id);
                        return (
                          <div 
                            key={id} 
                            onClick={() => {
                              setPoolATeamIds(prev => prev.filter(x => x !== id));
                              setPoolBTeamIds(prev => [...prev, id]);
                            }} 
                            className="p-2 bg-slate-800 rounded mb-1 text-sm text-white cursor-pointer hover:bg-slate-700 flex justify-between items-center"
                          >
                            <span className="truncate mr-2">{t?.name}</span>
                            <span className="text-slate-500">→</span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="bg-slate-900/80 p-3 rounded-lg border border-white/5">
                      <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">Pool B</div>
                      {poolBTeamIds.map(id => {
                        const t = approvedTeams.find(x => x.id === id);
                        return (
                          <div 
                            key={id} 
                            onClick={() => {
                              setPoolBTeamIds(prev => prev.filter(x => x !== id));
                              setPoolATeamIds(prev => [...prev, id]);
                            }} 
                            className="p-2 bg-slate-800 rounded mb-1 text-sm text-white cursor-pointer hover:bg-slate-700 flex justify-between items-center"
                          >
                            <span className="text-slate-500">←</span>
                            <span className="truncate ml-2 text-right">{t?.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 text-center">Click a team to move it to the other pool.</p>
                </div>
              )}

              <button 
                onClick={handleStartTournament}
                disabled={approvedTeams.length < (tournament.isAutoRules ? 4 : 2) || isSubmitting}
                className="btn btn-primary w-full py-3"
              >
                {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <><Play className="w-5 h-5 mr-2" /> Start Tournament</>}
              </button>
            </div>
          )}

          {!isManager && userTeam ? (
            <div>
              <div className={clsx(
                "p-4 border rounded-lg text-sm mb-4",
                userTeam.status === 'APPROVED' 
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
              )}>
                {userTeam.status === 'APPROVED' 
                  ? <>You have successfully registered your team: <strong>{userTeam.name}</strong></>
                  : <>Your team <strong>{userTeam.name}</strong> is awaiting manager approval.</>}
              </div>
              <p className="text-sm text-slate-400">
                Waiting for the tournament manager to generate draws and start the tournament...
              </p>
            </div>
          ) : (
            <div className={clsx(isManager && "pt-8 border-t border-white/10")}>
              {isManager && (
                <button 
                  onClick={() => setIsManualFormExpanded(!isManualFormExpanded)}
                  className="flex items-center justify-between w-full bg-white/5 p-4 rounded-lg mb-4 hover:bg-white/10 transition-colors"
                >
                  <h3 className="text-lg font-bold text-white">Register a Team (Manual)</h3>
                  {isManualFormExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                </button>
              )}
              
              {(!isManager || isManualFormExpanded) && (
                <form onSubmit={handleAddTeam} className="space-y-6">
                  <div>
                    <label htmlFor="teamName" className="block text-sm font-medium text-slate-400 mb-2">
                      Team Name
                    </label>
                    <input
                      id="teamName"
                      type="text"
                      value={newTeamName}
                      onChange={(e) => setNewTeamName(e.target.value)}
                      className="input"
                      placeholder="e.g. The Spikers"
                      disabled={isSubmitting}
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="players" className="block text-sm font-medium text-slate-400 mb-2">
                      Players (comma separated)
                    </label>
                    <textarea
                      id="players"
                      value={playersInput}
                      onChange={(e) => setPlayersInput(e.target.value)}
                      className="input min-h-[80px] py-2"
                      placeholder="e.g. John, Jane, Mike"
                      disabled={isSubmitting}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-400 mb-3">
                      Team Color
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {PRESET_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTeamColor(color)}
                          className={clsx(
                            "w-10 h-10 rounded-full transition-all duration-200 border-2",
                            newTeamColor === color 
                              ? "border-white scale-110 shadow-lg shadow-black/50" 
                              : "border-transparent hover:scale-110 opacity-70 hover:opacity-100"
                          )}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>

                  <button 
                    type={user ? "submit" : "button"}
                    onClick={user ? undefined : () => requireAuth(() => {})}
                    disabled={isSubmitting || (!user ? false : !newTeamName.trim())}
                    className="btn btn-primary w-full"
                  >
                    {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (user ? 'Register Team' : 'Sign in to Register')}
                  </button>
                </form>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area - Teams List */}
      <div className="lg:col-span-2 space-y-8">
        
        {/* Pending Teams Section (Manager Only) */}
        {isManager && pendingTeams.length > 0 && (
          <div className={clsx(activeTab !== 'pending' && "hidden lg:block")}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-bold text-amber-400 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Pending Approvals ({pendingTeams.length})
              </h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 pb-4 lg:pb-0">
              {pendingTeams.map(team => (
                <div key={team.id} className="flex flex-col">
                  <TeamCard 
                    team={team} 
                    onDelete={(id) => deleteTeam(tournament.id, id, sport)}
                    onEdit={handleEditClick}
                    onApprove={(id) => updateTeam(tournament.id, id, { status: 'APPROVED' }, sport)}
                    onReject={(id) => deleteTeam(tournament.id, id, sport)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Approved Teams Section */}
        <div className={clsx(activeTab !== 'approved' && "hidden lg:block")}>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Approved Teams ({approvedTeams.length})
            </h2>
          </div>

          {approvedTeams.length === 0 ? (
            <div className="card p-12 text-center flex flex-col items-center justify-center border-dashed border-2 border-white/5 bg-transparent">
              <Users className="w-12 h-12 text-slate-600 mb-4" />
              <h3 className="text-lg font-bold text-white mb-2">No teams approved yet</h3>
              <p className="text-slate-400">
                {isManager ? 'Share the tournament link with captains or register teams manually.' : 'Share the tournament link with captains so they can register.'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4 pb-4 lg:pb-0">
              {approvedTeams.map(team => (
                <div key={team.id} className="flex flex-col">
                  <TeamCard 
                    team={team} 
                    onDelete={isManager || team.captainId === currentUserId ? (id: string) => deleteTeam(tournament.id, id, sport) : undefined}
                    onEdit={isManager || team.captainId === currentUserId ? handleEditClick : undefined}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      </div>

      {/* Edit Team Modal */}
      {editingTeam && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="card max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-200">
            <h2 className="text-xl font-bold text-white mb-6">Edit Team</h2>
            <form onSubmit={handleEditSubmit} className="space-y-6 text-left">
              <div>
                <label htmlFor="editTeamName" className="block text-sm font-medium text-slate-400 mb-2">
                  Team Name
                </label>
                <input
                  id="editTeamName"
                  type="text"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="input"
                  placeholder="e.g. The Spikers"
                  disabled={isSubmitting}
                  required
                />
              </div>

              <div>
                <label htmlFor="editPlayers" className="block text-sm font-medium text-slate-400 mb-2">
                  Players (comma separated)
                </label>
                <textarea
                  id="editPlayers"
                  value={editPlayers}
                  onChange={(e) => setEditPlayers(e.target.value)}
                  className="input min-h-[80px] py-2"
                  placeholder="e.g. John, Jane, Mike"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-400 mb-3">
                  Team Color
                </label>
                <div className="flex flex-wrap gap-3">
                  {PRESET_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditColor(color)}
                      className={clsx(
                        "w-10 h-10 rounded-full transition-all duration-200 border-2",
                        editColor === color 
                          ? "border-white scale-110 shadow-lg shadow-black/50" 
                          : "border-transparent hover:scale-110 opacity-70 hover:opacity-100"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-white/10">
                <button
                  type="button"
                  onClick={() => setEditingTeam(null)}
                  disabled={isSubmitting}
                  className="btn btn-ghost flex-1 py-3"
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={isSubmitting || !editName.trim()}
                  className="btn btn-primary flex-1 py-3"
                >
                  {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation Bar (Mobile) */}
      <div className="fixed bottom-0 left-0 right-0 bg-slate-950/95 backdrop-blur-md border-t border-white/10 p-2 pb-safe z-50 lg:hidden">
        <div className="flex bg-slate-900/80 rounded-lg p-1 border border-white/10 w-full max-w-md mx-auto">
          <button
            onClick={() => setActiveTab('register')}
            className={clsx("flex-1 px-2 py-3 text-xs font-bold rounded-md flex flex-col items-center justify-center gap-1 transition-all", activeTab === 'register' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white')}
          >
            <UserPlus className="w-5 h-5" /> <span>{isManager ? 'Manage' : 'Register'}</span>
          </button>
          <button
            onClick={() => setActiveTab('approved')}
            className={clsx("flex-1 px-2 py-3 text-xs font-bold rounded-md flex flex-col items-center justify-center gap-1 transition-all", activeTab === 'approved' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white')}
          >
            <ClipboardList className="w-5 h-5" /> <span>Approved</span>
          </button>
          {isManager && (
            <button
              onClick={() => setActiveTab('pending')}
              className={clsx("flex-1 px-2 py-3 text-xs font-bold rounded-md flex flex-col items-center justify-center gap-1 transition-all", activeTab === 'pending' ? 'bg-primary text-white shadow-lg' : 'text-slate-400 hover:text-white')}
            >
              <div className="relative">
                <Clock className="w-5 h-5" />
                {pendingTeams.length > 0 && (
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-amber-500 rounded-full" />
                )}
              </div>
              <span>Pending</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
