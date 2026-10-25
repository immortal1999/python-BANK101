// Luhn check digit so the mock numbers look like real card numbers.
function luhnDigit(partial) {
  let sum = 0;
  [...partial].reverse().forEach((ch, i) => {
    let d = Number(ch);
    if (i % 2 === 0) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  });
  return String((10 - (sum % 10)) % 10);
}

// Deterministic mock card number from a BIN + the linked account number, so a user's
// card stays the same across visits. Demo data only — not a real card.
export function mockCardNumber(bin, seed) {
  const body = (bin + String(seed).replace(/\D/g, "").padStart(10, "0")).slice(0, 15);
  return body + luhnDigit(body);
}

export const groupCardNumber = (n) => n.replace(/(.{4})/g, "$1 ").trim();
export const maskCardNumber = (n) => `•••• •••• •••• ${n.slice(-4)}`;
