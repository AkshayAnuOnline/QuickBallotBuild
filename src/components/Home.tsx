import React, { useState, useEffect } from 'react';
import { Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate, useLocation } from 'react-router-dom';
import logoWordmark from '../../assets/logo-wordmark-white.svg';
import './Home.scss';
import AddOrganizationModal from './AddOrganizationModal';
import PopupContainer from './PopupContainer';
import './AddOrganizationModal.scss';
import HelpDrawer from './HelpDrawer'; // (Assume we will create this component)

const ipc = window.electronAPI;

const Home: React.FC = () => {
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedOrgs, setSelectedOrgs] = useState<string[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [appVersion, setAppVersion] = useState('1.0.0'); // Default fallback
  const [orgToOpen, setOrgToOpen] = useState<any | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showRecoveryModal, setShowRecoveryModal] = useState(false);
  const [recoveryPhraseInput, setRecoveryPhraseInput] = useState('');
  const [newPasswordInput, setNewPasswordInput] = useState('');
  const [confirmNewPasswordInput, setConfirmNewPasswordInput] = useState('');
  const [recoveryError, setRecoveryError] = useState('');
  const [recoverySuccess, setRecoverySuccess] = useState('');
  const [showRecoveryPhrase, setShowRecoveryPhrase] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const [showHelp, setShowHelp] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<{ updateAvailable: boolean, version?: string } | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [showUpdateBadge, setShowUpdateBadge] = useState(true);
  const [supportHover, setSupportHover] = useState(false);
  const [helpHover, setHelpHover] = useState(false);
  const [aboutHover, setAboutHover] = useState(false);

  // Check for updates on app launch
  useEffect(() => {
    const checkUpdate = async () => {
      try {
        const res = await ipc.invoke('check-for-update', appVersion, window.electronAPI.platform);
        setUpdateInfo(res);
      } catch (e) {
        setUpdateInfo(null);
      }
    };
    checkUpdate();
  }, []);

  // Check for updates when About modal opens
  useEffect(() => {
    if (showAbout) {
      const checkUpdate = async () => {
        try {
          const res = await ipc.invoke('check-for-update', appVersion, window.electronAPI.platform);
          setUpdateInfo(res);
        } catch (e) {
          setUpdateInfo(null);
        }
      };
      checkUpdate();
    }
  }, [showAbout]);

  // Handler to open releases page
  const handleOpenReleases = async () => {
    await ipc.invoke('open-website', 'https://github.com/AkshayAnuOnline/quikballot/releases');
  };

  // Handler for update notification click
  const handleUpdateClick = async () => {
    await ipc.invoke('open-website', 'https://github.com/AkshayAnuOnline/quikballot/releases');
    setShowUpdateBadge(false); // Clear badge after clicking
  };

  useEffect(() => {
    fetchOrganizations();
    
    // Get version from electronAPI (main process)
    const updateVersion = async () => {
      try {
        if (window.electronAPI && typeof window.electronAPI.getVersion === 'function') {
          const version = await window.electronAPI.getVersion();
          setAppVersion(version);
        }
      } catch (error) {
        console.error('Error getting app version:', error);
      }
    };
    
    // Call the function to update the version
    updateVersion();
  }, []);

  useEffect(() => {
    if (location.pathname === '/') {
      fetchOrganizations();
    }
  }, [location.pathname]);

  const fetchOrganizations = async () => {
    if (!ipc) return [];
    const orgs = await ipc.invoke('get-organizations');
    setOrganizations(orgs);
    return orgs;
  };

  const toggleSelectionMode = () => {
    setSelectionMode((prev) => {
      if (!prev) setSelectedOrgs([]);
      return !prev;
    });
  };

  const handleSelectOrg = (id: string) => {
    setSelectedOrgs((prev) =>
      prev.includes(id) ? prev.filter((oid) => oid !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = async () => {
    if (!ipc) return;
    for (const id of selectedOrgs) {
      await ipc.invoke('delete-organization', id);
    }
    fetchOrganizations();
    setSelectedOrgs([]);
    setSelectionMode(false);
  };

  const handleAddOrg = async (org: any) => {
    if (!ipc) return;
    const newOrg = await ipc.invoke('create-organization', org);
    setOrganizations(prev => [...prev, newOrg]);
    setShowAddModal(false);
  };

  const handleOrgCardClick = (org: any) => {
    setOrgToOpen(org);
    setShowPasswordModal(true);
    setPasswordInput('');
    setPasswordError('');
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgToOpen || !passwordInput.trim()) {
      setPasswordError('Password required.');
      return;
    }
    
    try {
      // Use backend authentication which handles bcrypt comparison
      await ipc.invoke('authenticate-admin', { orgId: orgToOpen.id, password: passwordInput });
      setShowPasswordModal(false);
      setPasswordInput('');
      setPasswordError('');
      navigate(`/organization/${orgToOpen.id}`, { state: { org: orgToOpen } });
    } catch (error: any) {
      setPasswordError('Incorrect password.');
    }
  };

  return (
    <div className="home-page">
      {/* Gemini-style header (no card) */}
      <header className="qb-header">
        <img src={logoWordmark} alt="QuickBallot" className="qb-wordmark" />
        <h1 className="qb-greeting">Welcome to QuickBallot</h1>
        <div className="qb-subtitle">Manage elections offline with ease.</div>
      </header>
      {/* Floating Help and About Buttons */}
      <div className="floating-buttons">
        <button
          className="support-btn"
          style={{
            background: supportHover ? '#e53935' : '#232427',
            border: '2px solid #e53935',
            color: supportHover ? '#fff' : '#e53935',
            fontWeight: 600,
            fontSize: 15,
            borderRadius: 16,
            boxShadow: '0 2px 12px #0004',
            padding: '6px 14px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 6,
            transition: 'background 0.18s, color 0.18s, transform 0.18s',
            transform: supportHover ? 'translateY(-2px)' : 'none',
          }}
          onClick={() => window.open('https://buildmelon.com/grow-the-melon/', '_blank')}
          aria-label="Support the Creator"
          onMouseEnter={() => setSupportHover(true)}
          onMouseLeave={() => setSupportHover(false)}
        >
          <span className="material-icons" style={{ fontSize: 18, color: supportHover ? '#fff' : '#e53935', transition: 'color 0.18s' }}>favorite</span>
          Support Creator
        </button>
      <button
        className="help-btn"
        style={{
            background: helpHover ? '#4f8cff' : '#232427',
          border: '2px solid #4f8cff',
            color: helpHover ? '#fff' : '#4f8cff',
            fontWeight: 600,
            fontSize: 15,
            borderRadius: 16,
          boxShadow: '0 2px 12px #0004',
            padding: '6px 14px',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
            gap: 6,
            transition: 'background 0.18s, color 0.18s, transform 0.18s',
            transform: helpHover ? 'translateY(-2px)' : 'none',
        }}
        onClick={() => setShowHelp(true)}
        aria-label="Open Help"
          onMouseEnter={() => setHelpHover(true)}
          onMouseLeave={() => setHelpHover(false)}
      >
          <span className="material-icons" style={{ fontSize: 18, color: helpHover ? '#fff' : '#4f8cff', transition: 'color 0.18s' }}>help_outline</span>
        Help
      </button>
        <div style={{ position: 'relative' }}>
          <button
            className="about-btn"
            style={{
              background: aboutHover ? '#4f8cff' : '#232427',
              border: '2px solid #4f8cff',
              color: aboutHover ? '#fff' : '#4f8cff',
              fontWeight: 600,
              fontSize: 15,
              borderRadius: 16,
              boxShadow: '0 2px 12px #0004',
              padding: '6px 14px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              transition: 'background 0.18s, color 0.18s, transform 0.18s',
              transform: aboutHover ? 'translateY(-2px)' : 'none',
            }}
            onClick={() => setShowAbout(true)}
            aria-label="About QuickBallot"
            onMouseEnter={() => setAboutHover(true)}
            onMouseLeave={() => setAboutHover(false)}
          >
            <span className="material-icons" style={{ fontSize: 18, color: aboutHover ? '#fff' : '#4f8cff', transition: 'color 0.18s' }}>info_outline</span>
            About QuickBallot
          </button>
        </div>
      </div>

      <div className="container py-4">
        <h1 className="orgs-page-title">Organizations</h1>
        {/* Organizations Section */}
        <Card className="organizations-card">
          <Card.Body>
            <div className="orgs-header d-flex align-items-center justify-content-between mb-4 w-100 position-relative">
              <div className="d-flex align-items-center gap-2">
                <Button className="create-btn order-1 order-md-0" onClick={() => setShowAddModal(true)}>
                  <span className="btn-icon material-icons me-2">add</span>
                  <span className="btn-text">Create New Organization</span>
                </Button>
              </div>
              <div className="d-flex align-items-center orgs-header-actions justify-content-end">
                <Button
                  variant={selectionMode ? 'danger' : 'outline-secondary'}
                  className="select-mode-btn px-4"
                  onClick={toggleSelectionMode}
                >
                  {selectionMode ? 'Cancel Selection' : 'Select Organizations'}
                </Button>
                {selectionMode && selectedOrgs.length > 0 && (
                  <Button
                    variant="danger"
                    className="delete-selected-btn px-4"
                    onClick={handleDeleteSelected}
                  >
                    Delete Selected
                  </Button>
                )}
              </div>
            </div>

            {/* Organizations Grid */}
            <Row className="organizations-grid">
              {organizations.map((org) => (
                <Col key={org.id} xs={12} sm={6} md={4} lg={3} className="mb-4">
                  <Card
                    className="org-card h-100"
                    tabIndex={selectionMode ? 0 : -1}
                    onClick={selectionMode ? (e) => {
                      if ((e.target as HTMLElement).classList.contains('org-select-checkbox')) return;
                      handleSelectOrg(org.id);
                    } : () => handleOrgCardClick(org)}
                    onKeyDown={selectionMode ? (e) => {
                      if (e.key === ' ' || e.key === 'Enter') {
                        e.preventDefault();
                        handleSelectOrg(org.id);
                      }
                    } : undefined}
                    style={selectionMode ? { cursor: 'pointer', position: 'relative' } : { cursor: 'pointer', position: 'relative' }}
                  >
                    {selectionMode && (
                      <input
                        type="checkbox"
                        className="org-select-checkbox"
                        checked={selectedOrgs.includes(org.id)}
                        onChange={() => handleSelectOrg(org.id)}
                        tabIndex={-1}
                        onClick={e => e.stopPropagation()}
                      />
                    )}
                    <Card.Body className="text-center position-relative">
                      <div className="org-logo mb-3">
                        {org.logo ? (
                          <img src={org.logo} alt="Logo" style={{ maxWidth: 48, maxHeight: 48, borderRadius: '0.7rem', boxShadow: '0 2px 8px rgba(80,80,120,0.13)' }} />
                        ) : (
                          <span className="material-icons">business</span>
                        )}
                      </div>
                      <Card.Title as="h5" className="org-name">
                        {org.name}
                      </Card.Title>
                      <div className="org-stats">
                        <div className="election-count">
                          {org.electionCount} Election{org.electionCount !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              ))}
              {/* Add New Organization Card */}
              {!selectionMode && (
                <Col xs={12} sm={6} md={4} lg={3} className="mb-4">
                  <Card
                    className="org-card add-org-card h-100"
                    onClick={() => setShowAddModal(true)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Card.Body className="text-center d-flex align-items-center justify-content-center">
                      <div className="add-org-content">
                        <div className="add-icon mb-3">
                          <span className="material-icons">add_circle_outline</span>
                        </div>
                        <div className="add-text">Add New Organization</div>
                      </div>
                    </Card.Body>
                  </Card>
                </Col>
              )}
            </Row>
          </Card.Body>
        </Card>
      </div>
      <AddOrganizationModal
        show={showAddModal}
        onHide={() => setShowAddModal(false)}
        onCreate={handleAddOrg}
      />

      {/* Password Modal */}
      {showPasswordModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content add-org-modal-content" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
              <PopupContainer>
                <div className="add-org-title-row mb-2">
                  <div className="add-org-title">Enter Organization Password</div>
                  <button className="add-org-close" onClick={() => {
                    setShowPasswordModal(false);
                    setPasswordError('');
                  }} aria-label="Close">&times;</button>
                </div>
                <div className="add-org-divider" />
                <form onSubmit={handlePasswordSubmit} autoComplete="off">
                  <div className="add-org-section" style={{ position: 'relative' }}>
                    <label htmlFor="orgPasswordInput" style={{ color: '#fff', fontWeight: 600, fontSize: '1.15rem', marginBottom: 8, display: 'block' }}>Password</label>
                    <div style={{ position: 'relative', height: 56 }}>
                      <input
                        id="orgPasswordInput"
                        type={showPassword ? 'text' : 'password'}
                        className="add-org-input"
                        value={passwordInput}
                        onChange={e => setPasswordInput(e.target.value)}
                        autoFocus
                        style={{ paddingRight: 44, height: 56, marginBottom: 0 }}
                      />
                      <button
                        type="button"
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowPassword((v) => !v)}
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
                        <span className="material-icons" style={{ fontSize: 24 }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {passwordError && <div className="add-org-error mb-2">{passwordError}</div>}
                  </div>
                  <div style={{ marginTop: 10, textAlign: 'right' }}>
                    <button
                      type="button"
                      style={{ background: 'none', border: 'none', color: '#4f8cff', textDecoration: 'underline', cursor: 'pointer', fontSize: 14 }}
                      onClick={() => { setShowPasswordModal(false); setShowRecoveryModal(true); }}
                    >
                      Forgot password?
                    </button>
                  </div>
                  <div className="d-flex gap-3 mt-4 justify-content-end">
                    <button type="button" className="add-org-cancel px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600, background: '#232427', color: '#fff', border: '1.5px solid #444', transition: 'background 0.2s, color 0.2s' }} onClick={() => {
                      setShowPasswordModal(false);
                      setPasswordError('');
                    }}>Cancel</button>
                    <button type="submit" className="px-4 py-2" style={{ background: '#4f8cff', color: '#fff', borderRadius: '0.8rem', fontWeight: 600, border: 'none', transition: 'background 0.2s, color 0.2s' }}>Access Organization</button>
                  </div>
                </form>
              </PopupContainer>
            </div>
          </div>
        </div>
      )}

      {/* Recovery Modal */}
      {showRecoveryModal && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content add-org-modal-content" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
              <PopupContainer>
                <div className="add-org-title-row mb-2">
                  <div className="add-org-title">Reset Password with Recovery Phrase</div>
                  <button className="add-org-close" onClick={() => setShowRecoveryModal(false)} aria-label="Close">&times;</button>
                </div>
                <div className="add-org-divider" />
                <form
                  onSubmit={async (e) => {
                    e.preventDefault();
                    setRecoveryError('');
                    setRecoverySuccess('');
                    if (!recoveryPhraseInput.trim() || !newPasswordInput || !confirmNewPasswordInput) {
                      setRecoveryError('All fields are required.');
                      return;
                    }
                    if (newPasswordInput !== confirmNewPasswordInput) {
                      setRecoveryError('Passwords do not match.');
                      return;
                    }
                    if (orgToOpen && recoveryPhraseInput.trim() === orgToOpen.recovery_phrase) {
                      await ipc.invoke('update-organization', {
                        ...orgToOpen,
                        password: newPasswordInput,
                      });
                      setRecoverySuccess('Password reset successfully. You can now log in.');
                      setTimeout(async () => {
                        const orgs = await fetchOrganizations();
                        // Find the updated org and set it as orgToOpen
                        const updatedOrg = orgs.find((o: any) => o.id === orgToOpen.id);
                        setOrgToOpen(updatedOrg || null);
                        setShowRecoveryModal(false);
                        setShowPasswordModal(true);
                        setRecoveryPhraseInput('');
                        setNewPasswordInput('');
                        setConfirmNewPasswordInput('');
                        setRecoveryError('');
                        setRecoverySuccess('');
                      }, 1200);
                    } else {
                      setRecoveryError('Incorrect recovery phrase.');
                    }
                  }}
                  autoComplete="off"
                >
                  <div className="add-org-section">
                    <label style={{ color: '#fff', fontWeight: 600, marginBottom: 6 }}>Recovery Phrase</label>
                    <div style={{ position: 'relative', height: 56 }}>
                      <input
                        type={showRecoveryPhrase ? 'text' : 'password'}
                        className="add-org-input"
                        value={recoveryPhraseInput}
                        onChange={e => setRecoveryPhraseInput(e.target.value)}
                        autoFocus
                        style={{ paddingRight: 44, height: 56, marginBottom: 0 }}
                      />
                      <button
                        type="button"
                        aria-label={showRecoveryPhrase ? 'Hide recovery phrase' : 'Show recovery phrase'}
                        onClick={() => setShowRecoveryPhrase((v) => !v)}
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
                        <span className="material-icons" style={{ fontSize: 24 }}>{showRecoveryPhrase ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    <label style={{ color: '#fff', fontWeight: 600, marginTop: 12, marginBottom: 6 }}>New Password</label>
                    <div style={{ position: 'relative', height: 56 }}>
                      <input
                        type={showNewPassword ? 'text' : 'password'}
                        className="add-org-input"
                        value={newPasswordInput}
                        onChange={e => setNewPasswordInput(e.target.value)}
                        style={{ paddingRight: 44, height: 56, marginBottom: 0 }}
                      />
                      <button
                        type="button"
                        aria-label={showNewPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowNewPassword((v) => !v)}
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
                        <span className="material-icons" style={{ fontSize: 24 }}>{showNewPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    <label style={{ color: '#fff', fontWeight: 600, marginTop: 12, marginBottom: 6 }}>Confirm New Password</label>
                    <div style={{ position: 'relative', height: 56 }}>
                      <input
                        type={showConfirmNewPassword ? 'text' : 'password'}
                        className="add-org-input"
                        value={confirmNewPasswordInput}
                        onChange={e => setConfirmNewPasswordInput(e.target.value)}
                        style={{ paddingRight: 44, height: 56, marginBottom: 0 }}
                      />
                      <button
                        type="button"
                        aria-label={showConfirmNewPassword ? 'Hide password' : 'Show password'}
                        onClick={() => setShowConfirmNewPassword((v) => !v)}
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
                        <span className="material-icons" style={{ fontSize: 24 }}>{showConfirmNewPassword ? 'visibility_off' : 'visibility'}</span>
                      </button>
                    </div>
                    {recoveryError && <div className="add-org-error mb-2">{recoveryError}</div>}
                    {recoverySuccess && <div className="text-success mb-2">{recoverySuccess}</div>}
                  </div>
                  <div className="d-flex gap-3 mt-4 justify-content-end">
                    <button type="button" className="add-org-cancel px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600, background: '#232427', color: '#fff', border: '1.5px solid #444' }} onClick={() => setShowRecoveryModal(false)}>Cancel</button>
                    <button type="submit" className="px-4 py-2" style={{ background: '#4f8cff', color: '#fff', borderRadius: '0.8rem', fontWeight: 600, border: 'none' }}>Reset Password</button>
                  </div>
                </form>
              </PopupContainer>
            </div>
          </div>
        </div>
      )}
      <HelpDrawer open={showHelp} onClose={() => setShowHelp(false)} />

      {/* About QuickBallot Modal */}
      {showAbout && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div
              className="modal-content add-org-modal-content"
              style={{
                background: '#181920',
                border: '2px solid #4f8cff',
                borderRadius: 20,
                color: '#fff',
                boxShadow: '0 8px 48px #000a',
                minWidth: 370,
                position: 'relative',
                padding: 0,
                overflow: 'hidden',
              }}
            >
              <button
                className="add-org-close"
                onClick={() => setShowAbout(false)}
                aria-label="Close"
                style={{
                  position: 'absolute',
                  top: 18,
                  right: 22,
                  background: 'none',
                  border: 'none',
                  color: '#7faaff',
                  fontSize: 32,
                  cursor: 'pointer',
                  zIndex: 2,
                  transition: 'color 0.15s',
                }}
                onMouseOver={e => (e.currentTarget.style.color = '#4f8cff')}
                onMouseOut={e => (e.currentTarget.style.color = '#7faaff')}
              >
                ×
              </button>
              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  padding: '36px 36px 28px 36px',
                  background: 'linear-gradient(180deg, #181920 80%, #191a22 100%)',
                }}
              >
                <div style={{
                  background: '#131417',
                  borderRadius: 16,
                  padding: 16,
                  marginBottom: 18,
                  boxShadow: '0 2px 12px #0002',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}>
                  <img
                    src={logoWordmark}
                    alt="QuickBallot Logo"
                    style={{ width: 160, height: 'auto', objectFit: 'contain', margin: 0 }}
                  />
                </div>
                <div style={{ width: '100%', borderTop: '1.5px solid #353a4a', margin: '0 0 18px 0' }} />
                <div style={{ fontSize: 17, color: '#b0b8ff', fontWeight: 500, marginBottom: 6, letterSpacing: 0.2 }}>Version</div>
                <div style={{ fontSize: 20, color: '#4f8cff', fontWeight: 700, marginBottom: 18 }}>{appVersion}</div>
                <div style={{ width: '100%', borderTop: '1.5px solid #353a4a', margin: '0 0 18px 0' }} />
                <div style={{ fontSize: 17, color: '#b0b8ff', fontWeight: 500, marginBottom: 6, letterSpacing: 0.2 }}>Developer</div>
                <div style={{ fontSize: 19, color: '#fff', fontWeight: 700, marginBottom: 10 }}>Akshay Anu S</div>
                <div style={{ fontSize: 16, color: '#7faaff', fontWeight: 600, marginBottom: 0 }}>Managed by BuildMelon</div>
                {updateInfo?.updateAvailable ? (
                  <div style={{ marginTop: 24, width: '100%', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, marginBottom: 8 }}>Version {updateInfo.version} is available.</div>
                    <div style={{ marginBottom: 20, color: '#666' }}>
                      A new version of QuickBallot is available. Click below to download it from our releases page.
                    </div>
                    <button
                      className="create-btn"
                      onClick={handleOpenReleases}
                      style={{ padding: '8px 20px', fontSize: 15, marginBottom: 12, margin: '0 auto' }}
                    >
                      Download Latest Version
                    </button>
                  </div>
                ) : (
                  <div style={{ marginTop: 24, width: '100%', textAlign: 'center', color: '#7faaff', fontWeight: 600 }}>
                    You are running the latest version.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Update Notification Modal */}
      {showUpdateModal && updateInfo?.updateAvailable && (
        <div className="modal show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content add-org-modal-content" style={{ background: '#232427', border: '2px solid #4f8cff', borderRadius: 18, color: '#fff', boxShadow: '0 8px 48px #000a', minWidth: 350 }}>
              <div style={{ display: 'flex', justifyContent: 'flex-end', padding: 8 }}>
                <button className="add-org-close" onClick={() => setShowUpdateModal(false)} aria-label="Close" style={{ background: 'none', border: 'none', color: '#b0b8ff', fontSize: 32, cursor: 'pointer' }}>×</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '0 32px 32px 32px' }}>
                <div style={{ fontWeight: 700, fontSize: 22, marginBottom: 8, color: '#4f8cff' }}>Update Available</div>
                <div style={{ fontSize: 18, marginBottom: 8 }}>Version {updateInfo.version} is available.</div>
                <div style={{ fontSize: 16, color: '#b0b8ff', marginBottom: 16 }}>You are currently on v{appVersion}.</div>
                <div style={{ padding: '16px 0' }}>
                  <div style={{ marginBottom: 12, fontWeight: 600 }}>Update Available</div>
                  <div style={{ marginBottom: 16 }}>Version {updateInfo.version} is available. Click below to download from our releases page.</div>
                  <button
                    className="create-btn"
                    onClick={handleOpenReleases}
                    style={{ padding: '8px 20px', fontSize: 15, boxShadow: '0 2px 8px #0003', margin: '0 auto' }}
                  >
                    Go to Releases Page
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Home; 