import React, { useEffect, useState } from 'react';
import { Routes, Route, useParams } from 'react-router-dom';
import Home from './components/Home';
import IndividualOrganization from './components/IndividualOrganization';
import ManageVoters from './components/ManageVoters';
import ManageCandidates from './components/ManageCandidates';
import VoterSlipGenerator from './components/VoterSlipGenerator';
import IndividualElection from './components/IndividualElection';
import ElectionResultsPage from './components/ElectionResultsPage';
import DirectVotingWindow from './components/DirectVotingWindow';
import QRBasedVotingWindow from './components/QRBasedVotingWindow';
import VoterIDBasedVotingWindow from './components/VoterIDBasedVotingWindow';
import './styles/App.scss';

// Helper wrapper to extract params and pass as props
const VoterSlipGeneratorWrapper: React.FC = () => {
  const { id } = useParams();
  const [orgName, setOrgName] = useState<string | null>(null);
  const [electionName, setElectionName] = useState<string | null>(null);
  useEffect(() => {
    if (!id) return;
    window.electronAPI.invoke('get-organizations').then((orgs: any[]) => {
      const found = orgs.find((o: any) => String(o.id) === String(id));
      setOrgName(found ? found.name : '');
      if (found) {
        window.electronAPI.invoke('get-elections', found.id).then((elections: any[]) => {
          // Use the latest election (by created_at or id desc)
          const sorted = [...elections].sort((a, b) => {
            // Prefer created_at if available, else id
            if (a.created_at && b.created_at) {
              return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
            }
            return (b.id || 0) - (a.id || 0);
          });
          setElectionName(sorted.length > 0 ? sorted[0].name : '');
        });
      }
    });
  }, [id]);
  if (!orgName || electionName === null) return <div style={{ color: '#fff', textAlign: 'center', marginTop: 60 }}>Loading...</div>;
  return <VoterSlipGenerator />;
};

// Wrapper to extract orgId and positionName for ManageCandidates
const IndividualPositionWrapper: React.FC = () => {
  const { orgId, electionId, positionName } = useParams();
  const [orgName, setOrgName] = React.useState<string | null>(null);
  const [orgLogo, setOrgLogo] = React.useState<string | null>(null);
  const [electionName, setElectionName] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!orgId || !electionId) return;
    window.electronAPI.invoke('get-organizations').then((orgs: any[]) => {
      const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
      setOrgName(foundOrg ? foundOrg.name : '');
      setOrgLogo(foundOrg ? foundOrg.logo : '');
      if (foundOrg) {
        window.electronAPI.invoke('get-elections', foundOrg.id).then((elections: any[]) => {
          const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
          setElectionName(foundElection ? foundElection.name : '');
        });
      }
    });
  }, [orgId, electionId]);

  if (!orgName || !electionName) return <div style={{ color: '#fff', textAlign: 'center', marginTop: 60 }}>Loading...</div>;
  return <ManageCandidates organization_id={orgId} position={positionName} orgName={orgName} orgLogo={orgLogo || undefined} electionName={electionName} />;
};

// VotingWindowWrapper: Reads orgId and electionId from query string
const VotingWindowWrapper: React.FC = () => {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [electionId, setElectionId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [electionType, setElectionType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const orgIdParam = params.get('orgId');
    const electionIdParam = params.get('electionId');
    const sessionIdParam = params.get('sessionId');
    const typeParam = params.get('type');
    setOrgId(orgIdParam);
    setElectionId(electionIdParam);
    setSessionId(sessionIdParam);
    if (typeParam) {
      setElectionType(typeParam);
      setLoading(false);
      return;
    }
    if (orgIdParam && electionIdParam) {
      window.electronAPI.invoke('get-organizations').then((orgs: any[]) => {
        const foundOrg = orgs.find((o: any) => String(o.id) === String(orgIdParam));
        if (foundOrg) {
          window.electronAPI.invoke('get-elections', foundOrg.id).then((elections: any[]) => {
            const foundElection = elections.find((e: any) => String(e.id) === String(electionIdParam));
            setElectionType(foundElection?.type || 'Direct');
            setLoading(false);
          });
        } else {
          setLoading(false);
        }
      });
    } else {
      setLoading(false);
    }
  }, []);

  if (loading || !orgId || !electionId || !sessionId) return <div style={{ color: '#fff', textAlign: 'center', marginTop: 60 }}>Loading Voting...</div>;

  if (electionType === 'QR') {
    return <QRBasedVotingWindow orgId={orgId} electionId={electionId} sessionId={sessionId} onClose={() => { window.electronAPI.invoke('close-voting-window'); }} />;
  } else if (electionType === 'VoterID') {
    return <VoterIDBasedVotingWindow orgId={orgId} electionId={electionId} sessionId={sessionId} onClose={() => { window.electronAPI.invoke('close-voting-window'); }} />;
  } else {
    return <DirectVotingWindow orgId={orgId} electionId={electionId} sessionId={sessionId} onClose={() => { window.electronAPI.invoke('close-voting-window'); }} />;
  }
};

const App: React.FC = () => {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/organization/:id" element={<IndividualOrganization />} />
        <Route path="/organization/:id/voters" element={<ManageVoters />} />
        <Route path="/organization/:id/candidates" element={<ManageCandidates />} />
        <Route path="/organization/:id/slip-generator" element={<VoterSlipGeneratorWrapper />} />
        <Route path="/organization/:orgId/election/:electionId" element={<IndividualElection />} />
        <Route path="/organization/:orgId/election/:electionId/position/:positionName" element={<IndividualPositionWrapper />} />
        <Route path="/organization/:orgId/election/:electionId/results" element={<ElectionResultsPage />} />
        <Route path="/voting" element={<VotingWindowWrapper />} />
      </Routes>
    </div>
  );
};

export default App; 