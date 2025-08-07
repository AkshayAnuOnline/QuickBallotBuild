import React, { useState } from 'react';
import { Card, Table, Button, Modal, Form } from 'react-bootstrap';
import GradientButton1 from './GradientButton1';
import GlassButton from './GlassButton';
import { FaSearch, FaArrowLeft, FaImage, FaCog } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { useParams, useNavigate } from 'react-router-dom';
import 'emoji-picker-element';
import PopupContainer from './PopupContainer';
import jsPDF from 'jspdf';
import 'jspdf/dist/polyfills.es.js';
import OpenMojiPicker from './OpenMojiPicker';
import './AddOrganizationModal.scss';

// Local JSX module augmentation for emoji-picker
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'emoji-picker': any;
    }
  }
}

// Update newCandidate state type
type CandidateFormState = {
  name: string;
  symbol: string;
  symbolFile: string | null; // base64 string or null
  photo: string | null; // base64 string or null
};

interface ManageCandidatesProps {
  organization_id?: string | number;
  position?: string;
  orgName?: string;
  orgLogo?: string;
  electionName?: string;
}

// Helper: Crop an image to a centered square and return a data URL
async function cropImageToSquare(dataUrl: string, size: number = 256): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.onload = function() {
      const minDim = Math.min(img.width, img.height);
      const sx = (img.width - minDim) / 2;
      const sy = (img.height - minDim) / 2;
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        if (ctx) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, size, size);
        ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);
          resolve(canvas.toDataURL('image/png'));
        } else {
        resolve(dataUrl);
      }
    };
    img.onerror = function() { resolve(dataUrl); };
    img.src = dataUrl;
  });
}

// Helper to crop an image to a circle and return a PNG data URL
async function cropImageToCircle(dataUrl: string, size: number = 64): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = 'Anonymous';
    img.onload = function () {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(dataUrl);
      ctx.clearRect(0, 0, size, size);
      ctx.save();
      ctx.beginPath();
      ctx.arc(size / 2, size / 2, size / 2, 0, 2 * Math.PI);
      ctx.closePath();
      ctx.clip();
      ctx.drawImage(img, 0, 0, size, size);
      ctx.restore();
      resolve(canvas.toDataURL('image/png'));
    };
    img.onerror = function () {
      resolve(dataUrl);
    };
    img.src = dataUrl;
  });
}

const ManageCandidates: React.FC<ManageCandidatesProps> = ({ organization_id: propOrgId, position: propPosition, orgName, orgLogo, electionName }) => {
  const params = useParams();
  const { orgId, electionId } = params;
  const organization_id = propOrgId ? Number(propOrgId) : Number(params.id);
  const position = propPosition || params.positionName;
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<number[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newCandidate, setNewCandidate] = useState<CandidateFormState>({
    name: '',
    symbol: '',
    symbolFile: null,
    photo: null
  });
  const [showEditModal, setShowEditModal] = useState(false);
  // Update editCandidate state type to include symbolFile
  const [editCandidate, setEditCandidate] = useState<{ id: number; name: string; symbol: string; symbolFile: string | null; photo: string | null } | null>(null);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importPreview, setImportPreview] = useState<{ names: string[]; symbols: string[]; added: number; skipped: number } | null>(null);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showEditEmojiPicker, setShowEditEmojiPicker] = useState(false);
  const [showEditPositionModal, setShowEditPositionModal] = useState(false);
  const [editPositionName, setEditPositionName] = useState(position || '');
  const navigate = useNavigate();
  const [showDeletePositionModal, setShowDeletePositionModal] = useState(false);
  const [deletePositionAuth, setDeletePositionAuth] = useState('');
  const [deletePositionError, setDeletePositionError] = useState('');
  const [addCandidateError, setAddCandidateError] = useState('');

  // Handler for delete position after auth
  const handleDeletePosition = async (e: React.FormEvent) => {
    e.preventDefault();
    setDeletePositionError('');
    if (!orgId || !electionId || !position) return;
    // Authenticate admin password
    const isValid = await window.electronAPI.invoke('authenticate-admin', { orgId, password: deletePositionAuth });
    if (!isValid) {
      setDeletePositionError('Incorrect password.');
      return;
    }
    // Fetch the current election
    const orgs = await window.electronAPI.invoke('get-organizations');
    const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
    if (!foundOrg) return;
    const elections = await window.electronAPI.invoke('get-elections', foundOrg.id);
    const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
    if (!foundElection) return;
    // Remove the position from the election
    const updatedPositions = Array.isArray(foundElection.positions)
      ? foundElection.positions.filter((p: string) => p !== position)
      : [];
    await window.electronAPI.invoke('update-election', {
      ...foundElection,
      positions: updatedPositions
    });
    // Delete all candidates for this position
    await window.electronAPI.invoke('delete-candidates-for-position', { organizationId: orgId, position });
    setShowDeletePositionModal(false);
    setShowEditPositionModal(false);
    setDeletePositionAuth('');
    // Optionally, refresh positions/candidates list
    navigate(`/organization/${orgId}/election/${electionId}`);
  };

  React.useEffect(() => {
    if (!organization_id || !position) return;
    window.electronAPI.invoke('get-candidates', { organizationId: organization_id, position }).then(setCandidates);
  }, [organization_id, position]);

  const handleSelect = (id: number) => {
    setSelected(selected.includes(id) ? selected.filter(s => s !== id) : [...selected, id]);
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.name.trim() || !position) return;
    // Duplicate name check (case-insensitive, trimmed) for this position
    const normNew = newCandidate.name.trim().toLowerCase();
    if (candidates.some(c => (c.name || '').trim().toLowerCase() === normNew)) {
      setAddCandidateError('A candidate with this name already exists for this position.');
      return;
    }
    setAddCandidateError('');
    // Check if we've reached the maximum of 10 candidates
    if (candidates.length >= 10) {
      alert('Maximum of 10 candidates allowed per position.');
      return;
    }
    
    // Use symbolFile if present, otherwise use symbol
    const symbolToSave = newCandidate.symbolFile ? newCandidate.symbolFile : newCandidate.symbol.trim();
    const newCandidateData = await window.electronAPI.invoke('create-candidate', { 
      organization_id, 
      position,
      name: newCandidate.name.trim(),
      symbol: symbolToSave,
      photo: newCandidate.photo
    });
    setCandidates(prev => [...prev, newCandidateData]);
    setNewCandidate({ name: '', symbol: '', symbolFile: null, photo: null });
    setShowAddModal(false);
  };

  const handleEditCandidate = async () => {
    if (!editCandidate || !position) return;
    // Use symbolFile if present, otherwise use symbol
    const symbolToSave = editCandidate.symbolFile ? editCandidate.symbolFile : editCandidate.symbol;
    await window.electronAPI.invoke('update-candidate', { ...editCandidate, symbol: symbolToSave, position });
    setCandidates(candidates.map(c => c.id === editCandidate.id ? { ...c, name: editCandidate.name, symbol: symbolToSave, symbolFile: editCandidate.symbolFile, photo: editCandidate.photo } : c));
    setShowEditModal(false);
    setEditCandidate(null);
  };

  const handleDeleteCandidate = async (id: number) => {
    await window.electronAPI.invoke('delete-candidate', id);
    setCandidates(candidates.filter(c => c.id !== id));
    setSelected(selected.filter(s => s !== id));
  };

  const handleBatchDelete = async () => {
    for (const id of selected) {
      await window.electronAPI.invoke('delete-candidate', id);
    }
    setCandidates(candidates.filter(c => !selected.includes(c.id)));
    setSelected([]);
  };

  const handleDownloadTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([["Candidate Name"]]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Candidates");
    XLSX.writeFile(wb, "candidates_template.xlsx");
  };

  const handleExportCandidates = async () => {
    try {
      if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
        alert('No candidates to export');
        return;
      }
      
      // Debug: Log the logo data
      console.log('PDF Export - orgLogo:', orgLogo ? orgLogo.substring(0, 100) + '...' : 'null');
      console.log('PDF Export - orgName:', orgName);
      console.log('PDF Export - electionName:', electionName);
      console.log('PDF Export - position:', position);
      // Preload all PNG symbol paths as data URLs
      const symbolDataUrlMap: Record<string, string> = {};
      // Pre-crop all candidate photos to square
      const photoDataUrlMap: Record<string, string> = {};
      // Pre-crop all candidate photos to square
      for (const candidate of candidates) {
        // Crop photo to square if present
        if (candidate.photo && /^data:image\//.test(candidate.photo)) {
          if (!photoDataUrlMap[candidate.photo]) {
            photoDataUrlMap[candidate.photo] = await cropImageToSquare(candidate.photo, 1024);
          }
        }
      }
      
      // Process all candidate symbols
      for (const candidate of candidates) {
        const sym = candidate.symbol;
        // Handle SVG data URLs by converting them to raster images
        if (typeof sym === 'string' && sym.startsWith('data:image/svg+xml')) {
          if (!symbolDataUrlMap[sym]) {
            try {
              // Try JPEG first
              let convertedDataUrl = await window.electronAPI.invoke('convert-svg-to-image', {
                svgDataUrl: sym,
                outputFormat: 'png',
                size: 512
              });
              
              if (convertedDataUrl && convertedDataUrl.startsWith('data:image/png')) {
                symbolDataUrlMap[sym] = convertedDataUrl;
              } else {
                console.warn('PNG conversion failed for symbol');
              }
            } catch (e) {
              console.warn('Failed to convert SVG symbol:', e);
            }
          }
        }
        // Handle other data URLs (custom uploaded symbols) by ensuring they're in the map
        if (typeof sym === 'string' && sym.startsWith('data:image/')) {
          // Custom uploaded symbols are already data URLs, so just ensure they're in the map
          if (!symbolDataUrlMap[sym]) {
            symbolDataUrlMap[sym] = sym;
          }
        }
      }
      const exportCandidates = candidates.map(candidate => {
        let symbol = candidate.symbol;
        if (typeof symbol === 'string' && symbolDataUrlMap[symbol]) {
          symbol = symbolDataUrlMap[symbol];
        }
        let photo = candidate.photo;
        if (photo && photoDataUrlMap[photo]) {
          photo = photoDataUrlMap[photo];
        }
        return { ...candidate, symbol, photo };
      });
      const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const headerLogoSize = 96;
      // Calculate widths for true centering
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      const orgNameWidth = doc.getTextWidth(orgName || 'Organization');
      const logoWidth = headerLogoSize;
      const logoSpacing = 16;
      const totalHeaderWidth = logoWidth + logoSpacing + orgNameWidth;
      const headerStartX = (pageWidth - totalHeaderWidth) / 2;
      const headerTextStart = headerStartX + logoWidth + logoSpacing;
      // Draw logo (if any)
      let y = 32;
      if (orgLogo && /^data:image\//.test(orgLogo) && !orgLogo.startsWith('data:image/svg+xml')) {
        try {
          let format = 'PNG';
          const formatMatch = orgLogo.match(/data:image\/([^;]+)/);
          if (formatMatch) {
            format = formatMatch[1].toUpperCase();
            if (!['PNG', 'JPEG', 'WEBP'].includes(format)) {
              format = 'PNG';
            }
          }
          doc.addImage(orgLogo, format, headerStartX, y, headerLogoSize, headerLogoSize);
        } catch (e) {
          console.warn('Failed to add logo to PDF:', e);
        }
      } else if (orgLogo && orgLogo.startsWith('data:image/svg+xml')) {
        // Handle SVG conversion
        try {
          console.log('Converting SVG logo to image...');
          
          // Convert SVG to image using sharp with PNG format to preserve transparency
          let convertedDataUrl = await window.electronAPI.invoke('convert-svg-to-image', {
            svgDataUrl: orgLogo,
            outputFormat: 'png',
            size: 512
          });
          
          // Check if conversion was successful
          if (convertedDataUrl && convertedDataUrl.startsWith('data:image/')) {
            console.log('SVG conversion successful, adding to PDF');
            const imageFormat = 'PNG'; // Always PNG for transparency
            doc.addImage(convertedDataUrl, imageFormat, headerStartX, y, headerLogoSize, headerLogoSize);
            // Store the converted data URL for use on new pages
            (doc as any)._convertedLogoDataUrl = convertedDataUrl;
            (doc as any)._convertedLogoFormat = imageFormat;
          } else {
            console.warn('SVG conversion failed, skipping logo');
          }
        } catch (e) {
          console.warn('Failed to convert SVG logo:', e);
          console.log('Continuing without logo...');
        }
      } else if (orgLogo && (orgLogo.endsWith('.png') || orgLogo.startsWith('/openmoji/'))) {
        // Handle OpenMoji PNG paths for header with higher quality
        try {
          // Convert relative path to absolute URL
          let emojiUrl = orgLogo;
          if (emojiUrl.startsWith('/openmoji/')) {
            // Use the base URL for OpenMoji assets
            const baseUrl = (import.meta as any).env?.BASE_URL || process.env.BASE_URL || '';
            emojiUrl = `${baseUrl}${emojiUrl}`;
          }
          // Use higher resolution for better quality in PDF header
          doc.addImage(emojiUrl, 'PNG', headerStartX, y, 96, 96);
        } catch (e) {
          console.warn('Failed to add emoji logo to PDF:', e);
        }
      } else if (orgLogo) {
        console.log('Logo format not supported for PDF:', orgLogo.substring(0, 50) + '...');
      }
      // Draw text block (all lines left-aligned to headerTextStart)
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(28);
      doc.setTextColor(20,20,20);
      doc.text(orgName || 'Organization', headerTextStart, y + 24);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(16);
      doc.setTextColor(60,60,60);
      doc.text(electionName || 'Election', headerTextStart, y + 48);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.setTextColor(0, 0, 0);
      doc.text(position ? String(position) : 'Position', headerTextStart, y + 72);
      y += headerLogoSize + 32;
      // Multi-page table logic (no footer)
      const containerMargin = 32;
      const containerWidth = pageWidth - 2 * containerMargin;
      const tableMargin = containerMargin + 16;
      const tableWidth = containerWidth - 32;
      const photoColWidth = 80;
      const symbolColWidth = 60;
      const nameColWidth = tableWidth - photoColWidth - symbolColWidth;
      const cellHeight = 72;
      const headerHeight = cellHeight;
      const paddingY = 8;
      const availableHeight = pageHeight - y - 24; // top used, reduced bottom margin
      const rowsPerPage = Math.floor((availableHeight - headerHeight - 2 * paddingY) / cellHeight);
      let rowIdx = 0;
      while (rowIdx < exportCandidates.length) {
        // How many rows on this page?
        const rowsThisPage = Math.min(rowsPerPage, exportCandidates.length - rowIdx);
        const containerHeight = (rowsThisPage + 1) * cellHeight + 2 * paddingY;
        // Draw the large rounded container
        doc.setFillColor(255,255,255);
        doc.setDrawColor(220,230,245);
        doc.setLineWidth(2);
        doc.roundedRect(containerMargin, y, containerWidth, containerHeight, 24, 24, 'FD');
        let rowY = y + paddingY;
        // Table header (inside container, no rounded corners)
        doc.setFillColor(234, 242, 255); // #eaf2ff
        doc.rect(tableMargin, rowY, tableWidth, cellHeight, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.setTextColor(60,60,60);
        doc.text('Photo', tableMargin + photoColWidth/2, rowY + cellHeight/2 + 2, { align: 'center', baseline: 'middle' });
        doc.text('Symbol', tableMargin + photoColWidth + symbolColWidth/2, rowY + cellHeight/2 + 2, { align: 'center', baseline: 'middle' });
        doc.text('Name', tableMargin + photoColWidth + symbolColWidth + nameColWidth/2, rowY + cellHeight/2 + 2, { align: 'center', baseline: 'middle' });
        rowY += cellHeight;
        // Table rows (inside container, no rounded corners, pastel alternating backgrounds)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(15);
        doc.setTextColor(40,40,40);
        for (let i = 0; i < rowsThisPage; ++i) {
          const candidate = exportCandidates[rowIdx + i];
          // Alternating row color: #f7faff and #eaf2ff
          if ((rowIdx + i) % 2 === 0) {
            doc.setFillColor(247,250,255); // #f7faff
          } else {
            doc.setFillColor(234,242,255); // #eaf2ff
          }
          doc.rect(tableMargin, rowY, tableWidth, cellHeight, 'F');
          // Photo (circular, object-fit: cover, with light border)
          if (candidate.photo && /^data:image\//.test(candidate.photo)) {
              try {
                let format = 'PNG';
              const formatMatch = candidate.photo.match(/data:image\/([^;]+)/);
                if (formatMatch) {
                  format = formatMatch[1].toUpperCase();
                  if (!['PNG', 'JPEG', 'WEBP'].includes(format)) {
                    format = 'PNG';
                  }
                }
              // Crop the photo to a circle using canvas
              const croppedPhoto = await cropImageToCircle(candidate.photo, 256);
              // Draw the photo (already circular)
              doc.addImage(croppedPhoto, 'PNG', tableMargin + (photoColWidth-64)/2, rowY + (cellHeight-64)/2, 64, 64);
              // Draw a border circle on top
              doc.setDrawColor(200, 210, 230);
              doc.setLineWidth(2);
              doc.circle(tableMargin + photoColWidth/2, rowY + cellHeight/2, 32);
            } catch (e) {}
            } else {
            // Placeholder circle (only if no photo)
            doc.setDrawColor(220,220,220);
            doc.setLineWidth(1);
            doc.circle(tableMargin + photoColWidth/2, rowY + cellHeight/2, 32);
          }
          // Symbol (centered, modern)
          if (candidate.symbol && /^data:image\//.test(candidate.symbol)) {
              try {
                let format = 'PNG';
              const formatMatch = candidate.symbol.match(/data:image\/([^;]+)/);
                if (formatMatch) {
                  format = formatMatch[1].toUpperCase();
                  if (!['PNG', 'JPEG', 'WEBP'].includes(format)) {
                    format = 'PNG';
                  }
                }
              doc.addImage(candidate.symbol, format, tableMargin + photoColWidth + (symbolColWidth-56)/2, rowY + (cellHeight-56)/2, 56, 56);
            } catch (e) {}
          } else if (candidate.symbol && (candidate.symbol.endsWith('.png') || candidate.symbol.startsWith('/openmoji/'))) {
            // Handle OpenMoji PNG paths with higher quality
            try {
              // Convert relative path to absolute URL
              let emojiUrl = candidate.symbol;
              if (emojiUrl.startsWith('/openmoji/')) {
                // Use the base URL for OpenMoji assets
                const baseUrl = (import.meta as any).env?.BASE_URL || process.env.BASE_URL || '';
                emojiUrl = `${baseUrl}${emojiUrl}`;
              }
              // Use larger size for better quality in PDF with high resolution assets
              doc.addImage(emojiUrl, 'PNG', tableMargin + photoColWidth + (symbolColWidth-96)/2, rowY + (cellHeight-96)/2, 96, 96);
            } catch (e) {
              console.warn('Failed to add emoji to PDF:', e);
            }
          } else if (candidate.symbol && candidate.symbol.length <= 3) {
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(28);
            doc.text(candidate.symbol, tableMargin + photoColWidth + symbolColWidth/2, rowY + cellHeight/2 + 8, { align: 'center', baseline: 'middle' });
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(15);
              } else {
            // Placeholder
            doc.setDrawColor(220,220,220);
            doc.setLineWidth(1);
            doc.circle(tableMargin + photoColWidth + symbolColWidth/2, rowY + cellHeight/2, 18);
          }
          // Name (bold, modern)
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(17);
          doc.setTextColor(30,30,30);
          doc.text(candidate.name || '', tableMargin + photoColWidth + symbolColWidth + nameColWidth/2, rowY + cellHeight/2 + 4, { align: 'center', baseline: 'middle' });
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(15);
          doc.setTextColor(40,40,40);
          rowY += cellHeight;
        }
        rowIdx += rowsThisPage;
        if (rowIdx < exportCandidates.length) {
          doc.addPage();
          y = 32;
          // Redraw header for new page
          if ((doc as any)._convertedLogoDataUrl) {
            // Use the already converted logo data URL
            try {
              const convertedDataUrl = (doc as any)._convertedLogoDataUrl;
              const format = (doc as any)._convertedLogoFormat;
              console.log('Using converted logo for new page:', format);
              doc.addImage(convertedDataUrl, format, headerStartX, y, headerLogoSize, headerLogoSize, undefined, 'FAST');
        } catch (e) {
              console.warn('Failed to add converted logo to PDF on new page:', e);
            }
          } else if (orgLogo && /^data:image\//.test(orgLogo) && !orgLogo.startsWith('data:image/svg+xml')) {
            try {
              let format = 'PNG';
              const formatMatch = orgLogo.match(/data:image\/([^;]+)/);
              if (formatMatch) {
                format = formatMatch[1].toUpperCase();
                if (!['PNG', 'JPEG', 'WEBP'].includes(format)) {
                  format = 'PNG';
                }
              }
              doc.addImage(orgLogo, format, headerStartX, y, headerLogoSize, headerLogoSize);
            } catch (e) {
              console.warn('Failed to add logo to PDF on new page:', e);
            }
          } else if (orgLogo && orgLogo.startsWith('data:image/svg+xml')) {
            // Handle SVG conversion for new page (fallback)
            try {
              console.log('Converting SVG logo to image for new page...');
              
              // Convert SVG to PNG to preserve transparency
              let convertedDataUrl = await window.electronAPI.invoke('convert-svg-to-image', {
                svgDataUrl: orgLogo,
                outputFormat: 'png',
                size: 256
              });
              
              if (convertedDataUrl && convertedDataUrl.startsWith('data:image/png')) {
                console.log('SVG to PNG conversion successful for new page, adding to PDF');
                doc.addImage(convertedDataUrl, 'PNG', headerStartX, y, headerLogoSize, headerLogoSize);
                // Store the converted data URL for use on subsequent pages
                (doc as any)._convertedLogoDataUrl = convertedDataUrl;
                (doc as any)._convertedLogoFormat = 'PNG';
              } else {
                console.warn('PNG conversion failed for new page, skipping logo');
              }
            } catch (e) {
              console.warn('Failed to convert SVG logo for new page:', e);
              console.log('Continuing without logo for new page...');
            }
          } else if (orgLogo && (orgLogo.endsWith('.png') || orgLogo.startsWith('/openmoji/'))) {
            // Handle OpenMoji PNG paths for header on new pages with higher quality
            try {
              // Convert relative path to absolute URL
              let emojiUrl = orgLogo;
              if (emojiUrl.startsWith('/openmoji/')) {
                // Use the base URL for OpenMoji assets
                const baseUrl = (import.meta as any).env?.BASE_URL || process.env.BASE_URL || '';
                emojiUrl = `${baseUrl}${emojiUrl}`;
              }
              // Use higher resolution for better quality in PDF header on new pages
              doc.addImage(emojiUrl, 'PNG', headerStartX, y, 96, 96);
            } catch (e) {
              console.warn('Failed to add emoji logo to PDF on new page:', e);
            }
          } else if (orgLogo) {
            console.log('Logo format not supported for PDF on new page:', orgLogo.substring(0, 50) + '...');
          }
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(28);
          doc.setTextColor(20,20,20);
          doc.text(orgName || 'Organization', headerTextStart, y + 24);
          doc.setFont('helvetica', 'normal');
          doc.setFontSize(16);
          doc.setTextColor(60,60,60);
          doc.text(electionName || 'Election', headerTextStart, y + 48);
          doc.setFont('helvetica', 'bold');
          doc.setFontSize(16);
          doc.setTextColor(0, 0, 0);
          doc.text(position ? String(position) : 'Position', headerTextStart, y + 72);
          y += headerLogoSize + 32;
        }
      }
      doc.save(`candidates_${position || 'position'}_${(new Date()).toISOString().slice(0, 19).replace(/:/g, '-')}.pdf`);
    } catch (e) {
      alert('An error occurred while exporting candidates. Please try again.');
    }
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    c.symbol.toLowerCase().includes(search.toLowerCase()) ||
    c.id.toString().toLowerCase().includes(search.toLowerCase())
  );

  // Helper: normalize header
  const headerVariants = [
    'candidate name', 'candidatename', 'name', 'full name', 'candidate', 'candidates', 'candidate_name', 'candidatename', 'candidate names', 'names',
    'symbol', 'symbols', 'candidate symbol', 'candidatesymbol', 'candidate_symbol'
  ];
  const normalize = (str: string) => str.trim().toLowerCase().replace(/\s|_/g, '');

  // Import handler
  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      let data: string | ArrayBuffer | null = evt.target && typeof evt.target.result !== 'undefined' ? evt.target.result : null;
      if (!data) return;
      let rows: any[][] = [];
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
      const existingNames = new Set(candidates.map(c => normalize(c.name)));
      const fileNames = new Set<string>();
      let added = 0, skipped = 0;
      const previewNames: string[] = [];
      const previewSymbols: string[] = [];
      for (let i = headerRowIdx + 1; i < rows.length; ++i) {
        const name = (rows[i][0] || '').trim();
        const symbol = (rows[i][1] || '').trim();
        if (!name) continue;
        const norm = normalize(name);
        if (headerVariants.includes(norm)) { skipped++; continue; }
        if (fileNames.has(norm) || existingNames.has(norm)) { skipped++; continue; }
        fileNames.add(norm);
        previewNames.push(name);
        previewSymbols.push(symbol);
        added++;
      }
      setImportPreview({ names: previewNames, symbols: previewSymbols, added, skipped });
    };
    if (file.name.endsWith('.csv')) {
      reader.readAsText(file);
    } else {
      reader.readAsBinaryString(file);
    }
  };

  // Add import confirm handler
  const handleImportConfirm = async () => {
    if (!importPreview || !position) return;
    const totalAfterImport = candidates.length + (importPreview?.names.length || 0);
    if (totalAfterImport > 10) {
      alert('Import would exceed the 10 candidate limit per position. Please reduce the number of candidates.');
      return;
    }
    const inserted = await window.electronAPI.invoke('batch-create-candidates', { 
      organization_id, 
      position,
      candidates: importPreview.names.map((name, idx) => ({
        name,
        symbol: importPreview.symbols[idx] || ''
      }))
    });
    
    setCandidates(prev => [...prev, ...inserted]);
    setImportPreview(null);
    setShowImportModal(false);
  };

  // Allowed image types
  const allowedTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'];

  // Update handleSymbolUpload to convert file to base64 string, with 5MB limit and type check
  const handleSymbolUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!allowedTypes.includes(file.type)) {
        alert('Unsupported image format. Please upload a PNG, JPG, WEBP, SVG, or GIF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Please upload an image smaller than 5MB.');
        return;
      }
      if (file.type === 'image/svg+xml' && file.size > 200 * 1024) {
        alert('SVGs larger than 200KB may cause performance issues.');
      }
      const reader = new FileReader();
      reader.onload = () => {
        setNewCandidate(prev => ({ ...prev, symbolFile: reader.result as string, symbol: reader.result as string }));
      };
      reader.onerror = () => {
        alert('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };
  // Update handlePhotoChange to convert file to base64 string, with 5MB limit and type check
  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!allowedTypes.includes(file.type)) {
        alert('Unsupported image format. Please upload a PNG, JPG, WEBP, SVG, or GIF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Please upload an image smaller than 5MB.');
        return;
      }
      if (file.type === 'image/svg+xml' && file.size > 200 * 1024) {
        alert('SVGs larger than 200KB may cause performance issues.');
      }
      const reader = new FileReader();
      reader.onload = () => {
        setNewCandidate(prev => ({ ...prev, photo: reader.result as string }));
      };
      reader.onerror = () => {
        alert('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };
  // Update handleEditPhotoChange to convert file to base64 string, with 5MB limit and type check
  const handleEditPhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!allowedTypes.includes(file.type)) {
        alert('Unsupported image format. Please upload a PNG, JPG, WEBP, SVG, or GIF.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('Please upload an image smaller than 5MB.');
        return;
      }
      if (file.type === 'image/svg+xml' && file.size > 200 * 1024) {
        alert('SVGs larger than 200KB may cause performance issues.');
      }
      const reader = new FileReader();
      reader.onload = () => {
        setEditCandidate(prev => prev ? { ...prev, symbolFile: reader.result as string, symbol: '' } : prev);
      };
      reader.onerror = () => {
        alert('Failed to read the image file.');
      };
      reader.readAsDataURL(file);
    }
  };

  // Edit Position Name Save Handler
  const handleEditPositionSave = async () => {
    if (!orgId || !electionId || !position || !editPositionName.trim()) return;
    // Fetch the current election
    const orgs = await window.electronAPI.invoke('get-organizations');
    const foundOrg = orgs.find((o: any) => String(o.id) === String(orgId));
    if (!foundOrg) return;
    const elections = await window.electronAPI.invoke('get-elections', foundOrg.id);
    const foundElection = elections.find((e: any) => String(e.id) === String(electionId));
    if (!foundElection) return;
    // Replace the old position with the new one
    const updatedPositions = Array.isArray(foundElection.positions)
      ? foundElection.positions.map((p: string) => (p === position ? editPositionName.trim() : p))
      : [];
    // Update the election in the DB
    await window.electronAPI.invoke('update-election', {
      ...foundElection,
      positions: updatedPositions
    });
    // Use SPA navigation to the new URL
    navigate(`/organization/${orgId}/election/${electionId}/position/${encodeURIComponent(editPositionName.trim())}`, { replace: true });
    setShowEditPositionModal(false);
  };

  const candidateLimitReached = candidates.length >= 10;

  // Select All logic
  const allSelected = filteredCandidates.length > 0 && selected.length === filteredCandidates.length;
  const someSelected = selected.length > 0 && selected.length < filteredCandidates.length;
  const handleSelectAll = () => {
    if (allSelected) {
      setSelected([]);
    } else {
      setSelected(filteredCandidates.map(c => c.id));
    }
  };

  return (
    <div className="manage-candidates-page" style={{ minHeight: '100vh', background: 'var(--dark)', padding: '2.5rem 0' }}>
      <div className="container py-4">
        <div className="d-flex align-items-center mb-4 gap-3">
          <Button variant="link" className="p-0" style={{ color: '#4f8cff', fontSize: 28 }} onClick={() => navigate(`/organization/${orgId}/election/${electionId}`)}><FaArrowLeft /></Button>
          <h2 className="mb-0 d-flex align-items-center" style={{ color: '#fff', fontWeight: 800, gap: 12 }}>
            {position ? position.charAt(0).toUpperCase() + position.slice(1) : 'Position'}
            <button
              className="btn btn-link p-0 ms-2"
              style={{ color: '#a3a6b1', fontSize: 22 }}
              onClick={() => setShowEditPositionModal(true)}
              title="Edit Position Name"
            >
              <FaCog />
            </button>
          </h2>
        </div>
        <Card className="mb-4" style={{ background: 'var(--dark-light)', borderRadius: 20, border: '1.5px solid var(--border)', boxShadow: '0 8px 32px rgba(0,0,0,0.45)' }}>
          <Card.Body>
            <div className="d-flex flex-wrap align-items-center justify-content-between mb-3" style={{ gap: '1rem' }}>
              <div className="d-flex align-items-center gap-2 flex-wrap" style={{ gap: '1rem !important' }}>
                <GlassButton 
                  icon="person_add" 
                  onClick={() => setShowAddModal(true)} 
                  style={{ marginRight: '1rem' }}
                  disabled={candidateLimitReached}
                >
                  Add Candidate ({candidates.length}/10)
                </GlassButton>
                <GlassButton icon="file_upload" onClick={() => setShowImportModal(true)} style={{ marginRight: '1rem' }}>Import CSV/Excel</GlassButton>
                <GlassButton icon="file_download" onClick={handleExportCandidates} style={{ marginRight: '1rem' }}>Download Candidate List</GlassButton>
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
                  placeholder="Search by name or symbol"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              <Table hover responsive variant="dark" className="mb-0" style={{ borderRadius: 14, overflow: 'hidden', background: 'var(--dark-light)' }}>
                <thead style={{ background: 'var(--dark-lighter)' }}>
                  <tr style={{ height: 60 }}>
                    <th style={{ verticalAlign: 'middle', width: 48, paddingLeft: '2rem', paddingRight: '1rem', textAlign: 'center' }}>
                      <input
                        type="checkbox"
                        className="dark-checkbox"
                        checked={allSelected}
                        ref={input => { if (input) input.indeterminate = someSelected; }}
                        onChange={handleSelectAll}
                        style={{ verticalAlign: 'middle', margin: 0, width: 22, height: 22 }}
                      />
                    </th>
                    <th style={{ verticalAlign: 'middle', width: 80 }}>Photo</th>
                    <th style={{ verticalAlign: 'middle', width: 80 }}>Symbol</th>
                    <th style={{ verticalAlign: 'middle' }}>Name</th>
                    <th style={{ verticalAlign: 'middle', width: 120 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCandidates.map(candidate => (
                    <tr key={candidate.id} style={{ height: 60 }}>
                      <td style={{ width: 48, paddingLeft: '2rem', paddingRight: '1rem', verticalAlign: 'middle', textAlign: 'center' }}>
                        <input type="checkbox" className="dark-checkbox" checked={selected.includes(candidate.id)} onChange={() => handleSelect(candidate.id)} style={{ verticalAlign: 'middle', margin: 0, width: 22, height: 22 }} />
                      </td>
                      <td style={{ verticalAlign: 'middle', width: 80 }}>
                        {candidate.photo ? (
                          <img 
                            src={candidate.photo} 
                            alt={candidate.name}
                            style={{ 
                              width: 40, 
                              height: 40, 
                              borderRadius: '50%', 
                              objectFit: 'cover',
                              border: '2px solid var(--border)'
                            }} 
                          />
                        ) : (
                          <div style={{ 
                            width: 40, 
                            height: 40, 
                            borderRadius: '50%', 
                            background: 'var(--dark-lighter)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '2px solid var(--border)'
                          }}>
                            <FaImage style={{ color: 'var(--text-secondary)', fontSize: 16 }} />
                          </div>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'middle', width: 80 }}>
                        {candidate.symbol && candidate.symbol.startsWith('data:image/') ? (
                          <img
                            src={candidate.symbol}
                            alt="Symbol"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              objectFit: 'cover',
                              background: '#232427',
                              border: '1.5px solid #31334a',
                            }}
                          />
                        ) : candidate.symbol && candidate.symbol.endsWith('.png') ? (
                          <img
                            src={candidate.symbol}
                            alt="Symbol"
                            style={{
                              width: 32,
                              height: 32,
                              borderRadius: 6,
                              objectFit: 'cover',
                              background: '#232427',
                              border: '1.5px solid #31334a',
                            }}
                          />
                        ) : (
                          <span style={{ fontSize: 28 }}>{candidate.symbol}</span>
                        )}
                      </td>
                      <td style={{ verticalAlign: 'middle' }}>{candidate.name}</td>
                      <td style={{ verticalAlign: 'middle', width: 120 }}>
                        <Button variant="link" className="p-0 me-2" style={{ color: '#4f8cff', fontSize: 24 }} onClick={() => { setEditCandidate({ ...candidate, symbolFile: candidate.symbolFile || null }); setShowEditModal(true); }}>
                          <span className="material-icons" style={{ verticalAlign: 'middle' }}>edit_square</span>
                        </Button>
                        <Button variant="link" className="p-0" style={{ color: '#eb445a', fontSize: 24 }} onClick={() => handleDeleteCandidate(candidate.id)}>
                          <span className="material-icons" style={{ verticalAlign: 'middle' }}>delete_forever</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {filteredCandidates.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-secondary py-4">No candidates found.</td>
                    </tr>
                  )}
                </tbody>
              </Table>
            </div>
          </Card.Body>
        </Card>
      </div>
      
      {/* Add Candidate Modal */}
      <Modal show={showAddModal} onHide={() => { setShowAddModal(false); setAddCandidateError(''); }} centered dialogClassName="add-org-modal-premium" contentClassName="modal-content add-org-modal-content">
        <div className="add-org-modal-body">
          <div className="add-org-title-row mb-2">
            <div className="add-org-title">
              Add New Candidate ({candidates.length}/10)
            </div>
            <button className="add-org-close" onClick={() => { setShowAddModal(false); setAddCandidateError(''); }} aria-label="Close">&times;</button>
          </div>
          <div className="add-org-divider" />
          <Form onSubmit={e => { e.preventDefault(); handleAddCandidate(); }} autoComplete="off">
            <div className="add-org-section" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ color: '#fff', fontWeight: 600, marginBottom: 6, display: 'block' }}>Candidate Name</label>
                <input
                  type="text"
                  className="add-org-input"
                  value={newCandidate.name}
                  onChange={e => { setNewCandidate({ ...newCandidate, name: e.target.value }); setAddCandidateError(''); }}
                  required
                  autoFocus
                  style={{ width: '100%' }}
                />
                {addCandidateError && <div style={{ color: '#eb445a', marginTop: 4, fontWeight: 600 }}>{addCandidateError}</div>}
              </div>
              <div style={{ background: 'var(--dark-lighter)', borderRadius: 10, padding: 12, marginBottom: 0 }}>
                <label style={{ color: '#fff', fontWeight: 600, marginBottom: 6, display: 'block' }}>Symbol (Choose Emoji or Upload Image)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="add-org-file-btn" style={{ marginBottom: 0 }} onClick={() => setShowEmojiPicker(v => !v)}>
                    {newCandidate.symbol ? 'Change Emoji' : 'Pick Emoji'}
                  </button>
                  
                  {/* Symbol preview */}
                  {newCandidate.symbolFile ? (
                    <img
                      src={newCandidate.symbolFile}
                      alt="Symbol Preview"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        objectFit: 'cover',
                        marginLeft: 8,
                        background: '#232427',
                        border: '1.5px solid #31334a',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    />
                  ) : newCandidate.symbol && (
                      newCandidate.symbol.endsWith('.png') ||
                      newCandidate.symbol.startsWith('/openmoji/') ||
                      newCandidate.symbol.startsWith('data:image/') ||
                      newCandidate.symbol.length > 100
                    ) ? (
                    <img
                      src={
                        newCandidate.symbol.startsWith('data:image/') || newCandidate.symbol.endsWith('.png') || newCandidate.symbol.startsWith('/openmoji/')
                          ? newCandidate.symbol
                          : `data:image/png;base64,${newCandidate.symbol}`
                      }
                      alt="Symbol Preview"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        objectFit: 'cover',
                        marginLeft: 8,
                        background: '#232427',
                        border: '1.5px solid #31334a',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    />
                  ) : newCandidate.symbol ? (
                    <span
                      style={{
                        fontSize: 32,
                        marginLeft: 4,
                        background: '#232427',
                        borderRadius: 8,
                        padding: '2px 12px',
                        border: '1.5px solid #31334a',
                        display: 'inline-block',
                        minWidth: 40,
                        textAlign: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    >
                      {newCandidate.symbol}
                    </span>
                  ) : null}
                  {newCandidate.symbol && !newCandidate.symbolFile && (
                    <button type="button" style={{ background: 'none', border: 'none', color: '#eb445a', fontWeight: 700, fontSize: 18, marginLeft: 2, cursor: 'pointer' }} onClick={() => setNewCandidate(prev => ({ ...prev, symbol: '' }))}>&times;</button>
                  )}
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    id="candidateSymbolFile"
                    style={{ display: 'none' }}
                    onChange={e => handleSymbolUpload(e)}
                  />
                  <label htmlFor="candidateSymbolFile" className="add-org-file-btn" style={{ marginBottom: 0 }}>Upload Symbol</label>
                  {/* Only show file label if not showing emoji */}
                  {(!newCandidate.symbol || newCandidate.symbolFile) && (
                    <span className="add-org-file-name" style={{ color: '#a3a6b1', fontSize: 13 }}>{newCandidate.symbolFile ? 'Symbol selected' : 'No file chosen'}</span>
                  )}
                </div>
                {showEmojiPicker && (
                  <div style={{ marginTop: 10, background: 'var(--dark-light)', borderRadius: 10, padding: 8, zIndex: 1000 }}>
                    <OpenMojiPicker
                      onSelect={(pngPath) => {
                        setNewCandidate(prev => ({ ...prev, symbol: pngPath, symbolFile: null }));
                        setShowEmojiPicker(false);
                      }}
                      onClose={() => setShowEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
              
              <div style={{ background: 'var(--dark-lighter)', borderRadius: 10, padding: 12, marginBottom: 0 }}>
                <label style={{ color: '#fff', fontWeight: 600, marginBottom: 6, display: 'block' }}>Candidate Photo (Optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    id="candidatePhotoFile"
                    style={{ display: 'none' }}
                    onChange={e => handlePhotoChange(e)}
                  />
                  <label htmlFor="candidatePhotoFile" className="add-org-file-btn" style={{ marginBottom: 0 }}>Choose Photo</label>
                  <span className="add-org-file-name" style={{ color: '#a3a6b1', fontSize: 13 }}>{newCandidate.photo ? 'Photo selected' : 'No file chosen'}</span>
                  {newCandidate.photo && (
                    <img src={newCandidate.photo} alt="Photo Preview" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', marginLeft: 8 }} />
                  )}
                </div>
              </div>
            </div>
            <div className="d-flex gap-3 justify-content-end mt-4">
              <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowAddModal(false)} type="button">Cancel</button>
              <GradientButton1 type="submit" style={{ borderRadius: '0.8rem', fontWeight: 600 }}>Add</GradientButton1>
            </div>
          </Form>
          {candidateLimitReached && (
            <div style={{ color: '#eb445a', fontWeight: 600, marginTop: 8, textAlign: 'center' }}>
              Maximum of 10 candidates allowed per position.
            </div>
          )}
        </div>
      </Modal>
      
      {/* Edit Candidate Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} centered dialogClassName="add-org-modal-premium" contentClassName="modal-content add-org-modal-content">
        <div className="add-org-modal-body">
          <div className="add-org-title-row mb-2">
            <div className="add-org-title">Edit Candidate</div>
            <button className="add-org-close" onClick={() => setShowEditModal(false)} aria-label="Close">&times;</button>
          </div>
          <div className="add-org-divider" />
          <Form onSubmit={e => { e.preventDefault(); handleEditCandidate(); }}>
            <div className="add-org-section" style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <label style={{ color: '#fff', fontWeight: 600, marginBottom: 6, display: 'block' }}>Candidate Name</label>
                <input
                  type="text"
                  className="add-org-input"
                  value={editCandidate?.name || ''}
                  onChange={e => setEditCandidate(ec => ec ? { ...ec, name: e.target.value } : ec)}
                  required
                  autoFocus
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ background: 'var(--dark-lighter)', borderRadius: 10, padding: 12, marginBottom: 0 }}>
                <label style={{ color: '#fff', fontWeight: 600, marginBottom: 6, display: 'block' }}>Symbol (Choose Emoji or Upload Image)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                  <button type="button" className="add-org-file-btn" style={{ marginBottom: 0 }} onClick={() => setShowEditEmojiPicker(v => !v)}>
                    {editCandidate?.symbol && !editCandidate?.symbolFile ? 'Change Emoji' : 'Pick Emoji'}
                  </button>
                  {/* Show emoji preview in edit modal */}
                  {editCandidate?.symbol && !editCandidate?.symbolFile && editCandidate.symbol.startsWith('data:image/') ? (
                    <img
                      src={editCandidate.symbol}
                      alt="Symbol Preview"
                      style={{
                        width: 32,
                        height: 32,
                        borderRadius: 6,
                        objectFit: 'cover',
                        marginLeft: 8,
                        background: '#232427',
                        border: '1.5px solid #31334a',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                      }}
                    />
                  ) : null}
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    id="editCandidateSymbolFile"
                    style={{ display: 'none' }}
                    onChange={e => handleEditPhotoChange(e)}
                  />
                  <label htmlFor="editCandidateSymbolFile" className="add-org-file-btn" style={{ marginBottom: 0 }}>Upload Symbol</label>
                  {editCandidate?.symbol && !editCandidate?.symbolFile && (editCandidate.symbol.endsWith('.png') || editCandidate.symbol.startsWith('/openmoji/') || editCandidate.symbol.startsWith('data:image/') || editCandidate.symbol.length > 100) ? (
                    <img src={
                        editCandidate.symbol.startsWith('data:image/') || editCandidate.symbol.endsWith('.png') || editCandidate.symbol.startsWith('/openmoji/')
                          ? editCandidate.symbol
                          : `data:image/png;base64,${editCandidate.symbol}`
                      } alt="Symbol Preview" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', marginLeft: 8 }} />
                  ) : editCandidate?.symbol && !editCandidate?.symbolFile && !editCandidate?.symbol.startsWith('data:image/') ? (
                    <span style={{
                      fontSize: 32,
                      marginLeft: 4,
                      background: '#232427',
                      borderRadius: 8,
                      padding: '2px 12px',
                      border: '1.5px solid #31334a',
                      display: 'inline-block',
                      minWidth: 40,
                      textAlign: 'center',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}>{editCandidate.symbol}</span>
                  ) : null}
                  {editCandidate?.symbol && !editCandidate?.symbolFile && (
                    <button type="button" style={{ background: 'none', border: 'none', color: '#eb445a', fontWeight: 700, fontSize: 18, marginLeft: 2, cursor: 'pointer' }} onClick={() => setEditCandidate(prev => prev ? { ...prev, symbol: '' } : prev)}>&times;</button>
                  )}
                  {/* Only show file label if not showing emoji or image */}
                  {(!editCandidate?.symbol || editCandidate?.symbolFile) && (
                    <span className="add-org-file-name" style={{ color: '#a3a6b1', fontSize: 13 }}>{editCandidate?.symbolFile ? 'Symbol selected' : 'No file chosen'}</span>
                  )}
                  {editCandidate?.symbolFile && (
                    <img src={editCandidate.symbolFile} alt="Symbol Preview" style={{ width: 32, height: 32, borderRadius: 6, objectFit: 'cover', marginLeft: 8 }} />
                  )}
                </div>
                {showEditEmojiPicker && (
                  <div style={{ marginTop: 10, background: 'var(--dark-light)', borderRadius: 10, padding: 8, zIndex: 1000 }}>
                    <OpenMojiPicker
                      onSelect={(pngPath) => {
                        setEditCandidate(prev => prev ? { ...prev, symbol: pngPath, symbolFile: null } : prev);
                        setShowEditEmojiPicker(false);
                      }}
                      onClose={() => setShowEditEmojiPicker(false)}
                    />
                  </div>
                )}
              </div>
              <div style={{ background: 'var(--dark-lighter)', borderRadius: 10, padding: 12, marginBottom: 0 }}>
                <label style={{ color: '#fff', fontWeight: 600, marginBottom: 6, display: 'block' }}>Candidate Photo (Optional)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <input
                    type="file"
                    accept=".png,.jpg,.jpeg,.svg,.webp"
                    id="editCandidatePhotoFile"
                    style={{ display: 'none' }}
                    onChange={e => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = () => {
                          setEditCandidate(prev => prev ? { ...prev, photo: reader.result as string } : prev);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <label htmlFor="editCandidatePhotoFile" className="add-org-file-btn" style={{ marginBottom: 0 }}>Choose Photo</label>
                  <span className="add-org-file-name" style={{ color: '#a3a6b1', fontSize: 13 }}>{editCandidate?.photo ? 'Photo selected' : 'No file chosen'}</span>
                  {editCandidate?.photo && (
                    <img src={editCandidate.photo} alt="Photo Preview" style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', marginLeft: 8 }} />
                  )}
                </div>
              </div>
            </div>
            <div className="d-flex gap-3 justify-content-end mt-4">
              <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowEditModal(false)} type="button">Cancel</button>
              <GradientButton1 type="submit" style={{ borderRadius: '0.8rem', fontWeight: 600 }}>Save</GradientButton1>
            </div>
          </Form>
        </div>
      </Modal>
      
      {/* Import CSV Modal */}
      <Modal show={showImportModal} onHide={() => { setShowImportModal(false); setImportPreview(null); }} centered dialogClassName="add-org-modal-premium" contentClassName="modal-content add-org-modal-content">
        <div className="add-org-modal-body">
          <div className="add-org-title-row mb-2">
            <div className="add-org-title">Import Candidates from CSV/Excel</div>
            <button className="add-org-close" onClick={() => { setShowImportModal(false); setImportPreview(null); }} aria-label="Close">&times;</button>
          </div>
          <div className="add-org-divider" />
          <div className="add-org-section">
            <p className="text-secondary mb-3">Upload a CSV or Excel file with candidate names and symbols. Download the template for correct format.</p>
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
                        <li key={idx}>{name} - {importPreview.symbols[idx] || 'No symbol'}</li>
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

      {/* Edit Position Settings Modal */}
      <Modal show={showEditPositionModal} onHide={() => setShowEditPositionModal(false)} centered dialogClassName="add-org-modal-premium" contentClassName="modal-content add-org-modal-content">
          <PopupContainer>
            <div className="add-org-title-row mb-2">
            <div className="add-org-title">Edit Position Settings</div>
              <button className="add-org-close" onClick={() => setShowEditPositionModal(false)} aria-label="Close">&times;</button>
            </div>
            <div className="add-org-divider" />
            <form autoComplete="off" onSubmit={e => { e.preventDefault(); handleEditPositionSave(); }}>
              <div className="add-org-section">
                <div className="add-org-float-group">
                  <input
                    type="text"
                    className="add-org-input"
                    id="editPositionNameInput"
                    value={editPositionName}
                    onChange={e => setEditPositionName(e.target.value)}
                    autoFocus
                    required
                    placeholder=" "
                  />
                  <label htmlFor="editPositionNameInput" className={editPositionName ? 'float-active' : ''}>Position Name</label>
                </div>
              </div>
            <div className="d-flex mt-4 justify-content-between align-items-center gap-3">
              <button type="button" className="btn btn-danger px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowDeletePositionModal(true)}>
                Delete Position
              </button>
              <div className="d-flex gap-3">
                <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowEditPositionModal(false)} type="button">Cancel</button>
                <GradientButton1 className="add-org-create px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} type="submit">Save</GradientButton1>
              </div>
              </div>
            </form>
          </PopupContainer>
      </Modal>
      
      {/* Delete Position Modal (Auth + Confirmation) */}
      <Modal show={showDeletePositionModal} onHide={() => setShowDeletePositionModal(false)} centered dialogClassName="add-org-modal-premium" contentClassName="modal-content add-org-modal-content">
        <PopupContainer>
          <div className="add-org-title-row mb-2">
            <div className="add-org-title">Delete Position</div>
            <button className="add-org-close" onClick={() => setShowDeletePositionModal(false)} aria-label="Close">&times;</button>
        </div>
          <div className="add-org-divider" />
          <form autoComplete="off" onSubmit={handleDeletePosition}>
            <div className="add-org-section">
              <label style={{ color: '#fff', fontWeight: 600, marginBottom: 6, display: 'block' }}>Admin Password</label>
              <input
                type="password"
                className="add-org-input"
                value={deletePositionAuth}
                onChange={e => setDeletePositionAuth(e.target.value)}
                required
                autoFocus
              />
              <div style={{ color: '#fff', fontWeight: 500, fontSize: 16, marginTop: 18 }}>
                Are you sure you want to delete the position <b>{editPositionName}</b>? <br /><br />
                <span style={{ color: '#eb445a', fontWeight: 700 }}>
                  This will remove <u>all candidates</u> for this position. This action cannot be undone.
                </span>
              </div>
              {deletePositionError && <div className="add-org-error">{deletePositionError}</div>}
            </div>
            <div className="d-flex gap-3 mt-4 justify-content-end">
              <button className="add-org-cancel btn btn-secondary px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} onClick={() => setShowDeletePositionModal(false)} type="button">Cancel</button>
              <button className="btn btn-danger px-4 py-2" style={{ borderRadius: '0.8rem', fontWeight: 600 }} type="submit" disabled={!deletePositionAuth}>Delete</button>
            </div>
          </form>
        </PopupContainer>
      </Modal>
    </div>
  );
};

export default ManageCandidates; 