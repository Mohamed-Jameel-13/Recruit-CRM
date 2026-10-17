/**
 * Generates unique Google Meet-style room codes for interview sessions.
 * Format matches Google Meet's real format: xxx-xxxx-xxx (3-4-3 letters)
 */

const MEET_CONSONANTS = 'bcdfghjklmnpqrstvwxyz';
const MEET_VOWELS = 'aeiou';

function randomChar(chars: string): string {
  return chars[Math.floor(Math.random() * chars.length)];
}

/**
 * Generates a realistic Google Meet code segment (alternates consonant/vowel for pronounceability)
 */
function generateMeetSegment(length: number): string {
  let segment = '';
  for (let i = 0; i < length; i++) {
    segment += i % 2 === 0 ? randomChar(MEET_CONSONANTS) : randomChar(MEET_VOWELS);
  }
  return segment;
}

/**
 * Generates a unique Google Meet link for a specific candidate/interview.
 * Format: https://meet.google.com/xxx-xxxx-xxx
 */
export function generateMeetLink(seed?: string): string {
  // Use seed to ensure the same candidate always gets the same link if re-generated
  if (seed) {
    // Simple deterministic hash from seed
    let hash = 0;
    for (let i = 0; i < seed.length; i++) {
      hash = (hash * 31 + seed.charCodeAt(i)) & 0x7fffffff;
    }
    
    const allChars = 'abcdefghijklmnopqrstuvwxyz';
    const part1 = [
      allChars[(hash >> 20) % 26],
      allChars[(hash >> 15) % 26],
      allChars[(hash >> 10) % 26],
    ].join('');
    const part2 = [
      allChars[(hash >> 8) % 26],
      allChars[(hash >> 6) % 26],
      allChars[(hash >> 4) % 26],
      allChars[(hash >> 2) % 26],
    ].join('');
    const part3 = [
      allChars[(hash ^ (hash >> 12)) % 26],
      allChars[(hash ^ (hash >> 7)) % 26],
      allChars[(hash ^ (hash >> 3)) % 26],
    ].join('');

    return `https://meet.google.com/${part1}-${part2}-${part3}`;
  }

  const part1 = generateMeetSegment(3);
  const part2 = generateMeetSegment(4);
  const part3 = generateMeetSegment(3);
  return `https://meet.google.com/${part1}-${part2}-${part3}`;
}
