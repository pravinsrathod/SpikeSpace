import { BrowserRouter as Router, Routes, Route, useParams, Navigate, Link } from 'react-router-dom';
import { TournamentProvider, useTournament } from './context/TournamentContext';
import HomeHubPage from './pages/HomeHubPage';
import CreateTournamentPage from './pages/CreateTournamentPage';
import TournamentLobbyPage from './pages/TournamentLobbyPage';
import TournamentBoardPage from './pages/TournamentBoardPage';
import MatchDashboardPage from './pages/MatchDashboardPage';
import LandingPage from './pages/LandingPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import { Trophy, LogIn, LogOut, User as UserIcon } from 'lucide-react';
import { AuthProvider, useAuth } from './context/AuthContext';

// Wrapper to provide tournament context based on URL param
function TournamentWrapper({ sport = 'volleyball' }: { sport?: 'volleyball' | 'badminton' }) {
  const { id } = useParams<{ id: string }>();
  if (!id) return <Navigate to="/" />;
  return (
    <TournamentProvider tournamentId={id} sport={sport}>
      <TournamentRouter sport={sport} />
    </TournamentProvider>
  );
}

// Internal router that decides which view to show based on tournament status
function TournamentRouter({ sport }: { sport: 'volleyball' | 'badminton' }) {
  const { tournament, loading } = useTournament();

  if (loading) {
    return <div className="flex-1 flex items-center justify-center text-slate-400">Loading tournament...</div>;
  }

  if (!tournament) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center">
        <h2 className="text-2xl font-bold text-white mb-4">Tournament not found</h2>
        <Link to="/" className="btn btn-primary">Back to Hub</Link>
      </div>
    );
  }

  // If registering, show lobby
  if (tournament.status === 'REGISTRATION') {
    return <TournamentLobbyPage sport={sport} />;
  }

  // Otherwise show the board (or allow nested routes for matches)
  return (
    <Routes>
      <Route path="/" element={<TournamentBoardPage sport={sport} />} />
      <Route path="/match/:matchId" element={<MatchWrapper sport={sport} />} />
    </Routes>
  );
}

function MatchWrapper({ sport }: { sport: 'volleyball' | 'badminton' }) {
  const { matchId } = useParams<{ matchId: string }>();
  if (!matchId) return <Navigate to=".." />;
  return <MatchDashboardPage matchId={matchId} sport={sport} />;
}

function AppContent() {
  const { user, requireAuth, logOut } = useAuth();

  return (
    <Router>
      <div className="h-[100dvh] flex flex-col overflow-hidden bg-slate-950 text-slate-200">
        {/* Navigation Bar */}
        <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-md shrink-0 z-50">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2 text-primary hover:opacity-80 transition-opacity">
              <Trophy className="w-6 h-6" />
              <h1 className="font-bold text-xl tracking-tight text-white">Pro<span className="text-primary">Manager</span></h1>
            </Link>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="hidden sm:flex items-center gap-2 text-sm text-slate-300">
                    <UserIcon className="w-4 h-4" />
                    <span className="truncate max-w-[150px]">{user.email}</span>
                  </div>
                  <button 
                    onClick={logOut}
                    className="btn btn-outline btn-sm border-white/10 hover:bg-white/5"
                  >
                    <LogOut className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Sign Out</span>
                  </button>
                </div>
              ) : (
                <button 
                  onClick={() => requireAuth(() => {})}
                  className="btn btn-primary btn-sm"
                >
                  <LogIn className="w-4 h-4 sm:mr-2" />
                  <span className="hidden sm:inline">Sign In</span>
                </button>
              )}
            </div>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto hide-scrollbar container mx-auto p-4 md:p-6 flex flex-col relative">
          <Routes>
            <Route path="/" element={<LandingPage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/volleyball" element={<HomeHubPage sport="volleyball" />} />
            <Route path="/volleyball/create" element={<CreateTournamentPage sport="volleyball" />} />
            <Route path="/volleyball/tournament/:id/*" element={<TournamentWrapper sport="volleyball" />} />
            <Route path="/tournament/:id/*" element={<TournamentWrapper sport="volleyball" />} />
            <Route path="/badminton" element={<HomeHubPage sport="badminton" />} />
            <Route path="/badminton/create" element={<CreateTournamentPage sport="badminton" />} />
            <Route path="/badminton/tournament/:id/*" element={<TournamentWrapper sport="badminton" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
