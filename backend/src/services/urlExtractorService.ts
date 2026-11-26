import dns from 'node:dns/promises';
import net from 'node:net';
import { classifySourceCredibility, type SearchResultItem } from './ragEngine.ts';

export interface ExtractedUrlContext {
  url: string;
  title: string;
  extractedClaimText: string;
  articleItem: SearchResultItem;
}

export type UrlExtractionStatus =
  | 'html_extracted'
  | 'pdf_extracted'
  | 'pdf_extraction_failed'
  | 'invalid_url'
  | 'blocked_private_url'
  | 'unavailable_webpage'
  | 'timeout';

export interface UrlExtractionResult {
  status: UrlExtractionStatus;
  reason?: string;
  context?: ExtractedUrlContext;
}

function isPrivateOrReservedIpv4(ip: string): boolean {
  const parts = ip.split('.').map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b] = parts;
  if (a === 0) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 169 && b === 254) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 100 && b >= 64 && b <= 127) return true;
  if (a >= 224) return true;
  return false;
}

function isPrivateOrReservedIp(rawIp: string): boolean {
  const ip = rawIp.trim().toLowerCase().replace(/^\[|\]$/g, '');
  const zoneIdx = ip.indexOf('%');
  const cleanIp = zoneIdx !== -1 ? ip.slice(0, zoneIdx) : ip;
  const ipVersion = net.isIP(cleanIp);
  if (ipVersion === 4) {
    return isPrivateOrReservedIpv4(cleanIp);
  }
  if (ipVersion === 6) {
    if (cleanIp === '::' || cleanIp === '::1') return true;
    if (cleanIp.startsWith('::ffff:')) {
      const mappedV4 = cleanIp.slice('::ffff:'.length);
      if (net.isIP(mappedV4) === 4) return isPrivateOrReservedIpv4(mappedV4);
      return true;
    }
    if (cleanIp.startsWith('fc') || cleanIp.startsWith('fd')) return true;
    if (
      cleanIp.startsWith('fe8') ||
      cleanIp.startsWith('fe9') ||
      cleanIp.startsWith('fea') ||
      cleanIp.startsWith('feb')
    ) {
      return true;
    }
    if (cleanIp.startsWith('ff')) return true;
    return false;
  }
  return true;
}

function decodeBasicHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#039;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#(\d+);/g, (_m, dec) => {
      const code = Number.parseInt(dec, 10);
      return Number.isFinite(code) && code > 0 && code < 0x10ffff ? String.fromCodePoint(code) : ' ';
    })
    .replace(/\s+/g, ' ')
    .trim();
}

function extractMetaContent(html: string, attrName: string, attrValue: string): string {
  const escaped = attrValue.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re1 = new RegExp(
    `<meta[^>]*${attrName}=["']${escaped}["'][^>]*content=["']([^"']{3,500})["'][^>]*>`,
    'i'
  );
  const re2 = new RegExp(
    `<meta[^>]*content=["']([^"']{3,500})["'][^>]*${attrName}=["']${escaped}["'][^>]*>`,
    'i'
  );
  const m = html.match(re1) || html.match(re2);
  return m?.[1] ? decodeBasicHtmlEntities(m[1]) : '';
}

function extractReadableTextFromPdfBuffer(buf: Uint8Array): string {
  const rawLatin = Buffer.from(buf).toString('latin1');
  const extractedParts: string[] = [];
  const literalRegex = /\(([^()\\]{3,220}(?:\\.[^()\\]{0,80})*)\)/g;
  for (const m of rawLatin.matchAll(literalRegex)) {
    const cleaned = m[1]
      .replace(/\\n/g, ' ')
      .replace(/\\r/g, ' ')
      .replace(/\\t/g, ' ')
      .replace(/\\([()\\])/g, '$1')
      .replace(/[^\x20-\x7E]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    if (cleaned.length >= 4 && /[A-Za-z]{2,}/.test(cleaned)) {
      extractedParts.push(cleaned);
    }
    if (extractedParts.length >= 160) break;
  }
  return extractedParts.join(' ').replace(/\s+/g, ' ').trim();
}

/**
 * SSRF-Safe Public URL & PDF Article Extractor.
 */
export async function fetchSafeUrlArticleContext(rawInput: string): Promise<UrlExtractionResult> {
  const urlMatch = rawInput.match(/https?:\/\/[^\s"'<>]+/i);
  if (!urlMatch) {
    return { status: 'invalid_url', reason: 'The provided URL is missing a valid http/https address.' };
  }

  let parsed: URL;
  try {
    parsed = new URL(urlMatch[0]);
  } catch {
    return { status: 'invalid_url', reason: 'The submitted URL could not be parsed as a valid web address.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { status: 'invalid_url', reason: 'Only standard HTTP/HTTPS web addresses are supported.' };
  }
  if (parsed.username || parsed.password) {
    return {
      status: 'blocked_private_url',
      reason: 'URLs with embedded credentials cannot be inspected for security reasons.',
    };
  }
  if (parsed.port && parsed.port !== '80' && parsed.port !== '443') {
    return { status: 'blocked_private_url', reason: 'Non-standard network ports are restricted for URL retrieval.' };
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    !hostname ||
    hostname === 'localhost' ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname === 'metadata.google.internal'
  ) {
    return {
      status: 'blocked_private_url',
      reason: 'Local or internal network URLs are blocked from external inspection.',
    };
  }

  if (net.isIP(hostname)) {
    if (isPrivateOrReservedIp(hostname)) {
      return { status: 'blocked_private_url', reason: 'Private or reserved IP addresses cannot be inspected.' };
    }
  } else {
    try {
      const resolved = await dns.lookup(hostname, { all: true });
      if (!resolved || resolved.length === 0) {
        return { status: 'unavailable_webpage', reason: `Could not resolve domain "${hostname}".` };
      }
      if (resolved.some((addr) => isPrivateOrReservedIp(addr.address))) {
        return { status: 'blocked_private_url', reason: 'Target domain resolves to a private network address.' };
      }
    } catch {
      return {
        status: 'unavailable_webpage',
        reason: `Webpage domain "${hostname}" is unreachable or does not exist.`,
      };
    }
  }

  const looksLikePdfUrl = /\.pdf(?:$|\?)/i.test(parsed.pathname + parsed.search);

  try {
    const res = await fetch(parsed.toString(), {
      method: 'GET',
      redirect: 'manual',
      headers: {
        'User-Agent': 'TruthLens-Verify/3.1 (Civic-Fact-Check)',
        Accept: 'text/html,application/xhtml+xml,text/plain,application/pdf;q=0.8',
      },
      signal: AbortSignal.timeout(4000),
    });

    if (res.status >= 300 && res.status < 400) {
      return {
        status: 'unavailable_webpage',
        reason: `Webpage returned an HTTP ${res.status} redirect that was not automatically followed.`,
      };
    }

    if (!res.ok || res.status < 200 || res.status >= 300) {
      return {
        status: 'unavailable_webpage',
        reason: `Webpage returned HTTP ${res.status} (${res.statusText || 'Unavailable'}).`,
      };
    }

    const contentType = (res.headers.get('content-type') || '').toLowerCase();
    const isPdfResponse = contentType.includes('application/pdf') || looksLikePdfUrl;

    if (isPdfResponse) {
      const MAX_PDF_BYTES = 350_000;
      const buf = new Uint8Array(await res.arrayBuffer()).slice(0, MAX_PDF_BYTES);
      const pdfText = extractReadableTextFromPdfBuffer(buf);
      if (pdfText.length < 60) {
        return {
          status: 'pdf_extraction_failed',
          reason: `Linked PDF document (${hostname}) appears scanned or compressed and could not be parsed cleanly into plain text.`,
        };
      }
      const cred = classifySourceCredibility(parsed.toString(), hostname);
      const pdfHeadline = pdfText.slice(0, 260);
      return {
        status: 'pdf_extracted',
        context: {
          url: parsed.toString(),
          title: `PDF Document (${hostname})`,
          extractedClaimText: pdfHeadline,
          articleItem: {
            title: `PDF Document (${hostname})`,
            url: parsed.toString(),
            snippet: pdfText.slice(0, 1800),
            publicationDate: 'Submitted PDF URL',
            sourceName: `Submitted PDF (${hostname})`,
            category: cred.categoryLabel,
            isPrimary: cred.isPrimary,
            credibilityTier: cred.credibilityTier,
          },
        },
      };
    }

    if (
      contentType &&
      !contentType.includes('text/html') &&
      !contentType.includes('application/xhtml') &&
      !contentType.includes('text/plain')
    ) {
      return {
        status: 'unavailable_webpage',
        reason: `Unsupported document content type (${contentType.split(';')[0]}) for webpage claim extraction.`,
      };
    }

    const MAX_BYTES = 250_000;
    let html = '';
    if (res.body) {
      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8', { fatal: false });
      let received = 0;
      while (received < MAX_BYTES) {
        const { done, value } = await reader.read();
        if (done) break;
        if (value) {
          received += value.byteLength;
          html += decoder.decode(value, { stream: true });
        }
      }
      html += decoder.decode();
      try {
        await reader.cancel();
      } catch {
        // Ignore cancel errors
      }
    } else {
      html = (await res.text()).slice(0, MAX_BYTES);
    }

    const titleTagMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const ogTitle =
      extractMetaContent(html, 'property', 'og:title') ||
      extractMetaContent(html, 'name', 'twitter:title');
    const rawTitle = decodeBasicHtmlEntities(ogTitle || titleTagMatch?.[1] || hostname);
    const title = rawTitle.replace(/\s+[|\-–—]\s+[^|\-–—]{2,40}$/, '').trim() || rawTitle;

    const description =
      extractMetaContent(html, 'property', 'og:description') ||
      extractMetaContent(html, 'name', 'description');

    const pubTime =
      extractMetaContent(html, 'property', 'article:published_time') ||
      extractMetaContent(html, 'name', 'pubdate') ||
      html.match(/<time[^>]*datetime=["']([^"']+)["']/i)?.[1] ||
      '';

    const strippedBody = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<(?:nav|footer|aside|header)[\s\S]*?<\/(?:nav|footer|aside|header)>/gi, ' ')
      .replace(/<[^>]+>/g, ' ');
    const bodyText = decodeBasicHtmlEntities(strippedBody).slice(0, 1800);

    const combinedSnippet = [title, description, bodyText].filter(Boolean).join('. ').slice(0, 2000);
    if (combinedSnippet.length < 25) {
      return {
        status: 'unavailable_webpage',
        reason: `Webpage (${hostname}) returned empty or unreadable body text.`,
      };
    }

    const extractedClaimText =
      description && !description.toLowerCase().includes(title.toLowerCase().slice(0, 24))
        ? `${title}. ${description}`.slice(0, 450)
        : title.slice(0, 350);

    const cred = classifySourceCredibility(parsed.toString(), hostname);
    let formattedPubDate = 'Submitted URL';
    if (pubTime) {
      const parsedDate = new Date(pubTime);
      if (!Number.isNaN(parsedDate.getTime())) {
        formattedPubDate = parsedDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric',
        });
      }
    }

    return {
      status: 'html_extracted',
      context: {
        url: parsed.toString(),
        title,
        extractedClaimText,
        articleItem: {
          title,
          url: parsed.toString(),
          snippet: combinedSnippet,
          publicationDate: formattedPubDate,
          sourceName: `Submitted URL (${hostname})`,
          category: cred.categoryLabel,
          isPrimary: cred.isPrimary,
          credibilityTier: cred.credibilityTier,
        },
      },
    };
  } catch (err: any) {
    const isTimeout =
      err?.name === 'TimeoutError' || String(err?.message || '').toLowerCase().includes('timeout');
    return {
      status: isTimeout ? 'timeout' : 'unavailable_webpage',
      reason: isTimeout
        ? `Timed out waiting for "${hostname}" to respond.`
        : `Failed to retrieve webpage from "${hostname}" (${err?.message || 'network unavailable'}).`,
    };
  }
}
