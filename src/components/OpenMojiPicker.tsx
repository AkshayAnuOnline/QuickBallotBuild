import React, { useState, useEffect } from 'react';
// Use the full OpenMoji list, filter out non-emoji
let openmojiList: { hexcode: string; annotation: string }[] = [];

// Load OpenMoji data at runtime
const loadOpenMojiData = async () => {
  try {
    // Get the correct base URL for fetching assets
    const baseURL = getBaseURL();
    // Try multiple paths for openmoji.json to work in both dev and prod environments
    const paths = [`${baseURL}/openmoji.json`, './openmoji.json', '/openmoji.json'];
    let data: any[] = [];
    
    for (const path of paths) {
      try {
        const response = await fetch(path);
        if (response.ok) {
          data = await response.json();
          console.log(`Successfully loaded OpenMoji data from ${path}`);
          break;
        }
      } catch (err) {
        console.warn(`Failed to load OpenMoji data from ${path}:`, err);
        continue;
      }
    }
    
    if (data.length > 0) {
      openmojiList = data
        .filter((e: any) => e.group !== 'Component')
        .map((e: any) => ({ hexcode: e.hexcode, annotation: e.annotation }));
      return openmojiList;
    } else {
      console.error('Failed to load OpenMoji data from all attempted paths');
      return [];
    }
  } catch (error) {
    console.error('Failed to load OpenMoji data:', error);
    return [];
  }
};

loadOpenMojiData();

// Utility function to get the correct asset path
const getAssetPath = (path: string) => {
  // Get the correct base URL for fetching assets
  const baseURL = getBaseURL();
  // Use relative path for assets to work in both dev and prod environments
  // In Electron, we need to use the correct base URL
  return `${baseURL}/${path}`;
};

// Utility function to get the correct base URL for fetching assets
const getBaseURL = () => {
  // In Electron, we need to use the correct base URL for fetching assets
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // When running in Electron, we're loading from a file URL
    // We need to adjust the path to correctly fetch assets
    const basePath = window.location.href.substring(0, window.location.href.lastIndexOf('/'));
    return basePath;
  }
  // In development or web environments, use relative paths
  return '';
};

interface OpenMojiPickerProps {
  onSelect: (pngPath: string, meta: { hexcode: string; annotation: string }) => void;
  onClose?: () => void;
}

const OpenMojiPicker: React.FC<OpenMojiPickerProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<{ hexcode: string; annotation: string }[]>([]);

  useEffect(() => {
    // Update filtered list when openmojiList is loaded
    if (openmojiList.length > 0) {
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
    }
  }, [search]);

  // Load OpenMoji data when component mounts
  useEffect(() => {
    loadOpenMojiData().then(() => {
      // Update filtered list after data is loaded
      setFiltered(openmojiList);
    });
  }, []);

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
                // Only add error message if not already added
                if (!e.currentTarget.parentElement?.querySelector('.emoji-error')) {
                  e.currentTarget.parentElement?.insertAdjacentHTML('beforeend', `<div class="emoji-error" style='color:#eb445a;font-size:10px;text-align:center;margin-top:2px;'>Not found</div>`);
                }
              }}
            />
          </button>
        ))}
      </div>
    </div>
  );
};

export default OpenMojiPicker; 