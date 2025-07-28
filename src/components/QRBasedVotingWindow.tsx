import React, { useState, useEffect, useCallback, useRef } from 'react';
import DirectVotingWindow from './DirectVotingWindow';
import { BrowserQRCodeReader } from '@zxing/browser';
import AdminExitModal from './AdminExitModal';
import VoterIdInput from './VoterIdInput';

interface VotingWindowProps {
  orgId: string;
  electionId: string;
  sessionId: string;
  onClose: (opts?: { adminExit?: boolean }) => void;
}

const QRBasedVotingWindow: React.FC<VotingWindowProps> = (props) => {
  console.log("QRBasedVotingWindow component mounted");
  const { orgId, electionId, sessionId } = props;
  const [voters, setVoters] = useState<any[]>([]);
  const [voterIdInput, setVoterIdInput] = useState('');
  const [authError, setAuthError] = useState('');
  const [authenticatedVoter, setAuthenticatedVoter] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [mode, setMode] = useState<'qr' | 'voterid'>('qr');
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [scanning, setScanning] = useState(false);
  const qrCodeReaderRef = useRef<BrowserQRCodeReader | null>(null);
  const controlsRef = useRef<any>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [org, setOrg] = useState<any>(null);
  const [scannerKey, setScannerKey] = useState(0);

  // Fetch org info for password validation
  useEffect(() => {
    window.electronAPI.invoke('get-organizations').then((orgs: any[]) => {
      const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
      setOrg(foundOrg || null);
    });
  }, [orgId]);

  // Request camera permission when component mounts
  useEffect(() => {
    const requestPermission = async () => {
      try {
        // Request permission through main process
        await window.electronAPI.invoke('request-camera-permission');
      } catch (error) {
        console.log('Permission request handled by browser');
      }
    };
    
    requestPermission();
  }, []);

  // Escape key handler for admin modal (only before authentication)
  useEffect(() => {
    if (authenticatedVoter) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !showAuthModal) {
        setShowAuthModal(true);
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [authenticatedVoter, showAuthModal]);

  useEffect(() => {
    setLoading(true);
    window.electronAPI.invoke('get-voters', orgId).then((v: any[]) => {
      setVoters(v);
      setLoading(false);
      // Ensure scanner is ready for new session
      setMode('qr');
      setAuthenticatedVoter(null);
      setScannerKey(k => k + 1);
    });
  }, [orgId]);

  // Reset auth state when sessionId changes (e.g., after reconducting election)
  useEffect(() => {
    setAuthenticatedVoter(null);
    setVoterIdInput('');
    setAuthError('');
    setMode('qr');
  }, [sessionId]);

  // Initialize scanner with proper error handling
  useEffect(() => {
    if (mode !== 'qr' || authenticatedVoter || !videoRef.current) return;

    const initScanner = async () => {
      try {
        setScanning(true);
        
        // Clean up previous scanner if exists
        if (controlsRef.current) {
          controlsRef.current.stop();
          controlsRef.current = null;
        }
        
        // Initialize new scanner
        const codeReader = new BrowserQRCodeReader();
        qrCodeReaderRef.current = codeReader;
        
        // Start scanning
        if (videoRef.current) {
          const controls = await codeReader.decodeFromVideoDevice(
            undefined,
            videoRef.current,
            (result, _, controls) => {
              if (result) {
                handleScan(result.getText());
                setScanning(false);
                controls?.stop();
              }
            }
          );
          
          controlsRef.current = controls;
        }
      } catch (error: any) {
        console.error('Camera error:', error);
        setScanning(false);
        
        // Handle permission denied error
        if (error.name === 'NotAllowedError' || error.message?.includes('Permission')) {
          setAuthError('Camera access denied. Please allow camera access in system settings.');
        } else {
          setAuthError('Failed to access camera. Please check if another application is using it.');
        }
      }
    };

    // Small delay to ensure video element is ready
    const timeoutId = setTimeout(initScanner, 100);
    
    return () => {
      clearTimeout(timeoutId);
      if (controlsRef.current) {
        controlsRef.current.stop();
        controlsRef.current = null;
      }
      if (qrCodeReaderRef.current) {
        qrCodeReaderRef.current = null;
      }
    };
  }, [mode, authenticatedVoter, scannerKey]);

  // Duplicate check logic
  const checkAlreadyVoted = async (voter: any) => {
    const votes = await window.electronAPI.invoke('get-votes', { electionId, sessionId });
    return votes.some((vote: any) =>
      (vote.voter_id && vote.voter_id.toString().toLowerCase() === (voter.voter_id || voter.id).toString().toLowerCase())
    );
  };

  // QR scan handler
  const handleScan = async (result: string | null) => {
    if (!result) return;
    setChecking(true);
    setAuthError('');
    // Assume QR code contains the Voter ID
    const voter = voters.find(v => (v.voter_id || v.id).toString().toLowerCase() === result.trim().toLowerCase());
    if (!voter) {
      setAuthError('Invalid QR code. No matching voter found.');
      setChecking(false);
      return;
    }
    if (await checkAlreadyVoted(voter)) {
      setAuthError('You have already voted in this election.');
      setChecking(false);
      return;
    }
    setAuthenticatedVoter(voter);
    setChecking(false);
  };

  // Voter ID input handler
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
    if (await checkAlreadyVoted(voter)) {
      setAuthError('You have already voted in this election.');
      setChecking(false);
      return;
    }
    setAuthenticatedVoter(voter);
    setChecking(false);
  };

  // Callback to reset auth after each voting session
  const handleNextVoter = useCallback(() => {
    setAuthenticatedVoter(null);
    setVoterIdInput('');
    setAuthError('');
    setMode('qr');
  }, []);

  // Start/stop QR scanning
  useEffect(() => {
    if (mode === 'qr' && !authenticatedVoter && videoRef.current) {
      setScanning(true);
      qrCodeReaderRef.current = new BrowserQRCodeReader();
      qrCodeReaderRef.current.decodeFromVideoDevice(
        undefined,
        videoRef.current,
        (result, _unused, controls) => {
          controlsRef.current = controls;
          if (result) {
            handleScan(result.getText());
            setScanning(false);
            controls?.stop();
          }
        }
      );
    }
    return () => {
      setScanning(false);
      controlsRef.current?.stop();
    };
    // eslint-disable-next-line
  }, [mode, authenticatedVoter, videoRef.current, scannerKey]);

  if (loading) return <div style={{ color: '#fff', textAlign: 'center', marginTop: 60 }}>Loading voters...</div>;

  if (!authenticatedVoter) {
    return (
      <>
      <div style={{ minHeight: '100vh', background: '#181a23', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ background: '#232427', borderRadius: 18, padding: '2.5rem 2.2rem', boxShadow: '0 8px 32px #0008', minWidth: 340, maxWidth: 420 }}>
          <div style={{ color: '#4f8cff', fontWeight: 800, fontSize: 22, marginBottom: 18, textAlign: 'center' }}>
            Voter Authentication
          </div>
          {mode === 'qr' ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <video
                    key={scannerKey}
                  ref={videoRef}
                  style={{ width: '100%', maxWidth: 320, borderRadius: 12, background: '#111' }}
                  autoPlay
                  muted
                />
                {scanning && <div style={{ color: '#4f8cff', textAlign: 'center', marginTop: 8 }}>Scanning for QR code...</div>}
              </div>
              <button
                type="button"
                className="btn btn-link"
                style={{ color: '#4f8cff', fontWeight: 700, marginBottom: 10, textDecoration: 'underline', fontSize: 16 }}
                onClick={() => setMode('voterid')}
              >
                Authenticate with Voter ID instead
              </button>
            </>
          ) : (
            <>
              <form onSubmit={handleAuth} autoComplete="off">
                <label htmlFor="voterIdInput" style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8, display: 'block' }}>Enter Voter ID</label>
                <VoterIdInput
                  value={voterIdInput}
                  onChange={setVoterIdInput}
                  autoFocus={true}
                  disabled={checking}
                  className="add-org-input"
                />
                <button type="submit" style={{ width: '100%', background: '#4f8cff', color: '#fff', border: 'none', borderRadius: 10, fontWeight: 700, fontSize: 18, padding: '0.7rem 0', marginTop: 8 }} disabled={checking}>{checking ? 'Checking...' : 'Authenticate'}</button>
              </form>
              <button
                type="button"
                className="btn btn-link"
                style={{ color: '#4f8cff', fontWeight: 700, marginTop: 10, textDecoration: 'underline', fontSize: 16 }}
                onClick={() => setMode('qr')}
              >
                Use QR Scanner instead
              </button>
            </>
          )}
          {authError && <div style={{ color: '#eb445a', fontWeight: 600, marginTop: 10 }}>{authError}</div>}
          {authError && authError.includes('Camera access denied') && (
            <button
              type="button"
              style={{
                width: '100%',
                background: '#4f8cff',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontWeight: 700,
                fontSize: 16,
                padding: '0.7rem 0',
                marginTop: 10,
                cursor: 'pointer',
              }}
              onClick={async () => {
                try {
                  await window.electronAPI.invoke('open-permission-settings');
                } catch (error) {
                  console.error('Failed to open permission settings:', error);
                }
              }}
            >
              Open Camera Settings
            </button>
          )}
            {authError === 'You have already voted in this election.' && !authenticatedVoter && (
              <button
                type="button"
                style={{
                  width: '100%',
                  background: '#4f8cff',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 10,
                  fontWeight: 700,
                  fontSize: 18,
                  padding: '0.7rem 0',
                  marginTop: 18,
                  marginBottom: 0,
                  cursor: 'pointer',
                  boxShadow: '0 2px 12px #4f8cff22',
                  letterSpacing: '0.01em',
                  transition: 'background 0.2s, box-shadow 0.2s',
                }}
                onClick={() => {
                  setAuthenticatedVoter(null);
                  setVoterIdInput('');
                  setAuthError('');
                  setMode('qr');
                  setScannerKey(k => k + 1);
                }}
              >
                Scan Next Voter
              </button>
            )}
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
      window.electronAPI.invoke('close-voting-window');
      return;
    }
    if (props.onClose) props.onClose(opts);
  }} />;
};

export default QRBasedVotingWindow; 