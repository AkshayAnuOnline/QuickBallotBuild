import React, { useState } from 'react';
import { Card, Table, Button, Modal, Form } from 'react-bootstrap';
import GradientButton1 from './GradientButton1';
import GlassButton from './GlassButton';
import { FaTrash, FaEdit, FaSearch, FaArrowLeft } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { useParams, useNavigate } from 'react-router-dom';
import './AddOrganizationModal.scss';

const ManageVoters: React.FC = () => {
  const { id } = useParams();
  const organization_id = Number(id);
  const navigate = useNavigate();
  const [notFound, setNotFound] = useState(false);
  const [voters, setVoters] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newVoterName, setNewVoterName] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);
  const [editVoter, setEditVoter] = useState<{ id: string; name: string } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<{ names: string[]; added: number; skipped: number } | null>(null);
  const [addVoterError, setAddVoterError] = useState('');

  React.useEffect(() => {
    if (!id) {
      setNotFound(true);
      const orgRoute = id ? `/organization/${id}` : '/';
      const timeout = setTimeout(() => {
        navigate(orgRoute);
      }, 1500);
      return () => clearTimeout(timeout);
    } else {
      setNotFound(false);
    }
  }, [id, navigate]);

  React.useEffect(() => {
    if (!organization_id) return;
    window.electronAPI.invoke('get-voters', organization_id).then(setVoters);
  }, [organization_id]);

  const handleSelect = (id: number) => {
    setSelected(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const handleAddVoter = async () => {
    if (!newVoterName.trim()) return;
    // Duplicate name check (case-insensitive, trimmed)
    const normNew = newVoterName.trim().toLowerCase();
    if (voters.some(v => (v.name || '').trim().toLowerCase() === normNew)) {
      setAddVoterError('A voter with this name already exists.');
      return;
    }
    setAddVoterError('');
    const newVoter = await window.electronAPI.invoke('create-voter', { organization_id, name: newVoterName.trim() });
    setVoters(prev => [...prev, newVoter]);
    setNewVoterName('');
    setShowAddModal(false);
  };

  const handleEditVoter = async () => {
    if (!editVoter) return;
    await window.electronAPI.invoke('update-voter', { ...editVoter });
    setVoters(voters.map(v => v.id === editVoter.id ? { ...v, name: editVoter.name } : v));
    setShowEditModal(false);
    setEditVoter(null);
  };

  const handleDeleteVoter = async (id: number) => {
    await window.electronAPI.invoke('delete-voter', id);
    setVoters(voters.filter(v => v.id !== id));
    setSelected(selected.filter(s => s !== id));
  };

  const handleBatchDelete = async () => {
    for (const id of selected) {
      await window.electronAPI.invoke('delete-voter', id);
    }
    setVoters(voters.filter(v => !selected.includes(v.id)));
    setSelected([]);
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Voter Name"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Voters");
    XLSX.writeFile(wb, "voters_template.xlsx");
  };

  const handleExportVoters = () => {
    if (voters.length === 0) {
      alert('No voters to export');
      return;
    }
    
    // Prepare data for export
    const exportData = voters.map(voter => ({
      'Voter ID': voter.voter_id || voter.id,
      'Name': voter.name
    }));
    
    // Create worksheet
    const ws = XLSX.utils.json_to_sheet(exportData);
    
    // Create workbook
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Voters");
    
    // Generate filename with timestamp
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
    const filename = `voters_export_${timestamp}.xlsx`;
    
    // Download the file
    XLSX.writeFile(wb, filename);
  };

  const filteredVoters = voters.filter(v => v.name.toLowerCase().includes(search.toLowerCase()) || (v.voter_id || v.id).toString().toLowerCase().includes(search.toLowerCase()));

  // Helper: normalize header
  const headerVariants = [
    'voter name', 'votername', 'name', 'full name', 'voter', 'voters', 'voter_name', 'votername', 'voter names', 'names'
  ];
  const normalize = (str: string) => str.trim().toLowerCase().replace(/\s|_/g, '');

  // Import handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      let data: string | ArrayBuffer | null = evt.target && typeof evt.target.result !== 'undefined' ? evt.target.result : null;
      let rows: any[][] = [];
      if (!data) return;
      if (file.name.endsWith('.csv')) {
        const text = typeof data === 'string' ? data : new TextDecoder().decode(data as ArrayBuffer);
        rows = text.split(/\r?\n/).map(row => row.split(','));
      } else {
        const workbook = XLSX.read(data, { type: 'binary' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        rows = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as any[][];
      }
      if (!rows.length) return;
      let headerRowIdx = 0;
      for (let i = 0; i < rows.length; ++i) {
        const cell = rows[i][0] || '';
        if (headerVariants.includes(normalize(cell))) {
          headerRowIdx = i;
          break;
        }
      }
      const existingNames = new Set(voters.map(v => normalize(v.name)));
      const fileNames = new Set<string>();
      let added = 0, skipped = 0;
      const previewNames: string[] = [];
      for (let i = headerRowIdx + 1; i < rows.length; ++i) {
        const name = (rows[i][0] || '').trim();
        if (!name) continue;
        const norm = normalize(name);
        if (headerVariants.includes(norm)) { skipped++; continue; }
        if (fileNames.has(norm) || existingNames.has(norm)) { skipped++; continue; }
        fileNames.add(norm);
        previewNames.push(name);
        added++;
      }
      setImportPreview({ names: previewNames, added, skipped });
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // Add import confirm handler
  const handleImportConfirm = async () => {
    if (!importPreview) return;
    const inserted = await window.electronAPI.invoke('batch-create-voters', { organization_id, names: importPreview.names });
    setVoters(prev => [...prev, ...inserted]);
    setImportPreview(null);
    setShowImportModal(false);
  };

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

  if (notFound) {
    const orgRoute = id ? `/organization/${id}` : '/';
    return (
      <div className="manage-voters-page" style={{ minHeight: '100vh', background: 'var(--dark)', padding: '2.5rem 0' }}>
        <div className="container py-4 text-center text-light">
          <h2 style={{ fontWeight: 900, fontSize: '2.2rem', marginBottom: 24 }}>Voter Management Not Found</h2>
          <div style={{ color: '#b0b8ff', fontSize: 18, marginBottom: 32 }}>The organization you are looking for does not exist or was deleted.</div>
          <button onClick={() => navigate(orgRoute)} style={{ fontSize: 20, padding: '12px 36px', borderRadius: 12, fontWeight: 700, background: '#4f8cff', color: '#fff', border: 'none' }}>Go Back</button>
        </div>
      </div>
    );
  }

  return (
    <div className="manage-voters-page" style={{ minHeight: '100vh', background: 'var(--dark)', padding: '2.5rem 0' }}>
      <div className="container py-4">
        <div className="d-flex align-items-center mb-4 gap-3">
          <Button variant="link" className="p-0" style={{ color: '#4f8cff', fontSize: 28 }} onClick={() => navigate(`/organization/${id}`)}><FaArrowLeft /></Button>
          <h2 className="mb-0" style={{ color: '#fff', fontWeight: 800 }}>Manage Voters</h2>
        </div>
        <Card className="mb-4" style={{ background: 'var(--dark-light)', borderRadius: 20, border: '1.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
          <Card.Body>
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3" style={{ gap: '1rem' }}>
              <div className="d-flex align-items-center gap-2 flex-wrap" style={{ gap: '1rem !important' }}>
                <GlassButton icon="person_add" onClick={() => setShowAddModal(true)} style={{ marginRight: '1rem' }}>Add Voter</GlassButton>
                <GlassButton icon="file_upload" onClick={() => setShowImportModal(true)} style={{ marginRight: '1rem' }}>Import CSV/Excel</GlassButton>
                <GlassButton icon="file_download" onClick={handleExportVoters} style={{ marginRight: '1rem' }}>Export Excel</GlassButton>
                {selected.length > 0 && (
                  <GlassButton icon="delete" onClick={handleBatchDelete} style={{ background: '#eb445a', color: '#fff', marginRight: '1rem' }}>Delete Selected</GlassButton>
                )}
              </div>
              <div className="d-flex align-items-center gap-2" style={{ minWidth: 220 }}>
                <FaSearch style={{ color: '#4f8cff', fontSize: 18 }} />
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
                    <th style={{ width: 120 }}>Actions</th>
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
                      <td>
                        <Button variant="link" className="p-0 me-2" style={{ color: '#4f8cff' }} onClick={() => { setEditVoter(voter); setShowEditModal(true); }}><FaEdit /></Button>
                        <Button variant="link" className="p-0" style={{ color: '#eb445a' }} onClick={() => handleDeleteVoter(voter.id)}><FaTrash /></Button>
                      </td>
                    </tr>
                  ))}
                  {filteredVoters.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-secondary py-4">No voters found.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </div>
      {/* Add Voter Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); setAddVoterError(''); }} centered dialogClassName="add-org-modal-premium" contentClassName="modal-content add-org-modal-content">
        <div className="add-org-modal-body">
          <div className="add-org-title-row mb-2">
            <div className="add-org-title">Add New Voter</div>
            <button className="add-org-close" onClick={() => { setShowAddModal(false); setAddVoterError(''); }} aria-label="Close">&times;</button>
          </div>
          <div className="add-org-divider" />
          <Form onSubmit={e => { e.preventDefault(); handleAddVoter(); }} autoComplete="off">
            <div className="add-org-section">
              <div className="add-org-float-group mb-3">
                <input
                  type="text"
                  className="add-org-input"
                  placeholder=" "
                  value={newVoterName}
                  onChange={e => { setNewVoterName(e.target.value); setAddVoterError(''); }}
                  required
                  autoFocus
                />
                <label className={newVoterName ? 'float-active' : ''}>Voter Name</label>
              </div>
              {addVoterError && <div style={{ color: '#eb445a', marginTop: 4, fontWeight: 600 }}>{addVoterError}</div>}
            </div>
            <div className="d-flex gap-3 justify-content-end mt-4">
              <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => { setShowAddModal(false); setAddVoterError(''); }} type="button">Cancel</button>
              <GradientButton1 type="submit" style={{ borderRadius: '0.8rem', fontWeight: 600 }}>Add</GradientButton1>
            </div>
          </Form>
        </div>
      </Modal>
      {/* Edit Voter Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered dialogClassName="add-org-modal-premium" contentClassName="modal-content add-org-modal-content">
        <div className="add-org-modal-body">
          <div className="add-org-title-row mb-2">
            <div className="add-org-title">Edit Voter</div>
            <button className="add-org-close" onClick={() => setShowEditModal(false)} aria-label="Close">&times;</button>
          </div>
          <div className="add-org-divider" />
          <Form onSubmit={e => { e.preventDefault(); handleEditVoter(); }} autoComplete="off">
            <div className="add-org-section">
              <div className="add-org-float-group mb-3">
                <input
                  type="text"
                  className="add-org-input"
                  placeholder=" "
                  value={editVoter?.name || ''}
                  onChange={e => setEditVoter(editVoter ? { ...editVoter, name: e.target.value } : null)}
                  required
                  autoFocus
                />
                <label className={editVoter?.name ? 'float-active' : ''}>Voter Name</label>
              </div>
            </div>
            <div className="d-flex gap-3 justify-content-end mt-4">
              <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowEditModal(false)} type="button">Cancel</button>
              <GradientButton1 type="submit" style={{ borderRadius: '0.8rem', fontWeight: 600 }}>Save</GradientButton1>
            </div>
          </Form>
        </div>
      </Modal>
      {/* Import CSV Modal (scaffold only) */}
      <Modal show={showImportModal} onHide={() => { setShowImportModal(false); setImportPreview(null); }} centered dialogClassName="add-org-modal-premium" contentClassName="modal-content add-org-modal-content">
        <div className="add-org-modal-body">
          <div className="add-org-title-row mb-2">
            <div className="add-org-title">Import Voters from CSV/Excel</div>
            <button className="add-org-close" onClick={() => { setShowImportModal(false); setImportPreview(null); }} aria-label="Close">&times;</button>
          </div>
          <div className="add-org-divider" />
          <div className="add-org-section">
            <p className="text-secondary mb-3">Upload a CSV or Excel file with voter names. Download the template for correct format.</p>
            <GlassButton icon="file_download" onClick={handleDownloadTemplate}>Download Template</GlassButton>
            <Form.Group controlId="csvFile" className="mt-3">
              <Form.Control type="file" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/vnd.ms-excel" onChange={handleImportFile} />
            </Form.Group>
            {importPreview && (
              <div className="mt-4" style={{ background: '#232427', borderRadius: 12, padding: '1.2rem', border: '1.2px solid #4f8cff' }}>
                <div style={{ color: '#fff', fontWeight: 600, marginBottom: 6 }}>
                  <span style={{ color: '#4f8cff' }}>{importPreview.added}</span> will be added, <span style={{ color: '#eb445a' }}>{importPreview.skipped}</span> skipped (duplicates/header/existing)
                </div>
                {importPreview.names.length > 0 && (
                  <div style={{ maxHeight: 120, overflowY: 'auto', fontSize: '0.98rem', color: '#a3a6b1' }}>
                    <strong>Preview:</strong>
                    <ul style={{ margin: 0, paddingLeft: 18 }}>
                      {importPreview.names.slice(0, 10).map((name, idx) => (
                        <li key={idx}>{name}</li>
                      ))}
                      {importPreview.names.length > 10 && <li>...and {importPreview.names.length - 10} more</li>}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="d-flex gap-3 justify-content-end mt-4">
            <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => { setShowImportModal(false); setImportPreview(null); }} type="button">Cancel</button>
            <GradientButton1 style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={handleImportConfirm} disabled={!importPreview || importPreview.added === 0}>Import</GradientButton1>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ManageVoters; 