/**
 * @jest-environment jsdom
 */

// Format time as M:SS (from script.js)
function formatTime(seconds) {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

describe('Time Formatting', () => {
  describe('formatTime', () => {
    test('should format 0 seconds as 0:00', () => {
      expect(formatTime(0)).toBe('0:00');
    });

    test('should format single digit seconds with leading zero', () => {
      expect(formatTime(5)).toBe('0:05');
      expect(formatTime(9)).toBe('0:09');
    });

    test('should format double digit seconds without leading zero', () => {
      expect(formatTime(15)).toBe('0:15');
      expect(formatTime(59)).toBe('0:59');
    });

    test('should format exactly 60 seconds as 1:00', () => {
      expect(formatTime(60)).toBe('1:00');
    });

    test('should format minutes and seconds correctly', () => {
      expect(formatTime(65)).toBe('1:05');
      expect(formatTime(125)).toBe('2:05');
      expect(formatTime(185)).toBe('3:05');
    });

    test('should format multiple minutes correctly', () => {
      expect(formatTime(120)).toBe('2:00');
      expect(formatTime(180)).toBe('3:00');
      expect(formatTime(600)).toBe('10:00');
    });

    test('should handle large time values', () => {
      expect(formatTime(3599)).toBe('59:59');
      expect(formatTime(3600)).toBe('60:00');
      expect(formatTime(7200)).toBe('120:00');
    });

    test('should format common durations', () => {
      expect(formatTime(30)).toBe('0:30');   // 30 seconds
      expect(formatTime(90)).toBe('1:30');   // 1.5 minutes
      expect(formatTime(210)).toBe('3:30');  // 3.5 minutes
      expect(formatTime(300)).toBe('5:00');  // 5 minutes
    });
  });
});
