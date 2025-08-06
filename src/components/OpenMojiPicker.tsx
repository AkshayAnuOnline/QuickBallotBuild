import React, { useState, useEffect } from 'react';

// Load OpenMoji data at runtime
const loadOpenMojiData = async () => {
  try {
    console.log('Loading OpenMoji data...');
    console.log('Window location protocol:', window.location.protocol);
    // In Electron, use IPC to read the file
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.readOpenMojiData === 'function') {
      console.log('Using Electron IPC to load OpenMoji data');
      // Use Electron IPC to read openmoji.json
      const result = await window.electronAPI.readOpenMojiData();
      console.log('Data loaded via IPC:', result);
      if (Array.isArray(result) && result.length > 0) {
        const data = result;
        console.log('OpenMoji data length:', data.length);
        const list = data
          .filter((e: any) => e.group !== 'Component')
          .map((e: any) => ({ hexcode: e.hexcode, annotation: e.annotation }));
        console.log('Successfully loaded OpenMoji data via IPC, list length:', list.length);
        return list;
      } else {
        console.error('Failed to load OpenMoji data via IPC');
        return [];
      }
    } else {
      console.log('Using fetch to load OpenMoji data');
      // In development or web environments, use fetch
      // Get the correct base URL for fetching assets
      const baseURL = getBaseURL();
      console.log('Base URL:', baseURL);
      // Try multiple paths for openmoji.json to work in both dev and prod environments
      const paths = [`${baseURL}/openmoji.json`, './openmoji.json', '/openmoji.json'];
      let data: any[] = [];
      
      for (const path of paths) {
        try {
          console.log('Trying to fetch from:', path);
          const response = await fetch(path);
          if (response.ok) {
            data = await response.json();
            console.log(`Successfully loaded OpenMoji data from ${path}`);
            break;
          } else {
            console.warn(`Failed to load OpenMoji data from ${path}:`, response.status);
          }
        } catch (err) {
          console.warn(`Failed to load OpenMoji data from ${path}:`, err);
          continue;
        }
      }
      
      if (data.length > 0) {
        const list = data
          .filter((e: any) => e.group !== 'Component')
          .map((e: any) => ({ hexcode: e.hexcode, annotation: e.annotation }));
        return list;
      } else {
        console.error('Failed to load OpenMoji data from all attempted paths');
        return [];
      }
    }
  } catch (error) {
    console.error('Failed to load OpenMoji data:', error);
    return [];
  }
};

// Utility function to get the correct asset path
const getAssetPath = (path: string) => {
  // In Electron, we should use IPC for loading assets
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // For Electron, we rely on IPC to load assets, so we return a placeholder
    // The actual loading is handled by the loadEmojiImage function
    return '';
  }
  // In development or web environments, use relative paths
  return `./${path}`;
};

// Utility function to get the correct base URL for fetching assets
const getBaseURL = () => {
  // In Electron, we need to use the correct base URL for fetching assets
  if (typeof window !== 'undefined' && window.location.protocol === 'file:') {
    // When running in Electron, we're loading from a file URL
    // We need to adjust the path to correctly fetch assets
    // Remove hash portion if present
    const urlWithoutHash = window.location.href.split('#')[0];
    const basePath = urlWithoutHash.substring(0, urlWithoutHash.lastIndexOf('/'));
    return basePath;
  }
  // In development or web environments, use relative paths
  return '';
};

interface OpenMojiPickerProps {
  onSelect: (pngPath: string, meta: { hexcode: string; annotation: string }) => void;
  onClose?: () => void;
}

interface EmojiButtonProps {
  emoji: { hexcode: string; annotation: string };
  onLoadImage: (hexcode: string) => Promise<string | null>;
  onSelect: (pngPath: string, meta: { hexcode: string; annotation: string }) => void;
}

const EmojiButton: React.FC<EmojiButtonProps> = ({ emoji, onLoadImage, onSelect }) => {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const loadImage = async () => {
      setLoading(true);
      setError(false);
      try {
        const src = await onLoadImage(emoji.hexcode);
        if (src) {
          setImageSrc(src);
        } else {
          setError(true);
        }
      } catch (err) {
        console.error('Failed to load emoji image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    loadImage();
  }, [emoji.hexcode, onLoadImage]);

  if (loading) {
    return (
      <div
        style={{
          background: 'none',
          border: 'none',
          borderRadius: 8,
          padding: 4,
          cursor: 'pointer',
          transition: 'background 0.2s',
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 24, height: 24, backgroundColor: '#ccc', borderRadius: '50%' }} />
      </div>
    );
  }

  if (error) {
    return (
      <button
        title={emoji.annotation}
        style={{
          background: 'none',
          border: 'none',
          borderRadius: 8,
          padding: 4,
          cursor: 'pointer',
          transition: 'background 0.2s',
        }}
        onClick={() => onSelect('', emoji)}
      >
        <div style={{
          width: 36,
          height: 36,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f0f0f0',
          borderRadius: 4,
        }}>
          <span style={{ color: '#eb445a', fontSize: 12 }}>!</span>
        </div>
        <div className="emoji-error" style={{ color: '#eb445a', fontSize: 10, textAlign: 'center', marginTop: 2 }}>
          Not found
        </div>
      </button>
    );
  }

  return (
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
      onClick={() => onSelect(imageSrc || '', emoji)}
    >
      <img
        src={imageSrc || ''}
        alt={emoji.annotation}
        style={{ width: 36, height: 36, display: 'block', margin: '0 auto' }}
        loading="lazy"
        onError={() => setError(true)}
      />
    </button>
  );
};

const OpenMojiPicker: React.FC<OpenMojiPickerProps> = ({ onSelect, onClose }) => {
  const [search, setSearch] = useState('');
  const [filtered, setFiltered] = useState<{ hexcode: string; annotation: string }[]>([]);
  const [imageCache, setImageCache] = useState<Record<string, string>>({});
  const [openmojiList, setOpenmojiList] = useState<{ hexcode: string; annotation: string }[]>([]);

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
  }, [search, openmojiList]);

  // Load OpenMoji data when component mounts
  useEffect(() => {
    loadOpenMojiData().then((data) => {
      if (data) {
        setOpenmojiList(data);
        // Update filtered list after data is loaded
        setFiltered(data);
      }
    });
  }, []);

  // Function to load emoji image via IPC
  const loadEmojiImage = async (hexcode: string) => {
    // Check if image is already cached
    if (imageCache[hexcode]) {
      return imageCache[hexcode];
    }
    
    try {
      // In Electron, use IPC to read the image
      if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.readOpenMojiImage === 'function') {
        const result = await window.electronAPI.readOpenMojiImage(hexcode);
        if (result.success && result.data) {
          // Cache the image
          if (result.data) {
            setImageCache(prev => ({ ...prev, [hexcode]: result.data as string }));
          }
          return result.data;
        } else {
          console.error('Failed to load emoji image:', result.error);
          return null;
        }
      } else {
        // In development or web environments, use the old URL-based approach
        return getAssetPath(`openmoji/${hexcode.toUpperCase()}.png`);
      }
    } catch (error) {
      console.error('Failed to load emoji image:', error);
      return null;
    }
  };

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
          <EmojiButton 
            key={emoji.hexcode} 
            emoji={emoji} 
            onLoadImage={loadEmojiImage} 
            onSelect={onSelect} 
          />
        ))}
      </div>
    </div>
  );
};

export default OpenMojiPicker; 