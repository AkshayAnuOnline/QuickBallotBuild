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
      // Fetch all votes for this election
      const votes = await ipc.invoke('get-votes', { electionId });
      // Fetch election to get positions
      const orgs = await ipc.invoke('get-organizations');
      const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
      let foundElection = null;
      if (foundOrg) {
        const elections = await ipc.invoke('get-elections', foundOrg.id);
        foundElection = elections.find((e: any) => String(e.id) === String(electionId));
      }
      let pos: string[] = [];
      if (foundElection && foundElection.positions) {
        pos = Array.isArray(foundElection.positions) ? foundElection.positions : [];
      }
      // Fetch all candidates for all positions
      let allCandidates: any[] = [];
      for (const position of pos) {
        const positionCandidates = await ipc.invoke('get-candidates', { organizationId: foundOrg.id, position });
        allCandidates = allCandidates.concat(positionCandidates);
      }
      // Tally votes
      const tally: Record<string, Record<number, number>> = {};
      for (const position of pos) {
        tally[position] = {};
        for (const candidate of allCandidates.filter(c => c.position === position)) {
          tally[position][candidate.id] = 0;
        }
      }
      for (const voteSession of votes) {
        const voteObj = typeof voteSession.votes === 'string' ? JSON.parse(voteSession.votes) : voteSession.votes;
        for (const [position, candidateId] of Object.entries(voteObj) as [string, number][]) {
          if (tally[position] && tally[position][candidateId]) {
            tally[position][candidateId] += 1;
          } else if (tally[position]) {
            tally[position][candidateId] = 1;
          }
        }
      }
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
      setResults(resultsArr);
      setLoading(false);
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