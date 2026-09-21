export interface ReputationRecord {
  id: string;
  spaceId: string;
  credential: {
    code: string;
    level: string;
    expiresAt: string | null;
    status: 'active' | 'expiring' | 'stale' | 'lapsed';
  };
  score: number;
  createdAt: string;
  updatedAt: string;
}