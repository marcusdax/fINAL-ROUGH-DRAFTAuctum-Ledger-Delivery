import React from 'react';

interface SpaceProfileProps {
  archetype: string;
  shopfrontName: string;
  shopfrontDescription: string;
  verified: boolean;
  totalEarned: number;
}

export const SpaceProfile: React.FC<SpaceProfileProps> = ({
  archetype,
  shopfrontName,
  shopfrontDescription,
  verified,
  totalEarned,
}) => {
  return (
    <section className="space-profile" aria-label={`${shopfrontName} profile`}>
      <h2>{shopfrontName}</h2>
      <p className="archetype">{archetype}</p>
      <p className="description">{shopfrontDescription}</p>
      <span className={`badge ${verified ? 'verified' : 'unverified'}`}>
        {verified ? 'Verified' : 'Unverified'}
      </span>
      <span className="income">${totalEarned.toFixed(2)}</span>
    </section>
  );
};