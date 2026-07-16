import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Layers, Loader2 } from 'lucide-react';
import { createTournament, type Tournament } from '../firebase/db';
import { useAuth } from '../context/AuthContext';
import { TournamentConfigForm, type TournamentConfigData } from '../components/TournamentConfigForm';
import { useEffect, useState } from 'react';
import { collection, getDocs, doc, writeBatch, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

export default function CreateTournamentPage() {
  const navigate = useNavigate();
  const { user, requireAuth } = useAuth();

  const [searchParams] = useSearchParams();
  const copyFrom = searchParams.get('copyFrom');
  const [initialData, setInitialData] = useState<Partial<TournamentConfigData> | undefined>(undefined);
  const [loading, setLoading] = useState(!!copyFrom);

  useEffect(() => {
    if (!copyFrom) return;
    const fetchOriginal = async () => {
      try {
        const snap = await getDoc(doc(db, 'tournaments', copyFrom));
        if (snap.exists()) {
          const t = snap.data() as Tournament;
          setInitialData({
            name: `${t.name} (Copy)`,
            expectedTeams: t.expectedTeams,
            phases: t.phases,
            copyTeams: true
          });
        }
      } catch (e) {
        console.error("Failed to fetch original tournament", e);
      } finally {
        setLoading(false);
      }
    };
    fetchOriginal();
  }, [copyFrom]);

  const handleCreate = async (data: TournamentConfigData) => {
    requireAuth(async () => {
      try {
        const tId = await createTournament({
          name: data.name,
          expectedTeams: data.expectedTeams,
          status: 'REGISTRATION',
          phases: data.phases,
          isAutoRules: data.isAutoRules,
          managerId: user!.uid
        });
        
        if (data.copyTeams && copyFrom) {
          const originalTeamsSnap = await getDocs(collection(db, 'tournaments', copyFrom, 'teams'));
          if (!originalTeamsSnap.empty) {
            const batch = writeBatch(db);
            originalTeamsSnap.forEach(tDoc => {
              const newTeamRef = doc(collection(db, 'tournaments', tId, 'teams'));
              batch.set(newTeamRef, { ...tDoc.data(), createdAt: new Date() });
            });
            await batch.commit();
          }
        }
        
        navigate(`/volleyball/tournament/${tId}`);
      } catch (err) {
        console.error(err);
        alert('Failed to create tournament');
      }
    });
  };

  return (
    <div className="max-w-3xl mx-auto w-full pt-8 pb-12">
      <button onClick={() => navigate('/volleyball')} className="btn btn-ghost mb-6">
        <ArrowLeft className="w-4 h-4 mr-2" /> Back to Hub
      </button>

      <div className="card p-8 text-center sm:text-left">
        <h1 className="text-3xl font-bold text-white mb-8 flex items-center justify-center sm:justify-start gap-3">
          <Layers className="w-8 h-8 text-primary" />
          Create New Tournament
        </h1>

        {loading ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>Loading tournament data...</p>
          </div>
        ) : (
          <TournamentConfigForm 
            initialData={initialData}
            allowCopyTeams={!!copyFrom}
            onSubmit={handleCreate} 
            submitLabel={user ? "Save & Configure" : "Sign in to Create"}
          />
        )}
      </div>
    </div>
  );
}
