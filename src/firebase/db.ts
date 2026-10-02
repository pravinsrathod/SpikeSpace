import { 
  collection, doc, setDoc, updateDoc, deleteDoc, 
  onSnapshot, query, orderBy, getDocs, Timestamp,
  writeBatch, addDoc, serverTimestamp, limit
} from 'firebase/firestore';
import { db } from './config';

// ----------------------------------------------------
// Types
// ----------------------------------------------------

export interface TournamentPhase {
  id: string; 
  name: string; // e.g., "Group Stage", "Semi-Finals"
  type: 'ROUND_ROBIN' | 'KNOCKOUT' | 'PAGE_PLAYOFFS';
  teamsAdvancing: number; // How many teams advance to the NEXT phase (0 for the final phase)
  teamIds?: string[]; // If provided, restricts this phase to only these specific teams
}

export interface Tournament {
  id: string;
  name: string;
  managerId: string;
  expectedTeams: number;
  status: 'REGISTRATION' | 'ACTIVE' | 'COMPLETED';
  phases: TournamentPhase[];
  isAutoRules?: boolean;
  createdAt: Timestamp | Date;
  winnerName?: string;
  // Cricket specific
  oversPerInnings?: number;
}

export interface Team {
  id: string;
  captainId: string; // the user who created the team
  name: string;
  players: string[];
  colorHex: string;
  status: 'PENDING' | 'APPROVED';
  createdAt: Timestamp | Date;
}

export interface CricketPlayerStats {
  runsScored: number;
  ballsFaced: number;
  fours: number;
  sixes: number;
  oversBowled: number;
  maidens: number;
  runsConceded: number;
  wicketsTaken: number;
  isOut: boolean;
  dismissalInfo?: string;
}

export interface CricketBallEvent {
  inning: 1 | 2;
  over: number; // the current over number (0-indexed)
  ball: number; // the ball number in the over (1-6+)
  bowlerName: string;
  batsmanName: string;
  runs: number; // runs off the bat
  extras: number;
  extraType?: 'WD' | 'NB' | 'B' | 'LB';
  isWicket: boolean;
  dismissalType?: 'BOWLED' | 'CAUGHT' | 'LBW' | 'RUN_OUT' | 'STUMPED' | 'HIT_WICKET';
  dismissedPlayer?: string;
}

export interface Match {
  id: string;
  tournamentId: string;
  teamAId: string | null;
  teamBId: string | null;
  teamAName: string;
  teamBName: string;
  name?: string; // e.g. 'Qualifier 1', 'Eliminator', 'Final'
  round: number;
  position: number;
  phaseId: string; // maps to TournamentPhase.id
  nextMatchId: string | null;
  status: 'PENDING' | 'LIVE' | 'COMPLETED';
  // Referee-configurable rules
  totalSets: number;
  pointsPerSet: number;
  pointsLastSet: number;
  // Scoring
  setsWonA: number;
  setsWonB: number;
  set1ScoreA: number;
  set1ScoreB: number;
  set2ScoreA: number;
  set2ScoreB: number;
  set3ScoreA: number;
  set3ScoreB: number;
  set4ScoreA: number;
  set4ScoreB: number;
  set5ScoreA: number;
  set5ScoreB: number;
  winnerId: string | null;
  currentServe: 'A' | 'B' | null;
  timeoutsRemainingA: number;
  timeoutsRemainingB: number;
  
  // --- Cricket Specific Fields ---
  tossWinnerId?: string | null;
  tossDecision?: 'BAT' | 'BOWL' | null;
  
  runsA?: number;
  wicketsA?: number;
  oversA?: number; // e.g., 5.1 for 5 overs 1 ball
  runsB?: number;
  wicketsB?: number;
  oversB?: number;
  
  currentInnings?: 1 | 2;
  battingTeamId?: string | null;
  targetScore?: number | null;
  
  strikerName?: string;
  nonStrikerName?: string;
  bowlerName?: string;
  
  playerStatsA?: Record<string, CricketPlayerStats>;
  playerStatsB?: Record<string, CricketPlayerStats>;
  ballHistory?: CricketBallEvent[];

  maxOversPerBowler?: number;
  maxWickets?: number;
  outPlayers?: string[];
  lastBowler?: string;

  updatedAt: Timestamp | Date;
}

// ----------------------------------------------------
// DB Helpers
// ----------------------------------------------------

// ---- Tournaments ----
export const subscribeToTournaments = (
  callback: (tournaments: Tournament[]) => void,
  onError?: (error: Error) => void,
  limitCount = 50,
  sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball'
) => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  const q = query(
    collection(db, coll), 
    orderBy('createdAt', 'desc'),
    limit(limitCount)
  );
  return onSnapshot(q, 
    (snapshot) => {
      const tournaments = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Tournament));
      callback(tournaments);
    }, 
    onError
  );
};

export const subscribeToTournament = (
  tournamentId: string,
  callback: (tournament: Tournament | null) => void,
  onError?: (error: Error) => void,
  sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball'
) => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  return onSnapshot(doc(db, coll, tournamentId), 
    (docSnap) => {
      if (docSnap.exists()) {
        callback({ id: docSnap.id, ...docSnap.data() } as Tournament);
      } else {
        callback(null);
      }
    },
    onError
  );
};

export const createTournament = async (tournament: Omit<Tournament, 'id' | 'createdAt'>, sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  const newRef = doc(collection(db, coll));
  await setDoc(newRef, {
    ...tournament,
    createdAt: new Date()
  });
  return newRef.id;
};

export const updateTournament = async (tournamentId: string, updates: Partial<Tournament>, sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  await updateDoc(doc(db, coll, tournamentId), updates);
};

// ---- Teams ----
export const subscribeToTeams = (
  tournamentId: string,
  callback: (teams: Team[]) => void,
  onError?: (error: Error) => void,
  sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball'
) => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  const q = query(collection(db, coll, tournamentId, 'teams'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, 
    (snapshot) => {
      const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      callback(teams);
    }, 
    onError
  );
};

export const addTeam = async (tournamentId: string, team: Omit<Team, 'id' | 'createdAt'>, sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  const teamsRef = collection(db, coll, tournamentId, 'teams');
  const docRef = await addDoc(teamsRef, {
    ...team,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateTeam = async (tournamentId: string, teamId: string, updates: Partial<Team>, sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  await updateDoc(doc(db, coll, tournamentId, 'teams', teamId), updates);
};

export const deleteTeam = async (tournamentId: string, teamId: string, sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  await deleteDoc(doc(db, coll, tournamentId, 'teams', teamId));
};

// ---- Matches ----

// Ensure all numeric / nullable fields on a Match document have safe defaults.
// Firestore may omit fields that were never written, which results in `undefined`
// at runtime despite TypeScript's compile-time types.  On iOS production builds,
// rendering `undefined` inside a React Native <Text> causes a hard native crash.
function sanitizeMatch(raw: Record<string, any>): Match {
  return {
    ...raw,
    round:               raw.round               ?? 0,
    position:            raw.position             ?? 0,
    status:              raw.status               ?? 'PENDING',
    totalSets:           raw.totalSets            ?? 1,
    pointsPerSet:        raw.pointsPerSet         ?? 25,
    pointsLastSet:       raw.pointsLastSet        ?? 15,
    setsWonA:            raw.setsWonA             ?? 0,
    setsWonB:            raw.setsWonB             ?? 0,
    set1ScoreA:          raw.set1ScoreA           ?? 0,
    set1ScoreB:          raw.set1ScoreB           ?? 0,
    set2ScoreA:          raw.set2ScoreA           ?? 0,
    set2ScoreB:          raw.set2ScoreB           ?? 0,
    set3ScoreA:          raw.set3ScoreA           ?? 0,
    set3ScoreB:          raw.set3ScoreB           ?? 0,
    set4ScoreA:          raw.set4ScoreA           ?? 0,
    set4ScoreB:          raw.set4ScoreB           ?? 0,
    set5ScoreA:          raw.set5ScoreA           ?? 0,
    set5ScoreB:          raw.set5ScoreB           ?? 0,
    winnerId:            raw.winnerId             ?? null,
    currentServe:        raw.currentServe         ?? null,
    timeoutsRemainingA:  raw.timeoutsRemainingA   ?? 2,
    timeoutsRemainingB:  raw.timeoutsRemainingB   ?? 2,
    teamAId:             raw.teamAId              ?? null,
    teamBId:             raw.teamBId              ?? null,
    teamAName:           raw.teamAName            ?? 'TBD',
    teamBName:           raw.teamBName            ?? 'TBD',
    nextMatchId:         raw.nextMatchId          ?? null,
    
    // Cricket safe defaults
    tossWinnerId:        raw.tossWinnerId         ?? null,
    tossDecision:        raw.tossDecision         ?? null,
    runsA:               raw.runsA                ?? 0,
    wicketsA:            raw.wicketsA             ?? 0,
    oversA:              raw.oversA               ?? 0,
    runsB:               raw.runsB                ?? 0,
    wicketsB:            raw.wicketsB             ?? 0,
    oversB:              raw.oversB               ?? 0,
    currentInnings:      raw.currentInnings       ?? 1,
    battingTeamId:       raw.battingTeamId        ?? null,
    targetScore:         raw.targetScore          ?? null,
    strikerName:         raw.strikerName          ?? '',
    nonStrikerName:      raw.nonStrikerName       ?? '',
    bowlerName:          raw.bowlerName           ?? '',
    playerStatsA:        raw.playerStatsA         ?? {},
    playerStatsB:        raw.playerStatsB         ?? {},
    ballHistory:         raw.ballHistory          ?? [],
    maxOversPerBowler:   raw.maxOversPerBowler    ?? undefined,
    maxWickets:          raw.maxWickets           ?? undefined,
    outPlayers:          raw.outPlayers           ?? [],
    lastBowler:          raw.lastBowler           ?? '',
  } as Match;
}

export const subscribeToMatches = (
  tournamentId: string,
  callback: (matches: Match[]) => void,
  onError?: (error: Error) => void,
  sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball'
) => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  const q = query(collection(db, coll, tournamentId, 'matches'), orderBy('round', 'asc'), orderBy('position', 'asc'));
  return onSnapshot(q, 
    (snapshot) => {
      const matches = snapshot.docs.map(d => sanitizeMatch({ id: d.id, ...d.data() }));
      callback(matches);
    }, 
    onError
  );
};

export const updateMatch = async (tournamentId: string, matchId: string, data: Partial<Match>, sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  const matchRef = doc(db, coll, tournamentId, 'matches', matchId);
  await updateDoc(matchRef, { ...data, updatedAt: new Date() });
};

export const setMatchesBulk = async (tournamentId: string, matches: Match[], sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  const BATCH_SIZE = 500;
  for (let i = 0; i < matches.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = matches.slice(i, i + BATCH_SIZE);
    for (const match of chunk) {
      const ref = doc(db, coll, tournamentId, 'matches', match.id);
      batch.set(ref, match);
    }
    await batch.commit();
  }
};

export const clearMatches = async (tournamentId: string, sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  const matchesSnap = await getDocs(collection(db, coll, tournamentId, 'matches'));
  const batch = writeBatch(db);
  matchesSnap.docs.forEach(d => batch.delete(d.ref));
  await batch.commit();
};

export const deleteTournament = async (tournamentId: string, sport: 'volleyball' | 'badminton' | 'cricket' = 'volleyball') => {
  const coll = sport === 'cricket' ? 'cricket_tournaments' : (sport === 'badminton' ? 'badminton_tournaments' : 'tournaments');
  const teamsRef = collection(db, coll, tournamentId, 'teams');
  const teamsSnap = await getDocs(teamsRef);
  
  const matchesRef = collection(db, coll, tournamentId, 'matches');
  const matchesSnap = await getDocs(matchesRef);

  const tRef = doc(db, coll, tournamentId);

  // Gather all references to delete
  const allRefs = [
    ...teamsSnap.docs.map(d => d.ref),
    ...matchesSnap.docs.map(d => d.ref),
    tRef
  ];

  // Firestore allows max 500 operations per batch
  const BATCH_SIZE = 500;
  for (let i = 0; i < allRefs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = allRefs.slice(i, i + BATCH_SIZE);
    chunk.forEach(ref => batch.delete(ref));
    await batch.commit();
  }
};
