import React from 'react';

interface SpaceCardProps {
  name: string;
  archetype: string;
  avatarUrl: string | null;
}

export const SpaceCard: React.FC<SpaceCardProps> = ({ name, archetype, avatarUrl }) => {
  return (
    <article className="space-card" aria-label={`${name} space`}>
      {avatarUrl && <img src={avatarUrl} alt={`${name} avatar`} />}
      <h3>{name}</h3>
      <p>{archetype}</p>
    </article>
  );
};