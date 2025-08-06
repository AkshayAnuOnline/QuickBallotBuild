import React, { useState, useEffect, useMemo, useCallback } from 'react';

// Load OpenMoji data at runtime
const loadOpenMojiData = async () => {
  try {
    
    
    
    // Debug: Check electronAPI availability
    
    if (typeof window !== 'undefined' && window.electronAPI) {
      
      
      
      
      
    }
    
    // In Electron, use IPC to read the file
    if (typeof window !== 'undefined' && window.electronAPI && typeof window.electronAPI.readOpenMojiData === 'function') {
      
      // Use Electron IPC to read openmoji.json
      const result = await window.electronAPI.readOpenMojiData();
      
      if (Array.isArray(result) && result.length > 0) {
        const data = result;
        
        const list = data
          .filter((e: any) => e.group !== 'Component')
          .map((e: any) => ({ hexcode: e.hexcode, annotation: e.annotation }));
        
        return list;
      } else {
        
        return [];
      }
    } else {
      
      // In development or web environments, use fetch
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
            
            break;
          } else {
            
          }
        } catch (err) {
          
          continue;
        }
      }
      
      if (data.length > 0) {
        const list = data
          .filter((e: any) => e.group !== 'Component')
          .map((e: any) => ({ hexcode: e.hexcode, annotation: e.annotation }));
        return list;
      } else {
        
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
      try {
        setLoading(true);
        setError(false);
        const src = await onLoadImage(emoji.hexcode);
        setImageSrc(src);
      } catch (err) {
        console.error(`Error loading emoji ${emoji.hexcode}:`, err);
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
        title={emoji.annotation}
        style={{
          background: '#2d2e35',
          border: 'none',
          borderRadius: 8,
          padding: 4,
          cursor: 'pointer',
          transition: 'background 0.2s',
          width: 46,
          height: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 32, height: 32, backgroundColor: '#ccc', borderRadius: '50%' }} />
      </div>
    );
  }

  if (!imageSrc) {
    return (
      <div
        title={emoji.annotation}
        style={{
          background: '#2d2e35',
          border: 'none',
          borderRadius: 8,
          padding: 4,
          cursor: 'pointer',
          transition: 'background 0.2s',
          width: 46,
          height: 46,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 32, height: 32, backgroundColor: '#ccc', borderRadius: '50%' }} />
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
          width: 46,
          height: 46,
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
        width: 46,
        height: 46,
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
  // Virtual scrolling state
  const [visibleStart, setVisibleStart] = useState(0);
  const [visibleEnd, setVisibleEnd] = useState(36); // Show 6x6 grid initially
  const itemsPerRow = 6;
  const rowsPerPage = 6;
  const itemsPerPage = itemsPerRow * rowsPerPage;

  // Filter emojis based on search
  const filteredEmojis = useMemo(() => {
    if (!openmojiList.length) return [];
    const s = search.trim().toLowerCase();
    return s
      ? openmojiList.filter(
          (e) =>
            e.annotation.toLowerCase().includes(s) ||
            e.hexcode.replace(/-/g, '').toLowerCase().includes(s)
        )
      : openmojiList;
  }, [search, openmojiList]);

  // Update filtered list
  useEffect(() => {
    setFiltered(filteredEmojis);
    // Reset visible range when search changes
    setVisibleStart(0);
    setVisibleEnd(itemsPerPage);
  }, [filteredEmojis, itemsPerPage]);

  // Load OpenMoji data when component mounts
  useEffect(() => {
    loadOpenMojiData().then((data) => {
      if (data) {
        setOpenmojiList(data);
      }
    });
  }, []);

  // Handle scroll for virtual scrolling
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
    
    // Load more items when scrolling near the bottom
    if (scrollHeight - scrollTop - clientHeight < 100) {
      setVisibleEnd(prev => Math.min(prev + itemsPerPage, filtered.length));
    }
    
    // Adjust visible start based on scroll position
    const rowHeight = 46; // Approximate height of each emoji row
    const startRow = Math.floor(scrollTop / rowHeight);
    setVisibleStart(startRow * itemsPerRow);
    setVisibleEnd(Math.min((startRow + rowsPerPage + 1) * itemsPerRow, filtered.length));
  }, [filtered.length, itemsPerPage, itemsPerRow, rowsPerPage]);

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
      <div className="emoji-grid" onScroll={handleScroll} style={{ height: '276px', overflowY: 'auto' }}>
        {filtered.slice(visibleStart, visibleEnd).map((emoji) => (
          <EmojiButton key={emoji.hexcode} emoji={emoji} onLoadImage={loadEmojiImage} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
};

export default OpenMojiPicker; 