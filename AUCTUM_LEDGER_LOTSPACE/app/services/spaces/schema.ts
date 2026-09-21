export interface Space {
  id: string;
  userId: string;
  archetype: 'farmer' | 'roaster' | 'collector' | 'exporter' | 'consumer' | 'cooperative';
  shopfront: { name: string; description: string; avatarUrl: string | null };
  compliance: { verified: boolean; documents: string[] };
  incomeLedger: { totalEarned: number; currency: string };
  createdAt: Date;
  updatedAt: Date;
}
