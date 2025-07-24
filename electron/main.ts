import { app, BrowserWindow, Menu, ipcMain, shell } from 'electron';
import * as path from 'path';
import { installExtension, REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';
import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import { spawn } from 'child_process';
import * as https from 'https';
import * as fs from 'fs';

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
    session_id TEXT NOT NULL,
    election_id INTEGER NOT NULL,
    organization_id INTEGER NOT NULL,
    votes TEXT NOT NULL,
    election_type TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
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

ipcMain.handle('create-candidate', (event, candidate) => {
  // Enforce max 10 candidates per position
  const count = db.prepare('SELECT COUNT(*) as cnt FROM candidates WHERE organization_id = ? AND position = ?').get(candidate.organization_id, candidate.position).cnt;
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

ipcMain.handle('batch-create-candidates', (event, { organization_id, position, candidates }) => {
  // Enforce max 10 candidates per position
  const count = db.prepare('SELECT COUNT(*) as cnt FROM candidates WHERE organization_id = ? AND position = ?').get(organization_id, position).cnt;
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
  const stmt = db.prepare('INSERT INTO votes (session_id, election_id, organization_id, votes, election_type, timestamp, voter_id, candidate_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)');
  const info = stmt.run(
    voteData.sessionId,
    voteData.electionId,
    voteData.orgId,
    JSON.stringify(voteData.votes),
    voteData.electionType,
    voteData.timestamp || new Date().toISOString(),
    voterId,
    candidateId
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
    ? `http://localhost:5177/voting?orgId=${orgId}&electionId=${electionId}&sessionId=${sessionId}&type=${type}`
    : `file://${path.join(__dirname, '../dist/index.html')}#/voting?orgId=${orgId}&electionId=${electionId}&sessionId=${sessionId}&type=${type}`;
  await votingWindow.loadURL(votingUrl);
  votingWindow.once('ready-to-show', () => {
    votingWindow?.show();
    votingWindow?.focus();
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
ipcMain.handle('convert-svg-to-image', async (event, { svgDataUrl, outputFormat, size, quality }) => {
  return new Promise((resolve, reject) => {
    try {
      // Get the path to the Python script
      const scriptPath = path.join(__dirname, '../svg_converter.py');
      const pythonPath = path.join(__dirname, '../venv/bin/python');
      
      // Prepare command line arguments
      const args = [scriptPath, svgDataUrl, outputFormat, size.toString()];
      if (quality !== undefined) {
        args.push(quality.toString());
      }
      
      console.log('Running SVG conversion:', { scriptPath, pythonPath, args });
      
      // Spawn the Python process
      const pythonProcess = spawn(pythonPath, args, {
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      let stdout = '';
      let stderr = '';
      
      pythonProcess.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      pythonProcess.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      pythonProcess.on('close', (code) => {
        if (code === 0) {
          try {
            const result = JSON.parse(stdout);
            if (result.success && result.data_url) {
              // Validate the data URL format
              if (result.data_url.startsWith('data:image/')) {
                console.log('SVG conversion successful, data URL length:', result.data_url.length);
                resolve(result.data_url);
              } else {
                reject(new Error('Invalid data URL format returned'));
              }
            } else {
              reject(new Error(result.error || 'Conversion failed'));
            }
          } catch (parseError) {
            console.error('Failed to parse Python output:', stdout);
            reject(new Error('Failed to parse Python output'));
          }
        } else {
          console.error('Python process failed:', { code, stderr, stdout });
          reject(new Error(`Python process failed with code ${code}: ${stderr}`));
        }
      });
      
      pythonProcess.on('error', (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
      
    } catch (error) {
      reject(new Error(`SVG conversion setup failed: ${error}`));
    }
  });
});

// --- Update Check, Download, and Install ---
const LATEST_JSON_URL = 'https://github.com/AkshayAnuOnline/quikballot/releases/download/v1.0.0/latest.json'; // Update this for each release
const DOWNLOAD_DIR = app.getPath('temp');

ipcMain.handle('check-for-update', async (event, currentVersion: string, platform: string) => {
  return new Promise((resolve, reject) => {
    https.get(LATEST_JSON_URL, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.version && json.version !== currentVersion) {
            let url = '';
            if (platform === 'darwin') url = json.mac;
            else if (platform === 'win32') url = json.win;
            else if (platform === 'linux') url = json.linux;
            resolve({ updateAvailable: true, version: json.version, url });
          } else {
            resolve({ updateAvailable: false });
          }
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

ipcMain.handle('download-update', async (event, url: string) => {
  return new Promise((resolve, reject) => {
    const fileName = url.split('/').pop() || 'update';
    const filePath = path.join(DOWNLOAD_DIR, fileName);
    const file = fs.createWriteStream(filePath);
    https.get(url, (res) => {
      res.pipe(file);
      file.on('finish', () => {
        file.close(() => resolve({ filePath }));
      });
    }).on('error', (err) => {
      fs.unlink(filePath, () => {});
      if (typeof err === 'object' && err !== null && 'message' in (err as any)) {
        console.error('Download update error:', (err as any).message);
      }
      reject(err);
    });
  });
});

ipcMain.handle('open-installer', async (event, filePath: string) => {
  await shell.openPath(filePath);
  return true;
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