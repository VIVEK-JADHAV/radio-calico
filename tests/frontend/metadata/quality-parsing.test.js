/**
 * @jest-environment jsdom
 */

// Parse source quality from metadata (from script.js logic)
function parseSourceQuality(data) {
  if (data.quality) {
    return data.quality;
  } else if (data.source_quality) {
    return data.source_quality;
  } else {
    const parts = [];

    // Add bit depth with "-bit" suffix
    if (data.bit_depth) {
      parts.push(`${data.bit_depth}-bit`);
    } else if (data.bitrate) {
      parts.push(data.bitrate.toString().includes('bit') ? data.bitrate : `${data.bitrate}-bit`);
    }

    // Add sample rate converted from Hz to kHz
    const sampleRateValue = data.sample_rate || data.samplerate;
    if (sampleRateValue) {
      const sampleRateKHz = parseFloat(sampleRateValue) / 1000;
      parts.push(`${sampleRateKHz}kHz`);
    }

    return parts.length > 0 ? parts.join(' ') : '16-bit 44.1kHz';
  }
}

describe('Quality Parsing', () => {
  describe('parseSourceQuality', () => {
    test('should use direct quality field if available', () => {
      const data = { quality: '24-bit 96kHz' };
      expect(parseSourceQuality(data)).toBe('24-bit 96kHz');
    });

    test('should use source_quality field if quality not available', () => {
      const data = { source_quality: '16-bit 48kHz' };
      expect(parseSourceQuality(data)).toBe('16-bit 48kHz');
    });

    test('should prefer quality over source_quality', () => {
      const data = {
        quality: '24-bit 96kHz',
        source_quality: '16-bit 44.1kHz'
      };
      expect(parseSourceQuality(data)).toBe('24-bit 96kHz');
    });

    test('should convert Hz to kHz (44100 Hz)', () => {
      const data = { bit_depth: '16', sample_rate: 44100 };
      expect(parseSourceQuality(data)).toBe('16-bit 44.1kHz');
    });

    test('should convert Hz to kHz (48000 Hz)', () => {
      const data = { bit_depth: '16', sample_rate: 48000 };
      expect(parseSourceQuality(data)).toBe('16-bit 48kHz');
    });

    test('should convert Hz to kHz (96000 Hz)', () => {
      const data = { bit_depth: '24', sample_rate: 96000 };
      expect(parseSourceQuality(data)).toBe('24-bit 96kHz');
    });

    test('should convert Hz to kHz (192000 Hz)', () => {
      const data = { bit_depth: '24', sample_rate: 192000 };
      expect(parseSourceQuality(data)).toBe('24-bit 192kHz');
    });

    test('should handle bit_depth without sample_rate', () => {
      const data = { bit_depth: '16' };
      expect(parseSourceQuality(data)).toBe('16-bit');
    });

    test('should handle sample_rate without bit_depth', () => {
      const data = { sample_rate: 48000 };
      expect(parseSourceQuality(data)).toBe('48kHz');
    });

    test('should use samplerate as alternative to sample_rate', () => {
      const data = { bit_depth: '16', samplerate: 44100 };
      expect(parseSourceQuality(data)).toBe('16-bit 44.1kHz');
    });

    test('should add -bit suffix if bitrate missing suffix', () => {
      const data = { bitrate: '16', sample_rate: 44100 };
      expect(parseSourceQuality(data)).toBe('16-bit 44.1kHz');
    });

    test('should not duplicate -bit suffix if already present', () => {
      const data = { bitrate: '16-bit', sample_rate: 44100 };
      expect(parseSourceQuality(data)).toBe('16-bit 44.1kHz');
    });

    test('should return fallback for empty data', () => {
      const data = {};
      expect(parseSourceQuality(data)).toBe('16-bit 44.1kHz');
    });

    test('should handle string numbers', () => {
      const data = { bit_depth: '24', sample_rate: '96000' };
      expect(parseSourceQuality(data)).toBe('24-bit 96kHz');
    });

    test('should handle numeric values', () => {
      const data = { bit_depth: 24, sample_rate: 96000 };
      expect(parseSourceQuality(data)).toBe('24-bit 96kHz');
    });

    test('should handle common CD quality (16-bit 44.1kHz)', () => {
      const data = { bit_depth: '16', sample_rate: 44100 };
      expect(parseSourceQuality(data)).toBe('16-bit 44.1kHz');
    });

    test('should handle DVD audio quality (24-bit 96kHz)', () => {
      const data = { bit_depth: '24', sample_rate: 96000 };
      expect(parseSourceQuality(data)).toBe('24-bit 96kHz');
    });

    test('should handle high-res audio (24-bit 192kHz)', () => {
      const data = { bit_depth: '24', sample_rate: 192000 };
      expect(parseSourceQuality(data)).toBe('24-bit 192kHz');
    });

    test('should handle broadcast quality (16-bit 48kHz)', () => {
      const data = { bit_depth: '16', sample_rate: 48000 };
      expect(parseSourceQuality(data)).toBe('16-bit 48kHz');
    });
  });
});
