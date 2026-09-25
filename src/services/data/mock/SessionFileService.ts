// ────────────────────────────────────────────────────────────────────────────
// The session adapter for the file seam (RFx A2 · AR-07).
//
// A thin wrapper over `sessionAttachments`: the bytes stay in this browser
// session only, and `urlFor` answers `null` after a reload, exactly as before
// the seam existed (CE-11). BL-27 replaces this class with an adapter that
// uploads; no component changes when it does.
//
// The access log (RFx B5, NR-1 BR-10) is held on this instance: each open or
// download is appended with who and the clock's time, and never edited. Like
// the bytes, it lasts for this session until BL-27 stores it.
// ────────────────────────────────────────────────────────────────────────────

import type { FileAccess, IFileService } from '../types';
import type { ActorAttribution } from '../../../lib/enforcement';
import { sdcClock } from '../../sdc/clock';
import type { AttachmentMeta } from '../../sourcing/rfqModel';
import { sessionAttachments } from '../../attachments/sessionAttachments';

export class SessionFileService implements IFileService {
  private readonly log = new Map<string, readonly FileAccess[]>();

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

  recordAccess(fileId: string, by: ActorAttribution): void {
    const entry: FileAccess = Object.freeze({ fileId, by, at: sdcClock.now() });
    this.log.set(fileId, Object.freeze([...(this.log.get(fileId) ?? []), entry]));
  }

  accessLog(fileId: string): readonly FileAccess[] {
    return this.log.get(fileId) ?? [];
  }
}
