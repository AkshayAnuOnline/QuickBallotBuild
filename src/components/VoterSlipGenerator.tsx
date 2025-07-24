import React, { useState, useEffect } from 'react';
import { Card, Table, Modal, Button } from 'react-bootstrap';
import GlassButton from './GlassButton';
import { FaArrowLeft } from 'react-icons/fa';
import { useParams, useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import QRCode from 'qrcode';
// import QRCode from 'qrcode.react'; // TODO: Use for QR code generation

interface Voter {
  id: number;
  voter_id: string;
  name: string;
}



const VoterSlipGenerator: React.FC = () => {
  const { id } = useParams();
  const organization_id = Number(id);
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);
  const [organization_name, setOrganizationName] = useState<string>('');
  const [election_name, setElectionName] = useState<string>('');
  const [voters, setVoters] = useState<Voter[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    if (!id) {
      setNotFound(true);
      const orgRoute = id ? `/organization/${id}` : '/';
      const timeout = setTimeout(() => {
        navigate(orgRoute);
      }, 1500);
      return () => clearTimeout(timeout);
    } else {
      setNotFound(false);
      // Fetch org and latest election
      window.electronAPI.invoke('get-organizations').then((orgs: any[]) => {
        const found = orgs.find((o: any) => String(o.id) === String(id));
        setOrganizationName(found ? found.name : '');
        if (found) {
          window.electronAPI.invoke('get-elections', found.id).then((elections: any[]) => {
            const sorted = [...elections].sort((a, b) => {
              if (a.created_at && b.created_at) {
                return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
              }
              return (b.id || 0) - (a.id || 0);
            });
            setElectionName(sorted.length > 0 ? sorted[0].name : '');
          });
        }
      });
    }
  }, [id, navigate]);

  useEffect(() => {
    if (!organization_id) return;
    window.electronAPI.invoke('get-voters', organization_id).then(setVoters);
  }, [organization_id]);

  const handleSelect = (id: number) => {
    setSelected(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const filteredVoters = voters.filter(v =>
    v.name.toLowerCase().includes(search.toLowerCase()) ||
    (v.voter_id || v.id.toString()).toLowerCase().includes(search.toLowerCase())
  );

  // Select All logic
  const allSelected = filteredVoters.length > 0 && selected.length === filteredVoters.length;
  const someSelected = selected.length > 0 && selected.length < filteredVoters.length;
  const handleSelectAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(filteredVoters.map(v => v.id));
    }
  };

  // PDF generation logic
  const handleGeneratePDF = async () => {
    const selectedVoters = voters.filter(v => selected.includes(v.id));
    if (selectedVoters.length === 0) return;

    // PDF setup
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10;
    const slipWidth = (pageWidth - margin * 3) / 2; // 2 columns
    const slipHeight = (pageHeight - margin * 5) / 4; // 4 rows
    let col = 0, row = 0, slipCount = 0;

    for (let i = 0; i < selectedVoters.length; i++) {
      const voter = selectedVoters[i];
      // Calculate position
      col = slipCount % 2;
      row = Math.floor(slipCount / 2) % 4;
      const x = margin + col * (slipWidth + margin);
      const y = margin + row * (slipHeight + margin);

      // Draw slip background (white)
      doc.setFillColor(255, 255, 255); // white
      doc.roundedRect(x, y, slipWidth, slipHeight, 4, 4, 'F');
      // Draw thicker black border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.2);
      doc.roundedRect(x, y, slipWidth, slipHeight, 4, 4, 'S');

      // Layout constants
      const qrWidth = 28; // slightly smaller for more space
      const qrHeight = 28;
      const qrMargin = 6;
      const textMargin = 8;
      const availableTextWidth = slipWidth - qrWidth - qrMargin - textMargin;
      const qrX = x + slipWidth - qrWidth - qrMargin;
      const qrY = y + qrMargin;
      const textX = x + textMargin;
      const textY = y + textMargin + 2;

      // Voter Name (multi-line, left of QR)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(34, 43, 69); // dark text
      const voterNameLines = doc.splitTextToSize(voter.name, availableTextWidth);
      doc.text(voterNameLines, textX, textY);

      // Voter ID (below name, monospace, larger)
      doc.setFont('courier', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60); // dark gray
      const voterIdY = textY + voterNameLines.length * 6 + 2;
      doc.text(voter.voter_id || voter.id.toString(), textX, voterIdY);

      // QR Code (top right) with thin rounded frame
      const qrDataUrl = await QRCode.toDataURL(voter.voter_id || voter.id.toString(), { width: 60, margin: 0, errorCorrectionLevel: 'H' });
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.5);
      doc.roundedRect(qrX - 2, qrY - 2, qrWidth + 4, qrHeight + 4, 3, 3, 'S'); // QR frame with rounded corners
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrWidth, qrHeight);

      // Horizontal line separating main info from footer (stop before QR)
      const lineY = y + slipHeight - 26;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.line(x + 6, lineY, qrX - 4, lineY);

      // Footer: org/election name stacked at bottom left
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(80, 90, 160);
      const orgNameLines = doc.splitTextToSize((organization_name || '').toUpperCase(), slipWidth - 20);
      const footerStartY = y + slipHeight - 18;
      doc.text(orgNameLines, x + 8, footerStartY);
      const electionNameLines = doc.splitTextToSize((election_name || '').toUpperCase(), slipWidth - 20);
      doc.text(electionNameLines, x + 8, footerStartY + 8);

      slipCount++;
      // New page if needed
      if (slipCount % 8 === 0 && i !== selectedVoters.length - 1) {
        doc.addPage();
        slipCount = 0;
      }
    }
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    doc.save(`voter_slips_${timestamp}.pdf`);
  };

  // Generate PDF for all voters (without changing selection)
  const handleGenerateAllPDF = async () => {
    if (voters.length === 0) return;

    // PDF setup
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const pageWidth = 210; // A4 width in mm
    const pageHeight = 297; // A4 height in mm
    const margin = 10;
    const slipWidth = (pageWidth - margin * 3) / 2; // 2 columns
    const slipHeight = (pageHeight - margin * 5) / 4; // 4 rows
    let col = 0, row = 0, slipCount = 0;

    for (let i = 0; i < voters.length; i++) {
      const voter = voters[i];
      // Calculate position
      col = slipCount % 2;
      row = Math.floor(slipCount / 2) % 4;
      const x = margin + col * (slipWidth + margin);
      const y = margin + row * (slipHeight + margin);

      // Draw slip background (white)
      doc.setFillColor(255, 255, 255); // white
      doc.roundedRect(x, y, slipWidth, slipHeight, 4, 4, 'F');
      // Draw thicker black border
      doc.setDrawColor(0, 0, 0);
      doc.setLineWidth(1.2);
      doc.roundedRect(x, y, slipWidth, slipHeight, 4, 4, 'S');

      // Layout constants
      const qrWidth = 28; // slightly smaller for more space
      const qrHeight = 28;
      const qrMargin = 6;
      const textMargin = 8;
      const availableTextWidth = slipWidth - qrWidth - qrMargin - textMargin;
      const qrX = x + slipWidth - qrWidth - qrMargin;
      const qrY = y + qrMargin;
      const textX = x + textMargin;
      const textY = y + textMargin + 2;

      // Voter Name (multi-line, left of QR)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.setTextColor(34, 43, 69); // dark text
      const voterNameLines = doc.splitTextToSize(voter.name, availableTextWidth);
      doc.text(voterNameLines, textX, textY);

      // Voter ID (below name, monospace, larger)
      doc.setFont('courier', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(60, 60, 60); // dark gray
      const voterIdY = textY + voterNameLines.length * 6 + 2;
      doc.text(voter.voter_id || voter.id.toString(), textX, voterIdY);

      // QR Code (top right) with thin rounded frame
      const qrDataUrl = await QRCode.toDataURL(voter.voter_id || voter.id.toString(), { width: 60, margin: 0, errorCorrectionLevel: 'H' });
      doc.setDrawColor(80, 80, 80);
      doc.setLineWidth(0.5);
      doc.roundedRect(qrX - 2, qrY - 2, qrWidth + 4, qrHeight + 4, 3, 3, 'S'); // QR frame with rounded corners
      doc.addImage(qrDataUrl, 'PNG', qrX, qrY, qrWidth, qrHeight);

      // Horizontal line separating main info from footer (stop before QR)
      const lineY = y + slipHeight - 26;
      doc.setDrawColor(180, 180, 180);
      doc.setLineWidth(0.4);
      doc.line(x + 6, lineY, qrX - 4, lineY);

      // Footer: org/election name stacked at bottom left
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9);
      doc.setTextColor(80, 90, 160);
      const orgNameLines = doc.splitTextToSize((organization_name || '').toUpperCase(), slipWidth - 20);
      const footerStartY = y + slipHeight - 18;
      doc.text(orgNameLines, x + 8, footerStartY);
      const electionNameLines = doc.splitTextToSize((election_name || '').toUpperCase(), slipWidth - 20);
      doc.text(electionNameLines, x + 8, footerStartY + 8);

      slipCount++;
      // New page if needed
      if (slipCount % 8 === 0 && i !== voters.length - 1) {
        doc.addPage();
        slipCount = 0;
      }
    }
    const now = new Date();
    const pad = (n: number) => n.toString().padStart(2, '0');
    const timestamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    doc.save(`voter_slips_${timestamp}.pdf`);
  };

  if (notFound) {
    const orgRoute = id ? `/organization/${id}` : '/';
    return (
      <div className="voter-slip-generator-page" style={{ minHeight: '100vh', background: 'var(--dark)', padding: '2.5rem 0' }}>
        <div className="container py-4 text-center text-light">
          <h2 style={{ fontWeight: 900, fontSize: '2.2rem', marginBottom: 24 }}>Voter Slip Generator Not Found</h2>
          <div style={{ color: '#b0b8ff', fontSize: 18, marginBottom: 32 }}>The organization you are looking for does not exist or was deleted.</div>
          <button onClick={() => navigate(orgRoute)} style={{ fontSize: 20, padding: '12px 36px', borderRadius: 12, fontWeight: 700, background: '#4f8cff', color: '#fff', border: 'none' }}>Go Back</button>
        </div>
      </div>
    );
  }

  if (!organization_name || election_name === null) return <div style={{ color: '#fff', textAlign: 'center', marginTop: 60 }}>Loading...</div>;

  return (
    <div className="voter-slip-generator-page" style={{ minHeight: '100vh', background: 'var(--dark)', padding: '2.5rem 0' }}>
      <div className="container py-4">
        <div className="d-flex align-items-center mb-4 gap-3">
          <Button variant="link" className="p-0" style={{ color: '#4f8cff', fontSize: 28 }} onClick={() => navigate(`/organization/${organization_id}`)}><FaArrowLeft /></Button>
          <h2 className="mb-0" style={{ color: '#fff', fontWeight: 800 }}>Voter Slip Generator</h2>
        </div>
        <Card className="mb-4" style={{ background: 'var(--dark-light)', borderRadius: 20, border: '1.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
          <Card.Body>
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3" style={{ gap: '1.3rem' }}>
              <div className="d-flex align-items-center gap-2 flex-wrap" style={{ gap: '1.3rem' }}>
                <GlassButton icon="file_download" onClick={handleGenerateAllPDF}>Generate All</GlassButton>
                <GlassButton icon="file_download" onClick={handleGeneratePDF} disabled={selected.length === 0}>Generate Selected</GlassButton>
              </div>
              <div className="d-flex align-items-center gap-2" style={{ minWidth: 220 }}>
                <span className="material-icons" style={{ color: '#4f8cff', fontSize: 18 }}>search</span>
                <input
                  type="text"
                  className="add-org-input search-bar"
                  style={{ width: 180, background: 'var(--dark-lighter)', fontSize: '0.98rem', padding: '0.7rem 1rem' }}
                  placeholder="Search by name or ID"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <Table hover responsive variant="dark" className="mb-0" style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--dark-light)' }}>
                <thead style={{ background: 'var(--dark-lighter)' }}>
                  <tr>
                    <th style={{ width: 48, paddingLeft: '2rem', paddingRight: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="dark-checkbox"
                        checked={allSelected}
                        ref={input => { if (input) input.indeterminate = someSelected; }}
                        onChange={handleSelectAll}
                        style={{ verticalAlign: 'middle', margin: 0, width: 22, height: 22 }}
                      />
                    </th>
                    <th>Voter ID</th>
                    <th>Name</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVoters.map(voter => (
                    <tr key={voter.id}>
                      <td style={{ width: 48, paddingLeft: '2rem', paddingRight: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                        <input type="checkbox" className="dark-checkbox" checked={selected.includes(voter.id)} onChange={() => handleSelect(voter.id)} style={{ verticalAlign: 'middle', margin: 0, width: 22, height: 22 }} />
                      </td>
                      <td style={{ color: '#fff', fontWeight: 600 }}>{voter.voter_id || voter.id}</td>
                      <td style={{ color: '#fff' }}>{voter.name}</td>
                    </tr>
                  ))}
                  {filteredVoters.length === 0 && (
                    <tr>
                      <td colSpan={3} className="text-center text-secondary py-4">No voters found.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </div>
      {/* Print Preview Modal (placeholder) */}
      <Modal show={showPreview} onHide={() => setShowPreview(false)} centered dialogClassName="add-org-modal-premium" contentClassName="add-org-modal-content">
        <div className="add-org-modal-body">
          <div className="add-org-title-row mb-2">
            <div className="add-org-title">Print Preview (Coming Soon)</div>
            <button className="add-org-close" onClick={() => setShowPreview(false)} aria-label="Close">&times;</button>
          </div>
          <div className="add-org-divider" />
          <div style={{ color: '#fff', textAlign: 'center', padding: '2rem 0' }}>
            PDF and QR code generation will be implemented here.<br />
            Organization: <b>{organization_name}</b><br />
            Election: <b>{election_name}</b><br />
            Selected Voters: <b>{selected.length}</b>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default VoterSlipGenerator; 