import React from 'react';

interface CardWithCheckboxProps {
  name: string;
  logo?: File | string;
  electionCount: number;
  selected: boolean;
  selectionMode: boolean;
  onSelect: () => void;
}

function isFile(obj: any): obj is File {
  return obj && typeof obj === 'object' && typeof obj.name === 'string' && typeof obj.size === 'number' && typeof obj.type === 'string';
}

const CardWithCheckbox: React.FC<CardWithCheckboxProps> = ({ name, logo, electionCount, selected, selectionMode, onSelect }) => {
  return (
    <div className="mb-4 col-lg-3 col-md-4 col-sm-6 col-12">
      <div
        className="org-card h-100"
        tabIndex={selectionMode ? 0 : -1}
        onClick={selectionMode ? (e) => {
          if ((e.target as HTMLElement).classList.contains('org-select-checkbox')) return;
          onSelect();
        } : undefined}
        onKeyDown={selectionMode ? (e) => {
          if (e.key === ' ' || e.key === 'Enter') {
            e.preventDefault();
            onSelect();
          }
        } : undefined}
        style={selectionMode ? { cursor: 'pointer', position: 'relative' } : { position: 'relative' }}
      >
        {selectionMode && (
          <input
            type="checkbox"
            className="org-select-checkbox"
            checked={selected}
            onChange={onSelect}
            tabIndex={-1}
            onClick={e => e.stopPropagation()}
          />
        )}
        <div className="text-center position-relative">
          <div className="org-logo mb-3">
            {logo ? (
              typeof logo === 'string' && logo.startsWith('blob:') ? (
                <img src={logo} alt="Logo" style={{ maxWidth: 48, maxHeight: 48, borderRadius: '0.7rem', boxShadow: '0 2px 8px rgba(80,80,120,0.13)' }} />
              ) : isFile(logo) ? (
                <img src={URL.createObjectURL(logo)} alt="Logo" style={{ maxWidth: 48, maxHeight: 48, borderRadius: '0.7rem', boxShadow: '0 2px 8px rgba(80,80,120,0.13)' }} />
              ) : null
            ) : (
              <span className="material-icons">business</span>
            )}
          </div>
          <div className="org-name" style={{ fontWeight: 700, fontSize: '1.13rem', marginBottom: '1.1rem', textAlign: 'center', letterSpacing: '0.01em', textShadow: '0 2px 8px rgba(0,0,0,0.18)' }}>{name}</div>
          <div className="org-stats">
            <div className="election-count">
              {electionCount} Election{electionCount !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CardWithCheckbox; 