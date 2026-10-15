import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('staat interne paden toe', () => {
    expect(safeReturnUrl('/mengsels/3')).toBe('/mengsels/3');
  });

  it.each([undefined, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'javascript:alert(1)'])(
    'weigert %s',
    (url) => {
      expect(safeReturnUrl(url)).toBe('/');
    },
  );
});
