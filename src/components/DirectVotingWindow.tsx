import React, { useState, useEffect, useCallback } from 'react';
import GradientButton1 from './GradientButton1';
import 'material-icons/iconfont/material-icons.css';
import AdminExitModal from './AdminExitModal';

console.log("DirectVotingWindow file loaded");

const ipc = window.electronAPI;

interface Candidate {
  id: number;
  name: string;
  symbol: string;
  symbolFile?: string | null;
  photo?: string | null;
  position: string; // Added position field
}

interface DirectVotingWindowProps {
  orgId: string;
  electionId: string;
  sessionId: string;
  onClose: (opts?: { adminExit?: boolean }) => void;
  onNextVoter?: () => void;
  voterId?: string;
  voterName?: string;
}

const DirectVotingWindow: React.FC<DirectVotingWindowProps> = ({ orgId, electionId, sessionId, onClose, onNextVoter, voterId, voterName }) => {
  console.log("DirectVotingWindow component mounted");
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [activePositions, setActivePositions] = useState<string[]>([]);
  const [currentPositionIndex, setCurrentPositionIndex] = useState(0);
  const [selectedCandidate, setSelectedCandidate] = useState<number | null>(null);
  const [votes, setVotes] = useState<Record<string, number>>({});
  const [showThankYou, setShowThankYou] = useState(false);
  const [waitingForNextVoter, setWaitingForNextVoter] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authPurpose, setAuthPurpose] = useState<'exit' | null>(null);
  const [authError, setAuthError] = useState('');

  const currentPosition = activePositions[currentPositionIndex];
  // FIX: Use position field for filtering
  const positionCandidates = candidates.filter(c => c.position === currentPosition);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Fetch organization and election data
        const orgs = await ipc.invoke('get-organizations');
        console.log('Fetched organizations:', orgs);
        const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));

        if (foundOrg) {
          const elections = await ipc.invoke('get-elections', foundOrg.id);
          console.log('Fetched elections:', elections);
          const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
          console.log('Found election:', foundElection);

          if (foundElection) {
            let positions = foundElection.active_positions;
            if (typeof positions === 'string') {
              try {
                positions = JSON.parse(positions);
              } catch (e) {
                positions = [];
              }
            }
            // Fallback: if positions is empty, use all positions from the election
            if ((!positions || positions.length === 0) && Array.isArray(foundElection.positions)) {
              positions = [...foundElection.positions];
            }
            setActivePositions(positions);
            console.log('Active positions:', positions);
            // Fetch candidates for all active positions
            const allCandidates: Candidate[] = [];
            for (const position of positions) {
              const positionCandidates = await ipc.invoke('get-candidates', { 
                organizationId: foundOrg.id, 
                position 
              });
              console.log(`Candidates for position ${position}:`, positionCandidates);
              allCandidates.push(...positionCandidates);
            }
            setCandidates(allCandidates);
            console.log('All candidates:', allCandidates);
          }
        }
      } catch (error) {
        console.error('Error fetching data:', error);
      }
      setLoading(false);
    };

    fetchData();
  }, [orgId, electionId]);

  // Hotkey handlers
  const handleKeyPress = useCallback((event: KeyboardEvent) => {
    console.log('Key pressed:', event.key, 'showThankYou:', showThankYou, 'showAuthModal:', showAuthModal);
    if (showAuthModal) return;
    if (showHelp) return;

    switch (event.key) {
      case 'Escape':
      case 'e':
      case 'E':
        event.preventDefault();
        setAuthPurpose('exit');
        setShowAuthModal(true);
        break;
      case 'ArrowRight':
      case 'n':
      case 'N':
        if (showThankYou) {
          event.preventDefault();
          // Only allow N/ArrowRight to advance to next voter on Thank You screen
          setVotes({});
          setSelectedCandidate(null);
          setShowThankYou(false);
          setWaitingForNextVoter(false);
          setCurrentPositionIndex(0);
          if (onNextVoter) onNextVoter();
        }
        // Do nothing during voting
        break;
      case 'ArrowLeft':
      case 'p':
      case 'P':
        if (!showThankYou) {
          event.preventDefault();
          handlePreviousPosition();
        }
        break;
      case 'r':
      case 'R':
        if (!showThankYou) {
          event.preventDefault();
          handleResetVote();
        }
        break;
      case 'h':
      case 'H':
        event.preventDefault();
        setShowHelp(true);
        break;
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
      case '0':
        if (!showThankYou) {
          event.preventDefault();
          const candidateIndex = parseInt(event.key) - 1;
          if (event.key === '0') {
            handleSelectCandidate(positionCandidates[9]?.id || null);
          } else {
            handleSelectCandidate(positionCandidates[candidateIndex]?.id || null);
          }
        }
        break;
    }
  }, [showAuthModal, showThankYou, showHelp, positionCandidates, onNextVoter]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyPress);
    return () => {
      document.removeEventListener('keydown', handleKeyPress);
    };
  }, [handleKeyPress]);

  // When showThankYou becomes true, force focus to document body
  useEffect(() => {
    if (showThankYou) {
      setTimeout(() => {
        if (document && document.body) document.body.focus();
      }, 100);
    }
  }, [showThankYou]);

  const handleSelectCandidate = (candidateId: number | null) => {
    setSelectedCandidate(candidateId);
  };

  const handleCastVote = async () => {
    if (selectedCandidate === null) return;

    // Play cast vote sound
    try {
      console.log('Requesting sound path for Cast Vote Sound.mp3');
      const soundPath = await window.electronAPI.getAssetPath('Cast Vote Sound.mp3');
      console.log('Received sound path:', soundPath);
      if (soundPath) {
        console.log('Creating Audio object with path:', soundPath);
        const audio = new Audio(soundPath);
        console.log('Audio object created, attempting to play');
        audio.play().catch(e => console.log('Audio play failed:', e));
      } else {
        console.log('Sound file not found');
      }
    } catch (error) {
      console.log('Error playing sound:', error);
    }

    // Save vote for current position
    const newVotes = { ...votes, [currentPosition]: selectedCandidate };
    setVotes(newVotes);

    // If not last position, advance to next position
    if (currentPositionIndex < activePositions.length - 1) {
      setCurrentPositionIndex(currentPositionIndex + 1);
      setSelectedCandidate(null);
    } else {
      // Last position: show thank you and save ballot
      setShowThankYou(true);
      setWaitingForNextVoter(true);
      // Save all votes to database with a unique session ID
      const voteData = {
        sessionId,
        electionId,
        orgId,
        votes: newVotes,
        timestamp: new Date().toISOString(),
        electionType: voterId ? 'VoterID' : 'Direct',
        ...(voterId ? { voter_id: voterId } : {})
      };
      try {
        await ipc.invoke('save-votes', voteData);
        console.log('Votes saved successfully:', voteData);
      } catch (error) {
        console.error('Error saving votes:', error);
      }
    }
  };

  // Hotkey handler for next voting session
  useEffect(() => {
    if (!waitingForNextVoter || showAuthModal) return;
    const handleNextVoterKey = (event: KeyboardEvent) => {
      if (event.key === 'Enter' || event.key.toLowerCase() === 'n') {
        // Reset for next voter
        setVotes({});
        setSelectedCandidate(null);
        setShowThankYou(false);
        setWaitingForNextVoter(false);
        setCurrentPositionIndex(0);
        if (onNextVoter) onNextVoter();
      }
    };
    window.addEventListener('keydown', handleNextVoterKey);
    return () => window.removeEventListener('keydown', handleNextVoterKey);
  }, [waitingForNextVoter, showAuthModal, onNextVoter]);



  const handlePreviousPosition = () => {
    if (currentPositionIndex > 0) {
      setCurrentPositionIndex(currentPositionIndex - 1);
      setSelectedCandidate(votes[activePositions[currentPositionIndex - 1]] || null);
    }
  };

  const handleResetVote = () => {
    setSelectedCandidate(null);
  };



  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{ color: '#fff', fontSize: 24, fontWeight: 600 }}>Loading Voting Interface...</div>
      </div>
    );
  }

  if (!loading && activePositions.length === 0) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'var(--dark)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999
      }}>
        <div style={{ color: '#fff', fontSize: 28, fontWeight: 700, textAlign: 'center' }}>
          No positions are available for voting.<br />
          Please contact the administrator.
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Voter Name Top Left */}
      {voterName && (
        <div style={{
          position: 'fixed',
          top: 24,
          left: 32,
          zIndex: 10000,
          color: '#4f8cff',
          fontWeight: 700,
          fontSize: 18,
          background: 'rgba(24,26,35,0.92)',
          borderRadius: 10,
          padding: '6px 18px',
          boxShadow: '0 2px 12px #0004',
          letterSpacing: '0.01em',
          pointerEvents: 'none',
        }}>
          {voterName}
                </div>
      )}
      <AdminExitModal
        show={showAuthModal}
        onClose={() => {
          setShowAuthModal(false);
          setAuthError('');
        }}
        onAuthenticate={async (password) => {
          try {
            // Use backend authentication which handles bcrypt comparison
            await window.electronAPI.invoke('authenticate-admin', { orgId, password });
                    setShowAuthModal(false);
                    setAuthError('');
                    if (window.electronAPI?.invoke) {
                      window.electronAPI.invoke('close-voting-window');
                    }
            onClose({ adminExit: true });
          } catch (error: any) {
                    setAuthError('Incorrect password.');
                  }
        }}
        error={authError}
        title="Admin Authentication"
        description={authPurpose === 'exit' ? 'Authenticate to exit the voting window.' : ''}
        buttonText="Exit Voting"
      />
      {showThankYou && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'var(--dark)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          flexDirection: 'column',
        }}>
          <h1 style={{ color: '#4f8cff', fontSize: 48, fontWeight: 800, marginBottom: 24 }}>Thank you for voting!</h1>
        </div>
      )}
      {!showThankYou && (
        <div style={{ minHeight: '100vh', background: 'var(--dark)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div
            className="evm-modern-ballot"
            style={{
              background: 'var(--dark-light)',
              borderRadius: 28,
              padding: '3.2rem 2.2rem',
              width: '100%',
              maxWidth: 700,
              minWidth: 320,
              minHeight: 400,
              maxHeight: 'calc(100vh - 80px)',
              margin: '40px auto',
              overflow: 'auto',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'flex-start',
              position: 'relative',
            }}
          >
            {/* Ready Lamp */}
            <div style={{ width: 32, height: 48, margin: '0 auto 2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <svg width="48" height="48" viewBox="0 0 48 48" style={{ display: 'block', overflow: 'visible' }}>
                <defs>
                  <filter id="lamp-light-shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feDropShadow dx="0" dy="0" stdDeviation="6" floodColor="#7fffa7" floodOpacity="0.7" />
                  </filter>
                </defs>
                <circle cx="24" cy="24" r="12" fill="#2ecc40" filter="url(#lamp-light-shadow)" />
              </svg>
            </div>
            {/* Position Title */}
            <h2 className="text-primary fw-bold mb-4" style={{ textAlign: 'center' }}>{currentPosition}</h2>
            {/* Candidate List */}
            <div
              style={{
                width: '100%',
                maxHeight: 10 * 64 + 8, // 10 rows of 64px + gap
                overflowY: positionCandidates.length > 7 ? 'auto' : 'visible',
                marginBottom: 24,
                marginTop: 8,
                paddingRight: 4,
                scrollbarWidth: 'thin',
              }}
            >
              {positionCandidates.length === 0 ? (
                <div style={{ color: '#fff', fontSize: 22, fontWeight: 600, textAlign: 'center', margin: '2rem 0' }}>
                  No candidates available for this position.
                </div>
              ) : (
                positionCandidates.map(candidate => (
                <div
                  className="evm-row"
                  key={candidate.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 12,
                    minHeight: 100,
                    padding: '0.4rem 0.2rem',
                    width: '100%',
                    maxWidth: 1000,
                    flexWrap: 'nowrap',
                    gap: 0,
                  }}
                >
                  <div
                    className="evm-candidate"
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '1.5rem',
                      minWidth: 0,
                      flex: 1,
                    }}
                  >
                    {candidate.photo && (
                      <img
                        src={candidate.photo}
                        alt="Candidate Photo"
                        className="evm-candidate-photo"
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 12,
                          objectFit: 'cover',
                          background: '#fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                        }}
                      />
                    )}
                    {candidate.symbol && (
                      <img
                        src={candidate.symbol}
                        alt="Symbol"
                        className="evm-candidate-symbol"
                        style={{
                          width: 80,
                          height: 80,
                          borderRadius: 12,
                          objectFit: 'cover',
                          background: '#fff',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                          marginLeft: candidate.photo ? 8 : 0,
                        }}
                      />
                    )}
                    <span
                      className="evm-name"
                      style={{
                        fontSize: 28,
                        fontWeight: 700,
                        color: '#fff',
                        marginLeft: (candidate.photo || candidate.symbol) ? 18 : 0,
                        whiteSpace: 'normal',
                        overflowWrap: 'break-word',
                        wordBreak: 'break-word',
                        maxWidth: 700,
                        lineHeight: 1.18,
                        minHeight: 36,
                        flex: 1,
                        minWidth: 0,
                      }}
                    >
                      {candidate.name}
                    </span>
                  </div>
                  <button
                    className={`evm-vote-btn${selectedCandidate === candidate.id ? ' selected' : ''}`}
                    style={{
                      width: 64,
                      height: 64,
                      borderRadius: '50%',
                      background: selectedCandidate === candidate.id ? '#2ecc40' : '#e0e0e0',
                      border: selectedCandidate === candidate.id ? '4px solid #2ecc40' : '4px solid #b0b0b0', // green border if selected, grey otherwise
                      boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 32,
                      color: selectedCandidate === candidate.id ? '#fff' : '#4f8cff',
                      transition: 'background 0.2s, border 0.2s',
                      marginLeft: 24,
                    }}
                    onClick={() => handleSelectCandidate(candidate.id)}
                    aria-label={`Vote for ${candidate.name}`}
                  >
                    {selectedCandidate === candidate.id ? (
                      <span className="material-icons" style={{ color: '#fff', fontSize: 36, filter: 'drop-shadow(0 0 6px #2ecc4066)' }}>check</span>
                    ) : ''}
                  </button>
                </div>
                ))
              )}
            </div>
            {/* Cast Vote Button */}
            <GradientButton1
              style={{ width: '100%', marginTop: 24, fontWeight: 700, fontSize: 18, borderRadius: 32, padding: '0.7rem 0', letterSpacing: '0.01em', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}
              onClick={handleCastVote}
              disabled={selectedCandidate === null || showThankYou}
            >
              Cast Vote
            </GradientButton1>
            {/* Thank You Message */}
            {showThankYou && (
              <div className="text-center mt-4">
                <span className="material-icons" style={{ fontSize: 48, color: '#2ecc40', marginBottom: 8 }}>check_circle</span>
                <div className="qb-greeting" style={{ fontSize: 24, marginBottom: 8 }}>Thank you for voting!</div>
                <div className="subtext">Please call the next voter.</div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};

export default DirectVotingWindow; 