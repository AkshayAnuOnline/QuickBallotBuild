import React, { useEffect, useState } from 'react';
import { Modal, Button, Table } from 'react-bootstrap';
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const ipc = window.electronAPI;

interface ResultsWindowProps {
  orgId: string;
  electionId: string;
  show: boolean;
  onClose: () => void;
}

const ResultsWindow: React.FC<ResultsWindowProps> = ({ orgId, electionId, show, onClose }) => {
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!show) return;
    const fetchResults = async () => {
      setLoading(true);
      try {
        console.log('=== FETCHING RESULTS DEBUG ===');
        console.log('Election ID:', electionId);
        console.log('Org ID:', orgId);
        
        // Fetch all votes for this election
        const votes = await ipc.invoke('get-votes', { electionId });
        console.log('All votes for election:', votes);
        
        // Get all unique session_ids for this election, sorted by most recent
        const sessionGroups = votes.reduce((acc: Record<string, any[]>, v: any) => {
          if (!acc[v.session_id]) acc[v.session_id] = [];
          acc[v.session_id].push(v);
          return acc;
        }, {});
        console.log('Session groups:', sessionGroups);
        
        const sessionIds = Object.keys(sessionGroups).sort((a, b) => {
          // Sort by most recent vote in each session
          const aTime = sessionGroups[a][0]?.timestamp ? new Date(sessionGroups[a][0].timestamp).getTime() : 0;
          const bTime = sessionGroups[b][0]?.timestamp ? new Date(sessionGroups[b][0].timestamp).getTime() : 0;
          return bTime - aTime;
        });
        console.log('Sorted session IDs:', sessionIds);
        
        // Use the latest session or all votes if no sessions
        const latestSessionId = sessionIds.length > 0 ? sessionIds[0] : null;
        const sessionVotes = latestSessionId && Array.isArray(sessionGroups[latestSessionId]) ? sessionGroups[latestSessionId] : votes;
        console.log('Latest session ID:', latestSessionId);
        console.log('Session votes to process:', sessionVotes);
        
        // Fetch election to get positions
        const orgs = await ipc.invoke('get-organizations');
        const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
        console.log('Found org:', foundOrg);
        
        let foundElection = null;
        if (foundOrg) {
          const elections = await ipc.invoke('get-elections', foundOrg.id);
          foundElection = elections.find((e: any) => String(e.id) === String(electionId));
        }
        console.log('Found election:', foundElection);
        
        let pos: string[] = [];
        if (foundElection && foundElection.positions) {
          pos = Array.isArray(foundElection.positions) ? foundElection.positions : [];
        }
        console.log('Positions:', pos);
        
        // Fetch all candidates for all positions
        let allCandidates: any[] = [];
        for (const position of pos) {
          const positionCandidates = await ipc.invoke('get-candidates', { organizationId: foundOrg.id, position });
          console.log(`Candidates for position ${position}:`, positionCandidates);
          allCandidates = allCandidates.concat(positionCandidates);
        }
        console.log('All candidates:', allCandidates);
        
        // Tally votes
        const tally: Record<string, Record<number, number>> = {};
        for (const position of pos) {
          tally[position] = {};
          for (const candidate of allCandidates.filter(c => c.position === position)) {
            tally[position][candidate.id] = 0;
          }
        }
        console.log('Initial tally structure:', tally);
        
        for (const voteSession of sessionVotes) {
          try {
            const voteObj = typeof voteSession.votes === 'string' ? JSON.parse(voteSession.votes) : voteSession.votes;
            console.log('Processing vote session:', voteSession);
            console.log('Vote object:', voteObj);
            
            if (voteObj && typeof voteObj === 'object') {
              for (const [position, candidateId] of Object.entries(voteObj)) {
                // Convert candidateId to number to ensure type matching
                const candidateIdNum = Number(candidateId);
                console.log(`Processing vote for position ${position}, candidate ${candidateId} (converted to ${candidateIdNum})`);
                if (tally[position] && tally[position][candidateIdNum] !== undefined) {
                  tally[position][candidateIdNum] += 1;
                  console.log(`Incremented tally for ${position}/${candidateIdNum}:`, tally[position][candidateIdNum]);
                } else {
                  console.log(`No tally entry for ${position}/${candidateIdNum}`);
                }
              }
            }
          } catch (e) {
            console.error('Error parsing vote data:', e);
          }
        }
        console.log('Final tally:', tally);
        
        // Prepare results array
        const resultsArr: any[] = [];
        for (const position of pos) {
          for (const candidate of allCandidates.filter(c => c.position === position)) {
            resultsArr.push({
              position,
              candidateName: candidate.name,
              votes: tally[position][candidate.id] || 0,
            });
          }
        }
        console.log('Results array:', resultsArr);
        setResults(resultsArr);
      } catch (error) {
        console.error('Error fetching results:', error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };
    fetchResults();
  }, [show, orgId, electionId]);

  const handleDownloadPDF = () => {
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Election Results', 14, 18);
    doc.setFontSize(12);
    const tableColumn = ['Position', 'Candidate', 'Votes'];
    const tableRows = results.map(row => [row.position, row.candidateName, row.votes]);
    (doc as any).autoTable({ head: [tableColumn], body: tableRows, startY: 28 });
    doc.save('election_results.pdf');
  };

  return (
    <Modal show={show} onHide={onClose} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>Election Results</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading ? (
          <div>Loading results...</div>
        ) : (
          <Table striped bordered hover>
            <thead>
              <tr>
                <th>Position</th>
                <th>Candidate</th>
                <th>Votes</th>
              </tr>
            </thead>
            <tbody>
              {results.length === 0 ? (
                <tr><td colSpan={3}>No results available.</td></tr>
              ) : (
                results.map((row, idx) => (
                  <tr key={idx}>
                    <td>{row.position}</td>
                    <td>{row.candidateName}</td>
                    <td>{row.votes}</td>
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>Close</Button>
        <Button variant="primary" onClick={handleDownloadPDF}>Download PDF</Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ResultsWindow; 