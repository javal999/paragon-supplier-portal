import { describe, expect, it } from 'vitest';
import {
  ALLOWED_FILE_EXTENSIONS,
  MAX_FILES_PER_RESPONSE,
  MAX_FILE_BYTES,
  fileLimitRefusal
} from './fileRules';

const pdf = (size = 1024) => ({ name: 'spec.pdf', size, type: 'application/pdf' });

describe('fileLimitRefusal — NR-1 BR-05 (D-3)', () => {
  it('the limits are the owner’s D-3 values', () => {
    expect(MAX_FILE_BYTES).toBe(25 * 1024 * 1024);
    expect(MAX_FILES_PER_RESPONSE).toBe(30);
    expect([...ALLOWED_FILE_EXTENSIONS].sort()).toEqual(
      [
        'pdf',
        'doc',
        'docx',
        'xls',
        'xlsx',
        'ppt',
        'pptx',
        'jpg',
        'jpeg',
        'png',
        'dwg',
        'dxf',
        'step',
        'stp'
      ].sort()
    );
  });

  describe('FILE_TOO_LARGE', () => {
    it('passes a file of exactly 25 MB', () => {
      expect(fileLimitRefusal(pdf(MAX_FILE_BYTES), 0)).toBeNull();
    });
    it('fires at 25 MB + 1 byte', () => {
      expect(fileLimitRefusal(pdf(MAX_FILE_BYTES + 1), 0)).toBe('FILE_TOO_LARGE');
    });
  });

  describe('FILE_TYPE_NOT_ALLOWED', () => {
    it.each([
      'a.pdf',
      'a.DOCX',
      'a.xls',
      'a.pptx',
      'a.jpeg',
      'a.png',
      'a.dwg',
      'a.dxf',
      'a.step',
      'a.STP'
    ])('passes %s', (name) => {
      expect(fileLimitRefusal({ name, size: 10, type: '' }, 0)).toBeNull();
    });
    it('passes .PDF in upper case', () => {
      expect(
        fileLimitRefusal({ name: 'DRAWING.PDF', size: 10, type: 'application/pdf' }, 0)
      ).toBeNull();
    });
    it('fires on .zip', () => {
      expect(fileLimitRefusal({ name: 'bundle.zip', size: 10, type: 'application/zip' }, 0)).toBe(
        'FILE_TYPE_NOT_ALLOWED'
      );
    });
    it('fires on .exe', () => {
      expect(
        fileLimitRefusal({ name: 'setup.exe', size: 10, type: 'application/x-msdownload' }, 0)
      ).toBe('FILE_TYPE_NOT_ALLOWED');
    });
    it('fires on a name with no extension, and on a disguised double extension', () => {
      expect(fileLimitRefusal({ name: 'README', size: 10, type: '' }, 0)).toBe(
        'FILE_TYPE_NOT_ALLOWED'
      );
      expect(fileLimitRefusal({ name: 'invoice.pdf.exe', size: 10, type: '' }, 0)).toBe(
        'FILE_TYPE_NOT_ALLOWED'
      );
    });
    it('judges by the name, not the reported MIME type', () => {
      expect(fileLimitRefusal({ name: 'bundle.zip', size: 10, type: 'application/pdf' }, 0)).toBe(
        'FILE_TYPE_NOT_ALLOWED'
      );
    });
  });

  describe('FILE_COUNT_EXCEEDED', () => {
    it('passes the 30th file', () => {
      expect(fileLimitRefusal(pdf(), 29)).toBeNull();
    });
    it('fires on the 31st file', () => {
      expect(fileLimitRefusal(pdf(), 30)).toBe('FILE_COUNT_EXCEEDED');
    });
  });
});
