import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageBG from './PageBG';
import Button1 from './Button1';
import PopupContainer from './PopupContainer';
import GradientButton1 from './GradientButton1';
import { FaImage } from 'react-icons/fa';
import { Row, Col, Card, Modal, Form } from 'react-bootstrap';
import HelpDrawer from './HelpDrawer';

interface Organization {
  id: number;
  name: string;
  logo?: string;
  password: string;
  recovery_phrase: string;
}

const ipc = window.electronAPI;

const IndividualOrganization: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [org, setOrg] = useState<Organization | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [editName, setEditName] = useState('');
  const [editLogo, setEditLogo] = useState<string | undefined>(undefined);
  const [editLogoFile, setEditLogoFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [elections, setElections] = useState<any[]>([]);
  const [showNewElectionModal, setShowNewElectionModal] = useState(false);
  const [newElectionName, setNewElectionName] = useState('');
  const [newElectionLogo, setNewElectionLogo] = useState<File | null>(null);
  const [newElectionLoading, setNewElectionLoading] = useState(false);
  // Add new state for positions and start/end time
  const [positions, setPositions] = useState<string[]>([]);
  const [newPosition, setNewPosition] = useState('');
  const [positionsError, setPositionsError] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  // Add state for showing the change password form
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [oldPassword, setOldPassword] = useState('');
  const [showOldPassword, setShowOldPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  useEffect(() => {
    fetchOrg();
    // eslint-disable-next-line
  }, [id]);

  useEffect(() => {
    if (org) fetchElections();
    // eslint-disable-next-line
  }, [org]);

  useEffect(() => {
    if (!org) {
      setNotFound(true);
      const timeout = setTimeout(() => {
        navigate('/');
      }, 1500);
      return () => clearTimeout(timeout);
    } else {
      setNotFound(false);
    }
  }, [org, navigate]);

  const fetchOrg = async () => {
    if (!ipc) return;
    const orgs = await ipc.invoke('get-organizations');
    const found = orgs.find((o: any) => String(o.id) === String(id));
    setOrg(found || null);
    setEditName(found?.name || '');
    setEditLogo(found?.logo);
  };

  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PNG, JPG, SVG, and WEBP images are allowed.');
        return;
      }
      setEditLogoFile(file);
      setEditLogo(undefined);
    }
  };

  const handleUpdateOrg = async () => {
    if (!ipc || !org) return;
    let logoData = editLogo;
    if (editLogoFile) {
      logoData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(editLogoFile);
      });
    }
    await ipc.invoke('update-organization', {
      ...org,
      name: editName,
      logo: logoData,
    });
    fetchOrg();
    setShowSettings(false);
    setEditLogoFile(null);
  };

  const handleDeleteOrg = async () => {
    if (!ipc || !org) return;
    await ipc.invoke('delete-organization', org.id);
    navigate('/');
  };

  // Fetch elections for this org
  const fetchElections = async () => {
    if (!ipc || !org) return;
    const result = await ipc.invoke('get-elections', org.id);
    setElections(result);
  };
  // Update handleCreateElection to include positions and times
  const handleCreateElection = async () => {
    if (!ipc || !org || !newElectionName.trim()) return;
    if (positions.length === 0 || positions.some(p => !p.trim())) {
      setPositionsError('At least one position is required.');
      return;
    }
    setNewElectionLoading(true);
    let logoData = '';
    if (newElectionLogo) {
      const reader = new FileReader();
      await new Promise<void>((resolve) => {
        reader.onload = () => {
          logoData = reader.result as string;
          resolve();
        };
        reader.readAsDataURL(newElectionLogo);
      });
    }
    await ipc.invoke('create-election', {
      organization_id: org.id,
      name: newElectionName.trim(),
      positions,
      logo: logoData,
      status: 'Not Started',
    });
    setShowNewElectionModal(false);
    setNewElectionName('');
    setNewElectionLogo(null);
    setPositions([]);
    setNewPosition('');
    setNewElectionLoading(false);
    fetchElections();
  };

  // Add handler for adding/removing positions
  const handleAddPosition = () => {
    if (newPosition.trim()) {
      setPositions([...positions, newPosition.trim()]);
      setNewPosition('');
      setPositionsError('');
    }
  };
  const handleRemovePosition = (idx: number) => {
    setPositions(positions.filter((_, i) => i !== idx));
  };

  // Add a handler for changing password
  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');
    if (!oldPassword || !newPassword || !confirmPassword) {
      setPasswordError('Please fill all password fields.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match.');
      return;
    }
    
    try {
      // Validate old password using backend authentication
      if (!org) {
        setPasswordError('Organization not found.');
      return;
    }
      await ipc.invoke('authenticate-admin', { orgId: org.id, password: oldPassword });
      
      // Update password
      await ipc.invoke('update-organization', {
        ...org,
        password: newPassword,
      });
      setPasswordSuccess('Password changed successfully.');
      setPasswordError('');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setShowChangePassword(false);
      fetchOrg();
    } catch (e: any) {
      // Check if it's an authentication error or other error
      if (e?.message?.includes('Incorrect password') || e?.message?.includes('authenticate-admin')) {
        setPasswordError('Incorrect password.');
      } else {
        setPasswordError('Failed to change password.');
      }
      setPasswordSuccess('');
    }
  };

  if (notFound) {
    return (
      <PageBG>
        <div className="container py-4 text-center text-light">
          <h2 style={{ fontWeight: 900, fontSize: '2.2rem', marginBottom: 24 }}>Organization not found</h2>
          <div style={{ color: '#b0b8ff', fontSize: 18, marginBottom: 32 }}>The organization you are looking for does not exist or was deleted.</div>
          <Button1 onClick={() => navigate('/')} style={{ fontSize: 20, padding: '12px 36px', borderRadius: 12, fontWeight: 700 }}>Go Home</Button1>
        </div>
      </PageBG>
    );
  }

  return (
    <PageBG>
      <HelpDrawer open={showHelp} onClose={() => setShowHelp(false)} />
      <div className="container py-4">
        {/* Header */}
        <div className="d-flex align-items-center justify-content-between mb-4">
          <div className="d-flex align-items-center gap-3">
            {/* Back Button */}
            <button
              className="btn btn-link p-0 me-3"
              style={{ color: '#4f8cff', fontSize: 28, textDecoration: 'none' }}
              onClick={() => navigate('/')}
              aria-label="Go back"
            >
              <span className="material-icons">arrow_back</span>
            </button>
            {org?.logo ? (
              <img src={org.logo} alt="Org Logo" style={{ width: 48, height: 48, borderRadius: '0.7rem' }} />
            ) : (
              <span className="material-icons" style={{ fontSize: 48, color: '#4f8cff' }}>business</span>
            )}
            <h2 className="mb-0" style={{ color: '#fff', fontWeight: 800 }}>{org?.name}</h2>
          </div>
          {/* Settings and Help buttons */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button
            className="org-settings-btn"
            onClick={() => setShowSettings(true)}
            aria-label="Organization Settings"
            style={{ background: 'none', border: 'none', padding: 0, marginLeft: 12, cursor: 'pointer', display: 'flex', alignItems: 'center' }}
          >
            <span className="material-icons" style={{ fontSize: 32, color: '#4f8cff', transition: 'color 0.2s' }}>settings</span>
          </button>
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
              }}
              onClick={() => setShowHelp(true)}
              aria-label="Open Help"
            >
              <span className="material-icons" style={{ fontSize: 24 }}>help_outline</span>
              Help
            </button>
          </div>
        </div>
        {/* Section 1: Elections */}
        <div style={{ marginBottom: 48 }}>
          <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: 18 }}>Elections</h4>
        <Row className="organizations-grid">
            {/* Add Election Card */}
            <Col xs={12} sm={6} md={4} lg={3} className="mb-4">
              <Card className="org-card h-100 d-flex align-items-center justify-content-center" style={{ cursor: 'pointer', minHeight: 180, border: '2px dashed #4f8cff', background: 'rgba(79,140,255,0.07)' }} onClick={() => setShowNewElectionModal(true)}>
                <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center">
                  <span className="material-icons" style={{ fontSize: 48, color: '#4f8cff', marginBottom: 8 }}>add_circle</span>
                  <div style={{ color: '#4f8cff', fontWeight: 700, fontSize: 20 }}>Add Election</div>
                </Card.Body>
              </Card>
            </Col>
            {/* Election Cards */}
          {elections.length === 0 ? (
            <Col xs={12} className="text-center text-secondary py-5">
                <div style={{ opacity: 0.7 }}>No elections yet. Click "Add Election" to create one.</div>
            </Col>
          ) : (
            elections.map(election => (
              <Col key={election.id} xs={12} sm={6} md={4} lg={3} className="mb-4">
                <Card className="org-card h-100" style={{ cursor: 'pointer', position: 'relative' }} onClick={() => navigate(`/organization/${org?.id}/election/${election.id}`)}>
                  <Card.Body className="text-center position-relative">
                    <div className="org-logo mb-3">
                      {election.logo ? (
                        <img src={election.logo} alt="Election Logo" style={{ maxWidth: 48, maxHeight: 48, borderRadius: '0.7rem', boxShadow: '0 2px 8px rgba(80,80,120,0.13)' }} />
                      ) : (
                        <span className="material-icons">how_to_vote</span>
                      )}
                    </div>
                    <Card.Title as="h5" className="org-name">{election.name}</Card.Title>
                    <div className="org-stats">
                      <div className="election-count">{election.status || 'Not Started'}</div>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            ))
          )}
        </Row>
        </div>

        {/* Section 2: Voter Management */}
        <div>
          <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: 18 }}>Voter Management</h4>
          <Row className="voter-management-row" style={{ marginBottom: 24 }}>
            <Col xs={12} sm={6} md={4} lg={3} className="mb-4">
              <Card className="org-card h-100 d-flex align-items-center justify-content-center" style={{ cursor: 'pointer', minHeight: 140 }} onClick={() => navigate(`/organization/${org?.id}/voters`)}>
                <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center">
                  <span className="material-icons" style={{ fontSize: 40, color: '#4f8cff', marginBottom: 8 }}>group</span>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Voter Management</div>
                </Card.Body>
              </Card>
            </Col>
            <Col xs={12} sm={6} md={4} lg={3} className="mb-4">
              <Card className="org-card h-100 d-flex align-items-center justify-content-center" style={{ cursor: 'pointer', minHeight: 140 }} onClick={() => navigate(`/organization/${org?.id}/slip-generator`)}>
                <Card.Body className="d-flex flex-column align-items-center justify-content-center text-center">
                  <span className="material-icons" style={{ fontSize: 40, color: '#4f8cff', marginBottom: 8 }}>qr_code</span>
                  <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>Voter Slip Generator</div>
                </Card.Body>
              </Card>
            </Col>
          </Row>
        </div>
        {/* Settings Popup */}
        {showSettings && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content add-org-modal-content" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
                <PopupContainer>
                  <div className="add-org-title-row mb-2">
                    <div className="add-org-title">Organization Settings</div>
                    <button className="add-org-close" onClick={() => setShowSettings(false)} aria-label="Close">&times;</button>
                  </div>
                  <div className="add-org-divider" />
                  <form autoComplete="off">
                    <div className="add-org-section">
                      <div className="add-org-float-group">
                        <input
                          type="text"
                          className="add-org-input"
                          id="editOrgNameInput"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          placeholder=" "
                        />
                        <label htmlFor="editOrgNameInput" className={editName ? 'float-active' : ''}>Organization Name</label>
                      </div>
                      <div className="add-org-logo-card">
                        <div className="add-org-logo-label-row">
                          <FaImage className="add-org-logo-icon" />
                          <span className="add-org-label">Logo (optional)</span>
                        </div>
                        <div className="add-org-file-wrap">
                          <input
                            type="file"
                            accept=".png,.jpg,.jpeg,.svg,.webp"
                            id="editOrgLogoFile"
                            style={{ display: 'none' }}
                            onChange={handleLogoChange}
                          />
                          <label htmlFor="editOrgLogoFile" className="add-org-file-btn">Choose Logo</label>
                          <span className="add-org-file-name">{editLogoFile ? editLogoFile.name : (editLogo ? 'Current logo' : 'No file chosen')}</span>
                        </div>
                        {(editLogoFile || editLogo) && (
                          <img
                            src={editLogoFile ? URL.createObjectURL(editLogoFile) : editLogo}
                            alt="Logo Preview"
                            className="add-org-logo-preview"
                          />
                        )}
                      </div>
                    </div>
                    <div className="add-org-section mt-3">
                      {!showChangePassword ? (
                        <button className="btn btn-outline-primary w-100" style={{ borderRadius: 8, fontWeight: 600 }} onClick={() => setShowChangePassword(true)}>
                          Change Password
                        </button>
                      ) : (
                        <div style={{ background: '#232427', borderRadius: 12, padding: 16, marginTop: 8 }}>
                          <div className="add-org-float-group" style={{ position: 'relative' }}>
                            <input
                              type={showOldPassword ? 'text' : 'password'}
                              className="add-org-input"
                              id="oldOrgPasswordInput"
                              value={oldPassword}
                              onChange={e => setOldPassword(e.target.value)}
                              placeholder=" "
                              autoComplete="current-password"
                              style={{ paddingRight: 44 }}
                            />
                            <button
                              type="button"
                              className="add-org-eye-btn"
                              aria-label={showOldPassword ? 'Hide password' : 'Show password'}
                              onClick={() => setShowOldPassword(v => !v)}
                              tabIndex={-1}
                              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a3a6b1', cursor: 'pointer', padding: 0, height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-icons" style={{ fontSize: 24 }}>{showOldPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                            <label htmlFor="oldOrgPasswordInput" className={oldPassword ? 'float-active' : ''}>Old Password</label>
                          </div>
                          <div className="add-org-float-group" style={{ position: 'relative' }}>
                            <input
                              type={showNewPassword ? 'text' : 'password'}
                              className="add-org-input"
                              id="newOrgPasswordInput"
                              value={newPassword}
                              onChange={e => setNewPassword(e.target.value)}
                              placeholder=" "
                              autoComplete="new-password"
                              style={{ paddingRight: 44 }}
                            />
                            <button
                              type="button"
                              className="add-org-eye-btn"
                              aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                              onClick={() => setShowNewPassword(v => !v)}
                              tabIndex={-1}
                              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a3a6b1', cursor: 'pointer', padding: 0, height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-icons" style={{ fontSize: 24 }}>{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                            <label htmlFor="newOrgPasswordInput" className={newPassword ? 'float-active' : ''}>New Password</label>
                          </div>
                          <div className="add-org-float-group" style={{ position: 'relative' }}>
                            <input
                              type={showConfirmPassword ? 'text' : 'password'}
                              className="add-org-input"
                              id="confirmOrgPasswordInput"
                              value={confirmPassword}
                              onChange={e => setConfirmPassword(e.target.value)}
                              placeholder=" "
                              autoComplete="new-password"
                              style={{ paddingRight: 44 }}
                            />
                            <button
                              type="button"
                              className="add-org-eye-btn"
                              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                              onClick={() => setShowConfirmPassword(v => !v)}
                              tabIndex={-1}
                              style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a3a6b1', cursor: 'pointer', padding: 0, height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                            >
                              <span className="material-icons" style={{ fontSize: 24 }}>{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                            </button>
                            <label htmlFor="confirmOrgPasswordInput" className={confirmPassword ? 'float-active' : ''}>Confirm New Password</label>
                          </div>
                          {passwordError && <div className="add-org-error" style={{ marginTop: 4 }}>{passwordError}</div>}
                          {passwordSuccess && <div className="text-success" style={{ marginTop: 4 }}>{passwordSuccess}</div>}
                          <div className="d-flex gap-2 mt-3">
                            <button className="btn btn-secondary w-50" style={{ borderRadius: 8, fontWeight: 600 }} onClick={() => { setShowChangePassword(false); setOldPassword(''); setNewPassword(''); setConfirmPassword(''); setPasswordError(''); setPasswordSuccess(''); }}>Cancel</button>
                            <button className="btn btn-primary w-50" style={{ borderRadius: 8, fontWeight: 600 }} onClick={handleChangePassword}>Change Password</button>
                          </div>
                        </div>
                      )}
                    </div>
                  </form>
                  <div className="d-flex gap-3 mt-4 justify-content-end">
                    <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowSettings(false)}>Cancel</button>
                    <GradientButton1 className="add-org-create px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={handleUpdateOrg}>Save</GradientButton1>
                    <button className="btn px-4 py-2" style={{ background: '#eb445a', color: '#fff', borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowDeleteConfirm(true)}>Delete Organization</button>
                  </div>
                </PopupContainer>
              </div>
            </div>
          </div>
        )}
        {/* Delete Confirmation Popup */}
        {showDeleteConfirm && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content add-org-modal-content" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
                <PopupContainer>
                  <div className="add-org-title-row mb-2">
                    <div className="add-org-title" style={{ color: '#fff', fontWeight: 800 }}>Delete Organization</div>
                    <button className="add-org-close" onClick={() => setShowDeleteConfirm(false)} aria-label="Close">&times;</button>
                  </div>
                  <div className="add-org-divider" />
                  <div className="add-org-section">
                    <h4 style={{ color: '#fff', fontWeight: 700, marginBottom: '1.2rem' }}>Are you sure you want to delete this organization?</h4>
                    <div style={{ color: '#ff4d6d', fontWeight: 500, marginBottom: '0.7rem' }}>This action cannot be undone.</div>
                  </div>
                  <div className="d-flex gap-3 mt-4 justify-content-end">
                    <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                    <button className="btn px-4 py-2" style={{ background: '#eb445a', color: '#fff', borderRadius: '0.8rem', fontWeight: 600 }} onClick={handleDeleteOrg}>Delete</button>
                  </div>
                </PopupContainer>
              </div>
            </div>
          </div>
        )}
        {/* New Election Modal */}
        <Modal show={showNewElectionModal} onHide={() => setShowNewElectionModal(false)} centered backdrop="static" dialogClassName="add-org-modal-premium" contentClassName="add-org-modal-content">
          <div className="add-org-modal-body">
            <div className="add-org-title-row">
              <div className="add-org-title">Create New Election</div>
              <button className="add-org-close" onClick={() => setShowNewElectionModal(false)} aria-label="Close">&times;</button>
            </div>
            <div className="add-org-divider" />
            <Form autoComplete="off">
              <div className="add-org-section">
                {/* Election Name */}
                <div className="add-org-float-group">
                  <input
                    type="text"
                    className="add-org-input"
                    id="electionNameInput"
                    value={newElectionName}
                    onChange={e => setNewElectionName(e.target.value)}
                    autoFocus
                    required
                    placeholder=" "
                  />
                  <label htmlFor="electionNameInput" className={newElectionName ? 'float-active' : ''}>Election Name</label>
                </div>
                {/* Positions Section */}
                <div className="add-org-logo-card mt-2 mb-3" style={{ background: '#202127', borderRadius: '1.1rem', border: '1.2px solid #232427', boxShadow: '0 4px 18px rgba(80,80,120,0.13)' }}>
                  <div className="d-flex align-items-center mb-2" style={{ gap: '0.6rem' }}>
                    <span className="material-icons" style={{ color: '#4f8cff', fontSize: '1.4rem' }}>list_alt</span>
                    <span className="add-org-label">Positions <span style={{ color: '#eb445a' }}>*</span></span>
                  </div>
                  <div className="d-flex gap-2 align-items-center mb-2">
                    <input
                      type="text"
                      className="add-org-input"
                      value={newPosition}
                      onChange={e => setNewPosition(e.target.value)}
                      placeholder="Add position"
                      style={{ minWidth: 0, flex: 1 }}
                      onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleAddPosition(); } }}
                    />
                    <button type="button" className="btn btn-primary px-3 py-1" style={{ borderRadius: 8, fontWeight: 600, minWidth: 60 }} onClick={handleAddPosition} disabled={!newPosition.trim()}>Add</button>
                  </div>
                  <ul style={{ listStyle: 'none', paddingLeft: 0, marginBottom: 0, marginTop: 4 }}>
                    {positions.map((pos, idx) => (
                      <li key={idx} className="d-flex align-items-center gap-2 mb-1" style={{ background: '#232427', borderRadius: 6, padding: '4px 10px', marginBottom: 4, fontWeight: 500, color: '#fff' }}>
                        <span>{pos}</span>
                        <button type="button" className="btn btn-sm btn-danger" style={{ borderRadius: 6, padding: '0 8px', fontSize: 13 }} onClick={() => handleRemovePosition(idx)} aria-label="Remove position">&times;</button>
                      </li>
                    ))}
                  </ul>
                  {positionsError && <div style={{ color: '#eb445a', fontSize: 13, marginTop: 2 }}>{positionsError}</div>}
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
                      id="electionLogoFile"
                      style={{ display: 'none' }}
                      onChange={e => {
                        if (e.target.files && e.target.files[0]) {
                          const file = e.target.files[0];
                          if (!allowedTypes.includes(file.type)) {
                            alert('Only PNG, JPG, SVG, and WEBP images are allowed.');
                            return;
                          }
                          setNewElectionLogo(file);
                        }
                      }}
                    />
                    <label htmlFor="electionLogoFile" className="add-org-file-btn">Choose Logo</label>
                    <span className="add-org-file-name">{newElectionLogo ? newElectionLogo.name : 'No file chosen'}</span>
                  </div>
                  {newElectionLogo && (
                    <img
                      src={URL.createObjectURL(newElectionLogo)}
                      alt="Logo Preview"
                      className="add-org-logo-preview"
                    />
                  )}
                </div>
              </div>
            </Form>
            <div className="d-flex gap-3 mt-4 justify-content-end">
              <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowNewElectionModal(false)}>Cancel</button>
              <GradientButton1 className="add-org-create px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={handleCreateElection} disabled={!newElectionName.trim() || newElectionLoading || positions.length === 0 || positions.some(p => !p.trim())}>{newElectionLoading ? 'Creating...' : 'Create'}</GradientButton1>
            </div>
          </div>
        </Modal>
      </div>
    </PageBG>
  );
};

export default IndividualOrganization; 