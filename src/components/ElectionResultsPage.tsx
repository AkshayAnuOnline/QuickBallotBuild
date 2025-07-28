import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Button, Table, Dropdown } from 'react-bootstrap';
import { Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js';
import { FaArrowLeft } from 'react-icons/fa';
import PopupContainer from './PopupContainer';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const ipc = window.electronAPI;

const ElectionResultsPage: React.FC = () => {
  const { orgId, electionId } = useParams();
  const navigate = useNavigate();
  const [votes, setVotes] = useState<any[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [positions, setPositions] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [election, setElection] = useState<any>(null);
  const [org, setOrg] = useState<any>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearError, setClearError] = useState('');
  const [clearSuccess, setClearSuccess] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      // Fetch org and election
      const orgs = await ipc.invoke('get-organizations');
      const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
      if (foundOrg) {
        const voters = await ipc.invoke('get-voters', foundOrg.id);
        foundOrg.voters = voters;
        setOrg(foundOrg);
      } else {
        setOrg(null);
      }
      let foundElection = null;
      if (foundOrg) {
        const elections = await ipc.invoke('get-elections', foundOrg.id);
        foundElection = elections.find((e: any) => String(e.id) === String(electionId));
        setElection(foundElection || null);
      }
      let pos: string[] = [];
      if (foundElection && foundElection.positions) {
        pos = Array.isArray(foundElection.positions) ? foundElection.positions : [];
      }
      setPositions(pos);
      // Fetch all candidates for all positions
      let allCandidates: any[] = [];
      for (const position of pos) {
        const positionCandidates = await ipc.invoke('get-candidates', { organizationId: foundOrg.id, position });
        allCandidates = allCandidates.concat(positionCandidates);
      }
      setCandidates(allCandidates);
      // Fetch all votes for this election
      const allVotes = await ipc.invoke('get-votes', { electionId });
      // Sort by timestamp (latest first)
      allVotes.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setVotes(allVotes);
      setLoading(false);
    };
    fetchData();
  }, [orgId, electionId]);

  const handleClearResults = async () => {
    setClearError('');
    setClearSuccess('');
    try {
      await ipc.invoke('clear-election-votes', { electionId });
      setClearSuccess('All results have been cleared.');
      setShowClearConfirm(false);
      // Refresh votes
      const allVotes = await ipc.invoke('get-votes', { electionId });
      allVotes.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setVotes(allVotes);
    } catch (e: any) {
      setClearError(e.message || 'Failed to clear results.');
    }
  };

  const handleDownloadPDF = async () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    let y = 18;
    const centerX = pageWidth / 2;
    const headerLogoSize = 36;
    const timeOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' } as const;
    // --- PAGE 1: Election Details ---
    // Logo
    if (org && org.logo && /^data:image\//.test(org.logo)) {
      try {
        if (org.logo.startsWith('data:image/svg+xml')) {
          // Handle SVG using sharp conversion
          let convertedDataUrl = await window.electronAPI.invoke('convert-svg-to-image', {
            svgDataUrl: org.logo,
            outputFormat: 'png',
            size: 512
          });
          if (convertedDataUrl && convertedDataUrl.startsWith('data:image/png')) {
            doc.addImage(convertedDataUrl, 'PNG', centerX - headerLogoSize/2, y, headerLogoSize, headerLogoSize);
            y += headerLogoSize + 10;
          } else {
            y += headerLogoSize + 10;
          }
        } else {
          let format = 'PNG';
          const formatMatch = org.logo.match(/data:image\/([^;]+)/);
          if (formatMatch) {
            format = formatMatch[1].toUpperCase();
            if (!['PNG', 'JPEG', 'WEBP'].includes(format)) {
              format = 'PNG';
            }
          }
          doc.addImage(org.logo, format, centerX - headerLogoSize/2, y, headerLogoSize, headerLogoSize);
          y += headerLogoSize + 10;
        }
      } catch (e) { y += headerLogoSize + 10; }
    }
    // Org name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(20,20,20);
    doc.text(org && org.name ? org.name : 'Organization', centerX, y, { align: 'center' });
    y += 10;
    // Election name
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(60,60,60);
    doc.text(election && election.name ? election.name : 'Election', centerX, y, { align: 'center' });
    y += 10;
    // Compute all variables before use
    const sortedVotes = [...sessionVotes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const startTime = sortedVotes[0]?.timestamp ? new Date(sortedVotes[0].timestamp) : (election?.start_time ? new Date(election.start_time) : null);
    let endTime = null;
    if (sortedVotes.length > 1) {
      endTime = new Date(sortedVotes[sortedVotes.length - 1].timestamp);
    } else if (election?.end_time) {
      endTime = new Date(election.end_time);
    }
    const sessionType = sessionVotes[0]?.election_type || election?.type;
    const sessionIdDisplay = selectedSessionId || election?.session_id || 'N/A';
    let voted: any[] = [], notVoted: any[] = [];
    if (org && org.voters) {
      const votedIds = new Set(sessionVotes.map((v: any) => (v.voter_id || '').toString().toLowerCase()));
      voted = org.voters.filter((v: any) => votedIds.has((v.voter_id || v.id).toString().toLowerCase()));
      notVoted = org.voters.filter((v: any) => !votedIds.has((v.voter_id || v.id).toString().toLowerCase()));
    }
    // Election Details as a table
    const detailsRows = [
      ['Session ID', sessionIdDisplay],
      ['Type', sessionType || 'N/A'],
      ['Start Time', startTime ? startTime.toLocaleString(undefined, timeOptions) : 'Not set'],
      ['End Time', endTime ? endTime.toLocaleString(undefined, timeOptions) : 'Ongoing'],
    ];
    if (sessionType === 'Direct') {
      detailsRows.push(['Voters Voted', sessionVotes.length.toString()]);
    }
    const maxTableWidth = 178; // pageWidth - left(18) - right(18)
    const detailsColWidths = { 0: { cellWidth: 48 }, 1: { cellWidth: 130 } };
    y += 6;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(47, 140, 255);
    doc.text('Election Details', centerX, y, { align: 'center' });
    y += 8;
    autoTable(doc, {
      head: [['Field', 'Value']],
      body: detailsRows,
      startY: y,
      margin: { left: 18, right: 18 },
      styles: { font: 'helvetica', fontSize: 11, cellPadding: 2 },
      headStyles: { fillColor: [47, 140, 255], textColor: 255, fontStyle: 'bold' },
      columnStyles: detailsColWidths,
      tableWidth: maxTableWidth,
      didDrawPage: (data) => {
        const table: any = data.table;
        if (!table || !table.margin || table.startY == null || table.width == null || table.height == null) {
          return;
        }
        doc.setDrawColor(220,230,245);
        doc.setLineWidth(1.2);
        const marginLeft = table.margin.left;
        const startY = table.startY;
        const width = table.width;
        const height = table.height;
        doc.roundedRect(
          marginLeft - 4,
          startY - 4,
          width + 8,
          height + 8,
          10, 10, 'S'
        );
      }
    });
    y = (doc as any).lastAutoTable.finalY + 8;
    // --- Voter Participation (as tables) ---
    if (sessionType === 'QR' || sessionType === 'VoterID') {
      y += 10;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(47, 140, 255);
      doc.text('Voter Participation', centerX, y, { align: 'center' });
      y += 8;
      // Voted Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(60,60,60);
      doc.text(`Voted (${voted.length})`, 18, y); y += 6;
      autoTable(doc, {
        head: [['S. No.', 'Name', 'Voter ID']],
        body: voted.map((v: any, i: number) => [i + 1, v.name, v.voter_id]),
        startY: y,
        margin: { left: 18, right: 18 },
        styles: { font: 'helvetica', fontSize: 11, cellPadding: 2 },
        headStyles: { fillColor: [110, 231, 183], textColor: 30, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 80 }, 2: { cellWidth: 70 } },
        tableWidth: maxTableWidth,
        didDrawPage: (data) => {
          const table: any = data.table;
          if (!table || !table.margin || table.startY == null || table.width == null || table.height == null) {
            return;
          }
          doc.setDrawColor(110,231,183);
          doc.setLineWidth(1.1);
          const marginLeft = table.margin.left;
          const startY = table.startY;
          const width = table.width;
          const height = table.height;
          doc.roundedRect(
            marginLeft - 4,
            startY - 4,
            width + 8,
            height + 8,
            8, 8, 'S'
          );
        }
      });
      y = (doc as any).lastAutoTable.finalY + 8;
      // Not Voted Table
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(60,60,60);
      doc.text(`Not Voted (${notVoted.length})`, 18, y); y += 6;
      autoTable(doc, {
        head: [['S. No.', 'Name', 'Voter ID']],
        body: notVoted.map((v: any, i: number) => [i + 1, v.name, v.voter_id]),
        startY: y,
        margin: { left: 18, right: 18 },
        styles: { font: 'helvetica', fontSize: 11, cellPadding: 2 },
        headStyles: { fillColor: [235, 68, 90], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 28 }, 1: { cellWidth: 80 }, 2: { cellWidth: 70 } },
        tableWidth: maxTableWidth,
        didDrawPage: (data) => {
          const table: any = data.table;
          if (!table || !table.margin || table.startY == null || table.width == null || table.height == null) {
            return;
          }
          doc.setDrawColor(235,68,90);
          doc.setLineWidth(1.1);
          const marginLeft = table.margin.left;
          const startY = table.startY;
          const width = table.width;
          const height = table.height;
          doc.roundedRect(
            marginLeft - 4,
            startY - 4,
            width + 8,
            height + 8,
            8, 8, 'S'
          );
        }
      });
      y = (doc as any).lastAutoTable.finalY + 8;
    }
    // --- PAGE 2: Results Table ---
    doc.addPage();
    y = 18;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(47, 140, 255);
    doc.text('Election Results', centerX, y, { align: 'center' });
    y += 10;
    // For each position, render a separate table
    positions.forEach((position, idx) => {
      // Heading for the position
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(47, 140, 255);
      doc.text(position, 18, y);
      y += 7;
      // Table for candidates and votes
      const posCandidates = candidates.filter((c: any) => c.position === position);
      const tableRows = posCandidates
        .sort((a: any, b: any) => (tally[position][b.id] || 0) - (tally[position][a.id] || 0))
        .map((candidate: any) => [candidate.name, tally[position][candidate.id] || 0]);
      autoTable(doc, {
        head: [['Candidate', 'Votes']],
        body: tableRows,
        startY: y,
        margin: { left: 18, right: 18 },
        styles: { font: 'helvetica', fontSize: 11, cellPadding: 2 },
        headStyles: { fillColor: [47, 120, 191], textColor: 255, fontStyle: 'bold' },
        columnStyles: { 0: { cellWidth: 110 }, 1: { cellWidth: 40 } },
        tableWidth: maxTableWidth,
        didDrawPage: (data) => {
          const table: any = data.table;
          if (!table || !table.margin || table.startY == null || table.width == null || table.height == null) {
            return;
          }
          doc.setDrawColor(47,120,191);
          doc.setLineWidth(1.1);
          const marginLeft = table.margin.left;
          const startY = table.startY;
          const width = table.width;
          const height = table.height;
          doc.roundedRect(
            marginLeft - 4,
            startY - 4,
            width + 8,
            height + 8,
            8, 8, 'S'
          );
        }
      });
      y = (doc as any).lastAutoTable.finalY + 12;
      // Add a page break if near the bottom
      if (y > 250 && idx < positions.length - 1) {
        doc.addPage();
        y = 18;
      }
    });
    // Add session info and org name to filename
    const sessionInfo = selectedSessionId ? `_session_${selectedSessionId}` : '';
    const orgNameForFile = org && org.name ? org.name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') : 'organization';
    doc.save(`${orgNameForFile}_election_results${sessionInfo}.pdf`);
  };

  // Get all unique session_ids for this election, sorted by most recent
  const sessionGroups = votes.reduce((acc: Record<string, any[]>, v) => {
    if (!acc[v.session_id]) acc[v.session_id] = [];
    acc[v.session_id].push(v);
    return acc;
  }, {});
  const sessionIds = Object.keys(sessionGroups).sort((a, b) => {
    // Sort by most recent vote in each session
    const aTime = sessionGroups[a][0]?.timestamp ? new Date(sessionGroups[a][0].timestamp).getTime() : 0;
    const bTime = sessionGroups[b][0]?.timestamp ? new Date(sessionGroups[b][0].timestamp).getTime() : 0;
    return bTime - aTime;
  });
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  useEffect(() => {
    if (sessionIds.length > 0 && !selectedSessionId) setSelectedSessionId(sessionIds[0]);
  }, [sessionIds, selectedSessionId]);
  // Filter votes for selected session
  const sessionVotes = selectedSessionId && Array.isArray(sessionGroups[selectedSessionId]) ? sessionGroups[selectedSessionId] : [];

  // Tally for the latest session
  const tally: Record<string, Record<number, number>> = {};
  for (const position of positions) {
    tally[position] = {};
    for (const candidate of candidates.filter((c: any) => c.position === position)) {
      tally[position][candidate.id] = 0;
    }
  }
  for (const voteRow of sessionVotes) {
    const voteObj = voteRow.votes ? (typeof voteRow.votes === 'string' ? JSON.parse(voteRow.votes) : voteRow.votes) : {};
    for (const [position, candidateId] of Object.entries(voteObj) as [string, number][]) {
      if (tally[position] && tally[position][candidateId] !== undefined) {
        tally[position][candidateId] += 1;
      }
    }
  }

  // Prepare chart data for each position
  const getChartData = (position: string) => {
    const posCandidates = candidates.filter((c: any) => c.position === position);
    return {
      labels: posCandidates.map((c: any) => c.name),
      datasets: [
        {
          label: 'Votes',
          data: posCandidates.map((c: any) => tally[position][c.id] || 0),
          backgroundColor: '#4f8cff',
        },
      ],
    };
  };

  // --- Voted/Not Voted Card for Results Page ---
  const VotersStatusCard: React.FC<{ org: any, votes: any[] }> = ({ org, votes }) => {
    const [voted, setVoted] = useState<any[]>([]);
    const [notVoted, setNotVoted] = useState<any[]>([]);

    useEffect(() => {
      if (!org || !org.voters) return;
      const votedIds = new Set(votes.map((v: any) => (v.voter_id || '').toString().toLowerCase()));
      const votedList = org.voters.filter((v: any) => votedIds.has((v.voter_id || v.id).toString().toLowerCase()));
      const notVotedList = org.voters.filter((v: any) => !votedIds.has((v.voter_id || v.id).toString().toLowerCase()));
      setVoted(votedList);
      setNotVoted(notVotedList);
    }, [org, votes]);

    return (
      <Card style={{ background: 'var(--dark-light)', borderRadius: 20, border: '1.5px solid var(--border)', marginTop: '2rem', marginBottom: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
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

  // --- Election Details Card ---
  const ElectionDetailsCard: React.FC<{ sessionId: string | null, sessionVotes: any[], election: any }> = ({ sessionId, sessionVotes, election }) => {
    // Find the first vote in the session for start time, last for end time
    const sortedVotes = [...sessionVotes].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    const startTime = sortedVotes[0]?.timestamp ? new Date(sortedVotes[0].timestamp) : (election?.start_time ? new Date(election.start_time) : null);
    let endTime = null;
    if (sortedVotes.length > 1) {
      endTime = new Date(sortedVotes[sortedVotes.length - 1].timestamp);
    } else if (election?.end_time) {
      endTime = new Date(election.end_time);
    }
    const sessionType = sessionVotes[0]?.election_type || election?.type;
    const sessionIdDisplay = sessionId || election?.session_id || 'N/A';
    const timeOptions = { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' } as const;
    return (
      <Card style={{ background: 'var(--dark-light)', borderRadius: 20, border: '1.5px solid var(--border)', marginBottom: '1.5rem', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
        <Card.Body>
          <div style={{ fontWeight: 800, fontSize: 20, color: '#4f8cff', marginBottom: 10 }}>Election Details</div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Session ID: <span style={{ color: '#b0b8ff' }}>{sessionIdDisplay}</span></div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Type: <span style={{ color: '#b0b8ff' }}>{sessionType || 'N/A'}</span></div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Start Time: <span style={{ color: '#b0b8ff' }}>{startTime ? startTime.toLocaleString(undefined, timeOptions) : 'Not set'}</span></div>
          <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>End Time: <span style={{ color: '#b0b8ff' }}>{endTime ? endTime.toLocaleString(undefined, timeOptions) : 'Ongoing'}</span></div>
          {sessionType === 'Direct' && (
            <div style={{ color: '#fff', fontWeight: 600, fontSize: 16, marginBottom: 8 }}>Voters Voted: <span style={{ color: '#b0b8ff' }}>{sessionVotes.length}</span></div>
          )}
        </Card.Body>
      </Card>
    );
  };

  return (
    <div style={{ background: 'var(--dark)', minHeight: '100vh' }}>
      <style>
        {`
        .custom-dropdown-item:hover {
          background-color: #3d4052 !important;
          color: #fff !important;
        }
        .custom-dropdown-item:focus {
          background-color: #3d4052 !important;
          color: #fff !important;
        }
        `}
      </style>
      <div className="container py-4">
        <Button variant="link" className="p-0" style={{ color: '#4f8cff', fontSize: 28, marginBottom: 24 }} onClick={() => navigate(`/organization/${orgId}/election/${electionId}`)}>
          <FaArrowLeft />
        </Button>
        <h1 className="qb-greeting">Election Results</h1>
        {election && <div className="subtext mb-4">{election.name}</div>}
        {/* Results History and Actions at the top */}
        {sessionIds.length >= 1 && (
              <div style={{ marginBottom: 24, display: 'flex', alignItems: 'center', gap: 16 }}>
                <span style={{ color: '#4f8cff', fontWeight: 700, fontSize: 18, minWidth: 140 }}>Results History:</span>
                <Dropdown onSelect={key => setSelectedSessionId(key as string)}>
              <Dropdown.Toggle variant="dark" id="session-dropdown" style={{ background: '#232427', color: '#fff', border: 'none' }}>
                    {selectedSessionId === sessionIds[0]
                  ? `Latest Result (${sessionGroups[sessionIds[0]] && sessionGroups[sessionIds[0]][0] ? new Date(sessionGroups[sessionIds[0]][0].timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' }) : 'No timestamp'})`
                  : `Session (${sessionGroups[selectedSessionId!] && sessionGroups[selectedSessionId!][0] ? new Date(sessionGroups[selectedSessionId!][0].timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' }) : 'No timestamp'})`}
                  </Dropdown.Toggle>
              <Dropdown.Menu style={{ background: '#232427', color: '#fff', border: '1.5px solid #31334a' }}>
                    {sessionIds.map((id, idx) => (
                  <Dropdown.Item
                    key={id}
                    eventKey={id}
                    active={selectedSessionId === id}
                    style={
                      selectedSessionId === id
                        ? { background: '#2563eb', color: '#fff', fontWeight: 700 }
                        : { color: '#fff' }
                    }
                    className="custom-dropdown-item"
                  >
                        {idx === 0
                      ? `Latest Result (${sessionGroups[id] && sessionGroups[id][0] ? new Date(sessionGroups[id][0].timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' }) : 'No timestamp'})`
                      : `Session (${sessionGroups[id] && sessionGroups[id][0] ? new Date(sessionGroups[id][0].timestamp).toLocaleString(undefined, { hour: 'numeric', minute: '2-digit', second: '2-digit', hour12: true, year: 'numeric', month: '2-digit', day: '2-digit' }) : 'No timestamp'})`}
                      </Dropdown.Item>
                    ))}
                  </Dropdown.Menu>
                </Dropdown>
            <div className="d-flex justify-content-end mb-3" style={{ gap: 12, marginLeft: 'auto' }}>
              <button className="btn btn-primary" style={{ fontWeight: 700, borderRadius: 8 }} onClick={handleDownloadPDF}>
                Download PDF
              </button>
              <button className="btn btn-danger" style={{ fontWeight: 700, borderRadius: 8 }} onClick={() => setShowClearConfirm(true)}>
                Clear All Results
              </button>
            </div>
          </div>
        )}
        {/* Election Details Card */}
        {sessionVotes.length > 0 && (
          <ElectionDetailsCard sessionId={selectedSessionId} sessionVotes={sessionVotes} election={election} />
        )}
        {loading ? (
          <div className="subtext">Loading results...</div>
        ) : votes.length === 0 ? (
          <div className="subtext fw-bold" style={{ fontSize: 18 }}>No results available.</div>
        ) : (
          <>
            {showClearConfirm && (
              <div className="modal show d-block" tabIndex={-1}>
                <div className="modal-dialog modal-dialog-centered">
                  <div className="modal-content add-org-modal-content" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
                    <PopupContainer>
                      <div className="add-org-title-row mb-2">
                        <div className="add-org-title">Clear All Results</div>
                        <button className="add-org-close" onClick={() => setShowClearConfirm(false)} aria-label="Close">&times;</button>
                      </div>
                      <div className="add-org-divider" />
                      <div className="add-org-section">
                        <p style={{ color: '#fff' }}>Are you sure you want to clear all results for this election? This cannot be undone.</p>
                        {clearError && <div className="add-org-error mb-2">{clearError}</div>}
                        {clearSuccess && <div className="text-success mb-2">{clearSuccess}</div>}
                      </div>
                      <div className="d-flex gap-3 mt-4 justify-content-end">
                        <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowClearConfirm(false)}>Cancel</button>
                        <button className="btn px-4 py-2" style={{ background: '#eb445a', color: '#fff', borderRadius: '0.8rem', fontWeight: 600 }} onClick={handleClearResults}>Clear All Results</button>
                      </div>
                    </PopupContainer>
                  </div>
                </div>
              </div>
            )}
            {/* Check if election is completed before showing results */}
            {election && election.status !== 'Completed' ? (
              <div className="alert alert-warning text-center" style={{ borderRadius: '0.8rem', fontWeight: 600, fontSize: '1.2rem' }}>
                <h3>Election Not Completed</h3>
                <p>Results are not available until the election is officially completed.</p>
                <p>Current Status: <strong>{election.status}</strong></p>
              </div>
            ) : (
              <>
                {/* Results Table and Analytics */}
                <div className="row g-4">
                  {positions.map(position => (
                    <div className="col-md-6" key={position}>
                      <Card
                        style={{
                          background: 'var(--dark-light)',
                          borderRadius: 18,
                          border: '1.5px solid #31334a',
                          marginBottom: 32,
                        }}
                      >
                        <Card.Body>
                          <h3 className="text-primary fw-bold mb-3">{position}</h3>
                          <Table striped bordered hover variant="dark" style={{ marginBottom: 24 }}>
                            <thead>
                              <tr>
                                <th>Candidate</th>
                                <th>Votes</th>
                              </tr>
                            </thead>
                            <tbody>
                              {candidates
                                .filter((c: any) => c.position === position)
                                .sort((a: any, b: any) => (tally[position][b.id] || 0) - (tally[position][a.id] || 0))
                                .map((candidate: any) => (
                                <tr key={candidate.id}>
                                  <td>{candidate.name}</td>
                                  <td>{tally[position][candidate.id] || 0}</td>
                                </tr>
                              ))}
                            </tbody>
                          </Table>
                          <div style={{ margin: '0 auto' }}>
                            <Bar data={getChartData(position)} options={{
                              responsive: true,
                              plugins: {
                                legend: { display: false },
                                title: { display: true, text: 'Votes per Candidate' },
                              },
                              scales: {
                                y: { beginAtZero: true }
                              }
                            }} />
                          </div>
                        </Card.Body>
                      </Card>
                    </div>
                  ))}
                </div>
                {/* Voter Participation Card at the bottom */}
                {org && org.voters && sessionVotes.length > 0 && (() => {
                  // Find the type of the current session (if available)
                  const sessionType = sessionVotes[0]?.election_type || election?.type;
                  if (sessionType === 'QR' || sessionType === 'VoterID') {
                    return <VotersStatusCard org={org} votes={sessionVotes} />;
                  }
                  return null;
                })()}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default ElectionResultsPage; 