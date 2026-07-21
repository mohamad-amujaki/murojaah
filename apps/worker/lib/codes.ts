const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateJoinCode(length = 6): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return [...bytes].map(b => ALPHABET[b % ALPHABET.length]).join("");
}
