import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, LogOut, Trash2, ShieldAlert, Mail, Lock, Loader2 } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export function AccountSettingsModal({ isOpen, onClose }: Props) {
  const { user, logOut, deleteAccount } = useAuth();
  const [step, setStep] = useState<'OPTIONS' | 'CONFIRM_DELETE'>('OPTIONS');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !user) return null;

  const handleSignOut = async () => {
    try {
      await logOut();
      onClose();
    } catch (e: any) {
      alert('Failed to sign out');
    }
  };

  const handleDeleteAccount = async () => {
    setError('');
    setLoading(true);

    try {
      await deleteAccount(password);
      setLoading(false);
      onClose();
      alert('Your account and associated data have been permanently removed.');
    } catch (err: any) {
      console.error(err);
      setLoading(false);

      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Incorrect password. Please enter your current password to verify deletion.');
      } else if (err.code === 'auth/requires-recent-login' || err.message === 'REQUIRES_REAUTH') {
        setError('Please enter your account password to confirm deletion.');
      } else {
        setError(err.message || 'Failed to delete account. Please try again.');
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-slate-900 border border-white/10 rounded-2xl w-full max-w-md p-6 shadow-2xl relative" onClick={e => e.stopPropagation()}>
        {/* Close Button */}
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {step === 'OPTIONS' ? (
          <div>
            <h2 className="text-xl font-bold text-white mb-6 text-center">Account Settings</h2>

            {/* User Info Card */}
            <div className="bg-slate-950/60 border border-white/10 rounded-xl p-4 mb-6 flex items-center gap-3">
              <div className="bg-primary/20 p-2.5 rounded-full border border-primary/30 text-primary">
                <Mail className="w-5 h-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-slate-400">Signed In As</p>
                <p className="text-white font-bold text-sm truncate">{user.email}</p>
              </div>
            </div>

            {/* Actions */}
            <div className="space-y-3">
              {/* Sign Out */}
              <button 
                onClick={handleSignOut}
                className="w-full bg-slate-800 hover:bg-slate-700 p-4 rounded-xl border border-white/10 flex items-center justify-between transition-colors"
              >
                <div className="flex items-center gap-3">
                  <LogOut className="w-5 h-5 text-slate-400" />
                  <span className="text-slate-200 font-bold text-sm">Sign Out</span>
                </div>
              </button>

              {/* Danger Zone: Delete Account */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <p className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2">Danger Zone</p>
                <button 
                  onClick={() => {
                    setStep('CONFIRM_DELETE');
                    setError('');
                    setPassword('');
                  }}
                  className="w-full bg-red-500/10 hover:bg-red-500/20 p-4 rounded-xl border border-red-500/30 flex items-center justify-between transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <Trash2 className="w-5 h-5 text-red-400" />
                    <div>
                      <span className="text-red-400 font-bold text-sm block">Delete Account</span>
                      <span className="text-red-400/60 text-xs block">Permanently erase account & data</span>
                    </div>
                  </div>
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div>
            {/* Confirm Deletion Step */}
            <div className="text-center mb-6">
              <div className="bg-red-500/20 p-3 rounded-full inline-flex mb-3 border border-red-500/30 text-red-400">
                <ShieldAlert className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-white">Delete Account?</h2>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                This action is <strong className="text-red-400 font-bold">permanent</strong> and cannot be undone. All your credentials and shared data will be erased.
              </p>
            </div>

            {error ? (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                <p className="text-red-400 text-xs text-center">{error}</p>
              </div>
            ) : null}

            <div className="mb-6">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Enter Password to Confirm</label>
              <div className="relative">
                <div className="absolute left-3 top-3 text-slate-500">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-lg pl-9 pr-4 py-2.5 text-white text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                  placeholder="••••••••"
                  disabled={loading}
                />
              </div>
            </div>

            <div className="space-y-2">
              <button 
                onClick={handleDeleteAccount}
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 py-3 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Permanently Delete Account</span>
                  </>
                )}
              </button>

              <button 
                onClick={() => setStep('OPTIONS')}
                disabled={loading}
                className="w-full py-2.5 rounded-xl text-slate-400 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
