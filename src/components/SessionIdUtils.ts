// Utility to generate the next session ID for an election session
// Format: ORG-EID-XXXX (first 4 letters of org name, election ID padded to 3 digits, 4-digit ascending number)

export function getNextSessionId(orgName: string, electionId: number, existingSessionIds: string[]): string {
  const orgPart = (orgName || '').replace(/\s/g, '').toUpperCase().substring(0, 4);
  const electionIdPart = (electionId || 0).toString().padStart(3, '0');
  
  // Find all session numbers for this org/election prefix
  const prefix = `${orgPart}-${electionIdPart}-`;
  const numbers = existingSessionIds
    .filter(id => id.startsWith(prefix))
    .map(id => {
      const match = id.match(/-(\d{4})$/);
      return match ? parseInt(match[1], 10) : null;
    })
    .filter(n => n !== null) as number[];
  
  // Find the next number (start at 1000)
  const nextNum = numbers.length > 0 ? Math.max(...numbers) + 1 : 1000;
  const numStr = nextNum.toString().padStart(4, '0');
  return `${orgPart}-${electionIdPart}-${numStr}`;
} 