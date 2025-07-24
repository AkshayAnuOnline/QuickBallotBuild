import React, { useState, useMemo } from 'react';

const helpTopics = [
  {
    title: 'Getting Started',
    content: `
      <h3>Quick Start Guide</h3>
      <p><strong>1. Create Organization</strong></p>
      <ul>
        <li>Click "Create New Organization" on homepage</li>
        <li>Enter organization name, password, and recovery phrase</li>
        <li>Optionally add a logo</li>
      </ul>
      
      <p><strong>2. Access Organization</strong></p>
      <ul>
        <li>Click on organization card</li>
        <li>Enter password to access dashboard</li>
      </ul>
      
      <p><strong>3. Create Election</strong></p>
      <ul>
        <li>Click "Add Election" in organization dashboard</li>
        <li>Set election name, positions, and type</li>
        <li>Choose from Direct, QR-based, or Voter ID-based</li>
      </ul>
      
      <p><strong>4. Add Voters & Candidates</strong></p>
      <ul>
        <li>Use Voter Management to add voters</li>
        <li>Navigate to election → positions → add candidates</li>
      </ul>
    `
  },
  {
    title: 'Organization Management',
    content: `
      <h3>Managing Your Organization</h3>
      
      <p><strong>Organization Dashboard</strong></p>
      <ul>
        <li>View all elections in grid layout</li>
        <li>Access voter management tools</li>
        <li>Generate voter slips</li>
        <li>Configure organization settings</li>
      </ul>
      
      <p><strong>Organization Settings</strong></p>
      <ul>
        <li>Edit organization name and logo</li>
        <li>Change password (requires current password)</li>
        <li>Delete organization (password confirmation required)</li>
      </ul>
      
      <p><strong>Security Features</strong></p>
      <ul>
        <li>Password protection for all organizations</li>
        <li>Recovery phrase system for password reset</li>
        <li>Show/hide password toggles for secure input</li>
      </ul>
    `
  },
  {
    title: 'Voter Management',
    content: `
      <h3>Managing Voters</h3>
      
      <p><strong>Adding Voters</strong></p>
      <ul>
        <li>Individual addition with name validation</li>
        <li>Automatic voter ID generation</li>
        <li>Duplicate name checking</li>
      </ul>
      
      <p><strong>Bulk Operations</strong></p>
      <ul>
        <li>Import voters from Excel/CSV files</li>
        <li>Export voter data to Excel</li>
        <li>Bulk delete selected voters</li>
        <li>Download import templates</li>
      </ul>
      
      <p><strong>Voter Data</strong></p>
      <ul>
        <li>Search and filter voters</li>
        <li>Edit voter information</li>
      </ul>
    `
  },
  {
    title: 'Election Management',
    content: `
      <h3>Managing Elections</h3>
      
      <p><strong>Creating Elections</strong></p>
      <ul>
        <li>Set election name and logo</li>
        <li>Define positions (e.g., President, Secretary)</li>
        <li>Choose election type: Direct, QR-based, or Voter ID-based</li>
      </ul>
      
      <p><strong>Election Types</strong></p>
      <ul>
        <li><strong>Direct:</strong> In-person voting with immediate access</li>
        <li><strong>QR-based:</strong> Voters scan QR codes from slips</li>
        <li><strong>Voter ID-based:</strong> Manual voter ID entry</li>
      </ul>
      
      <p><strong>Election Control</strong></p>
      <ul>
        <li>Start election (password protected)</li>
        <li>Pause/Resume active elections</li>
        <li>End election (password protected)</li>
        <li>Reconduct completed elections</li>
      </ul>
    `
  },
  {
    title: 'Candidate Management',
    content: `
      <h3>Managing Candidates</h3>
      
      <p><strong>Adding Candidates</strong></p>
      <ul>
        <li>Assign candidates to specific positions</li>
        <li>Upload candidate photos (PNG, JPG, SVG, WEBP)</li>
        <li>Upload election symbols</li>
        <li>Automatic candidate ID generation</li>
      </ul>
      
      <p><strong>Position Organization</strong></p>
      <ul>
        <li>View candidates by position</li>
        <li>Position-specific candidate counts</li>
        <li>Easy navigation between positions</li>
      </ul>
      
      <p><strong>Media Management</strong></p>
      <ul>
        <li>Preview uploaded photos and symbols</li>
        <li>Automatic image resizing</li>
        <li>Support for multiple image formats</li>
      </ul>
    `
  },
  {
    title: 'Voting Process',
    content: `
      <h3>How Voting Works</h3>
      
      <p><strong>Direct Voting</strong></p>
      <ul>
        <li>Voters access voting window directly</li>
        <li>Vote position by position</li>
        <li>Select candidates and confirm votes</li>
        <li>Admin can pause/resume/end voting</li>
      </ul>
      
      <p><strong>QR-based Voting</strong></p>
      <ul>
        <li>Voters scan QR codes from their slips</li>
        <li>Automatic voter verification</li>
        <li>Prevents duplicate voting</li>
        <li>Same voting interface as direct</li>
      </ul>
      
      <p><strong>Voter ID-based Voting</strong></p>
      <ul>
        <li>Voters enter their voter ID manually</li>
        <li>System validates voter ID</li>
        <li>Access control and verification</li>
        <li>Standard voting interface</li>
      </ul>
      
      <p><strong>Security Features</strong></p>
      <ul>
        <li>Password protection for admin actions</li>
        <li>Session management</li>
        <li>Vote integrity verification</li>
        <li>Duplicate vote prevention</li>
      </ul>
    `
  },
  {
    title: 'Voter Slips',
    content: `
      <h3>Voter Slip Generation</h3>
      
      <p><strong>Generating Slips</strong></p>
      <ul>
        <li>Create QR codes for each voter</li>
        <li>High error correction (Level H) for reliability</li>
        <li>Include organization and voter information</li>
        <li>Secure encoding for voter verification</li>
      </ul>
      
      <p><strong>Output Options</strong></p>
      <ul>
        <li>Print slips directly</li>
        <li>Save as PDF for later printing</li>
        <li>Batch processing for multiple voters</li>
      </ul>
      
      <p><strong>Slip Information</strong></p>
      <ul>
        <li>Voter name and ID</li>
        <li>Organization details</li>
        <li>Election information</li>
        <li>Unique QR code for each voter</li>
      </ul>
    `
  },
  {
    title: 'Election Results',
    content: `
      <h3>Viewing Results</h3>
      
      <p><strong>Results Display</strong></p>
      <ul>
        <li>Total votes cast per position</li>
        <li>Individual candidate performance</li>
        <li>Interactive bar charts</li>
        <li>Vote distribution visualization</li>
      </ul>
      
      <p><strong>Voter Participation</strong></p>
      <ul>
        <li>Voter turnout statistics</li>
        <li>Individual voter status</li>
        <li>Participation reports</li>
        <li>Session-wise vote counts</li>
      </ul>
      
      <p><strong>Export & Management</strong></p>
      <ul>
        <li>Generate PDF reports</li>
        <li>Detailed vote breakdown</li>
        <li>Professional formatting</li>
        <li>Clear results (password protected)</li>
      </ul>
    `
  },
  {
    title: 'Troubleshooting',
    content: `
      <h3>Common Issues & Solutions</h3>
      
      <p><strong>QR Code Issues</strong></p>
      <ul>
        <li>Ensure good lighting for scanning</li>
        <li>Hold QR code steady in camera view</li>
        <li>Check if QR code is damaged or unclear</li>
        <li>Try adjusting camera distance</li>
      </ul>
      
      <p><strong>Password Problems</strong></p>
      <ul>
        <li>Use recovery phrase if password forgotten</li>
        <li>Check caps lock and keyboard layout</li>
        <li>Ensure no extra spaces in password</li>
        <li>Contact admin if recovery phrase lost</li>
      </ul>
      
      <p><strong>Import/Export Issues</strong></p>
      <ul>
        <li>Use provided Excel templates</li>
        <li>Check file format (Excel/CSV)</li>
        <li>Ensure column headers match template</li>
        <li>Verify no special characters in names</li>
      </ul>
      
      <p><strong>Voting Problems</strong></p>
      <ul>
        <li>Ensure election is active</li>
        <li>Check if voter ID is correct</li>
        <li>Verify QR code is for current election</li>
        <li>Contact admin for technical issues</li>
      </ul>
    `
  },
  {
    title: 'FAQ',
    content: '', // We'll render FAQ dynamically below
    isFAQ: true
  }
];

// Replace highlightText with a version that highlights only text nodes in HTML
function highlightHtml(html: string, query: string): string {
  if (!query.trim()) return html;
  const safeQuery = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const regex = new RegExp(safeQuery, 'gi');
  const parser = new window.DOMParser();
  const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
  function walk(node: Node) {
    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      let match;
      let text = node.textContent;
      let lastIndex = 0;
      const parent = node.parentNode;
      if (!parent) return;
      const frag = document.createDocumentFragment();
      regex.lastIndex = 0;
      let hasMatch = false;
      while ((match = regex.exec(text)) !== null) {
        hasMatch = true;
        if (match.index > lastIndex) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
        }
        const mark = document.createElement('mark');
        mark.style.background = '#ffe066';
        mark.style.color = '#222';
        mark.style.padding = '0 2px';
        mark.style.borderRadius = '3px';
        mark.textContent = match[0];
        frag.appendChild(mark);
        lastIndex = match.index + match[0].length;
      }
      if (hasMatch) {
        if (lastIndex < text.length) {
          frag.appendChild(document.createTextNode(text.slice(lastIndex)));
        }
        parent.replaceChild(frag, node);
      }
    } else if (node.nodeType === Node.ELEMENT_NODE) {
      Array.from(node.childNodes).forEach(walk);
    }
  }
  walk(doc.body);
  return doc.body.innerHTML;
}

const QuickBallotOverview = () => (
  <section style={{ marginBottom: 32 }}>
    <h2 style={{ fontWeight: 800, fontSize: 26, marginBottom: 10, color: '#fff' }}>QuickBallot Overview</h2>
    <div style={{ color: '#b0b8ff', fontSize: 16, marginBottom: 18 }}>
      QuickBallot is organized around <b>Organizations</b>, which manage <b>Voters</b> and <b>Elections</b>. Each Election contains <b>Positions</b>, and each Position has <b>Candidates</b>. Elections can be of different types (Direct, QR-based, Voter ID-based). The diagram below shows how these parts fit together.
    </div>
    <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
      <img 
        src="/assets/Block-Diagram.png" 
        alt="QuickBallot Block Diagram" 
        style={{ 
          maxWidth: '100%', 
          height: 'auto'
        }} 
      />
    </div>
  </section>
);

const FAQ_QUESTIONS = [
  {
    q: 'Does QuickBallot require an internet connection?',
    a: `<ul><li>No, QuickBallot works entirely offline</li><li>You do not need internet to use any feature</li><li>All data is stored locally on your device</li></ul>`
  },
  {
    q: 'Does QuickBallot connect to the cloud or any external server?',
    a: `<ul><li>No, QuickBallot does not connect to any cloud or external server</li><li>Your data never leaves your device</li><li>There is no remote backup or sync</li></ul>`
  },
  {
    q: 'Can my data be deleted or lost?',
    a: `<ul><li>Your data is stored locally and is not deleted unless you remove it</li><li>Deleting an organization or election will permanently remove its data</li></ul>`
  },
  {
    q: 'Is my data private and secure?',
    a: `<ul><li>Yes, all data is private to your device</li><li>No one else can access your data unless they have access to your computer</li><li>Passwords and recovery phrases protect your organizations</li></ul>`
  },
  {
    q: 'Can I pause and resume an election to conduct it over multiple days?',
    a: `<ul><li>Yes, you can pause an election at any time</li><li>All votes are saved securely</li><li>Resume the election whenever you're ready</li><li>No data loss between sessions</li></ul>`
  },
  {
    q: 'Will my data be safe if I close the app?',
    a: `<ul><li>Yes, all data is saved locally and securely</li><li>Nothing is lost when closing the app</li><li>You can continue from where you left off</li></ul>`
  },
  {
    q: 'Can I modify positions after creating an election?',
    a: `<ul><li>Yes, positions can be added or removed</li><li>Changes allowed until election starts</li><li>Cannot modify during active voting</li></ul>`
  },
  {
    q: 'What happens if a voter loses their QR slip?',
    a: `<ul><li>Admin can regenerate voter slip</li></ul>`
  },
  {
    q: 'Can I export election results?',
    a: `<ul><li>Yes, results can be exported as PDF</li><li>Includes detailed vote breakdown</li></ul>`
  },
  {
    q: 'What if I need to reconduct an election?',
    a: `<ul><li>Use the reconduct feature</li><li>Previous results are preserved</li><li>Start fresh voting session</li></ul>`
  },
  {
    q: 'What should I do if I forget my password? How can I recover it?',
    a: `<ul>
      <li>Use the “Forgot password?” option on the password screen when trying to access the organization.</li>
      <li>Enter your recovery phrase when prompted.</li>
      <li>Set a new password for your organization.</li>
      <li><b>Note:</b> If you’ve lost your recovery phrase, you will not be able to reset the password for security reasons.</li>
    </ul>`
  }
];

const FAQAccordion = ({ search }: { search: string }) => {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  // Filter and highlight if searching
  const filtered = useMemo(() => {
    if (!search.trim()) return FAQ_QUESTIONS.map((q, i) => ({ ...q, idx: i }));
    const q = search.trim().toLowerCase();
    return FAQ_QUESTIONS
      .map((item, i) => {
        const questionMatch = item.q.toLowerCase().includes(q);
        const answerMatch = item.a.replace(/<[^>]+>/g, '').toLowerCase().includes(q);
        return { ...item, idx: i, match: questionMatch || answerMatch };
      })
      .filter(item => item.match);
  }, [search]);
  if (filtered.length === 0) return <div style={{ color: '#ffb0b0', fontSize: 16, margin: '18px 0', fontWeight: 600 }}>No related keywords found.</div>;
  return (
    <div style={{ margin: '36px 0 0 0' }}>
      {/* Divider */}
      <div style={{
        width: '100%',
        borderTop: '3px solid #4f8cff',
        margin: '0 0 24px 0',
        position: 'relative',
        textAlign: 'center',
      }}>
        <span style={{
          position: 'relative',
          top: -18,
          background: '#232427',
          color: '#4f8cff',
          fontWeight: 800,
          fontSize: 18,
          padding: '0 18px',
          letterSpacing: 1,
        }}>
          FAQ
        </span>
      </div>
      <h3 style={{ fontWeight: 700, fontSize: 22, marginBottom: 10, color: '#fff' }}>Frequently Asked Questions</h3>
      {filtered.map((item) => (
        <div key={item.idx} style={{ marginBottom: 10, borderBottom: '1px solid #333' }}>
          <button
            onClick={() => setOpenIdx(openIdx === item.idx ? null : item.idx)}
            style={{
              width: '100%',
              background: 'none',
              border: 'none',
              color: '#fff',
              fontWeight: 600,
              fontSize: 18,
              textAlign: 'left',
              padding: '10px 0',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
            aria-expanded={openIdx === item.idx}
          >
            <span dangerouslySetInnerHTML={{ __html: search ? highlightHtml(item.q, search) : item.q }} />
            <span style={{ fontSize: 20, color: '#4f8cff', marginLeft: 8 }}>{openIdx === item.idx ? '−' : '+'}</span>
          </button>
          {openIdx === item.idx && (
            <div style={{ color: '#b0b8ff', fontSize: 16, padding: '0 0 10px 0', lineHeight: 1.6 }}
              dangerouslySetInnerHTML={{ __html: search ? highlightHtml(item.a, search) : item.a }}
            />
          )}
        </div>
      ))}
    </div>
  );
};

const HelpDrawer = ({ open, onClose }: { open: boolean; onClose: () => void }) => {
  const [search, setSearch] = useState('');

  // Compute filtered and ranked topics
  const filteredTopics = useMemo(() => {
    if (!search.trim()) return helpTopics.map(t => ({ ...t, autoExpand: false }));
    const q = search.trim().toLowerCase();
    return helpTopics
      .map(t => {
        const titleMatch = t.title.toLowerCase().includes(q);
        const contentMatch = t.content.replace(/<[^>]+>/g, '').toLowerCase().includes(q);
        return { ...t, autoExpand: true, match: titleMatch || contentMatch };
      })
      .filter(t => t.match)
      .sort(() => 0); // No need to sort, all are matches
  }, [search]);

  if (!open) return null;
  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          background: 'rgba(20, 22, 30, 0.75)',
          zIndex: 9998,
        }}
        onClick={onClose}
        aria-label="Close Help"
      />
      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '85vw',
          maxWidth: 900,
          height: '85vh',
          maxHeight: '95vh',
          background: '#232427',
          color: '#fff',
          boxShadow: '0 8px 48px #000a',
          zIndex: 9999,
          borderRadius: 18,
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
        role="dialog"
        aria-modal="true"
      >
        <button
          onClick={onClose}
          style={{ position: 'absolute', top: 18, right: 24, background: 'none', border: 'none', color: '#b0b8ff', fontSize: 32, cursor: 'pointer', zIndex: 2 }}
          aria-label="Close Help"
        >
          ×
        </button>
        <div 
          className="help-modal-content"
          style={{
            padding: '38px 38px 28px 38px',
            height: '100%',
            overflowY: 'auto',
          }}
        >
          {/* Search Bar - now below close button */}
          <div style={{ marginTop: 32, marginBottom: 24, position: 'relative', display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{
              position: 'absolute',
              left: 16,
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#7faaff',
              fontSize: 22,
              pointerEvents: 'none',
              zIndex: 2
            }}>
              {/* Search icon SVG */}
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="9" cy="9" r="7" stroke="#7faaff" strokeWidth="2"/><path d="M15.5 15.5L13 13" stroke="#7faaff" strokeWidth="2" strokeLinecap="round"/></svg>
            </span>
            <style>{`
              .help-search-input::placeholder {
                color: #b0b8ff;
                opacity: 1;
              }
            `}</style>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search help topics..."
              className="help-search-input"
              style={{
                width: '100%',
                padding: '12px 44px 12px 44px',
                borderRadius: 10,
                border: search ? '2px solid #4f8cff' : '2px solid #232b45',
                background: '#181920',
                color: '#fff',
                fontSize: 17,
                outline: 'none',
                boxShadow: search ? '0 0 0 2px #4f8cff33' : '0 1px 8px #0002',
                fontWeight: 500,
                transition: 'border 0.2s, box-shadow 0.2s',
              }}
              aria-label="Search help topics"
              autoFocus
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{
                  position: 'absolute',
                  right: 14,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  color: '#7faaff',
                  fontSize: 22,
                  cursor: 'pointer',
                  padding: 0,
                  zIndex: 2,
                  borderRadius: 20,
                  width: 28,
                  height: 28,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'background 0.15s, color 0.15s',
                }}
                aria-label="Clear search"
                onMouseOver={e => (e.currentTarget.style.background = '#232b45')}
                onMouseOut={e => (e.currentTarget.style.background = 'none')}
              >
                ×
              </button>
            )}
          </div>
          {!search.trim() && <QuickBallotOverview />}
          <div>
            {filteredTopics.length === 0 ? (
              <div style={{ color: '#ffb0b0', fontSize: 18, textAlign: 'center', marginTop: 40, fontWeight: 600 }}>
                No related keywords found.
              </div>
            ) : (
              filteredTopics.map((topic, idx) => (
                topic.isFAQ
                  ? <FAQAccordion key={idx} search={search} />
                  : <AccordionSection key={idx} title={topic.title} content={topic.content} autoExpand={topic.autoExpand} search={search} />
              ))
            )}
          </div>
        </div>
      </div>
    </>
  );
};

const AccordionSection = ({ title, content, autoExpand, search }: { title: string; content: string; autoExpand?: boolean; search?: string }) => {
  const [expanded, setExpanded] = useState(!!autoExpand);
  React.useEffect(() => {
    if (autoExpand) setExpanded(true);
    else if (autoExpand === false) setExpanded(false);
    // eslint-disable-next-line
  }, [autoExpand]);
  return (
    <div style={{ marginBottom: 16, borderBottom: '1px solid #333' }}>
      <button
        onClick={() => setExpanded(e => !e)}
        style={{
          width: '100%',
          background: 'none',
          border: 'none',
          color: '#fff',
          fontWeight: 700,
          fontSize: 20,
          textAlign: 'left',
          padding: '12px 0',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
        aria-expanded={expanded}
      >
        <span dangerouslySetInnerHTML={{ __html: search ? highlightHtml(title, search) : title }} />
        <span style={{ fontSize: 22, color: '#4f8cff', marginLeft: 8 }}>{expanded ? '−' : '+'}</span>
      </button>
      {expanded && (
        <div 
          style={{ 
            color: '#b0b8ff', 
            fontSize: 16, 
            padding: '0 0 12px 0',
            lineHeight: 1.6
          }}
          dangerouslySetInnerHTML={{ __html: search ? highlightHtml(content, search) : content }}
        />
      )}
    </div>
  );
};

export default HelpDrawer; 