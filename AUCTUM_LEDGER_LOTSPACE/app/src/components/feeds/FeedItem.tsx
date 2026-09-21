import React from 'react';

interface FeedItemProps {
  type: string;
  content: Record<string, unknown>;
  provenanceRef: string | null;
  createdAt: string;
}

export const FeedItem: React.FC<FeedItemProps> = ({ type, content, provenanceRef, createdAt }) => {
  return (
    <article className="feed-item" aria-label={`${type} feed item`}>
      <span className="type">{type}</span>
      <p>{JSON.stringify(content)}</p>
      {provenanceRef && <span className="provenance">Ref: {provenanceRef}</span>}
      <time>{createdAt}</time>
    </article>
  );
};