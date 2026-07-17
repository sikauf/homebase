// Callie's palette — deliberately nothing like the rest of the site.
// Pink + polka dots, with her second-favorite green as the accent.

export const callieTheme = {
  pageBackground: {
    backgroundColor: '#fdeef5',
    backgroundImage:
      'radial-gradient(rgba(236,72,153,0.16) 2px, transparent 2.6px), ' +
      'radial-gradient(rgba(236,72,153,0.09) 2px, transparent 2.6px)',
    backgroundSize: '30px 30px, 30px 30px',
    backgroundPosition: '0 0, 15px 15px',
  } as const,
  card: {
    background: '#ffffff',
    border: '1px solid #fbcfe3',
    boxShadow: '0 2px 12px rgba(236,72,153,0.10)',
  } as const,
  pink: '#db2777',
  pinkSoft: '#f9a8d0',
  pinkText: '#be185d',
  pinkChip: { background: '#fce7f3', color: '#be185d', border: '1px solid #fbcfe3' } as const,
  green: '#2f9e44',
  greenText: '#2b8a3e',
  greenChip: { background: '#d3f9d8', color: '#2b8a3e', border: '1px solid #b2f2bb' } as const,
  muted: '#c084ab',
}

export function addedByChip(addedBy: string) {
  return addedBy === 'callie'
    ? { style: callieTheme.pinkChip, label: '🎀 Callie' }
    : { style: callieTheme.greenChip, label: '🌿 Sam' }
}
