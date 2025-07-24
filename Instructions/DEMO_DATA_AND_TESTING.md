# QuickBallot Demo Data & Testing Instructions

## Demo Organizations

### Organization 1: "Green Valley School"
- **Password:** `green123`
- **Recovery Phrase:** `green valley phrase`
- **Logo:** (use any school logo image)

### Organization 2: "Blue River Academy"
- **Password:** `blue123`
- **Recovery Phrase:** `blue river phrase`
- **Logo:** (use any academy logo image)

---

## Demo Voters

### Green Valley School Voters
1. **John Smith** - Voter ID: `GV001`
2. **Maria Garcia** - Voter ID: `GV002`
3. **Ahmed Hassan** - Voter ID: `GV003`
4. **Sarah Johnson** - Voter ID: `GV004`
5. **Michael Chen** - Voter ID: `GV005`
6. **Emily Rodriguez** - Voter ID: `GV006`
7. **David Thompson** - Voter ID: `GV007`
8. **Lisa Wang** - Voter ID: `GV008`
9. **Robert Brown** - Voter ID: `GV009`
10. **Jennifer Davis** - Voter ID: `GV010`

### Blue River Academy Voters
1. **Alex Turner** - Voter ID: `BR001`
2. **Sophie Martin** - Voter ID: `BR002`
3. **James Wilson** - Voter ID: `BR003`
4. **Emma Taylor** - Voter ID: `BR004`
5. **Daniel Anderson** - Voter ID: `BR005`

---

## Demo Elections

### Green Valley School Elections

#### 1. "Student Council Election 2024" (QR-based)
- **Status:** Completed
- **Type:** QR-based
- **Session ID:** GV-ELEC-0001
- **Start Time:** (when you start it)
- **End Time:** (when you end it)

**Positions:**
1. **President**
   - Candidates:
     - John Smith (Photo: student photo)
     - Maria Garcia (Photo: student photo)
     - Ahmed Hassan (Photo: student photo)

2. **Vice President**
   - Candidates:
     - Sarah Johnson (Photo: student photo)
     - Michael Chen (Photo: student photo)

3. **Secretary**
   - Candidates:
     - Emily Rodriguez (Photo: student photo)
     - David Thompson (Photo: student photo)
     - Lisa Wang (Photo: student photo)

4. **Treasurer**
   - Candidates:
     - Robert Brown (Photo: student photo)
     - Jennifer Davis (Photo: student photo)

#### 2. "Class Representative Election" (Direct)
- **Status:** Not Started
- **Type:** Direct
- **Session ID:** (will be generated)

**Positions:**
1. **Class 10A Representative**
   - Candidates:
     - Alex Johnson (Photo: student photo)
     - Sarah Williams (Photo: student photo)

2. **Class 10B Representative**
   - Candidates:
     - Mike Davis (Photo: student photo)
     - Lisa Brown (Photo: student photo)
     - Tom Wilson (Photo: student photo)

#### 3. "Sports Captain Election" (Voter ID-based)
- **Status:** In Progress
- **Type:** Voter ID-based
- **Session ID:** GV-ELEC-0002

**Positions:**
1. **Cricket Captain**
   - Candidates:
     - Rahul Sharma (Photo: sports photo)
     - Priya Patel (Photo: sports photo)

2. **Football Captain**
   - Candidates:
     - Carlos Rodriguez (Photo: sports photo)
     - Anna Kowalski (Photo: sports photo)
     - Yuki Tanaka (Photo: sports photo)

### Blue River Academy Elections

#### 1. "Academic Council Election" (QR-based)
- **Status:** Paused
- **Type:** QR-based
- **Session ID:** BR-ELEC-0001

**Positions:**
1. **Academic Head**
   - Candidates:
     - Dr. Sarah Mitchell (Photo: faculty photo)
     - Prof. James Anderson (Photo: faculty photo)

2. **Research Coordinator**
   - Candidates:
     - Dr. Emily Chen (Photo: faculty photo)
     - Dr. Michael Brown (Photo: faculty photo)
     - Dr. Lisa Garcia (Photo: faculty photo)

#### 2. "Faculty Committee Election" (Direct)
- **Status:** Not Started
- **Type:** Direct
- **Session ID:** (will be generated)

**Positions:**
1. **Faculty Representative**
   - Candidates:
     - Dr. Robert Wilson (Photo: faculty photo)
     - Dr. Jennifer Davis (Photo: faculty photo)

---

## Testing Scenarios

### 1. Organization Management
- [ ] Create both organizations with different passwords
- [ ] Edit organization details (name, logo, password)
- [ ] Test password validation (mismatch, empty)
- [ ] Test recovery phrase functionality
- [ ] Delete organization (should delete all related data)

### 2. Voter Management
- [ ] Add all voters to both organizations
- [ ] Test duplicate Voter ID validation
- [ ] Test long name handling in UI
- [ ] Edit voter details
- [ ] Delete voters
- [ ] Test voter list pagination (if implemented)

### 3. Election Creation & Management
- [ ] Create elections with all three types (Direct, QR-based, Voter ID-based)
- [ ] Test position creation with multiple candidates
- [ ] Test candidate photo upload
- [ ] Test candidate symbol upload
- [ ] Edit election details
- [ ] Delete elections
- [ ] Test position reordering

### 4. Election Session Testing

#### Direct Voting Mode
- [ ] Start Direct election
- [ ] Test fullscreen voting window
- [ ] Vote for all positions
- [ ] Test partial voting (exit before completing)
- [ ] Test admin hotkeys (N, Enter, E, Escape)
- [ ] End election and view results

#### QR-based Voting Mode
- [ ] Start QR-based election
- [ ] Test QR code generation for each voter
- [ ] Test voter authentication with QR codes
- [ ] Test invalid QR code rejection
- [ ] Test duplicate QR code usage prevention
- [ ] Vote with multiple voters
- [ ] Test voter participation tracking
- [ ] End election and view results

#### Voter ID-based Voting Mode
- [ ] Start Voter ID-based election
- [ ] Test voter authentication with Voter IDs
- [ ] Test invalid Voter ID rejection
- [ ] Test duplicate Voter ID usage prevention
- [ ] Vote with multiple voters
- [ ] Test voter participation tracking
- [ ] End election and view results

### 5. Election Session Management
- [ ] Pause and resume elections
- [ ] Test session ID generation (ORG-ELEC-XXXX format)
- [ ] Test start time recording
- [ ] Test end time recording
- [ ] Test session-specific results
- [ ] Clear results and restart

### 6. Results & Reporting
- [ ] View real-time results during voting
- [ ] View final results after election ends
- [ ] Test voter participation list (QR/Voter ID elections)
- [ ] Export results to PDF
- [ ] Test results with ties
- [ ] Test results with no votes
- [ ] Test results with partial voting

### 7. UI/UX Testing
- [ ] Test responsive design on different screen sizes
- [ ] Test candidate name overflow handling
- [ ] Test long organization/election names
- [ ] Test navigation between pages
- [ ] Test modal dialogs
- [ ] Test error message display
- [ ] Test loading states

### 8. Security Testing
- [ ] Test password hashing (check database)
- [ ] Test admin authentication
- [ ] Test session isolation
- [ ] Test vote integrity
- [ ] Test data persistence
- [ ] Test error handling

### 9. Edge Cases
- [ ] Election with single candidate
- [ ] Election with no candidates
- [ ] Election with maximum candidates
- [ ] Very long candidate names
- [ ] Special characters in names
- [ ] Large voter lists
- [ ] Multiple concurrent elections
- [ ] Network interruption during voting
- [ ] App crash during voting session

### 10. Data Integrity
- [ ] Verify vote counts match
- [ ] Verify voter participation accuracy
- [ ] Verify session isolation
- [ ] Verify data persistence after app restart
- [ ] Verify PDF export accuracy
- [ ] Verify time formatting (12-hour)

---

## Testing Checklist

### Pre-Testing Setup
- [ ] Clear existing database
- [ ] Create demo organizations
- [ ] Add all demo voters
- [ ] Create all demo elections
- [ ] Prepare test images for candidates

### Core Functionality
- [ ] Organization CRUD operations
- [ ] Voter CRUD operations
- [ ] Election CRUD operations
- [ ] All three voting modes
- [ ] Results and reporting
- [ ] PDF export

### Advanced Features
- [ ] Session management
- [ ] Voter participation tracking
- [ ] Real-time updates
- [ ] Error handling
- [ ] Security features

### Performance & Stability
- [ ] Large dataset handling
- [ ] Memory usage
- [ ] App responsiveness
- [ ] Data persistence
- [ ] Error recovery

---

## Expected Outcomes

After completing all tests, you should have:
1. **Complete coverage** of all app features
2. **Verified security** with password hashing
3. **Confirmed data integrity** across all operations
4. **Validated UI/UX** for all screen sizes
5. **Tested edge cases** and error scenarios
6. **Documented any issues** found during testing

This demo data provides a comprehensive testing environment that covers all major features, edge cases, and potential issues in your QuickBallot application. 