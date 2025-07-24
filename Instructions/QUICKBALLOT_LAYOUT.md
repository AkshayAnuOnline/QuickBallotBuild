# QuickBallot - Offline Election Management System

## Overview
QuickBallot is an offline-first desktop app for managing elections in Indian schools and small organizations, ensuring all core functions work without internet. It uses Electron (Chromium+Node.js) to run natively on Windows and Linux, with a React front-end and Material-UI (MUI) for the interface. The app enforces dark mode only. Data is stored locally in SQLite to support offline use. All inputs auto-save continuously to prevent data loss.

### User Roles:
- **Admin**: Full access to create/manage organizations and elections, configure posts/candidates/voters, start/stop elections, and view/export results.
- **Voter**: Limited access. Can only vote when election is active.

## Tech Stack
- **Framework**: Electron 27 + React 18 + TypeScript 5
- **UI**: 
  - React Bootstrap 5
  - SCSS for styling
  - Material Icons
  - Chart.js for data visualization
- **State Management**: Redux Toolkit + RTK Query
- **Database**: SQLite (better-sqlite3)
- **Build Tool**: Vite 5

## UI/UX Guidelines

### Color Scheme
- **Primary**: `#5f76e8` (Soft Blue)
- **Secondary**: `#49beff` (Light Blue)
- **Success**: `#2dd36f` (Green)
- **Warning**: `#ffc409` (Yellow)
- **Danger**: `#eb445a` (Red)
- **Dark**: `#1e1e2d` (Dark Blue-Gray)
- **Light**: `#f5f7fb` (Off-White)
- **Gray Scale**: Range from `#f8f9fa` to `#212529`

### Typography
- **Font Family**: 'Poppins', sans-serif
- **Base Font Size**: 14px
- **Headings**:
  - h1: 2.25rem (36px)
  - h2: 1.875rem (30px)
  - h3: 1.5rem (24px)
  - h4: 1.125rem (18px)
  - h5: 1rem (16px)
  - h6: 0.875rem (14px)

### Layout
- **Container**: 1200px max-width with padding
- **Gutters**: 15px grid gutters
- **Border Radius**: 6px (cards, buttons, inputs)
- **Box Shadow**: 0 0.15rem 1.75rem 0 rgba(58, 59, 69, 0.15)
- **Transitions**: 0.3s ease-in-out for all hover effects

### Components
1. **Cards**:
   - White background
   - Rounded corners (6px)
   - Subtle shadow
   - Header with border-bottom

2. **Buttons**:
   - Primary: Gradient blue
   - Secondary: Light gray
   - Rounded corners (4px)
   - Hover effects with slight scale
   - Icon support

3. **Forms**:
   - Floating labels
   - Rounded inputs
   - Focus state with primary color
   - Error states in red

4. **Tables**:
   - Hover effects on rows
   - Striped rows option
   - Compact spacing
   - Action buttons with icons

5. **Navigation**:
   - Left sidebar (collapsible)
   - Active state highlighting
   - Nested menu support
   - Icons for each menu item

### Dark Mode
- **Background**: `#1a2038`
- **Card Background**: `#222b45`
- **Text**: `#ffffff` (primary), `#9ca3af` (secondary)
- **Borders**: `#2d3748`

### Authentication & First-Time Setup

### First Launch Experience
1. **Welcome Screen**:
   - Full-page centered card with shadow
   - App logo at top
   - Welcome message with brief description
   - Gradient button "Get Started"
   - Subtle animation on load


## Application Flow

### Window 1: Home
- **Access**: First screen
- **Layout**:
  - Clean, modern dashboard
  - Header with:
    - App logo
    - Page title
    - User dropdown
    - Theme toggle (dark/light)
  - Content area with:
    - Welcome card
    - Quick stats (if any organizations exist)
    - Recent activity
  - No sidebar for maximum content space
  - Consistent padding and spacing
  - Subtle animations on hover/click

- **Features**:
  - **Organization Grid**:
    - Cards with organization logo and name
    - Rounded corners on all cards
    - Grid layout (responsive)
  - **Actions**:
    - Create New Organization (button)
    - Multi-select organizations for batch delete
    - Click organization to open it

- **New Organization Popup**:
  - Fields:
    - Name (required)
    - Logo (optional, shows default building SVG if not provided)
    - Admin Password 
      Admin Password are required Set during organization creation 
      - Must be confirmed (enter twice)
        - Requirements:
          - Minimum 8 characters
          - At least 1 uppercase letter
          - At least 1 number
          - At least 1 special character
        - Password Protection:
          - Required for:
            - Starting elections
            - Ending elections
            - Viewing election results
          - Session timeout: 30 minutes

        - During Organization Setup:
            - System generates a 6-word recovery phrase (Diceware-style)
            - User must write this down and store it securely
            - Phrase is never stored digitally (only shown once)
            - Example: `correct horse battery staple clip onion`

  - Actions:
    - Create
    - Cancel

### Window 2: Individual Organization
- **Access**: Clicking on an organization from Home
- **Sections**:
  1. **Elections List**:
     - Grid of election cards (similar to orgs in Home)
     - Each card shows election name and status
     - Click to open election
  2. **Voters Management**:
     - Button to open Voter Management (Window 3)
  3. **Voter Slip Generator**:
     - Button to open Slip Generator (Window 4)
  4. **New Election**:
     - Button to open New Election popup
  5. **Organization Settings**:
     - Edit organization name/logo
     - Delete organization

- **New Election Popup**:
  - Fields:
    - Election Name (required)
    - Positions (add multiple, at least one required)
    - Logo (optional, shows default SVG if not provided)
    - Start/End Time (optional)
  - Actions:
    - Create
    - Cancel

### Window 3: Manage Voters
- **Access**: From Organization window > Voters Management
- **Features**:
  - List of voters in a table
  - Columns: Voter ID, Name, Actions (Edit/Delete)
  - Multi-select for batch delete
  - Search functionality
  - Add New Voter button
  - Import/Export CSV buttons

- **Voter ID Format**:
  - Auto-generated
  - Format: `ORG-FirstLetterOfName-XXXX`
  - Example: `MYSCHOOL-J-0042` for John Doe

- **CSV Import/Export**:
  - Download template button
  - Upload CSV with voter names
  - Validation for duplicate entries
  - Preview before import

### Window 4: Voter Slip Generator
- **Features**:
  - Search voter by name/ID
  - Select multiple voters
  - Generate PDF button
  - Print preview

- **PDF Specifications**:
  - A4 size
  - Grid layout (multiple slips per page)
  - Each slip contains:
    - Voter Name
    - Voter ID
    - QR Code (links to voter ID)
    - Organization Name
    - Election Name

### Window 5: Individual Election
- **Access**: Clicking on an election from Organization window
- **Sections**:
  1. **Election Details**:
     - Name, Positions, Status
     - Start/End Time
     - Current status: Not Started/In Progress/Ended
  2. **Manage Candidates**:
     - Button to open Candidate Management (Window 8)
  3. **Election Type**:
     - Direct Election (admin-controlled)
     - QR-based
     - Voter ID-based
  4. **Election Controls** (admin only):
     - Start Election (requires password)
     - End Election (auto-redirects to results)
     - View Results (active after election ends)

- **Election End Flow**:
  1. Admin clicks "End Election"
  2. Password confirmation required
  3. System:
     - Closes voting
     - Calculates results
     - Generates audit log
     - Redirects to Results (Window 7)

- **Invalid Credential Handling**:
  - **QR Code**:
    - Show "Invalid QR Code" message
    - Option to try again
  - **Voter ID**:
    - Validate format
    - Check against voter list
    - Show appropriate error messages

### Window 6: Voting Interface
- **Access**: When election is started (full-screen)
- **Features**:
  - **Voter Verification**:
    - QR code scanner (for QR-based elections)
    - Voter ID input (for ID-based elections)
    - Clear error messages for invalid credentials
  - **Voting Screen**:
    - Large, readable fonts
    - Candidate cards with:
      - Photo (if available)
      - Name
      - Position
      - Symbol (if available)
  - **Admin Controls** (password protected):
    - Next Voter (hotkey: N)
    - End Election (hotkey: E, confirms before ending)
    - Pause/Resume (hotkey: P)
  - **Election End**:
    - Auto-saves all votes
    - Shows processing animation
    - Redirects to Results (Window 7)

### Window 7: Results
- **Access**: After election ends
- **Features**:
  - Results by position
  - Vote count for each candidate
  - Visual graphs/charts
  - Export to PDF
  - Timestamp of when results were generated

## Implementation Notes

### Authentication Flow
1. **First-Time Setup**:
   - App checks for existing admin password
   - If none found, shows setup wizard
   - Creates admin account with provided password
   - Creates default organization

2. **Admin Authentication**:
   - Required for sensitive operations
   - Simple password-based
   - Session timeout after 30 minutes of inactivity
   - Password can be changed in Organization Settings
   - No password recovery (security measure)

3. **Voter Verification**:
   - For QR-based elections:
     - Scan QR code
     - Validate against voter list
     - Mark as voted if valid
   - For Voter ID elections:
     - Input Voter ID
     - Validate format and existence
     - Check if already voted
     - Mark as voted if valid

### Data Management
- All data stored locally in SQLite
- Auto-save on all forms
- CSV import/export for voters and candidates
- Database backups on critical operations

### UI/UX Guidelines
- Dark theme only
- Rounded corners on all components
- Consistent spacing and typography
- Clear visual hierarchy
- Loading indicators for async operations

### Hotkeys
- **N**: Next voter (admin only)
- **E**: End election (admin only, requires confirmation)
- **P**: Pause/Resume election (admin only)
- **Esc**: Exit fullscreen/cancel

### Error Handling
- Clear error messages
- Validation on all forms
- Undo/Redo where applicable
- Data recovery options

## Implementation Notes
- Ensure all UI components follow Material-UI dark theme
- Implement proper state persistence
- Add loading states for async operations
- Include input validation throughout the application
- Implement comprehensive error handling
- Add tooltips and help text for better UX

## Future Enhancements
1. Mobile companion app for voters
2. Cloud sync option
3. Advanced reporting and analytics
4. Integration with student management systems
5. Support for different voting methods (ranked choice, etc.)
