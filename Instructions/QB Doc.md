# QuickBallot
An offline election management system

## Overview
QuickBallot is a desktop application designed for managing elections offline. It provides a secure platform for creating and managing organizations, conducting various types of elections, and handling voter management - all while maintaining data privacy through offline operations.

## Table of Contents
1. [Homepage](#homepage)
2. [Organization Dashboard](#organization-dashboard)
3. [Voter Management](#voter-management)
4. [Election Management](#election-management)
5. [Candidate Management](#candidate-management)
6. [Voter Slip Generator](#voter-slip-generator)
7. [Voting Windows](#voting-windows)
8. [Election Results](#election-results)

## Homepage

### Overview
The homepage is the central hub for managing organizations. It provides secure access to create, access, and manage multiple organizations.

### Features

#### Organization Management
- **Create Organization**
  - Access: Click "Create New Organization" button
  - Required: Name, password, recovery phrase
  - Optional: Organization logo

- **View Organizations**
  - Grid layout showing organization cards
  - Each card displays: Logo (if any), name, election count

- **Access Organization**
  - Click organization card
  - Enter password to access
  - Use recovery phrase if password forgotten

- **Bulk Actions**
  - Select multiple organizations
  - Delete selected organizations

### Security
- Password protection for each organization
- Recovery system using recovery phrases
- Show/hide password toggles for secure input

### Interface Elements

#### Header
- QuickBallot logo and welcome message
- Help button (top-right)

#### Main Area
- Organizations grid
- Management toolbar
- Add organization option

#### Modals
1. **Add Organization**
   - Organization creation form
   - Logo upload option

2. **Password Entry**
   - Password field with show/hide
   - Recovery option

3. **Password Recovery**
   - Recovery phrase verification
   - New password setup

## Organization Dashboard

### Overview
The organization dashboard provides centralized access to all organization features including elections, voter management, and settings.

### Features

#### Elections Section
- **View Elections**
  - Grid display of all elections
  - Shows election name, logo, and status
  - Click to access individual election

- **Create Election**
  - Add new election with name and logo
  - Define positions for the election
  - Set election type (Direct, QR-based, Voter ID-based)

#### Voter Management Section
- **Voter Management**
  - Access voter list and management tools
  - Add, edit, and delete voters
  - Import/export voter data

- **Voter Slip Generator**
  - Generate QR code slips for voters
  - Print or save voter slips

#### Organization Settings
- **Edit Organization**
  - Change organization name
  - Update organization logo
  - Modify organization details

- **Change Password**
  - Update organization password
  - Requires current password verification

- **Delete Organization**
  - Remove organization and all data
  - Requires password confirmation

### Navigation
- Back button to homepage
- Settings button for organization configuration
- Direct access to elections and voter management

## Voter Management

### Overview
Comprehensive voter management system for adding, editing, and organizing voter data.

### Features

#### Voter Operations
- **Add Voter**
  - Individual voter addition
  - Name validation and duplicate checking
  - Automatic voter ID generation

- **Edit Voter**
  - Modify existing voter information
  - Update voter names
  - Maintain voter history

- **Delete Voter**
  - Remove individual voters
  - Bulk delete selected voters
  - Confirmation prompts

#### Data Management
- **Import Voters**
  - Excel/CSV file import
  - Template download available
  - Preview before import
  - Duplicate handling

- **Export Voters**
  - Export to Excel format
  - Include voter IDs and names
  - Complete voter data export

#### Search and Filter
- **Search Function**
  - Real-time voter search
  - Name-based filtering
  - Quick voter location

- **Selection Tools**
  - Select individual voters
  - Select all voters
  - Bulk operations support

### Interface Elements
- Voter list with search bar
- Action buttons for add, edit, delete
- Import/export functionality
- Bulk selection tools

## Election Management

### Overview
Complete election lifecycle management from creation to completion with various voting methods.

### Features

#### Election Creation
- **Basic Setup**
  - Election name and logo
  - Position definitions
  - Election type selection

- **Election Types**
  - Direct Election: In-person voting
  - QR-based: QR code scanning
  - Voter ID-based: ID verification

#### Election Configuration
- **Position Management**
  - Add/remove positions
  - Position-specific settings
  - Candidate assignment

- **Election Settings**
  - Edit election details
  - Modify positions
  - Update election type

#### Election Control
- **Start Election**
  - Password-protected start
  - Position selection
  - Session initialization

- **Election Status**
  - Active/Inactive status
  - Pause/Resume functionality
  - Real-time progress tracking

- **End Election**
  - Password-protected end
  - Vote finalization
  - Results preparation

#### Advanced Features
- **Reconduct Election**
  - Restart completed elections
  - Maintain previous data
  - New voting session

- **Delete Election**
  - Remove election data
  - Password confirmation required
  - Complete data cleanup

### Security Features
- Password protection for all admin actions
- Session management
- Vote integrity verification

## Candidate Management

### Overview
Manage candidates for each position in elections with photo and symbol support.

### Features

#### Candidate Operations
- **Add Candidate**
  - Name and position assignment
  - Photo upload (optional)
  - Symbol upload (optional)
  - Automatic candidate ID

- **Edit Candidate**
  - Update candidate information
  - Modify photos and symbols
  - Position reassignment

- **Delete Candidate**
  - Remove candidates
  - Clean up associated files
  - Position validation

#### Media Management
- **Photo Upload**
  - Support for PNG, JPG, SVG, WEBP
  - Automatic resizing
  - Preview functionality

- **Symbol Upload**
  - Election symbol support
  - Multiple format support
  - Symbol preview

#### Position Organization
- **Position-based Viewing**
  - Filter by position
  - Position-specific management
  - Candidate counts per position

### Interface Elements
- Position-based candidate grid
- Upload tools for media
- Edit/delete functionality
- Position navigation

## Voter Slip Generator

### Overview
Generate QR code-based voter slips for secure voter identification and authentication.

### Features

#### Slip Generation
- **QR Code Creation**
  - High error correction (Level H)
  - Voter-specific codes
  - Secure encoding

- **Slip Customization**
  - Organization branding
  - Voter information display
  - Election details

#### Output Options
- **Print Slips**
  - Direct printing
  - Print preview
  - Multiple slip printing

- **Save Slips**
  - PDF generation
  - Image format export
  - Batch processing

#### Voter Data
- **Voter Information**
  - Voter name and ID
  - Organization details
  - Election information

- **Security Features**
  - Unique QR codes
  - Tamper-resistant design
  - Verification capabilities

## Voting Windows

### Overview
Three different voting interfaces for various election types with secure vote casting.

### Direct Voting Window

#### Features
- **Voter Interface**
  - Position-by-position voting
  - Candidate selection
  - Vote confirmation

- **Navigation**
  - Previous/Next position
  - Vote reset
  - Progress tracking

- **Security**
  - Admin exit protection
  - Vote integrity
  - Session management

### QR-based Voting Window

#### Features
- **QR Code Scanning**
  - Camera-based scanning
  - Real-time detection
  - Error handling

- **Voter Verification**
  - QR code validation
  - Voter identification
  - Duplicate vote prevention

- **Voting Process**
  - Same interface as direct voting
  - QR-based authentication
  - Secure vote casting

### Voter ID-based Voting Window

#### Features
- **ID Input**
  - Manual voter ID entry
  - ID validation
  - Voter lookup

- **Authentication**
  - Voter verification
  - Access control
  - Session management

- **Voting Interface**
  - Standard voting process
  - ID-based access
  - Secure voting

## Election Results

### Overview
Comprehensive results display with analytics, charts, and export capabilities.

### Features

#### Results Display
- **Vote Summary**
  - Total votes cast
  - Position-wise results
  - Candidate performance

- **Visual Analytics**
  - Bar charts per position
  - Vote distribution
  - Interactive charts

#### Data Management
- **Results Export**
  - PDF report generation
  - Detailed vote breakdown
  - Professional formatting

- **Results Clearing**
  - Password-protected clearing
  - Complete vote removal
  - Fresh start capability

#### Voter Status
- **Participation Tracking**
  - Voter turnout statistics
  - Individual voter status
  - Participation reports

#### Session Information
- **Election Sessions**
  - Session details
  - Vote counts per session
  - Timeline information

### Interface Elements
- Results dashboard
- Chart visualizations
- Export options
- Voter status cards 