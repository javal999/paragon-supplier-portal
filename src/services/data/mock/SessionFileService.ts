// ────────────────────────────────────────────────────────────────────────────
// The session adapter for the file seam (RFx A2 · AR-07).
//
// A thin wrapper over `sessionAttachments`: the bytes stay in this browser
// session only, and `urlFor` answers `null` after a reload, exactly as before
// the seam existed (CE-11). BL-27 replaces this class with an adapter that
// uploads; no component changes when it does.
// ────────────────────────────────────────────────────────────────────────────

import type { IFileService } from '../types';
import type { AttachmentMeta } from '../../sourcing/rfqModel';
import { sessionAttachments } from '../../attachments/sessionAttachments';

export class SessionFileService implements IFileService {
  async put(file: File): Promise<AttachmentMeta> {
    return sessionAttachments.add(file);
  }

  urlFor(id: string): string | null {
    return sessionAttachments.urlFor(id);
  }

  release(id: string): void {
    sessionAttachments.release(id);
  }

  isHeld(id: string): boolean {
    return sessionAttachments.urlFor(id) !== null;
  }
}
