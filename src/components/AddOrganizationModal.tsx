import React, { useState } from 'react';
import { Modal, Button, Form } from 'react-bootstrap';
import './AddOrganizationModal.scss';
import { FaImage } from 'react-icons/fa';
import GradientButton1 from './GradientButton1';

const DICEWARE_WORDS = [
  'correct', 'horse', 'battery', 'staple', 'clip', 'onion', 'table', 'river', 'cloud', 'apple', 'star', 'moon', 'light', 'dream', 'stone', 'leaf', 'ocean', 'flame', 'echo', 'wave', 'field', 'grain', 'sky', 'wind', 'root', 'breeze', 'dawn', 'dusk', 'frost', 'glow', 'mist'
];
function generateDicewarePhrase() {
  let phrase = [];
  for (let i = 0; i < 6; i++) {
    const idx = Math.floor(Math.random() * DICEWARE_WORDS.length);
    phrase.push(DICEWARE_WORDS[idx]);
  }
  return phrase.join(' ');
}
// Remove passwordRequirements and related logic
// Only require non-empty password and matching confirmation
const AddOrganizationModal = ({ show, onHide, onCreate }: any) => {
  const [name, setName] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [touched] = useState(false);
  const [showPhrase, setShowPhrase] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [copied, setCopied] = useState(false);
  // Remove passwordRequirements array and validPassword logic
  // Only show error if password is empty or doesn't match
  const canCreate = name.trim() && password.length > 0 && password === confirm && showPhrase;
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];
  const handleLogo = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!allowedTypes.includes(file.type)) {
        alert('Only PNG, JPG, SVG, and WEBP images are allowed.');
        return;
      }
      setLogo(file);
    }
  };
  const handleShowPhrase = () => {
    setPhrase(generateDicewarePhrase());
    setShowPhrase(true);
  };
  const handleCopy = () => {
    navigator.clipboard.writeText(phrase);
    setCopied(true);
    setTimeout(() => setCopied(false), 1200);
  };
  const handleCreate = async () => {
    if (!canCreate) return;

    let logoData: string | null = null;
    if (logo) {
      // Read file as base64
      logoData = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(logo);
      });
    }

    onCreate({ name, logo: logoData, password, recovery_phrase: phrase });
    setName(''); setLogo(null); setPassword(''); setConfirm(''); setShowPhrase(false); setPhrase('');
  };
  // For each input, use a state to track focus. Label is inside input by default, animates up only on focus or if value is not empty.
  const [nameFocused, setNameFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [confirmFocused, setConfirmFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  return (
    <Modal show={show} onHide={onHide} centered backdrop="static" dialogClassName="add-org-modal-premium" contentClassName="add-org-modal-content">
      <div className="add-org-modal-body">
        <div className="add-org-title-row">
          <div className="add-org-title">Create New Organization</div>
          <button className="add-org-close" onClick={onHide} aria-label="Close">&times;</button>
        </div>
        <div className="add-org-divider" />
        <Form autoComplete="off">
          <div className="add-org-section">
            <div className="add-org-float-group">
              <input
                type="text"
                className="add-org-input"
                id="orgNameInput"
                value={name}
                onChange={e => setName(e.target.value)}
                autoFocus
                required
                onFocus={() => setNameFocused(true)}
                onBlur={() => setNameFocused(false)}
                placeholder=" "
              />
              <label htmlFor="orgNameInput" className={(nameFocused || name) ? 'float-active' : ''}>Organization Name</label>
              {touched && !name.trim() && <div className="add-org-error">Name is required</div>}
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
                  id="orgLogoFile"
                  style={{ display: 'none' }}
                  onChange={handleLogo}
                />
                <label htmlFor="orgLogoFile" className="add-org-file-btn">Choose Logo</label>
                <span className="add-org-file-name">{logo ? logo.name : 'No file chosen'}</span>
              </div>
              {logo && (
                <img
                  src={URL.createObjectURL(logo)}
                  alt="Logo Preview"
                  className="add-org-logo-preview"
                />
              )}
            </div>
          </div>
          <div className="add-org-section">
            <div className="add-org-float-group" style={{ position: 'relative' }}>
              <input
                type={showPassword ? 'text' : 'password'}
                className="add-org-input"
                id="orgPasswordInput"
                value={password}
                onChange={e => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
                autoComplete="new-password"
                placeholder=" "
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
              <label htmlFor="orgPasswordInput" className={(passwordFocused || password) ? 'float-active' : ''}>Admin Password</label>
              {touched && password.length === 0 && <div className="add-org-error">Password is required</div>}
              {touched && password.length > 0 && confirm.length > 0 && password !== confirm && (
                <div className="add-org-error">Passwords must match</div>
              )}
            </div>
            {/* Remove password requirements list and error */}
            <div className="add-org-float-group" style={{ position: 'relative' }}>
              <input
                type={showConfirm ? 'text' : 'password'}
                className="add-org-input"
                id="orgConfirmPasswordInput"
                value={confirm}
                onChange={e => setConfirm(e.target.value)}
                onFocus={() => setConfirmFocused(true)}
                onBlur={() => setConfirmFocused(false)}
                autoComplete="new-password"
                placeholder=" "
                style={{ paddingRight: 44 }}
              />
              <button
                type="button"
                className="add-org-eye-btn"
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                onClick={() => setShowConfirm(v => !v)}
                tabIndex={-1}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#a3a6b1', cursor: 'pointer', padding: 0, height: 32, width: 32, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
              >
                <span className="material-icons" style={{ fontSize: 24 }}>{showConfirm ? 'visibility_off' : 'visibility'}</span>
              </button>
              <label htmlFor="orgConfirmPasswordInput" className={(confirmFocused || confirm) ? 'float-active' : ''}>Confirm Password</label>
              {touched && password && confirm && password !== confirm && (
                <div className="add-org-error">Passwords must match</div>
              )}
            </div>
          </div>
          {/* Only show Generate Recovery Phrase if password is non-empty and matches */}
          {!showPhrase && password.length > 0 && password === confirm && (
            <Button variant="primary" className="add-org-generate w-100 mb-3" onClick={handleShowPhrase}>
              Generate Recovery Phrase
            </Button>
          )}
          {showPhrase && (
            <div className="add-org-phrase-box mb-3">
              <div className="add-org-phrase-label">Recovery Phrase</div>
              <div className="add-org-phrase-value">{phrase}</div>
              <Button size="sm" variant="outline-light" className="add-org-copy" onClick={handleCopy}>
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <div className="add-org-phrase-warning">
                Please write this down and store it securely. It will not be shown again.
              </div>
            </div>
          )}
        </Form>
        <div className="d-flex gap-3 mt-4 justify-content-end">
          <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={onHide}>Cancel</button>
          <GradientButton1 className="add-org-create px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={handleCreate} disabled={!canCreate}>Create</GradientButton1>
        </div>
      </div>
    </Modal>
  );
};
export default AddOrganizationModal; 