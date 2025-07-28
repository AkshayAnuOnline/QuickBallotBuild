import React, { useState, useEffect } from 'react';
import openmojiData from '../../assets/openmoji.json';

// Use the full OpenMoji list, filter out non-emoji
const openmojiList: { hexcode: string; annotation: string }[] = (openmojiData as any[])
  .filter(e => e.group !== 'Component')
  .map(e => ({ hexcode: e.hexcode, annotation: e.annotation }));

// Utility function to get the correct asset path
const getAssetPath = (path: string) => {
  // Use import.meta.env.BASE_URL if available (Vite)
  // Fallback to process.env.BASE_URL if available (Create React App)
  // Otherwise use empty string for relative paths
  const baseUrl = (import.meta as any).env?.BASE_URL || process.env.BASE_URL || '';
  return `${baseUrl}${path}`;
};

interface OpenMojiPickerProps {
  onSelect: (pngPath: string, meta: { hexcode: string; annotation: string }) => void;
  onClose?: () => void;
}

const OpenMojiPicker: React.FC<OpenMojiPickerProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState(openmojiList);

  useEffect(() => {
    const s = search.trim().toLowerCase();
    setFiltered(
      s
        ? openmojiList.filter(
            (e) =>
              e.annotation.toLowerCase().includes(s) ||
              e.hexcode.replace(/-/g, '').toLowerCase().includes(s)
          )
        : openmojiList
    );
  }, [search]);

  return (
    <div style={{
      background: 'var(--dark-light, #232427)',
      borderRadius: 12,
      padding: 16,
      width: 360,
      boxShadow: '0 4px 24px rgba(0,0,0,0.25)',
      zIndex: 1000,
      color: '#fff',
      fontFamily: 'Poppins, sans-serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 10 }}>
        <input
          type="text"
          placeholder="Search emoji..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            padding: '8px 12px',
            borderRadius: 8,
            border: '1.5px solid #31334a',
            background: '#18191c',
            color: '#fff',
            fontSize: 15,
            outline: 'none',
            marginRight: 8,
          }}
        />
        {onClose && (
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#eb445a', fontWeight: 700, fontSize: 20, cursor: 'pointer' }}>&times;</button>
        )}
      </div>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(6, 1fr)',
        gap: 10,
        maxHeight: 260,
        overflowY: 'auto',
      }}>
        {filtered.map((emoji) => (
          <button
            key={emoji.hexcode}
            title={emoji.annotation}
            style={{
              background: 'none',
              border: 'none',
              borderRadius: 8,
              padding: 4,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
            onClick={() => onSelect(getAssetPath(`openmoji/${emoji.hexcode.toUpperCase()}.png`), emoji)}
          >
            <img
              src={getAssetPath(`openmoji/${emoji.hexcode.toUpperCase()}.png`)}
              alt={emoji.annotation}
              style={{ width: 36, height: 36, display: 'block', margin: '0 auto' }}
              loading="lazy"
              onError={e => {
                console.error('Failed to load OpenMoji:', e.currentTarget.src);
                e.currentTarget.style.opacity = "0.3";
                e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', `<div style='color:#eb445a;font-size:10px;text-align:center;'>Not found</div>`);
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default OpenMojiPicker; 