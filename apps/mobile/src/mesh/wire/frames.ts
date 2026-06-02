/**
 * Link-level frame types. Frames are protocol units exchanged over one peer
 * session; they are NOT status objects. The frame wrapper carries an opaque
 * payload — higher layers (envelope, inventory, want, fragment) own their own
 * payload encoding, so this wire layer stays decoupled from object semantics.
 */

export enum FrameType {
  HELLO = 0x01,
  HANDSHAKE = 0x02,
  INVENTORY_SUMMARY = 0x03,
  WANT_LIST = 0x04,
  ENVELOPE = 0x05,
  FRAGMENT = 0x06,
  RECEIPT = 0x07,
  LINK_ACK = 0x08,
  GOODBYE = 0x09,
  ERROR = 0x0a,
}

export const FRAME_VERSION = 1;
export const SESSION_ID_BYTES = 8;

export type Frame = {
  version: number;
  type: number; // FrameType, but kept numeric for forward-compatibility
  seq: number;
  sessionId: Uint8Array; // SESSION_ID_BYTES
  payload: Uint8Array;
};

export class FrameError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FrameError';
  }
}
