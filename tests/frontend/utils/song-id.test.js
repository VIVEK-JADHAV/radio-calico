/**
 * @jest-environment jsdom
 */

// Generate song ID from artist and title (from script.js)
function generateSongId(artist, title) {
  return `${artist}||${title}`.toLowerCase().replace(/[^a-z0-9||]/g, '');
}

describe('Song ID Generation', () => {
  describe('generateSongId', () => {
    test('should create ID from artist and title', () => {
      const id = generateSongId('The Beatles', 'Hey Jude');
      expect(id).toBe('thebeatles||heyjude');
    });

    test('should convert to lowercase', () => {
      const id = generateSongId('ARTIST NAME', 'SONG TITLE');
      expect(id).toBe('artistname||songtitle');
    });

    test('should remove spaces', () => {
      const id = generateSongId('Artist With Spaces', 'Song With Spaces');
      expect(id).toBe('artistwithspaces||songwithspaces');
    });

    test('should remove special characters', () => {
      const id = generateSongId("Artist's Name", "Song's Title!");
      expect(id).toBe('artistsname||songstitle');
    });

    test('should preserve separator', () => {
      const id = generateSongId('Artist', 'Title');
      expect(id).toContain('||');
      expect(id.split('||').length).toBe(2);
    });

    test('should handle numbers in artist and title', () => {
      const id = generateSongId('Blink-182', 'All The Small Things');
      expect(id).toBe('blink182||allthesmallthings');
    });

    test('should remove punctuation', () => {
      const id = generateSongId('Artist, The', 'Song: Subtitle');
      expect(id).toBe('artistthe||songsubtitle');
    });

    test('should handle parentheses', () => {
      const id = generateSongId('Artist (Band)', 'Song (Live Version)');
      expect(id).toBe('artistband||songliveversion');
    });

    test('should handle ampersands', () => {
      const id = generateSongId('Artist & Band', 'Song & Dance');
      expect(id).toBe('artistband||songdance');
    });

    test('should handle hyphens and dashes', () => {
      const id = generateSongId('Up-Tempo Band', 'Fast-Paced Song');
      expect(id).toBe('uptempoband||fastpacedsong');
    });

    test('should handle empty strings', () => {
      const id = generateSongId('', '');
      expect(id).toBe('||');
    });

    test('should create unique IDs for different songs', () => {
      const id1 = generateSongId('Artist 1', 'Song 1');
      const id2 = generateSongId('Artist 2', 'Song 2');
      expect(id1).not.toBe(id2);
    });

    test('should create same ID for same song', () => {
      const id1 = generateSongId('The Beatles', 'Yesterday');
      const id2 = generateSongId('The Beatles', 'Yesterday');
      expect(id1).toBe(id2);
    });

    test('should handle unicode characters', () => {
      const id = generateSongId('Artíst Nãme', 'Sõng Títle');
      // Unicode characters are removed by the regex, leaving only ASCII alphanumeric
      expect(id).toBe('artstnme||sngttle');
    });

    test('should handle real-world examples', () => {
      const examples = [
        { artist: 'Led Zeppelin', title: 'Stairway to Heaven', expected: 'ledzeppelin||stairwaytoheaven' },
        { artist: 'Queen', title: "Bohemian Rhapsody", expected: 'queen||bohemianrhapsody' },
        { artist: 'Pink Floyd', title: 'Comfortably Numb', expected: 'pinkfloyd||comfortablynumb' },
        { artist: 'The Rolling Stones', title: "(I Can't Get No) Satisfaction", expected: 'therollingstones||icantgetnosatisfaction' }
      ];

      examples.forEach(({ artist, title, expected }) => {
        const id = generateSongId(artist, title);
        expect(id).toBe(expected);
      });
    });
  });
});
