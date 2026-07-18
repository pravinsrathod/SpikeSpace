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
  sport: 'volleyball' | 'badminton' = 'volleyball'
) => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  const q = query(collection(db, coll), orderBy('createdAt', 'desc'), limit(limitCount));
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
  sport: 'volleyball' | 'badminton' = 'volleyball'
) => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
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

export const createTournament = async (tournament: Omit<Tournament, 'id' | 'createdAt'>, sport: 'volleyball' | 'badminton' = 'volleyball') => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  const newRef = doc(collection(db, coll));
  await setDoc(newRef, {
    ...tournament,
    createdAt: new Date()
  });
  return newRef.id;
};

export const updateTournament = async (tournamentId: string, updates: Partial<Tournament>, sport: 'volleyball' | 'badminton' = 'volleyball') => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  await updateDoc(doc(db, coll, tournamentId), updates);
};

// ---- Teams ----
export const subscribeToTeams = (
  tournamentId: string,
  callback: (teams: Team[]) => void,
  onError?: (error: Error) => void,
  sport: 'volleyball' | 'badminton' = 'volleyball'
) => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  const q = query(collection(db, coll, tournamentId, 'teams'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, 
    (snapshot) => {
      const teams = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Team));
      callback(teams);
    }, 
    onError
  );
};

export const addTeam = async (tournamentId: string, team: Omit<Team, 'id' | 'createdAt'>, sport: 'volleyball' | 'badminton' = 'volleyball') => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  const teamsRef = collection(db, coll, tournamentId, 'teams');
  const docRef = await addDoc(teamsRef, {
    ...team,
    createdAt: serverTimestamp()
  });
  return docRef.id;
};

export const updateTeam = async (tournamentId: string, teamId: string, updates: Partial<Team>, sport: 'volleyball' | 'badminton' = 'volleyball') => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  await updateDoc(doc(db, coll, tournamentId, 'teams', teamId), updates);
};

export const deleteTeam = async (tournamentId: string, teamId: string, sport: 'volleyball' | 'badminton' = 'volleyball') => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  await deleteDoc(doc(db, coll, tournamentId, 'teams', teamId));
};

// ---- Matches ----
export const subscribeToMatches = (
  tournamentId: string,
  callback: (matches: Match[]) => void,
  onError?: (error: Error) => void,
  sport: 'volleyball' | 'badminton' = 'volleyball'
) => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  const q = query(collection(db, coll, tournamentId, 'matches'), orderBy('round', 'asc'), orderBy('position', 'asc'));
  return onSnapshot(q, 
    (snapshot) => {
      const matches = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Match));
      callback(matches);
    }, 
    onError
  );
};

export const updateMatch = async (tournamentId: string, matchId: string, data: Partial<Match>, sport: 'volleyball' | 'badminton' = 'volleyball') => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  const matchRef = doc(db, coll, tournamentId, 'matches', matchId);
  await updateDoc(matchRef, { ...data, updatedAt: new Date() });
};

export const setMatchesBulk = async (tournamentId: string, matches: Match[], sport: 'volleyball' | 'badminton' = 'volleyball') => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
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

export const clearMatches = async (tournamentId: string, sport: 'volleyball' | 'badminton' = 'volleyball') => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
  const matchesSnap = await getDocs(collection(db, coll, tournamentId, 'matches'));
  const BATCH_SIZE = 500;
  for (let i = 0; i < matchesSnap.docs.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    const chunk = matchesSnap.docs.slice(i, i + BATCH_SIZE);
    chunk.forEach(d => batch.delete(d.ref));
    await batch.commit();
  }
};

export const deleteTournament = async (tournamentId: string, sport: 'volleyball' | 'badminton' = 'volleyball') => {
  const coll = sport === 'badminton' ? 'badminton_tournaments' : 'tournaments';
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
