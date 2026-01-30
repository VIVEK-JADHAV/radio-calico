// Helper function to get client IP (same as in server.js)
function getClientIp(req) {
  return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
         req.headers['x-real-ip'] ||
         req.socket.remoteAddress ||
         req.connection.remoteAddress;
}

describe('IP Detection', () => {
  describe('getClientIp', () => {
    test('should extract IP from x-forwarded-for header', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1'
        },
        socket: { remoteAddress: '10.0.0.1' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.1');
    });

    test('should extract first IP from x-forwarded-for with multiple IPs', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1, 198.51.100.1, 192.0.2.1'
        },
        socket: { remoteAddress: '10.0.0.1' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.1');
    });

    test('should trim whitespace from x-forwarded-for IP', () => {
      const req = {
        headers: {
          'x-forwarded-for': '  203.0.113.1  , 198.51.100.1'
        },
        socket: { remoteAddress: '10.0.0.1' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.1');
    });

    test('should fallback to x-real-ip if x-forwarded-for not present', () => {
      const req = {
        headers: {
          'x-real-ip': '198.51.100.1'
        },
        socket: { remoteAddress: '10.0.0.1' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('198.51.100.1');
    });

    test('should fallback to socket.remoteAddress if headers not present', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '192.0.2.1' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('192.0.2.1');
    });

    test('should fallback to connection.remoteAddress if socket not available', () => {
      const req = {
        headers: {},
        socket: {},
        connection: { remoteAddress: '192.0.2.99' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('192.0.2.99');
    });

    test('should prefer x-forwarded-for over x-real-ip', () => {
      const req = {
        headers: {
          'x-forwarded-for': '203.0.113.1',
          'x-real-ip': '198.51.100.1'
        },
        socket: { remoteAddress: '10.0.0.1' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('203.0.113.1');
    });

    test('should handle IPv6 addresses', () => {
      const req = {
        headers: {
          'x-forwarded-for': '2001:db8::1'
        },
        socket: { remoteAddress: '::1' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('2001:db8::1');
    });

    test('should handle localhost addresses', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '127.0.0.1' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('127.0.0.1');
    });

    test('should handle IPv6 localhost', () => {
      const req = {
        headers: {},
        socket: { remoteAddress: '::1' }
      };

      const ip = getClientIp(req);
      expect(ip).toBe('::1');
    });
  });
});
