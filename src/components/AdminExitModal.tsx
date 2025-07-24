import React, { useState } from 'react';
import PopupContainer from './PopupContainer';

interface AdminExitModalProps {
  show: boolean;
  onClose: () => void;
  onAuthenticate: (password: string) => void;
  error?: string;
  loading?: boolean;
  title?: string;
  description?: string;
  buttonText?: string;
}

const AdminExitModal: React.FC<AdminExitModalProps> = ({
  show,
  onClose,
  onAuthenticate,
  error = '',
  loading = false,
  title = 'Admin Authentication',
  description = 'Authenticate to exit the voting window.',
  buttonText = 'Exit Voting',
}) => {
  const [password, setPassword] = useState('');
  const [touched, setTouched] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setTouched(true);
    if (!password.trim()) return;
    onAuthenticate(password);
  };

  React.useEffect(() => {
    if (!show) setPassword('');
  }, [show]);

  if (!show) return null;

  return (
    <div className="modal show d-block" tabIndex={-1} style={{ zIndex: 99999, position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh' }}>
      <div className="modal-dialog modal-dialog-centered">
        <div className="modal-content add-org-modal-content" style={{ background: 'none', border: 'none', boxShadow: 'none' }}>
          <PopupContainer>
            <div className="add-org-title-row mb-2">
              <div className="add-org-title">{title}</div>
              <button className="add-org-close" onClick={onClose} aria-label="Close">&times;</button>
            </div>
            <div className="add-org-divider" />
            <div style={{ color: '#b0c8ff', fontWeight: 500, marginBottom: 10, fontSize: 15, textAlign: 'left' }}>{description}</div>
            <form autoComplete="off" onSubmit={handleSubmit}>
              <div className="add-org-section">
                <div className="add-org-float-group" style={{ position: 'relative' }}>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="add-org-input"
                    id="adminExitPasswordInput"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoFocus
                    required
                    placeholder=" "
                    disabled={loading}
                    style={{ paddingRight: 44 }}
                  />
                  <button
                    type="button"
                    className="add-org-eye-btn"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(v => !v)}
                    tabIndex={-1}
                    style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a3a6b1', cursor: 'pointer', padding: 0, height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <span className="material-icons" style={{ fontSize: 24 }}>{showPassword ? 'visibility_off' : 'visibility'}</span>
                  </button>
                  <label htmlFor="adminExitPasswordInput" className={password ? 'float-active' : ''}>Admin Password</label>
                </div>
                {(!!error || (touched && !password.trim())) && (
                  <div style={{ color: '#eb445a', fontWeight: 600, marginBottom: 10 }}>
                    {error || (!password.trim() ? 'Password required.' : '')}
                  </div>
                )}
              </div>
              <div className="d-flex gap-3 mt-4 justify-content-end">
                <button type="button" className="add-org-cancel px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600, background: '#232427', color: '#fff', border: '1.5px solid #444', transition: 'background 0.2s, color 0.2s' }} onClick={onClose} disabled={loading}>Cancel</button>
                <button type="submit" className="px-4 py-2" style={{ background: '#4f8cff', color: '#fff', borderRadius: '0.8rem', fontWeight: 600, border: 'none', transition: 'background 0.2s, color 0.2s' }} disabled={loading}>{buttonText}</button>
              </div>
            </form>
          </PopupContainer>
        </div>
      </div>
    </div>
  );
};

export default AdminExitModal; 