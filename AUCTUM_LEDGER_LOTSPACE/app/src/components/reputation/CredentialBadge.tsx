import React from 'react';

interface CredentialBadgeProps {
  state: 'active' | 'expiring' | 'stale' | 'lapsed';
  credentialType: string;
  score: number;
}

export const CredentialBadge: React.FC<CredentialBadgeProps> = ({ state, credentialType, score }) => {
  const stateColors: Record<string, string> = {
    active: 'green',
    expiring: 'yellow',
    stale: 'orange',
    lapsed: 'red',
  };
  return (
    <span className={`credential-badge state-${stateColors[state]}`} aria-label={`${credentialType}: ${state}`}>
      {credentialType} — {state} (score: {score})
    </span>
  );
};