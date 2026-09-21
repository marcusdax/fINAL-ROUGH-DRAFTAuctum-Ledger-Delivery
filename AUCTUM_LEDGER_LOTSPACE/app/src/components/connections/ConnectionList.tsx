import React from 'react';

interface ConnectionListProps {
  connections: Array<{ id: string; followerSpaceId: string; type: string }>;
}

export const ConnectionList: React.FC<ConnectionListProps> = ({ connections }) => {
  return (
    <ul className="connection-list" aria-label="Connections">
      {connections.map((conn) => (
        <li key={conn.id}>
          {conn.followerSpaceId} — {conn.type}
        </li>
      ))}
    </ul>
  );
};