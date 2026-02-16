
export enum CallStatus {
  IDLE = 'IDLE',
  CONNECTING = 'CONNECTING',
  RINGING = 'RINGING',
  IN_CALL = 'IN_CALL',
  RECEIVING = 'RECEIVING'
}

export interface UserProfile {
  id: string;
  name: string;
}

export interface CallSession {
  remotePeerId: string;
  isIncoming: boolean;
  status: CallStatus;
}

declare global {
  interface Window {
    Peer: any;
  }
}
