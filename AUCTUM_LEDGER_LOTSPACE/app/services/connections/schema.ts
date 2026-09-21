export interface Connection {
  id: string;
  followerSpaceId: string;
  followingSpaceId: string;
  type: 'follow' | 'fan' | 'subscriber' | 'collector';
  createdAt: Date;
}