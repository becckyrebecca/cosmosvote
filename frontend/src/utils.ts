export function maskAddress(addr: string): string {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatTokenAmount(amount: bigint, decimals: number): string {
  const str = String(amount);
  if (decimals === 0) return str.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  
  const padded = str.padStart(decimals + 1, '0');
  const intPart = padded.slice(0, -decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  let fracPart = padded.slice(-decimals);
  
  // We can just keep 2 decimals for simplicity or trim trailing zeros
  fracPart = fracPart.slice(0, 2).padEnd(2, '0');
  
  return `${intPart}.${fracPart} CVT`;
}
