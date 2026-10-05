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

/** @import { FileAccess, IFileService } from '../types' */
/** @import { ActorAttribution } from '@lib/enforcement' */
import { sdcClock } from '../../sdc/clock';
/** @import { AttachmentMeta } from '../../sourcing/rfqModel' */
import { sessionAttachments } from '../../attachments/sessionAttachments';

/** @implements {IFileService} */
export class SessionFileService {
  /**
   * @private
   * @readonly
   */
  log = /** @type {Map<string, readonly FileAccess[]>} */ (new Map());

  /**
   * @param {File} file
   * @returns {Promise<AttachmentMeta>}
   */
  async put(file) {
    return sessionAttachments.add(file);
  }

  /**
   * @param {string} id
   * @returns {string | null}
   */
  urlFor(id) {
    return sessionAttachments.urlFor(id);
  }

  /**
   * @param {string} id
   * @returns {void}
   */
  release(id) {
    sessionAttachments.release(id);
  }

  /**
   * @param {string} id
   * @returns {boolean}
   */
  isHeld(id) {
    return sessionAttachments.urlFor(id) !== null;
  }

  /**
   * @param {string} fileId
   * @param {ActorAttribution} by
   * @returns {void}
   */
  recordAccess(fileId, by) {
    /** @type {FileAccess} */
    const entry = Object.freeze({ fileId, by, at: sdcClock.now() });
    this.log.set(fileId, Object.freeze([...(this.log.get(fileId) ?? []), entry]));
  }

  /**
   * @param {string} fileId
   * @returns {readonly FileAccess[]}
   */
  accessLog(fileId) {
    return this.log.get(fileId) ?? [];
  }
}
