import { app, BrowserWindow, Menu, ipcMain, shell, systemPreferences } from 'electron';
import * as path from 'path';
import { installExtension, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { spawn } from 'child_process';
import * as https from 'https';
import * as fs from 'fs';
// Import sharp dynamically to avoid packaging issues
let sharp: any;

// Function to load sharp with multiple fallback approaches
const loadSharp = async () => {
  try {
    console.log('Attempting to load sharp module...');
    console.log('App path:', app.getAppPath());
    console.log('Resource path:', process.resourcesPath);
    
    // Method 1: Try dynamic import with full path
    try {
      const sharpPath = require.resolve('sharp');
      console.log('Sharp path resolved to:', sharpPath);
      sharp = (await import('sharp')).default;
      console.log('Sharp module loaded successfully with dynamic import:', !!sharp);
      return true;
    } catch (error) {
      console.warn('Failed to load sharp with dynamic import:', error);
    }
    
    // Method 2: Try require
    try {
      sharp = require('sharp');
      console.log('Sharp module loaded successfully with require:', !!sharp);
      return true;
    } catch (error) {
      console.warn('Failed to load sharp with require:', error);
    }
    
    // Method 3: Try direct path require
    try {
      const sharpPath = require.resolve('sharp');
      sharp = require(sharpPath);
      console.log('Sharp module loaded successfully with direct path require:', !!sharp);
      return true;
    } catch (error) {
      console.warn('Failed to load sharp with direct path require:', error);
    }
    
    // Method 4: Try loading from app resources in packaged environment
    try {
      const isDev = !app.isPackaged;
      console.log('App is packaged:', !isDev);
      
      if (!isDev) {
        // In packaged app, try to load from app.asar.unpacked
        const path = require('path');
        const appPath = app.getAppPath();
        console.log('App path:', appPath);
        
        // Try to load from app.asar.unpacked/node_modules
        const sharpUnpackedPath = path.join(appPath, '..', 'app.asar.unpacked', 'node_modules', 'sharp');
        console.log('Trying to load sharp from unpacked path:', sharpUnpackedPath);
        
        if (require('fs').existsSync(sharpUnpackedPath)) {
          const sharpLibPath = path.join(sharpUnpackedPath, 'lib', 'index.js');
          console.log('Loading sharp from:', sharpLibPath);
          sharp = require(sharpLibPath);
          console.log('Sharp module loaded successfully from unpacked path:', !!sharp);
          return true;
        }
      }
    } catch (error) {
      console.warn('Failed to load sharp from unpacked path:', error);
    }
    
    console.error('Failed to load sharp module with all methods');
    return false;
  } catch (error) {
    console.error('Error in loadSharp function:', error);
    return false;
  }
};

// Load sharp immediately and store the promise
const sharpLoadPromise = loadSharp();

// Function to ensure sharp is loaded before using it
const ensureSharpLoaded = async () => {
  try {
    // Wait for the initial load attempt
    await sharpLoadPromise;
    
    // If sharp is still not loaded, try one more time
    if (!sharp) {
      console.log('Sharp not loaded yet, trying again...');
      await loadSharp();
      
      // Give it a moment to initialize
      if (!sharp) {
        console.log('Still no sharp, waiting 200ms...');
        await new Promise(resolve => setTimeout(resolve, 200));
      }
    }
    
    return !!sharp;
  } catch (error) {
    console.error('Error ensuring sharp loaded:', error);
    return false;
  }
};

// Import the svg2img library for Node.js-based SVG conversion (fallback option)
let svg2img: any;
try {
  svg2img = require('svg2img');
} catch (error) {
  console.warn('svg2img module not available');
}

// Type definitions
interface Candidate {
  organization_id: number;
  position: string;
  name: string;
  symbol: string;
  photo?: string | null;
}

const isDev = process.env.NODE_ENV === 'development';

// --- SQLite Setup ---
const dbPath = path.join(app.getPath('userData'), 'quickballot.db');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');
db.prepare(`
  CREATE TABLE IF NOT EXISTS organizations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    logo TEXT,
    password TEXT NOT NULL,
    recovery_phrase TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS elections (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    status TEXT,
    logo TEXT,
    positions TEXT,
    start_time DATETIME,
    end_time DATETIME,
    type TEXT,
    active_positions TEXT,
    session_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  )
`).run();

db.prepare(`
  CREATE TABLE IF NOT EXISTS voters (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    voter_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  )
`).run();

// Add voter_id column to existing voters table if it doesn't exist
try {
  db.prepare(`
    ALTER TABLE voters ADD COLUMN voter_id TEXT
  `).run();
} catch (error) {
  // Column already exists, ignore the error
  console.log('voter_id column already exists or could not be added');
}

// Create candidates table
db.prepare(`
  CREATE TABLE IF NOT EXISTS candidates (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    organization_id INTEGER NOT NULL,
    position TEXT NOT NULL,
    name TEXT NOT NULL,
    symbol TEXT NOT NULL,
    photo TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  )
`).run();

// Create votes table for storing election results
db.prepare(`
  CREATE TABLE IF NOT EXISTS votes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT,
    election_id INTEGER,
    organization_id INTEGER,
    votes TEXT,
    election_type TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    voter_id TEXT,
    candidate_id TEXT,
    position TEXT,
    FOREIGN KEY (election_id) REFERENCES elections(id) ON DELETE CASCADE,
    FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE
  )
`).run();

// Add missing columns to existing elections table if they don't exist
function addColumnIfNotExists(table: string, column: string, type: string) {
  const info = db.prepare(`PRAGMA table_info(${table})`).all();
  if (!info.some((col: any) => col.name === column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${type}`).run();
  }
}
addColumnIfNotExists('elections', 'logo', 'TEXT');
addColumnIfNotExists('elections', 'positions', 'TEXT');
addColumnIfNotExists('elections', 'start_time', 'DATETIME');
addColumnIfNotExists('elections', 'end_time', 'DATETIME');
addColumnIfNotExists('elections', 'type', 'TEXT');
addColumnIfNotExists('elections', 'active_positions', 'TEXT');
addColumnIfNotExists('elections', 'session_id', 'TEXT');
// Add missing columns to existing votes table if they don't exist
addColumnIfNotExists('votes', 'session_id', 'TEXT');
addColumnIfNotExists('votes', 'election_type', 'TEXT');
addColumnIfNotExists('votes', 'timestamp', 'DATETIME');
addColumnIfNotExists('votes', 'organization_id', 'INTEGER');
addColumnIfNotExists('votes', 'votes', 'TEXT');
addColumnIfNotExists('votes', 'voter_id', 'TEXT');
addColumnIfNotExists('votes', 'candidate_id', 'TEXT');
addColumnIfNotExists('votes', 'position', 'TEXT');

// One-time migration: Make candidate_id, position, and voter_id nullable in votes table
try {
  const tableInfo = db.prepare("PRAGMA table_info(votes)").all();
  const needsMigration = tableInfo.some((col: any) =>
    (col.name === 'candidate_id' && col.notnull === 1) ||
    (col.name === 'position' && col.notnull === 1) ||
    (col.name === 'voter_id' && col.notnull === 1)
  );
  if (needsMigration) {
    db.transaction(() => {
      db.prepare(`CREATE TABLE IF NOT EXISTS votes_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT,
        election_id INTEGER,
        organization_id INTEGER,
        votes TEXT,
        election_type TEXT,
        timestamp DATETIME,
        voter_id TEXT,
        candidate_id TEXT,
        position TEXT
      )`).run();
      db.prepare(`INSERT INTO votes_new (id, session_id, election_id, organization_id, votes, election_type, timestamp, voter_id, candidate_id, position)
        SELECT id, session_id, election_id, organization_id, votes, election_type, timestamp, voter_id, candidate_id, position FROM votes`).run();
      db.prepare('DROP TABLE votes').run();
      db.prepare('ALTER TABLE votes_new RENAME TO votes').run();
    })();
    console.log('Votes table migrated: candidate_id, position, voter_id are now nullable.');
  }
} catch (error) {
  if (typeof error === 'object' && error !== null && 'message' in error) {
    console.log('Votes table migration failed or not needed:', (error as any).message);
  } else {
    console.log('Votes table migration failed or not needed:', error);
  }
}

// --- IPC Handlers for Organizations CRUD ---
ipcMain.handle('get-organizations', () => {
  // Get orgs with election count and ensure logo is always a string
  const orgs = db.prepare(`
    SELECT o.*, 
      COALESCE((SELECT COUNT(*) FROM elections e WHERE e.organization_id = o.id), 0) as electionCount
    FROM organizations o
  `).all();
  return orgs.map((org: any) => ({ ...org, logo: org.logo || '' }));
});

ipcMain.handle('create-organization', (event, org) => {
  // Hash password before storing
  const hashedPassword = bcrypt.hashSync(org.password, 10);
  const stmt = db.prepare('INSERT INTO organizations (name, logo, password, recovery_phrase) VALUES (?, ?, ?, ?)');
  const info = stmt.run(org.name, org.logo, hashedPassword, org.recovery_phrase);
  return { id: info.lastInsertRowid, ...org, password: undefined };
});

ipcMain.handle('update-organization', (event, org) => {
  // Only hash if not already hashed (bcrypt hashes start with $2)
  const passwordToStore = org.password && !org.password.startsWith('$2') ? bcrypt.hashSync(org.password, 10) : org.password;
  db.prepare('UPDATE organizations SET name=?, logo=?, password=?, recovery_phrase=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(org.name, org.logo, passwordToStore, org.recovery_phrase, org.id);
  return { ...org, password: undefined };
});

ipcMain.handle('delete-organization', (event, id) => {
  db.prepare('DELETE FROM organizations WHERE id=?').run(id);
  return id;
});

// --- IPC Handlers for Elections CRUD ---
ipcMain.handle('get-elections', (event, organizationId) => {
  const rows = db.prepare('SELECT * FROM elections WHERE organization_id = ? ORDER BY created_at DESC').all(organizationId);
  // Parse positions and active_positions JSON for each row
  return rows.map((row: any) => ({
    ...row,
    positions: row.positions ? JSON.parse(row.positions) : [],
    active_positions: row.active_positions ? JSON.parse(row.active_positions) : [],
  }));
});
ipcMain.handle('create-election', (event, election) => {
  try {
    // Try the full insert first
    const stmt = db.prepare('INSERT INTO elections (organization_id, name, status, logo, positions, start_time, end_time, type, active_positions, session_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    const info = stmt.run(
      election.organization_id,
      election.name,
      election.status || 'Not Started',
      election.logo || '',
      JSON.stringify(election.positions || []),
      election.start_time || null,
      election.end_time || null,
      election.type || null,
      JSON.stringify(election.active_positions || []),
      election.session_id || null
    );
    return { id: info.lastInsertRowid, ...election, status: election.status || 'Not Started', logo: election.logo || '', positions: election.positions || [], start_time: election.start_time || null, end_time: election.end_time || null, type: election.type || null, active_positions: election.active_positions || [], session_id: election.session_id || null };
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      console.log('Full insert failed, trying minimal insert:', (error as any).message);
    } else {
      console.log('Full insert failed, trying minimal insert:', error);
    }
    const stmt = db.prepare('INSERT INTO elections (organization_id, name, status) VALUES (?, ?, ?)');
    const info = stmt.run(
      election.organization_id,
      election.name,
      election.status || 'Not Started'
    );
    return { id: info.lastInsertRowid, ...election, status: election.status || 'Not Started', logo: '', positions: [], start_time: null, end_time: null, type: null, active_positions: [], session_id: null };
  }
});
ipcMain.handle('update-election', (event, election) => {
  try {
    // Try the full update first
    db.prepare('UPDATE elections SET name=?, status=?, logo=?, positions=?, start_time=?, end_time=?, type=?, active_positions=?, session_id=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(
        election.name,
        election.status,
        election.logo,
        JSON.stringify(election.positions || []),
        election.start_time || null,
        election.end_time || null,
        election.type || null,
        JSON.stringify(election.active_positions || []),
        election.session_id || null,
        election.id
      );
  } catch (error) {
    if (typeof error === 'object' && error !== null && 'message' in error) {
      console.log('Full update failed, trying minimal update:', (error as any).message);
    } else {
      console.log('Full update failed, trying minimal update:', error);
    }
    db.prepare('UPDATE elections SET name=?, status=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
      .run(
        election.name,
        election.status,
        election.id
      );
  }
  return election;
});
ipcMain.handle('delete-election', (event, { orgId, electionId, password }) => {
  // Validate organization password
  const org = db.prepare('SELECT password FROM organizations WHERE id = ?').get(orgId) as { password: string } | undefined;
  if (!org) {
    throw new Error('Organization not found');
  }
  if (!bcrypt.compareSync(password, org.password)) {
    throw new Error('Incorrect password');
  }
  
  // Delete the election
  db.prepare('DELETE FROM elections WHERE id = ? AND organization_id = ?').run(electionId, orgId);
  return electionId;
});

ipcMain.handle('authenticate-admin', (event, { orgId, password }) => {
  const org = db.prepare('SELECT password FROM organizations WHERE id = ?').get(orgId) as { password: string } | undefined;
  if (!org) {
    throw new Error('Organization not found');
  }
  if (!bcrypt.compareSync(password, org.password)) {
    throw new Error('Incorrect password');
  }
  return true; // Authenticated
});

// --- Voter ID Generation Function ---
function generateVoterId(orgName: string, voterName: string, organizationId: number): string {
  // Get first 4 letters of org name, uppercase, remove spaces, pad to 4 chars with 'X'
  const orgPrefix = (orgName.replace(/\s/g, '').toUpperCase().substring(0, 4)).padEnd(4, 'X');
  
  // Get first 4 letters of voter name, uppercase, remove spaces, pad to 4 chars with 'X'
  const voterPrefix = (voterName.replace(/\s/g, '').toUpperCase().substring(0, 4)).padEnd(4, 'X');
  
  // Generate a unique 4-digit random number that's not already used
  let randomNumber: number;
  let attempts = 0;
  const maxAttempts = 100;
  
  do {
    randomNumber = Math.floor(Math.random() * 9000) + 1000; // 1000-9999
    attempts++;
    
    // Check if this number is already used for this org
    const existingVoter = db.prepare('SELECT id FROM voters WHERE organization_id = ? AND voter_id LIKE ?').get(
      organizationId, 
      `${orgPrefix}-${voterPrefix}-${randomNumber}`
    ) as { id: number } | undefined;
    
    if (!existingVoter) {
      break; // Found a unique number
    }
  } while (attempts < maxAttempts);
  
  // If we couldn't find a unique number after max attempts, use timestamp-based fallback
  if (attempts >= maxAttempts) {
    randomNumber = Date.now() % 9000 + 1000;
  }
  
  return `${orgPrefix}-${voterPrefix}-${randomNumber}`;
}

// --- IPC Handler for App Version ---
ipcMain.handle('get-app-version', async (event) => {
  try {
    return app.getVersion();
  } catch (error) {
    console.error('Error reading package.json:', error);
    return '1.0.0'; // fallback version
  }
});

// --- IPC Handlers for Voters CRUD ---
ipcMain.handle('get-voters', (event, organizationId) => {
  return db.prepare('SELECT * FROM voters WHERE organization_id = ? ORDER BY created_at DESC').all(organizationId);
});
ipcMain.handle('create-voter', (event, voter) => {
  // Get organization name for voter ID generation
  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(voter.organization_id) as { name: string } | undefined;
  if (!org) {
    throw new Error('Organization not found');
  }
  
  const voterId = generateVoterId(org.name, voter.name, voter.organization_id);
  const stmt = db.prepare('INSERT INTO voters (organization_id, name, voter_id) VALUES (?, ?, ?)');
  const info = stmt.run(voter.organization_id, voter.name, voterId);
  return { id: info.lastInsertRowid, organization_id: voter.organization_id, name: voter.name, voter_id: voterId };
});
ipcMain.handle('update-voter', (event, voter) => {
  db.prepare('UPDATE voters SET name=?, updated_at=CURRENT_TIMESTAMP WHERE id=?').run(voter.name, voter.id);
  return voter;
});
ipcMain.handle('delete-voter', (event, id) => {
  db.prepare('DELETE FROM voters WHERE id=?').run(id);
  return id;
});
ipcMain.handle('batch-create-voters', (event, { organization_id, names }) => {
  // Get organization name for voter ID generation
  const org = db.prepare('SELECT name FROM organizations WHERE id = ?').get(organization_id) as { name: string } | undefined;
  if (!org) {
    throw new Error('Organization not found');
  }
  
  const stmt = db.prepare('INSERT INTO voters (organization_id, name, voter_id) VALUES (?, ?, ?)');
  const inserted: any[] = [];
  for (const name of names) {
    const voterId = generateVoterId(org.name, name, organization_id);
    const info = stmt.run(organization_id, name, voterId);
    inserted.push({ id: info.lastInsertRowid, organization_id, name, voter_id: voterId });
  }
  return inserted;
});

// --- IPC Handlers for Candidates CRUD ---
ipcMain.handle('get-candidates', (event, { organizationId, position }) => {
  return db.prepare('SELECT * FROM candidates WHERE organization_id = ? AND position = ? ORDER BY created_at DESC').all(organizationId, position);
});

ipcMain.handle('create-candidate', (event, candidate: Candidate) => {
  // Enforce max 10 candidates per position
  const countResult: any = db.prepare('SELECT COUNT(*) as cnt FROM candidates WHERE organization_id = ? AND position = ?').get(candidate.organization_id, candidate.position);
  const count = countResult.cnt;
  if (count >= 10) {
    throw new Error('Maximum of 10 candidates allowed per position.');
  }
  const stmt = db.prepare('INSERT INTO candidates (organization_id, position, name, symbol, photo) VALUES (?, ?, ?, ?, ?)');
  const info = stmt.run(candidate.organization_id, candidate.position, candidate.name, candidate.symbol, candidate.photo || null);
  return { 
    id: info.lastInsertRowid, 
    organization_id: candidate.organization_id, 
    position: candidate.position,
    name: candidate.name, 
    symbol: candidate.symbol, 
    photo: candidate.photo || null 
  };
});

ipcMain.handle('update-candidate', (event, candidate) => {
  db.prepare('UPDATE candidates SET name=?, symbol=?, photo=?, position=?, updated_at=CURRENT_TIMESTAMP WHERE id=?')
    .run(candidate.name, candidate.symbol, candidate.photo, candidate.position, candidate.id);
  return candidate;
});

ipcMain.handle('delete-candidate', (event, id) => {
  db.prepare('DELETE FROM candidates WHERE id=?').run(id);
  return id;
});

ipcMain.handle('batch-create-candidates', (event, { organization_id, position, candidates }: { organization_id: number, position: string, candidates: Candidate[] }) => {
  // Enforce max 10 candidates per position
  const countResult: any = db.prepare('SELECT COUNT(*) as cnt FROM candidates WHERE organization_id = ? AND position = ?').get(organization_id, position);
  const count = countResult.cnt;
  if (count + candidates.length > 10) {
    throw new Error('Import would exceed the 10 candidate limit per position. Please reduce the number of candidates.');
  }
  const stmt = db.prepare('INSERT INTO candidates (organization_id, position, name, symbol, photo) VALUES (?, ?, ?, ?, ?)');
  const inserted: any[] = [];
  for (const candidate of candidates) {
    const info = stmt.run(organization_id, position, candidate.name, candidate.symbol, candidate.photo || null);
    inserted.push({ 
      id: info.lastInsertRowid, 
      organization_id, 
      position,
      name: candidate.name, 
      symbol: candidate.symbol, 
      photo: candidate.photo || null 
    });
  }
  return inserted;
});

// --- IPC Handler for Votes ---
ipcMain.handle('save-votes', (event, voteData) => {
  // Provide a dummy voter_id and candidate_id for direct voting if not present
  const voterId = voteData.voter_id || 'DIRECT';
  const candidateId = voteData.candidate_id || 'DIRECT';
  const position = voteData.position || '';
  const stmt = db.prepare('INSERT INTO votes (session_id, election_id, organization_id, votes, election_type, timestamp, voter_id, candidate_id, position) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(
    voteData.sessionId,
    voteData.electionId,
    voteData.orgId,
    JSON.stringify(voteData.votes),
    voteData.electionType,
    voteData.timestamp || new Date().toISOString(),
    voterId,
    candidateId,
    position
  );
  return { id: info.lastInsertRowid, ...voteData };
});

ipcMain.handle('get-votes', (event, { electionId, sessionId }) => {
  if (sessionId && electionId) {
    // Get all votes for the specific session and election
    return db.prepare('SELECT * FROM votes WHERE session_id = ? AND election_id = ?').all(sessionId, electionId);
  } else if (sessionId) {
    // Get all votes for the specific session
    return db.prepare('SELECT * FROM votes WHERE session_id = ?').all(sessionId);
  } else {
    // Get all votes for an election
    return db.prepare('SELECT * FROM votes WHERE election_id = ? ORDER BY timestamp DESC').all(electionId);
  }
});

ipcMain.handle('clear-election-votes', (event, { electionId }) => {
  const stmt = db.prepare('DELETE FROM votes WHERE election_id = ?');
  stmt.run(electionId);
  return true;
});

// --- Voting Fullscreen Window Handler ---
let votingWindow: BrowserWindow | null = null;
ipcMain.handle('open-voting-window', async (event, { orgId, electionId, sessionId, type }) => {
  console.log('Opening voting window', { orgId, electionId, sessionId, type });
  if (votingWindow && !votingWindow.isDestroyed()) {
    votingWindow.focus();
    return;
  }
  votingWindow = new BrowserWindow({
    fullscreen: true,
    alwaysOnTop: true,
    frame: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    show: false,
    skipTaskbar: true,
    backgroundColor: '#1a2038',
    fullscreenable: true,
    closable: false,
    minimizable: false,
    maximizable: false,
  });
  // Prevent closing/minimizing except via IPC
  votingWindow.on('close', (e) => {
    if (!(votingWindow as any)._forceClose) {
      e.preventDefault();
      votingWindow?.focus();
    }
  });
  // Load the voting route (hash or query params)
  const votingUrl = isDev
    ? `http://localhost:5177/#/voting?orgId=${orgId}&electionId=${electionId}&sessionId=${sessionId}&type=${type}`
    : `file://${path.join(__dirname, '../dist/index.html')}#/voting?orgId=${orgId}&electionId=${electionId}&sessionId=${sessionId}&type=${type}`;
  await votingWindow.loadURL(votingUrl);
  votingWindow.once('ready-to-show', () => {
    if (votingWindow) {
      votingWindow.setFullScreen(true);
      votingWindow.show();
      votingWindow.focus();
    }
  });
});
ipcMain.handle('close-voting-window', () => {
  console.log('close-voting-window IPC received');
  if (votingWindow && !votingWindow.isDestroyed()) {
    (votingWindow as any)._forceClose = true;
    votingWindow.close();
    votingWindow.destroy();
    votingWindow = null;
  }
});

// --- SVG Conversion IPC Handler ---
// Handle SVG to image conversion using sharp for higher quality
ipcMain.handle('convert-svg-to-image', async (event, args) => {
  const { svgDataUrl, outputFormat = 'jpeg', size = 512, quality = 0.95 } = args;
  
  try {
    // Validate input
    if (!svgDataUrl || typeof svgDataUrl !== 'string') {
      throw new Error('Invalid SVG data URL provided');
    }
    
    // Extract the base64 part of the data URL
    const base64Data = svgDataUrl.replace(/^data:image\/svg\+xml;base64,/, '');
    
    // Convert base64 to string
    const svgString = Buffer.from(base64Data, 'base64').toString('utf-8');
    
    // Ensure sharp is loaded before proceeding
    console.log('Ensuring sharp is loaded...');
    const sharpAvailable = await ensureSharpLoaded();
    console.log('Sharp availability after ensure:', sharpAvailable);
    
    // Try to use sharp for higher quality conversion
    console.log('Checking for sharp availability:', !!sharp);
    if (sharp) {
      console.log('Converting SVG using sharp:', { outputFormat, size, quality });
      
      // Use sharp with high density for better quality
      // Set density to 300 DPI for high quality output
      const density = 300;
      
      // Create sharp instance with SVG input and high density
      // Ensure transparent background is preserved
      const sharpInstance = sharp(Buffer.from(svgString), { density, background: { r: 255, g: 255, b: 255, alpha: 0 } });
      
      // Resize to the desired size while maintaining aspect ratio
      // Increase the size for better quality in PDF
      sharpInstance.resize(size * 4);
      
      // Set output format and quality
      if (outputFormat === 'jpeg') {
        sharpInstance.jpeg({ quality: Math.round(quality * 100) });
      } else {
        sharpInstance.png();
      }
      
      // Convert to buffer
      const buffer = await sharpInstance.toBuffer();
      
      // Convert the buffer to a data URL
      const mimeType = outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
      const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
      console.log('SVG conversion successful with sharp, data URL length:', dataUrl.length);
      
      return dataUrl;
    } 
    // If sharp is not available, continue without conversion
    else {
      console.log('Sharp not available, continuing without SVG conversion');
      // Return the original SVG data URL
      return svgDataUrl;
    }
  } catch (error) {
    console.error('SVG conversion failed:', error);
    // Continue without conversion on error
    return svgDataUrl;
  }
});

// --- Test SVG Conversion ---
ipcMain.handle('test-svg-conversion', async () => {
  console.log('Testing SVG conversion with sharp...');
  
  // Simple test SVG
  const testSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
    <circle cx="50" cy="50" r="40" stroke="black" stroke-width="3" fill="red" />
    <text x="50" y="55" text-anchor="middle" fill="white" font-family="Arial" font-size="20">Test</text>
  </svg>`;
  
  // Convert to data URL
  const svgDataUrl = `data:image/svg+xml;base64,${Buffer.from(testSvg).toString('base64')}`;
  
  try {
    // Create a mock event object
    const mockEvent = {} as any;
    
    // Call the actual handler function directly
    const result = await (async (event: any, args: any) => {
      const { svgDataUrl, outputFormat = 'jpeg', size = 128, quality = 0.95 } = args;
      
      try {
        // Validate input
        if (!svgDataUrl || typeof svgDataUrl !== 'string') {
          throw new Error('Invalid SVG data URL provided');
        }
        
        // Extract the base64 part of the data URL
        const base64Data = svgDataUrl.replace(/^data:image\/svg\+xml;base64,/, '');
        
        // Convert base64 to string
        const svgString = Buffer.from(base64Data, 'base64').toString('utf-8');
        
        // Ensure sharp is loaded before proceeding
        console.log('Ensuring sharp is loaded for test...');
        const sharpAvailable = await ensureSharpLoaded();
        console.log('Sharp availability for test:', sharpAvailable);
        
        // Try to use sharp for higher quality conversion
        console.log('Checking for sharp availability in test:', !!sharp);
        if (sharp) {
          try {
            console.log('Using sharp for SVG conversion with size:', size, 'format:', outputFormat);
            
            // Create sharp instance with SVG buffer and set density for higher quality (300 DPI)
            // Ensure transparent background is preserved
            const density = 300;
            const sharpInstance = sharp(Buffer.from(svgString), { density, background: { r: 255, g: 255, b: 255, alpha: 0 } });
            
            // Apply resize with multiplier for better quality
            const resizeMultiplier = 4; // Increased from 2 to 4 for better quality
            sharpInstance.resize(size * resizeMultiplier);
            
            // Set output format and quality
            if (outputFormat === 'jpeg') {
              sharpInstance.jpeg({ quality: Math.round(quality * 100) });
            } else {
              sharpInstance.png();
            }
            
            // Convert to buffer
            const buffer = await sharpInstance.toBuffer();
            
            // Convert to data URL
            const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${buffer.toString('base64')}`;
            
            console.log('Sharp conversion successful, data URL length:', dataUrl.length);
            return dataUrl;
          } catch (sharpError) {
            console.error('Sharp conversion failed:', sharpError);
          }
        }
        
        // Fallback to svg2img if sharp is not available or failed
        console.log('Falling back to svg2img for SVG conversion');
        if (svg2img) {
          try {
            // Set up conversion options with transparency support
            const options: any = {
              format: outputFormat === 'jpeg' ? 'jpg' : outputFormat,
              resvg: {
                fitTo: {
                  mode: 'width',
                  value: size
                },
                // Preserve transparency by explicitly setting a transparent background
                background: 'transparent'
              }
            };
            
            if (outputFormat !== 'jpeg' && quality !== undefined) {
              // Quality is only applicable for JPEG format
              options.quality = quality;
            }
            
            // Convert the SVG to the desired format using svg2img
            const buffer = await new Promise((resolve, reject) => {
              svg2img(svgString, options, (error: any, buffer: any) => {
                if (error) {
                  reject(error);
                  return;
                }
                resolve(buffer);
              });
            });
            
            // Convert to data URL
            const mimeType = outputFormat === 'png' ? 'image/png' : 'image/jpeg';
            const dataUrl = `data:${mimeType};base64,${(buffer as Buffer).toString('base64')}`;
            
            console.log('svg2img conversion successful, data URL length:', dataUrl.length);
            return dataUrl;
          } catch (svg2imgError) {
            console.error('svg2img conversion failed:', svg2imgError);
          }
        }
        
        throw new Error('No SVG conversion method available');
      } catch (error) {
        console.error('SVG conversion failed:', error);
        throw error;
      }
    })(mockEvent, {
      svgDataUrl,
      outputFormat: 'jpeg',
      size: 128,
      quality: 0.95
    });
    
    console.log('Test SVG conversion result length:', result ? (result as string).length : 0);
    console.log('Test SVG conversion successful:', !!result);
    return { success: !!result, dataUrlLength: result ? (result as string).length : 0 };
  } catch (error) {
    console.error('Test SVG conversion failed:', error);
    return { error: error.message };
  }
});

// --- Update Check, Download, and Install ---
const LATEST_RELEASE_API = 'https://api.github.com/repos/AkshayAnuOnline/QuickBallotBuild/releases/latest';

ipcMain.handle('check-for-update', async (event, currentVersion: string, platform: string) => {
  return new Promise((resolve, reject) => {
    https.get(LATEST_RELEASE_API, { headers: { 'User-Agent': 'QuickBallot' } }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          const latestTag: string | undefined = json.tag_name || json.name;
          if (latestTag) {
            const latestVersion = latestTag.startsWith('v') ? latestTag.slice(1) : latestTag;
            if (latestVersion !== currentVersion) {
              resolve({ updateAvailable: true, version: latestVersion });
              return;
            }
          }
          resolve({ updateAvailable: false });
        } catch (e) {
          if (typeof e === 'object' && e !== null && 'message' in (e as any)) {
            console.error('Update check error:', (e as any).message);
          }
          resolve({ updateAvailable: false });
        }
      });
    }).on('error', (err) => {
      if (typeof err === 'object' && err !== null && 'message' in (err as any)) {
        console.error('Update check error:', (err as any).message);
      }
      resolve({ updateAvailable: false });
    });
  });
});

ipcMain.handle('open-website', async (event, url: string) => {
  await shell.openExternal(url);
  return true;
});

// --- Camera Permission Handlers ---
// Add these after the existing IPC handlers
async function requestCameraPermission(): Promise<boolean> {
  try {
    // Check if we're on macOS
    if (process.platform === 'darwin') {
      const cameraStatus = systemPreferences.getMediaAccessStatus('camera');
      
      if (cameraStatus === 'granted') {
        return true;
      }
      
      // Request camera access on macOS
      const granted = await systemPreferences.askForMediaAccess('camera');
      return granted === true;
    }
    
    // For Windows and Linux, permissions are typically handled by the OS
    // and the browser will prompt the user when needed
    return true;
  } catch (error: any) {
    console.error('Error requesting camera permission:', error);
    // On error, we'll let the browser handle the permission request
    return true;
  }
}

// Add IPC handler for permission requests
ipcMain.handle('request-camera-permission', async () => {
  return await requestCameraPermission();
});

// Add IPC handler to open system settings for permissions
ipcMain.handle('open-permission-settings', async () => {
  try {
    if (process.platform === 'darwin') {
      // Open macOS privacy settings for camera
      shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Camera');
    } else if (process.platform === 'win32') {
      // Open Windows privacy settings for camera
      shell.openExternal('ms-settings:privacy-webcam');
    } else {
      // For Linux, we can't directly open settings, but we can open a help page
      shell.openExternal('https://help.ubuntu.com/community/Webcam');
    }
    return true;
  } catch (error: any) {
    console.error('Error opening permission settings:', error);
    return false;
  }
});

// --- Existing Electron Window Code ---

async function createWindow(): Promise<void> {
  // Determine icon path based on platform
  const iconPath = process.platform === 'win32' 
    ? path.join(__dirname, '../assets/icon.ico')
    : process.platform === 'darwin'
    ? path.join(__dirname, '../assets/icon.icns')
    : path.join(__dirname, '../assets/icon.png');
  
  console.log('Platform:', process.platform);
  console.log('Icon path:', iconPath);
  console.log('Icon exists:', require('fs').existsSync(iconPath));
  console.log('Creating main window...');
  // Read version from package.json
  const appVersion = app.getVersion();
  
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    icon: iconPath,
    title: `QuickBallot v${appVersion}`,
    titleBarStyle: 'default',
    show: true, // Force window to show immediately
    center: true
  })
  mainWindow.center();
  mainWindow.show();
  mainWindow.focus();
  console.log('Main window created and shown.');

  // Load the app
  if (isDev) {
    try {
      await mainWindow.loadURL('http://localhost:5177');
      mainWindow.webContents.openDevTools()
      // Install React DevTools in development
      try {
        await installExtension(REACT_DEVELOPER_TOOLS)
        console.log('React DevTools installed successfully')
      } catch (e: unknown) {
        if (typeof e === 'object' && e !== null && 'message' in e) {
          console.log('React DevTools installation failed:', (e as any).message);
        } else {
          console.log('React DevTools installation failed:', String(e));
        }
      }
    } catch (error: unknown) {
      if (typeof error === 'object' && error !== null && 'message' in error) {
        console.error('Failed to load dev server:', (error as any).message);
      } else {
        console.error('Failed to load dev server:', String(error));
      }
      // Show window even if dev server fails to load
      mainWindow.show()
    }
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  // Show window when ready
  mainWindow.once('ready-to-show', () => {
    console.log('Main window ready to show.');
    mainWindow.show()
    mainWindow.focus()
  })

  // Also show window if it takes too long to load
  setTimeout(() => {
    if (!mainWindow.isVisible()) {
      console.log('Forcing main window to show after timeout.');
      mainWindow.show()
      mainWindow.focus()
    }
  }, 3000)

  // Handle window closed
  mainWindow.on('closed', () => {
    // Dereference the window object
    console.log('Main window closed.');
  })
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
app.whenReady().then(() => {
  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here. 