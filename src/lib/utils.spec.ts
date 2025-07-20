import { slugifyAndRemoveExtension } from './utils';

describe('slugifyAndRemoveExtension', () => {
  describe('basic functionality', () => {
    it('should slugify a simple string with spaces', () => {
      expect(slugifyAndRemoveExtension('giorgi test')).toBe('giorgi-test');
    });

    it('should remove file extensions', () => {
      expect(slugifyAndRemoveExtension('giorgi test.pdf')).toBe('giorgi-test');
      expect(slugifyAndRemoveExtension('my file name.txt')).toBe('my-file-name');
      expect(slugifyAndRemoveExtension('document.docx')).toBe('document');
    });

    it('should handle multiple file extensions', () => {
      expect(slugifyAndRemoveExtension('file.backup.txt')).toBe('file-backup');
    });

    it('should handle strings without extensions', () => {
      expect(slugifyAndRemoveExtension('simple text')).toBe('simple-text');
      expect(slugifyAndRemoveExtension('camelCase')).toBe('camelcase');
    });
  });

  describe('special characters and formatting', () => {
    it('should handle special characters', () => {
      expect(slugifyAndRemoveExtension('file@name#.pdf')).toBe('filename');
      expect(slugifyAndRemoveExtension('my-file_name.txt')).toBe('my-file-name');
    });

    it('should handle multiple spaces and underscores', () => {
      expect(slugifyAndRemoveExtension('multiple   spaces.pdf')).toBe('multiple-spaces');
      expect(slugifyAndRemoveExtension('file___name.txt')).toBe('file-name');
    });

    it('should handle mixed case', () => {
      expect(slugifyAndRemoveExtension('CamelCase File.pdf')).toBe('camelcase-file');
      expect(slugifyAndRemoveExtension('UPPERCASE TEXT.txt')).toBe('uppercase-text');
    });

    it('should remove leading and trailing hyphens', () => {
      expect(slugifyAndRemoveExtension('-leading-hyphen.pdf')).toBe('leading-hyphen');
      expect(slugifyAndRemoveExtension('trailing-hyphen-.txt')).toBe('trailing-hyphen');
      expect(slugifyAndRemoveExtension('-both-hyphens-.pdf')).toBe('both-hyphens');
    });

    it('should handle multiple consecutive hyphens', () => {
      expect(slugifyAndRemoveExtension('file--name.pdf')).toBe('file-name');
      expect(slugifyAndRemoveExtension('multiple---hyphens.txt')).toBe('multiple-hyphens');
    });
  });

  describe('edge cases', () => {
    it('should handle empty string', () => {
      expect(slugifyAndRemoveExtension('')).toBe('');
    });

    it('should handle null and undefined', () => {
      expect(slugifyAndRemoveExtension(null as any)).toBe('');
      expect(slugifyAndRemoveExtension(undefined as any)).toBe('');
    });

    it('should handle non-string inputs', () => {
      expect(slugifyAndRemoveExtension(123 as any)).toBe('');
      expect(slugifyAndRemoveExtension({} as any)).toBe('');
    });

    it('should handle strings with only special characters', () => {
      expect(slugifyAndRemoveExtension('!@#$%^&*().pdf')).toBe('');
      expect(slugifyAndRemoveExtension('---.txt')).toBe('');
    });

    it('should handle strings with only file extensions', () => {
      expect(slugifyAndRemoveExtension('.pdf')).toBe('');
      expect(slugifyAndRemoveExtension('.txt')).toBe('');
    });

    it('should handle strings with only spaces', () => {
      expect(slugifyAndRemoveExtension('   ')).toBe('');
      expect(slugifyAndRemoveExtension('  .pdf')).toBe('');
    });
  });

  describe('real-world examples', () => {
    it('should handle common file names', () => {
      expect(slugifyAndRemoveExtension('My Resume 2024.pdf')).toBe('my-resume-2024');
      expect(slugifyAndRemoveExtension('project_documentation.docx')).toBe('project-documentation');
      expect(slugifyAndRemoveExtension('user-profile-photo.jpg')).toBe('user-profile-photo');
    });

    it('should handle complex file names', () => {
      expect(slugifyAndRemoveExtension('Annual Report Q4 2023_Final_v2.pdf')).toBe(
        'annual-report-q4-2023-final-v2',
      );
      expect(slugifyAndRemoveExtension('user@example.com_profile.png')).toBe(
        'userexample-com-profile',
      );
    });
  });
});
