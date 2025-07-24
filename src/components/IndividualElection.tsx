import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import PageBG from './PageBG';
import GradientButton1 from './GradientButton1';
import GlassButton from './GlassButton';
import { Card, Row, Col } from 'react-bootstrap';
import { FaCog, FaImage } from 'react-icons/fa';
import PopupContainer from './PopupContainer';
import ResultsWindow from './ResultsWindow';
import 'material-icons/iconfont/material-icons.css';

import { getNextSessionId } from './SessionIdUtils';
import HelpDrawer from './HelpDrawer';


const ipc = window.electronAPI;

const electionTypes = [
  { value: 'Direct', label: 'Direct Election' },
  { value: 'QR', label: 'QR-based' },
  { value: 'VoterID', label: 'Voter ID-based' },
];

const IndividualElection: React.FC = () => {
  const { orgId, electionId } = useParams();
  const navigate = useNavigate();
  const [election, setElection] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState('Direct');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState<any>(null);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [editPositions, setEditPositions] = useState<string[]>([]);
  const [editNewPosition, setEditNewPosition] = useState('');
  const [editPositionsError, setEditPositionsError] = useState('');
  const [positionCandidateCounts, setPositionCandidateCounts] = useState<Record<string, number>>({});
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteError, setDeleteError] = useState('');
  const [positionsToConduct, setPositionsToConduct] = useState<string[]>([]);
  const [startError, setStartError] = useState('');
  const [showVotingPasswordModal, setShowVotingPasswordModal] = useState(false);
  const [votingPassword, setVotingPassword] = useState('');
  const [votingPasswordError, setVotingPasswordError] = useState('');
  const [showResultsWindow, setShowResultsWindow] = useState(false);
  const [showVotingPassword, setShowVotingPassword] = useState(false);
  const [showDeletePassword, setShowDeletePassword] = useState(false);
  const [voterTypeInfo, setVoterTypeInfo] = useState('');
  const [votingPasswordPurpose, setVotingPasswordPurpose] = useState<'start' | 'end' | 'exit' | 'reconduct'>('end');
  const [voters, setVoters] = useState<any[]>([]);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const orgs = await ipc.invoke('get-organizations');
      const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
      if (foundOrg) {
        // Fetch voters and attach to org
        const voters = await ipc.invoke('get-voters', foundOrg.id);
        foundOrg.voters = voters;
        const elections = await ipc.invoke('get-elections', foundOrg.id);
        const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
        setElection(foundElection || null);
        setOrg(foundOrg || null);
        if (foundElection && foundElection.type) {
          setSelectedType(foundElection.type);
        } else {
          setSelectedType('Direct');
        }
      } else {
        setOrg(null);
      }
      setLoading(false);
    };
    fetchData();
  }, [orgId, electionId]);

  useEffect(() => {
    if (election) {
      setEditForm({
        name: election.name || '',
        positions: Array.isArray(election.positions) ? election.positions.join(', ') : '',
        logo: election.logo || '',
      });
      setEditPositions(Array.isArray(election.positions) ? election.positions : []);
      setEditLogoFile(null);
      setEditNewPosition('');
      setEditPositionsError('');
      
      // Initialize position selection for new elections
      if (election.status === 'Not Started' && positionsToConduct.length === 0) {
        setPositionsToConduct(Array.isArray(election.positions) ? [...election.positions] : []);
      }
      
      // Fetch candidate counts for each position
      const fetchCandidateCounts = async () => {
        if (!org || !election.positions || !Array.isArray(election.positions)) return;
        const counts: Record<string, number> = {};
        for (const position of election.positions) {
          try {
            const candidates = await ipc.invoke('get-candidates', { 
              organizationId: org.id, 
              position 
            });
            counts[position] = candidates.length;
          } catch (error) {
            counts[position] = 0;
          }
        }
        setPositionCandidateCounts(counts);
      };
      fetchCandidateCounts();
    }
  }, [election, org]);

  useEffect(() => {
    if (!orgId) return;
    ipc.invoke('get-voters', orgId).then((v: any[]) => {
      setVoters(v);
      if (!v || v.length === 0) {
        setVoterTypeInfo('Add at least one voter to enable QR-based or Voter ID-based elections.');
        if (selectedType === 'QR' || selectedType === 'VoterID') setSelectedType('Direct');
      } else {
        setVoterTypeInfo('');
      }
    });
  }, [orgId]);

  useEffect(() => {
    if (!loading && (!election || !org)) {
      const timeout = setTimeout(() => {
        navigate(`/organization/${orgId}`);
      }, 1500);
      return () => clearTimeout(timeout);
    }
  }, [loading, election, org, orgId, navigate]);

  const handleEditChange = (field: string, value: string) => {
    setEditForm((prev: any) => ({ ...prev, [field]: value }));
  };

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  const handleEditLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PNG, JPG, SVG, and WEBP images are allowed.');
        return;
      }
      setEditLogoFile(file);
      setEditForm((prev: any) => ({ ...prev, logo: '' }));
    }
  };
  const handleEditAddPosition = () => {
    if (editNewPosition.trim()) {
      setEditPositions([...editPositions, editNewPosition.trim()]);
      setEditNewPosition('');
      setEditPositionsError('');
    }
  };
  const handleEditRemovePosition = (idx: number) => {
    setEditPositions(editPositions.filter((_, i) => i !== idx));
  };
  const handleEditSave = async () => {
    if (!editForm) return;
    if (editPositions.length === 0 || editPositions.some(p => !p.trim())) {
      setEditPositionsError('At least one position is required.');
      return;
    }
    let logoData = editForm.logo;
    if (editLogoFile) {
      logoData = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(editLogoFile);
      });
    }
    const updated = {
      ...election,
      name: editForm.name.trim(),
      positions: editPositions,
      logo: logoData,
    };
    await ipc.invoke('update-election', updated);
    setShowEditModal(false);
    // Refresh election details
    const orgs = await ipc.invoke('get-organizations');
    const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
    if (foundOrg) {
      const elections = await ipc.invoke('get-elections', foundOrg.id);
      const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
      setElection(foundElection || null);
    }
  };

  const handleDeleteElection = async () => {
    setDeleteError('');
    if (!deletePassword.trim()) {
      setDeleteError('Password required.');
      return;
    }
    try {
      await ipc.invoke('delete-election', { orgId, electionId, password: deletePassword });
      setShowDeleteModal(false);
      // Redirect to organization page after deletion, replacing history
      navigate(`/organization/${orgId}`, { replace: true });
    } catch (e: any) {
      setDeleteError(e?.message || 'Incorrect password or failed to delete.');
    }
  };


  const handleTogglePosition = (pos: string) => {
    setPositionsToConduct(prev => prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos]);
  };
  const handleToggleSelectAll = () => {
    if (Array.isArray(election.positions) && positionsToConduct.length === election.positions.length) {
      setPositionsToConduct([]);
    } else {
      setPositionsToConduct(Array.isArray(election.positions) ? [...election.positions] : []);
    }
  };
  const handleStartElection = async () => {
    if (!positionsToConduct.length) {
      setStartError('Select at least one position to conduct the election for.');
      return;
    }
    
    // For Direct elections, show password modal first
    if (selectedType === 'Direct') {
      setVotingPasswordPurpose('start');
      setShowVotingPasswordModal(true);
      setVotingPasswordError('');
      setVotingPassword('');
      return;
    }
    
    // For other election types, proceed normally
    await startElectionProcess();
  };

  // For Direct elections, only update DB after password is correct
  const startElectionProcess = async () => {
    let sessionId = election.session_id;
    if (!sessionId) {
      // Fetch all existing session IDs for this election
      const allVotes = await ipc.invoke('get-votes', { electionId });
      const existingSessionIds = Array.from(new Set((allVotes || []).map((v: any) => v.session_id).filter(Boolean))) as string[];
      sessionId = getNextSessionId(org?.name || '', election?.id || 0, existingSessionIds);
    }
    // Fallback: if positionsToConduct is empty, use all positions
    let activePositions = positionsToConduct;
    if ((!activePositions || activePositions.length === 0) && Array.isArray(election.positions)) {
      activePositions = [...election.positions];
    }
    // For all election types, update DB and open voting window if not already in progress
    if (election.status !== 'In Progress') {
      // Set start_time if not already set
      const now = new Date().toISOString();
      await ipc.invoke('update-election', {
        ...election,
        active_positions: activePositions,
        status: 'In Progress',
        type: selectedType,
        session_id: sessionId,
        start_time: now,
      });
      setElection((prev: any) => ({ ...prev, session_id: sessionId }));
      await ipc.invoke('open-voting-window', { orgId, electionId, sessionId, type: selectedType });
      // Refresh election details
      const orgs = await ipc.invoke('get-organizations');
      const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
      if (foundOrg) {
        const elections = await ipc.invoke('get-elections', foundOrg.id);
        const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
        setElection(foundElection || null);
      }
      return;
    }
    // If already in progress, just refresh
    setStartError('');
    const orgs = await ipc.invoke('get-organizations');
    const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
    if (foundOrg) {
      const elections = await ipc.invoke('get-elections', foundOrg.id);
      const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
      setElection(foundElection || null);
    }
  };

  const handleVotingPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!votingPassword.trim()) {
      setVotingPasswordError('Password required.');
      return;
    }
    
    try {
      // Use backend authentication which handles bcrypt comparison
      await ipc.invoke('authenticate-admin', { orgId, password: votingPassword });
      setShowVotingPasswordModal(false);
      setVotingPassword('');
      setVotingPasswordError('');
      if (votingPasswordPurpose === 'end') {
        // End the election and redirect to results for all types
        const now = new Date().toISOString();
        await ipc.invoke('update-election', {
          ...election,
          status: 'Completed',
          end_time: now,
        });
        // Refresh election details
        const orgs = await ipc.invoke('get-organizations');
        const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
        if (foundOrg) {
          const elections = await ipc.invoke('get-elections', foundOrg.id);
          const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
          setElection(foundElection || null);
        }
        // Redirect to results page for all types
        navigate(`/organization/${orgId}/election/${electionId}/results`);
        return;
      } else if (votingPasswordPurpose === 'reconduct') {
        // Reconduct the election with previous settings
        await handleReconductElectionWithAuth();
        return;
      }
      await startElectionProcess();
    } catch (error: any) {
      setVotingPasswordError('Incorrect password.');
    }
  };

  const handleEndElection = async () => {
    setVotingPasswordPurpose('end');
    setShowVotingPasswordModal(true);
    setVotingPasswordError('');
    setVotingPassword('');
  };

  const handleReconductElection = async () => {
    // Show password modal for reconduct authentication
    setVotingPasswordPurpose('reconduct');
    setShowVotingPasswordModal(true);
    setVotingPasswordError('');
    setVotingPassword('');
  };

  const handleReconductElectionWithAuth = async () => {
    // Fetch all existing session IDs for this election
    const allVotes = await ipc.invoke('get-votes', { electionId });
    const existingSessionIds = Array.from(new Set((allVotes || []).map((v: any) => v.session_id).filter(Boolean))) as string[];
    const newSessionId = getNextSessionId(org?.name || '', election?.id || 0, existingSessionIds);
    
    // Use the current configuration (selected type and positions)
    const currentType = selectedType;
    const currentPositions = positionsToConduct.length > 0 ? positionsToConduct : 
      (Array.isArray(election.positions) ? [...election.positions] : []);
    
    console.log('=== RECONDUCT ELECTION DEBUG ===');
    console.log('Election object:', election);
    console.log('Current selected type:', currentType);
    console.log('Current positions to conduct:', currentPositions);
    console.log('Election status:', election.status);
    
    // Start the election with current configuration
    const now = new Date().toISOString();
    await ipc.invoke('update-election', {
      ...election,
      status: 'In Progress',
      type: currentType,
      active_positions: currentPositions,
      session_id: newSessionId,
      start_time: now,
    });
    
    // Update local election state with new session ID
    setElection((prev: any) => ({ ...prev, session_id: newSessionId }));
    
    // Open voting window with new session and current type
    await ipc.invoke('open-voting-window', { orgId, electionId, sessionId: newSessionId, type: currentType });
    
    // Refresh election details
    const orgs = await ipc.invoke('get-organizations');
    const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
    if (foundOrg) {
      const elections = await ipc.invoke('get-elections', foundOrg.id);
      const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
      setElection(foundElection || null);
    }
  };

  // When opening voting window, reset admin close state
  const handleOpenVotingWindow = async () => {
    if (!election.session_id) return;
    await ipc.invoke('open-voting-window', { orgId, electionId, sessionId: election.session_id, type: election.type || selectedType });
  };

  const handlePauseElection = async () => {
    if (!election) return;
    await ipc.invoke('update-election', {
      ...election,
      status: 'Paused',
    });
    // Refresh election details
    const orgs = await ipc.invoke('get-organizations');
    const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
    if (foundOrg) {
      const elections = await ipc.invoke('get-elections', foundOrg.id);
      const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
      setElection(foundElection || null);
    }
  };

  const handleResumeElection = async () => {
    if (!election) return;
    // Set start_time if not already set
    const now = new Date().toISOString();
    await ipc.invoke('update-election', {
      ...election,
      status: 'In Progress',
      start_time: now,
    });
    // Refresh election details
    const orgs = await ipc.invoke('get-organizations');
    const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
    if (foundOrg) {
      const elections = await ipc.invoke('get-elections', foundOrg.id);
      const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
      setElection(foundElection || null);
    }
  };

  // ElectionSessionCard: Shown only when election is in progress or paused
  const ElectionSessionCard: React.FC<{ election: any, org: any, onPause: () => void, onResume: () => void, onEnd: () => void, onReopen: () => void }> = ({ election, org, onPause, onResume, onEnd, onReopen }) => {
    // Calculate voting progress
    const [votersVoted, setVotersVoted] = useState(0);
    const [totalVoters, setTotalVoters] = useState(0);
    useEffect(() => {
      let interval: NodeJS.Timeout | null = null;
      const fetchProgress = async () => {
        if (!election) return;
        const votes = await window.electronAPI.invoke('get-votes', { electionId: election.id, sessionId: election.session_id });
        if (election.type === 'Direct') {
          setVotersVoted(votes.length);
        } else {
          const uniqueVoters = new Set(votes.map((v: any) => v.voter_id));
          setVotersVoted(uniqueVoters.size);
        }
        setTotalVoters(org && org.voters ? org.voters.length : 0);
      };
      fetchProgress();
      interval = setInterval(fetchProgress, 3000);
      return () => { if (interval) clearInterval(interval); };
    }, [election, org]);

    const isDirect = election.type === 'Direct';
    const isQRorVoterID = election.type === 'QR' || election.type === 'VoterID';

    return (
      <Card style={{ background: 'var(--dark-light)', borderRadius: 24, border: '1.5px solid var(--border)', marginBottom: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
        <Card.Body>
          <div style={{ fontWeight: 800, fontSize: 22, color: '#4f8cff', marginBottom: 10 }}>Election Session</div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Type: <span style={{ color: '#b0b8ff' }}>{election.type}</span></div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Status: <span style={{ color: election.status === 'Paused' ? '#ebc46a' : '#4f8cff' }}>{election.status}</span></div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Session ID: <span style={{ color: '#b0b8ff' }}>{election.session_id}</span></div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Start Time: <span style={{ color: '#b0b8ff' }}>{election.start_time ? new Date(election.start_time).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Not set'}</span></div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Positions: <span style={{ color: '#b0b8ff' }}>{Array.isArray(election.positions) ? election.positions.join(', ') : ''}</span></div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>
            Voters Voted: <span style={{ color: '#b0b8ff' }}>
              {isDirect ? votersVoted : `${votersVoted} / ${totalVoters}`}
            </span>
            {isQRorVoterID && (
              <div style={{ background: '#23263a', borderRadius: 8, height: 12, marginTop: 6, width: 180, overflow: 'hidden' }}>
                <div style={{ background: '#4f8cff', height: '100%', width: `${totalVoters ? (votersVoted / totalVoters) * 100 : 0}%`, transition: 'width 0.3s' }} />
              </div>
            )}
          </div>
          <div className="d-flex gap-3 mt-4 justify-content-end">
            <button className="btn btn-primary" style={{ borderRadius: 16, fontWeight: 700, fontSize: 18 }} onClick={onReopen} disabled={election.status === 'Paused'}>
              <span className="material-icons" style={{ verticalAlign: 'middle', fontSize: 22 }}>open_in_new</span> Reopen Voting Window
            </button>
            {election.status === 'In Progress' && (
              <button className="btn btn-warning" style={{ borderRadius: 16, fontWeight: 700, fontSize: 18, color: '#222' }} onClick={onPause}>
                <span className="material-icons" style={{ fontSize: 22, verticalAlign: 'middle' }}>pause_circle</span> Pause Election
              </button>
            )}
            {election.status === 'Paused' && (
              <button className="btn btn-success" style={{ borderRadius: 16, fontWeight: 700, fontSize: 18 }} onClick={onResume}>
                <span className="material-icons" style={{ fontSize: 22, verticalAlign: 'middle' }}>play_circle</span> Resume Election
              </button>
            )}
            <button className="btn btn-danger" style={{ borderRadius: 16, fontWeight: 700, fontSize: 18 }} onClick={onEnd}>
              <span className="material-icons" style={{ fontSize: 22, verticalAlign: 'middle' }}>stop_circle</span> End Election
            </button>
          </div>
        </Card.Body>
      </Card>
    );
  };

  // --- Voted/Not Voted Card for QR/VoterID Elections ---
  const VotersStatusCard: React.FC<{ election: any, org: any }> = ({ election, org }) => {
    const [voted, setVoted] = useState<any[]>([]);
    const [notVoted, setNotVoted] = useState<any[]>([]);

    useEffect(() => {
      let interval: NodeJS.Timeout | null = null;
      const fetchVotersStatus = async () => {
        if (!election || !org || !org.voters) return;
        const votes = await window.electronAPI.invoke('get-votes', { electionId: election.id, sessionId: election.session_id });
        const votedIds = new Set(votes.map((v: any) => (v.voter_id || '').toString().toLowerCase()));
        const votedList = org.voters.filter((v: any) => votedIds.has((v.voter_id || v.id).toString().toLowerCase()));
        const notVotedList = org.voters.filter((v: any) => !votedIds.has((v.voter_id || v.id).toString().toLowerCase()));
        setVoted(votedList);
        setNotVoted(notVotedList);
      };
      fetchVotersStatus();
      interval = setInterval(fetchVotersStatus, 3000);
      return () => { if (interval) clearInterval(interval); };
    }, [election, org]);

    return (
      <Card style={{ background: 'var(--dark-light)', borderRadius: 20, border: '1.5px solid var(--border)', marginBottom: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
        <Card.Body>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#4f8cff', marginBottom: 10 }}>Voter Participation</div>
          <div className="row">
            <div className="col-md-6">
              <div style={{ color: '#b0b8ff', fontWeight: 700, marginBottom: 6 }}>Voted ({voted.length})</div>
              <div style={{ maxHeight: 180, overflowY: 'auto', background: '#23263a', borderRadius: 8, padding: 8 }}>
                {voted.length === 0 ? <div style={{ color: '#aaa' }}>No voters yet.</div> : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {voted.map((v: any) => (
                      <li key={v.id} style={{ color: '#6ee7b7', fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{v.name} <span style={{ color: '#b0b8ff', fontWeight: 400, fontSize: 13 }}>({v.voter_id})</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
            <div className="col-md-6">
              <div style={{ color: '#b0b8ff', fontWeight: 700, marginBottom: 6 }}>Not Voted ({notVoted.length})</div>
              <div style={{ maxHeight: 180, overflowY: 'auto', background: '#23263a', borderRadius: 8, padding: 8 }}>
                {notVoted.length === 0 ? <div style={{ color: '#aaa' }}>All have voted.</div> : (
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                    {notVoted.map((v: any) => (
                      <li key={v.id} style={{ color: '#eb445a', fontWeight: 600, fontSize: 15, marginBottom: 2 }}>{v.name} <span style={{ color: '#b0b8ff', fontWeight: 400, fontSize: 13 }}>({v.voter_id})</span></li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    );
  };

  if (loading) return <div style={{ color: '#fff', textAlign: 'center', marginTop: 60 }}>Loading...</div>;
  if (!election || !org) return <div style={{ color: '#fff', textAlign: 'center', marginTop: 60 }}>Election not found.</div>;

  return (
    <PageBG>
      <div className="container py-4 individual-election-page">
        {/* Header with Manage Candidates and Results */}
        <div className="d-flex align-items-center justify-content-between mb-4 gap-3 flex-wrap">
          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-link p-0" style={{ color: '#4f8cff', fontSize: 28 }} onClick={() => navigate(`/organization/${orgId}`)}>
              <span className="material-icons">arrow_back</span>
            </button>
            <h2 className="mb-0" style={{ color: '#fff', fontWeight: 800 }}>{election.name}</h2>
            <button
              className="btn btn-link p-0 ms-2"
              style={{ color: '#a3a6b1', fontSize: 22 }}
              onClick={() => setShowEditModal(true)}
              title="Edit Election Details"
            >
              <FaCog />
            </button>
            <span className="badge bg-secondary ms-3" style={{ fontSize: 16, fontWeight: 600 }}>{election.status}</span>
            {election.status === 'In Progress' && election.type && (
              <span className="badge bg-primary ms-2" style={{ fontSize: 15, fontWeight: 600, background: '#4f8cff', color: '#fff', borderRadius: 8, padding: '6px 16px' }}>
                {electionTypes.find(t => t.value === election.type)?.label || election.type}
              </span>
            )}
          </div>
          <div className="d-flex gap-2 flex-wrap" style={{ alignItems: 'center' }}>
            <GlassButton icon="bar_chart" style={{ minWidth: 160 }} onClick={() => navigate(`/organization/${orgId}/election/${electionId}/results`)}>View Results</GlassButton>
            <button
              className="help-btn"
              style={{
                background: '#232427',
                border: '2px solid #4f8cff',
                color: '#4f8cff',
                fontWeight: 700,
                fontSize: 18,
                borderRadius: 24,
                boxShadow: '0 2px 12px #0004',
                padding: '10px 22px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginLeft: 16,
              }}
              onClick={() => setShowHelp(true)}
              aria-label="Open Help"
            >
              <span className="material-icons" style={{ fontSize: 24 }}>help_outline</span>
              Help
            </button>
          </div>
        </div>
        <HelpDrawer open={showHelp} onClose={() => setShowHelp(false)} />
        {showEditModal && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content add-org-modal-content" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
                <PopupContainer>
                  <div className="add-org-title-row mb-2">
                    <div className="add-org-title">Edit Election</div>
                    <button className="add-org-close" onClick={() => setShowEditModal(false)} aria-label="Close">&times;</button>
                  </div>
                  <div className="add-org-divider" />
                  <form autoComplete="off" onSubmit={e => { e.preventDefault(); handleEditSave(); }}>
                    <div className="add-org-section">
                      {/* Election Name */}
                      <div className="add-org-float-group">
                        <input
                          type="text"
                          className="add-org-input"
                          id="editElectionNameInput"
                          value={editForm?.name || ''}
                          onChange={e => handleEditChange('name', e.target.value)}
                          autoFocus
                          required
                          placeholder=" "
                        />
                        <label htmlFor="editElectionNameInput" className={editForm?.name ? 'float-active' : ''}>Election Name</label>
                      </div>
                      {/* Positions Section */}
                      <div className="add-org-logo-card mt-2 mb-3" style={{ background: '#202127', borderRadius: '1.1rem', border: '1.2px solid #232427', boxShadow: '0 4px 18px rgba(80,80,120,0.13)' }}>
                        <div className="d-flex align-items-center mb-2" style={{ gap: '0.6rem' }}>
                          <span className="material-icons" style={{ color: '#4f8cff', fontSize: '1.4rem' }}>list_alt</span>
                          <span className="add-org-label">Positions <span style={{ color: '#eb445a' }}>*</span></span>
                        </div>
                        {/* Disable editing if election is running or paused */}
                        {(election.status === 'In Progress' || election.status === 'Paused') && (
                          <div style={{ color: '#ebc46a', fontWeight: 600, fontSize: 14, marginBottom: 8 }}>
                            Positions cannot be modified while the election is running or paused.
                          </div>
                        )}
                        <div className="d-flex gap-2 align-items-center mb-2">
                          <input
                            type="text"
                            className="add-org-input"
                            value={editNewPosition}
                            onChange={e => setEditNewPosition(e.target.value)}
                            placeholder="Add position"
                            style={{ minWidth: 0, flex: 1 }}
                            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleEditAddPosition(); } }}
                            disabled={election.status === 'In Progress' || election.status === 'Paused'}
                          />
                          <button type="button" className="btn btn-primary px-3 py-1" style={{ borderRadius: 8, fontWeight: 600, minWidth: 60 }} onClick={handleEditAddPosition} disabled={!editNewPosition.trim() || election.status === 'In Progress' || election.status === 'Paused'}>Add</button>
                        </div>
                        <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0, marginTop: 4 }}>
                          {editPositions.map((pos, idx) => (
                            <li key={idx} className="d-flex align-items-center gap-2 mb-1" style={{ background: '#232427', borderRadius: 6, padding: '4px 10px', marginBottom: 4, fontWeight: 500, color: '#fff' }}>
                              <span>{pos}</span>
                              <button type="button" className="btn btn-sm btn-danger" style={{ borderRadius: 6, padding: '0 8px', fontSize: 13 }} onClick={() => handleEditRemovePosition(idx)} aria-label="Remove position" disabled={election.status === 'In Progress' || election.status === 'Paused'}>&times;</button>
                            </li>
                          ))}
                        </ul>
                        {editPositionsError && <div style={{ color: '#eb445a', fontSize: 13, marginTop: 2 }}>{editPositionsError}</div>}
                      </div>
                      {/* Logo upload section */}
                      <div className="add-org-logo-card mb-3">
                        <div className="add-org-logo-label-row">
                          <FaImage className="add-org-logo-icon" />
                          <span className="add-org-label">Logo (optional)</span>
                        </div>
                        <div className="add-org-file-wrap">
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg,.webp"
                            id="editElectionLogoFile"
                            style={{ display: 'none' }}
                            onChange={handleEditLogoChange}
                          />
                          <label htmlFor="editElectionLogoFile" className="add-org-file-btn">Choose Logo</label>
                          <span className="add-org-file-name">{editLogoFile ? editLogoFile.name : (editForm?.logo ? 'Current logo' : 'No file chosen')}</span>
                        </div>
                        {(editLogoFile || editForm?.logo) && (
                          <img
                            src={editLogoFile ? URL.createObjectURL(editLogoFile) : editForm.logo}
                            alt="Logo Preview"
                            className="add-org-logo-preview"
                          />
                        )}
                      </div>
                    </div>
                    <div className="d-flex gap-3 mt-4 justify-content-end">
                      <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowEditModal(false)} type="button">Cancel</button>
                      <GradientButton1 className="add-org-create px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} type="submit">Save Changes</GradientButton1>
                      <button className="btn btn-danger px-4 py-2 ms-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} type="button" onClick={() => { setShowDeleteModal(true); setDeletePassword(''); setDeleteError(''); }}>Delete Election</button>
                    </div>
                  </form>
                </PopupContainer>
              </div>
            </div>
          </div>
        )}
        {showDeleteModal && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content add-org-modal-content" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
                <PopupContainer>
                  <div className="add-org-title-row mb-2">
                    <div className="add-org-title" style={{ color: '#eb445a' }}>Delete Election</div>
                    <button className="add-org-close" onClick={() => setShowDeleteModal(false)} aria-label="Close">&times;</button>
                  </div>
                  <div className="add-org-divider" />
                  <div style={{ color: '#fff', fontWeight: 500, marginBottom: 16 }}>To delete this election, please enter the organization password:</div>
                  <form autoComplete="off" onSubmit={e => { e.preventDefault(); handleDeleteElection(); }}>
                    <div className="add-org-float-group" style={{ position: 'relative' }}>
                      <input
                        type={showDeletePassword ? 'text' : 'password'}
                        className="add-org-input"
                        value={deletePassword}
                        onChange={e => setDeletePassword(e.target.value)}
                        placeholder="Organization Password"
                        autoFocus
                        style={{ marginBottom: 12, paddingRight: 44 }}
                      />
                      <button
                        type="button"
                        className="add-org-eye-btn"
                        aria-label={showDeletePassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowDeletePassword(v => !v)}
                        tabIndex={-1}
                        style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a3a6b1', cursor: 'pointer', padding: 0, height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      >
                        <span className="material-icons" style={{ fontSize: 24 }}>{showDeletePassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {deleteError && <div style={{ color: '#eb445a', fontSize: 14, marginBottom: 8 }}>{deleteError}</div>}
                    <div className="d-flex gap-3 mt-3 justify-content-end">
                      <button className="btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} type="button" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                      <button className="btn btn-danger px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} type="submit">Delete</button>
                    </div>
                  </form>
                </PopupContainer>
              </div>
            </div>
          </div>
        )}
        <Row className="g-4" style={{ marginTop: 24 }}>
          {/* Left Column: Election Details and Positions */}
          <Col md={6}>
            {/* Election Details Card */}
            <Card style={{ background: 'var(--dark-light)', borderRadius: 20, border: '1.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)', marginBottom: '1.5rem' }}>
              <Card.Body>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 18, marginBottom: 12 }}>Election Details</div>
                <div style={{ color: '#a3a6b1' }}>
                  <div><b>Organization:</b> {org.name}</div>
                  <div><b>Positions:</b> {Array.isArray(election.positions) ? election.positions.join(', ') : ''}</div>
                  <div><b>Start Time:</b> {election.start_time ? new Date(election.start_time).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Not set'}</div>
                  <div><b>End Time:</b> {election.end_time ? new Date(election.end_time).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Not set'}</div>
                  <div><b>Status:</b> {election.status}</div>
                </div>
              </Card.Body>
            </Card>
            {/* Positions Grid Card (always show) */}
            <Card className="organizations-card" style={{ borderRadius: 20, border: '1.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
              <Card.Body>
                <div style={{ color: '#fff', fontWeight: 600, fontSize: 18, marginBottom: 12 }}>Positions</div>
                <div style={{ color: '#ebc46a', fontWeight: 500, fontSize: 15, marginBottom: 10 }}>
                  Click on positions to add candidates.
                </div>
                <div className="d-flex flex-wrap gap-3" style={{ minHeight: 60 }}>
                  {Array.isArray(election.positions) && election.positions.length > 0 ? (
                    election.positions.map((pos: string, idx: number) => (
                      <div
                        key={idx}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: 'rgba(36, 38, 48, 0.98)',
                          border: '2px solid #4f8cff',
                          borderRadius: 32,
                          padding: '0.6rem 1.4rem 0.6rem 1.1rem',
                          fontWeight: 700,
                          fontSize: 18,
                          color: '#fff',
                          boxShadow: '0 2px 12px #4f8cff22',
                          letterSpacing: '0.01em',
                          minWidth: 90,
                          transition: 'box-shadow 0.18s, border 0.18s',
                          cursor: (election.status === 'In Progress' || election.status === 'Paused') ? 'not-allowed' : 'pointer',
                          opacity: (election.status === 'In Progress' || election.status === 'Paused') ? 0.6 : 1,
                        }}
                        onClick={
                          (election.status === 'In Progress' || election.status === 'Paused')
                            ? undefined
                            : () => navigate(`/organization/${orgId}/election/${electionId}/position/${encodeURIComponent(pos)}`)
                        }
                        title={
                          (election.status === 'In Progress' || election.status === 'Paused')
                            ? 'Cannot edit candidates while the election is running or paused.'
                            : `Manage candidates for ${pos}`
                        }
                      >
                        <span className="material-icons" style={{ fontSize: 22, color: '#4f8cff', marginRight: 4 }}>how_to_vote</span>
                        <span>{pos}</span>
                        <span style={{ 
                          background: '#4f8cff', 
                          color: '#fff', 
                          borderRadius: '50%', 
                          width: 24, 
                          height: 24, 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'center', 
                          fontSize: 12, 
                          fontWeight: 700,
                          marginLeft: 8
                        }}>
                          {positionCandidateCounts[pos] || 0}
                        </span>
                      </div>
                    ))
                  ) : (
                    <span className="text-secondary" style={{ opacity: 0.7, fontWeight: 500 }}>No positions set for this election.</span>
                  )}
                </div>
              </Card.Body>
            </Card>
          </Col>
          {/* Right Column: Start Election or Session Card */}
          <Col md={6}>
            {(election.status === 'In Progress' || election.status === 'Paused') && (
              <ElectionSessionCard
                election={election}
                org={org}
                onPause={handlePauseElection}
                onResume={handleResumeElection}
                onEnd={handleEndElection}
                onReopen={handleOpenVotingWindow}
              />
            )}
            {/* Show VotersStatusCard only for QR/VoterID elections */}
            {(election.type === 'QR' || election.type === 'VoterID') && (election.status === 'In Progress' || election.status === 'Paused') && (
              <VotersStatusCard election={election} org={org} />
            )}
            {(election.status === 'Not Started' || election.status === 'Completed') && (
              <Card className="organizations-card" style={{ borderRadius: 20, border: '1.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
                <Card.Body>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 800, fontSize: 22, marginBottom: 8, letterSpacing: '-0.5px', textAlign: 'left' }}>Start Election</div>
                    {/* Election Type Selection */}
                    <div style={{ marginBottom: 24 }}>
                      <div style={{ color: '#b0b8ff', fontWeight: 700, fontSize: 13, marginBottom: 10, textAlign: 'left', letterSpacing: '0.01em', textTransform: 'uppercase' }}>Election Type</div>
                      <div className="election-type-toggle">
                        {electionTypes.map((type) => {
                          const disabled = (type.value === 'QR' || type.value === 'VoterID') && (!voters || voters.length === 0);
                          return (
                            <button
                              key={type.value}
                              className={`toggle-btn${selectedType === type.value ? ' active' : ''}`}
                              onClick={() => !disabled && setSelectedType(type.value)}
                              aria-pressed={selectedType === type.value}
                              tabIndex={0}
                              disabled={disabled}
                              style={disabled ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
                            >
                              {type.label}
                            </button>
                          );
                        })}
                      </div>
                      {voterTypeInfo && (
                        <div style={{ color: '#eb445a', fontWeight: 600, fontSize: 15, marginTop: 8 }}>{voterTypeInfo}</div>
                      )}
                      {selectedType === 'Direct' && (
                        <div className="info-box direct-voting-info">
                          <div className="info-box-header">
                            <span className="material-icons info-icon">info</span>
                            <span className="info-title">Direct Voting Mode</span>
                          </div>
                          <div className="info-description">
                            Opens a secure, fullscreen voting window for each voter. Only one voter can vote at a time.
                          </div>
                          <div className="info-hotkeys">
                            <span className="hotkeys-label">Hotkeys:</span>
                            <span className="hotkey"><b>N</b></span> <span className="or">or</span> <span className="hotkey"><b>Enter</b></span> <span className="hotkey-desc">for next voter</span>,
                            <span className="hotkey"><b>E</b></span> <span className="or">or</span> <span className="hotkey"><b>Escape</b></span> <span className="hotkey-desc">to exit voting window (admin only)</span>
                          </div>
                        </div>
                      )}
                      {(selectedType === 'QR' || selectedType === 'VoterID') && (
                        <div className="info-box qr-voting-info">
                          <div className="info-box-header">
                            <span className="material-icons info-icon">info</span>
                            <span className="info-title">{selectedType === 'QR' ? 'QR-based Voting Mode' : 'Voter ID-based Voting Mode'}</span>
                          </div>
                          <div className="info-description">
                            Opens a secure, fullscreen voting window for each voter. Each voter must authenticate using their {selectedType === 'QR' ? 'QR code' : 'Voter ID'} before voting. Only one voter can vote at a time.
                          </div>
                          <div className="info-hotkeys">
                            <span className="hotkeys-label">Hotkeys:</span>
                            <span className="hotkey"><b>N</b></span> <span className="or">or</span> <span className="hotkey"><b>Enter</b></span> <span className="hotkey-desc">for next voter</span>,
                            <span className="hotkey"><b>E</b></span> <span className="or">or</span> <span className="hotkey"><b>Escape</b></span> <span className="hotkey-desc">to exit voting window (admin only)</span>
                          </div>
                        </div>
                      )}
                    </div>
                    <div style={{ borderBottom: '1.5px solid #4f8cff33', margin: '24px 0', padding: 0, width: '100%' }} />
                  </div>
                  
                  {/* Position Selection */}
                  <div>
                    <div style={{ color: '#b0b8ff', fontWeight: 700, fontSize: 13, marginBottom: 10, textAlign: 'left', letterSpacing: '0.01em', textTransform: 'uppercase' }}>Select Positions to Conduct</div>
                    <div style={{ marginBottom: 16 }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, fontWeight: 600, color: '#4f8cff', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          className="dark-checkbox"
                          checked={Array.isArray(election.positions) && election.positions.length > 0 && positionsToConduct.length === election.positions.length}
                          onChange={handleToggleSelectAll}
                          style={{ marginRight: 10 }}
                        />
                        Select All
                      </label>
                      {Array.isArray(election.positions) && election.positions.map((pos: string) => (
                        <label key={pos} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8, fontWeight: 500, color: '#fff', cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            className="dark-checkbox"
                            checked={positionsToConduct.includes(pos)}
                            onChange={() => handleTogglePosition(pos)}
                            style={{ marginRight: 10 }}
                          />
                          {pos}
                        </label>
                      ))}
                      {startError && <div style={{ color: '#eb445a', marginTop: 10, fontSize: 14 }}>{startError}</div>}
                    </div>
                    <div style={{ borderBottom: '1.5px solid #4f8cff33', margin: '24px 0', padding: 0, width: '100%' }} />
                  </div>
                  
                  <div style={{ width: '100%', display: 'flex', justifyContent: 'center', marginTop: 0 }}>
                    {election.status === 'Not Started' && (
                      <GradientButton1
                        className="election-action-btn"
                        style={{
                          width: '100%',
                          maxWidth: 300,
                          minHeight: 48,
                          fontWeight: 700,
                          fontSize: 20,
                          borderRadius: 32,
                          padding: '0.5rem 0',
                          letterSpacing: '0.01em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          margin: '0 auto',
                        }}
                        onClick={handleStartElection}
                      >
                        Start Election
                      </GradientButton1>
                    )}
                    {election.status === 'Completed' && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, width: '100%', maxWidth: 300, margin: '0 auto' }}>
                        <div style={{
                          width: '100%',
                          minHeight: 48,
                          fontWeight: 700,
                          fontSize: 20,
                          borderRadius: 32,
                          padding: '0.5rem 0',
                          letterSpacing: '0.01em',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          background: 'linear-gradient(90deg, #28a745 0%, #20c997 100%)',
                          color: '#fff',
                        }}>
                          Election Completed
                        </div>
                        <GradientButton1
                          className="election-action-btn"
                          onClick={handleReconductElection}
                          style={{
                            width: '100%',
                            minHeight: 48,
                            fontWeight: 700,
                            fontSize: 18,
                            borderRadius: 32,
                            padding: '0.5rem 0',
                            letterSpacing: '0.01em',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            textAlign: 'center',
                            background: 'linear-gradient(90deg, #4f8cff 0%, #7a7cff 100%)',
                          }}
                        >
                          Reconduct Election
                        </GradientButton1>
                      </div>
                    )}
                  </div>
                </Card.Body>
              </Card>
            )}
          </Col>
        </Row>

        {/* Voting Password Modal */}
        {showVotingPasswordModal && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content add-org-modal-content" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
                <PopupContainer>
                  <div className="add-org-title-row mb-2">
                    <div className="add-org-title">Enter Organization Password</div>
                  </div>
                  <div style={{ color: '#b0c8ff', fontWeight: 500, marginBottom: 10, fontSize: 15, textAlign: 'left' }}>
                    {votingPasswordPurpose === 'end' ? 'Authenticate to end the election.' : 
                     votingPasswordPurpose === 'start' ? 'Authenticate to start the election.' : 
                     votingPasswordPurpose === 'reconduct' ? 'Authenticate to reconduct the election.' :
                     'Authenticate to exit the voting window.'}
                  </div>
                  <div className="add-org-divider" />
                  <form onSubmit={handleVotingPasswordSubmit} autoComplete="off">
                    <div className="add-org-section" style={{ position: 'relative' }}>
                      <label htmlFor="votingPasswordInput" style={{ color: '#fff', fontWeight: 600, fontSize: '1.15rem', marginBottom: 8, display: 'block' }}>Password</label>
                      <div style={{ position: 'relative', height: 56 }}>
                        <input
                          id="votingPasswordInput"
                          type={showVotingPassword ? 'text' : 'password'}
                          className="add-org-input"
                          value={votingPassword}
                          onChange={e => setVotingPassword(e.target.value)}
                          autoFocus
                          style={{ paddingRight: 44, height: 56, marginBottom: 0 }}
                        />
                        <button
                          type="button"
                          aria-label={showVotingPassword ? 'Hide password' : 'Show password'}
                          onClick={() => setShowVotingPassword((v) => !v)}
                          style={{
                            position: 'absolute',
                            right: 14,
                            top: 0,
                            height: 56,
                            width: 44,
                            background: 'none',
                            border: 'none',
                            color: '#a3a6b1',
                            fontSize: 24,
                            cursor: 'pointer',
                            padding: 0,
                            zIndex: 2,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}
                          tabIndex={0}
                        >
                          <span className="material-icons" style={{ fontSize: 24 }}>{showVotingPassword ? 'visibility_off' : 'visibility'}</span>
                        </button>
                      </div>
                      {votingPasswordError && <div className="add-org-error mb-2">{votingPasswordError}</div>}
                    </div>
                    <div className="d-flex gap-3 mt-4 justify-content-end">
                      <button type="button" className="add-org-cancel px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600, background: '#232427', color: '#fff', border: '1.5px solid #444', transition: 'background 0.2s, color 0.2s' }} onClick={() => {
                        setShowVotingPasswordModal(false);
                        setVotingPasswordError('');
                        setVotingPassword('');
                      }}>Cancel</button>
                      <button type="submit" className="px-4 py-2" style={{ background: '#4f8cff', color: '#fff', borderRadius: '0.8rem', fontWeight: 600, border: 'none', transition: 'background 0.2s, color 0.2s' }}>
                        {votingPasswordPurpose === 'end' ? 'End Election' : 
                         votingPasswordPurpose === 'start' ? 'Start Election' : 
                         votingPasswordPurpose === 'reconduct' ? 'Reconduct Election' :
                         'Start Voting'}
                      </button>
                    </div>
                  </form>
                </PopupContainer>
              </div>
            </div>
          </div>
        )}

        {/* Results Window */}
        <ResultsWindow
          orgId={orgId || ''}
          electionId={electionId || ''}
          show={showResultsWindow}
          onClose={() => setShowResultsWindow(false)}
        />
      </div>
    </PageBG>
  );
};

export default IndividualElection; 