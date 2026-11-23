const BROWSERS: [RegExp, string][] = [
  [/Edg\/(\d+)/, 'Edge'],
  [/OPR\/(\d+)/, 'Opera'],
  [/Firefox\/(\d+)/, 'Firefox'],
  [/Chrome\/(\d+)/, 'Chrome'],
  [/Version\/(\d+)[\d.]* (?:Mobile\/\S+ )?Safari/, 'Safari'],
];
const CLIENTS = /(okhttp|Dart|PostmanRuntime|curl|axios|Java-http-client)/i;
const SYSTEMS: [RegExp, string][] = [
  [/Windows/, 'Windows'],
  [/Android/, 'Android'],
  [/iPhone|iPad/, 'iOS'],
  [/Mac OS X/, 'macOS'],
  [/Linux/, 'Linux'],
];

/** Short, human summary of a user-agent string, e.g. "Chrome 140 on Windows". Null if unrecognised. */
export function parseUserAgent(ua: string | null | undefined): string | null {
  if (!ua) return null;
  let browser: string | null = null;
  for (const [re, name] of BROWSERS) {
    const m = re.exec(ua);
    if (m) {
      browser = `${name} ${m[1]}`;
      break;
    }
  }
  if (!browser) browser = CLIENTS.exec(ua)?.[1] ?? null;
  const os = SYSTEMS.find(([re]) => re.test(ua))?.[1] ?? null;
  if (!browser && !os) return null;
  return [browser, os && `on ${os}`].filter(Boolean).join(' ');
}
