import { createContext, useContext, useState, useEffect } from 'react';
import { 
  type Team, type Match, type Tournament, 
  subscribeToTeams, subscribeToMatches, subscribeToTournament 
} from '../firebase/db';

interface TournamentContextType {
  tournament: Tournament | null;
  loading: boolean;
  error: string | null;
}

const TournamentContext = createContext<TournamentContextType>({
  tournament: null,
  loading: true,
  error: null
});

const TeamsContext = createContext<Team[]>([]);
const MatchesContext = createContext<Match[]>([]);

export const useTournament = () => useContext(TournamentContext);
export const useTeams = () => useContext(TeamsContext);
export const useMatches = () => useContext(MatchesContext);

export const TournamentProvider = ({ tournamentId, children }: { tournamentId: string, children: React.ReactNode }) => {
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [ready, setReady] = useState({ tournament: false, teams: false, matches: false });

  useEffect(() => {
    // Reset state when tournamentId changes
    setReady({ tournament: false, teams: false, matches: false });
    setLoading(true);
    
    if (!tournamentId) return;

    const handleError = (err: Error) => {
      setError(err.message);
      setLoading(false);
    };

    const unsubTournament = subscribeToTournament(
      tournamentId,
      (data) => {
        setTournament(data);
        setReady(prev => ({ ...prev, tournament: true }));
      },
      handleError
    );

    const unsubTeams = subscribeToTeams(
      tournamentId,
      (data) => {
        setTeams(data);
        setReady(prev => ({ ...prev, teams: true }));
      },
      handleError
    );

    const unsubMatches = subscribeToMatches(
      tournamentId,
      (data) => {
        setMatches(data);
        setReady(prev => ({ ...prev, matches: true }));
      },
      handleError
    );

    return () => {
      unsubTournament();
      unsubTeams();
      unsubMatches();
    };
  }, [tournamentId]);

  useEffect(() => {
    if (ready.tournament && ready.teams && ready.matches) {
      setLoading(false);
    }
  }, [ready]);

  return (
    <TournamentContext.Provider value={{ tournament, loading, error }}>
      <TeamsContext.Provider value={teams}>
        <MatchesContext.Provider value={matches}>
          {children}
        </MatchesContext.Provider>
      </TeamsContext.Provider>
    </TournamentContext.Provider>
  );
};
