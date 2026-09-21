export interface FeedItem {
  id: string;
  spaceId: string;
  type: 'story' | 'cupping_result' | 'tip' | 'follow' | 'purchase';
  content: Record<string, unknown>;
  provenanceRef: string | null;
  createdAt: Date;
}