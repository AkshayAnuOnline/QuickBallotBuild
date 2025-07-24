import React, { useState, useEffect, useCallback } from 'react';
import DirectVotingWindow from './DirectVotingWindow';
import AdminExitModal from './AdminExitModal';
import VoterIdInput from './VoterIdInput';

interface VotingWindowProps {
  orgId: string;
  electionId: string;
  sessionId: string;
  onClose: (opts?: { adminExit?: boolean }) => void;
}

const VoterIDBasedVotingWindow: React.FC<VotingWindowProps> = (props) => {
  console.log('VoterIDBasedVotingWindow file loaded');
  console.log("VoterIDBasedVotingWindow component mounted");
  const { orgId, electionId, sessionId } = props;
  const [voters, setVoters] = useState<any[]>([]);
  const [voterIdInput, setVoterIdInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticatedVoter, setAuthenticatedVoter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [org, setOrg] = useState<any>(null);

  useEffect(() => {
    setLoading(true);
    window.electronAPI.invoke('get-voters', orgId).then((v: any[]) => {
      setVoters(v);
      setLoading(false);
    });
  }, [orgId]);

  useEffect(() => {
    window.electronAPI.invoke('get-organizations').then((orgs: any[]) => {
      const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
      setOrg(foundOrg || null);
    });
  }, [orgId]);

  // Reset auth state when sessionId changes (e.g., after reconducting election)
  useEffect(() => {
    setAuthenticatedVoter(null);
    setVoterIdInput('');
    setAuthError('');
  }, [sessionId]);

  useEffect(() => {
    // Always allow Escape to open admin modal, regardless of state
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showAuthModal) {
        setShowAuthModal(true);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [showAuthModal]);



  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setChecking(true);
    const voter = voters.find(v => (v.voter_id || v.id).toString().toLowerCase() === voterIdInput.trim().toLowerCase());
    if (!voter) {
      setAuthError('Invalid Voter ID. Please try again.');
      setChecking(false);
      return;
    }
    // Check if already voted in this session/election
    try {
      const votes = await window.electronAPI.invoke('get-votes', { electionId, sessionId });
      const alreadyVoted = votes.some((vote: any) => {
        return (
          (vote.voter_id && vote.voter_id.toString().toLowerCase() === (voter.voter_id || voter.id).toString().toLowerCase()) ||
          (vote.voter_id === undefined && vote.candidate_id && vote.candidate_id.toString().toLowerCase() === (voter.voter_id || voter.id).toString().toLowerCase())
        );
      });
      if (alreadyVoted) {
        setAuthError('You have already voted in this election.');
        setChecking(false);
        return;
      }
      setAuthenticatedVoter(voter);
    } catch (err) {
      setAuthError('Error checking voting status. Please try again.');
    }
    setChecking(false);
  };

  // Callback to reset auth after each voting session
  const handleNextVoter = useCallback(() => {
    setAuthenticatedVoter(null);
    setVoterIdInput('');
    setAuthError('');
  }, []);

  if (loading) return <div style={{ color: '#fff', textAlign: 'center', marginTop: 60 }}>Loading voters...</div>;

  if (!authenticatedVoter) {
    return (
      <>
        <div style={{ minHeight: '100vh', background: '#181a23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ background: '#232427', borderRadius: 18, padding: '2.5rem 2.2rem', boxShadow: '0 8px 32px #0008', minWidth: 340 }}>
            <div style={{ color: '#4f8cff', fontWeight: 800, fontSize: 22, marginBottom: 18, textAlign: 'center' }}>
              Voter Authentication
            </div>
            <form onSubmit={handleAuth} autoComplete="off">
              <label htmlFor="voterIdInput" style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8, display: 'block' }}>Enter Voter ID</label>
              <VoterIdInput
                value={voterIdInput}
                onChange={setVoterIdInput}
                autoFocus={true}
                disabled={checking}
                className="add-org-input"
              />
              {authError && <div style={{ color: '#eb445a', fontWeight: 600, marginBottom: 10 }}>{authError}</div>}
              <button type="submit" style={{ width: '100%', background: '#4f8cff', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 18, padding: '0.7rem 0', marginTop: 8 }} disabled={checking}>{checking ? 'Checking...' : 'Authenticate'}</button>
            </form>
          </div>
        </div>
        <AdminExitModal
          show={showAuthModal}
          onClose={() => {
            setShowAuthModal(false);
            setAuthError('');
          }}
          onAuthenticate={async (password) => {
            if (!org) return;
            try {
              // Use backend authentication which handles bcrypt comparison
              await window.electronAPI.invoke('authenticate-admin', { orgId: org.id, password });
              setShowAuthModal(false);
              setAuthError('');
              props.onClose({ adminExit: true });
            } catch (error: any) {
              setAuthError('Incorrect password.');
            }
          }}
          error={authError}
          title="Admin Authentication"
          description="Authenticate to exit the voting window."
          buttonText="Exit Voting"
        />
      </>
    );
  }

  // Pass a prop to DirectVotingWindow to call handleNextVoter after each session and provide voterId
  return <DirectVotingWindow {...props} onNextVoter={handleNextVoter} voterId={(authenticatedVoter?.voter_id || authenticatedVoter?.id)?.toString()} voterName={authenticatedVoter?.name} onClose={opts => {
    if (opts?.adminExit) {
      console.log('Admin exit: requesting close-voting-window');
      window.electronAPI.invoke('close-voting-window');

      return;
    }
    if (props.onClose) props.onClose(opts);
  }} />;
};

export default VoterIDBasedVotingWindow; 