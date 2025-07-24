# AI Prompt for QuickBallot Demo Data Generation

## Prompt for AI Assistant

```
Create demo data for a voting application called QuickBallot. I need realistic organizations, candidates, and voters for testing purposes.

## Requirements:

### Organizations (2-3 organizations)
- Create educational institutions (schools, colleges, universities)
- Each organization needs:
  - Name (realistic institution name)
  - Password (simple, memorable password)
  - Recovery phrase (3-4 word phrase)

### Candidates (15-20 candidates total)
- Mix of students, faculty, and staff
- Include diverse names from different cultures
- Each candidate needs:
  - Full name (first and last name)
  - Role/position they're running for (e.g., "Student Council President", "Faculty Representative", "Sports Captain")
  - Brief description of their background (1-2 sentences)

### Voters (20-30 voters total)
- Mix of students, faculty, and staff
- Include diverse names from different cultures
- Each voter needs:
  - Full name (first and last name)
  - Voter ID (unique 6-character alphanumeric code, format: XX000 where XX = organization initials)
  - Role/affiliation (e.g., "Student", "Faculty Member", "Staff")

## Format:
Present the data in a clean, organized format that's easy to copy and paste into the application.

## Examples:
- Organization: "Green Valley High School" | Password: "green123" | Recovery: "valley green school"
- Candidate: "Maria Garcia" | Position: "Student Council President" | Background: "Senior student with leadership experience in student clubs"
- Voter: "John Smith" | Voter ID: "GV001" | Role: "Student"

Please generate realistic, diverse data that would be suitable for testing a voting application.
```

## Expected Output Format

The AI should return data in this format:

```
## Organizations
1. [Organization Name] | Password: [password] | Recovery: [recovery phrase]
2. [Organization Name] | Password: [password] | Recovery: [recovery phrase]

## Candidates
1. [Full Name] | Position: [Role/Position] | Background: [Brief description]
2. [Full Name] | Position: [Role/Position] | Background: [Brief description]
...

## Voters
1. [Full Name] | Voter ID: [XX000] | Role: [Student/Faculty/Staff]
2. [Full Name] | Voter ID: [XX000] | Role: [Student/Faculty/Staff]
...
```

## Usage Instructions

1. Copy the prompt above
2. Paste it into any AI assistant (ChatGPT, Claude, etc.)
3. Copy the generated data
4. Use it to manually populate your QuickBallot application for testing

This will give you realistic, diverse demo data that covers all the basic entities needed for testing your voting application. 