import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import { z } from 'zod';

const envSchema = z.object({
  LOVABLE_EVENT_IMPORT_URL: z.string().url(),
  EVENT_INGEST_TOKEN: z.string().min(20),
  MAX_SOURCES: z.coerce.number().int().positive().default(25),
  REQUEST_TIMEOUT_MS: z.coerce.number().int().positive().default(15000),
  USER_AGENT: z.string().default('FoodXMobileEventCrawler/0.2 (+https://foodxmobile.com)'),
});

const env = envSchema.parse(process.env);

type EventSourceRow = {
  id: string;
  source_name: string;
  source_url: string;
  source_type: string;
  city: string;
  region: string;
  category: string | null;
};

type NormalizedEvent = {
  source_id: string;
  source_name: string;
  source_url: string;
  source_event_url: string | null;
  external_id: string | null;
  title: string;
  start_at: string | null;
  end_at: string | null;
  start_date: string | null;
  start_time: string | null;
  end_date: string | null;
  end_time: string | null;
  venue: string | null;
  address: string | null;
  city: string;
  region: string;
  description: string | null;
  image_url: string | null;
  ticket_url: string | null;
  organizer: string | null;
  category: string | null;
  confidence_score: number;
  duplicate_status: 'new';
  review_status: 'pending_review';
  event_fingerprint: string;
  raw_payload: unknown;
};

function asArray<T>(value: T | T[] | null | undefined): T[] {
  if (value == null) return [];
  return Array.isArray(value) ? value : [value];
}

function cleanText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const cleaned = value.replace(/\s+/g, ' ').trim();
  return cleaned.length ? cleaned : null;
}

function firstString(...values: unknown[]): string | null {
  for (const value of values) {
    const cleaned = cleanText(value);
    if (cleaned) return cleaned;
  }
  return null;
}

function flattenJsonLd(node: unknown): unknown[] {
  if (Array.isArray(node)) return node.flatMap(flattenJsonLd);
  if (!node || typeof node !== 'object') return [];

  const record = node as Record<string, unknown>;
  const graph = record['@graph'];
  const nodes = [record];
  if (Array.isArray(graph)) nodes.push(...graph.flatMap(flattenJsonLd) as Record<string, unknown>[]);
  return nodes;
}

function isEventNode(node: unknown): node is Record<string, unknown> {
  if (!node || typeof node !== 'object') return false;
  const typeValue = (node as Record<string, unknown>)['@type'];
  const types = asArray(typeValue).map(String).map((type) => type.toLowerCase());
  return types.includes('event');
}

function parseDateParts(isoValue: string | null): { date: string | null; time: string | null } {
  if (!isoValue) return { date: null, time: null };
  const match = isoValue.match(/^(\d{4}-\d{2}-\d{2})(?:[T\s](\d{2}:\d{2})(?::\d{2})?)?/);
  return { date: match?.[1] ?? null, time: match?.[2] ?? null };
}

function getLocationName(location: unknown): string | null {
  const first = asArray(location)[0];
  if (!first || typeof first !== 'object') return cleanText(location);
  const record = first as Record<string, unknown>;
  return firstString(record.name, record['@id']);
}

function getAddress(location: unknown): string | null {
  const first = asArray(location)[0];
  if (!first || typeof first !== 'object') return null;
  const address = (first as Record<string, unknown>).address;
  if (typeof address === 'string') return cleanText(address);
  if (!address || typeof address !== 'object') return null;

  const record = address as Record<string, unknown>;
  const parts = [record.streetAddress, record.addressLocality, record.addressRegion, record.postalCode]
    .map(cleanText)
    .filter(Boolean);
  return parts.length ? parts.join(', ') : null;
}

function getOfferUrl(node: Record<string, unknown>): string | null {
  const offers = asArray(node.offers);
  for (const offer of offers) {
    if (typeof offer === 'string') return cleanText(offer);
    if (offer && typeof offer === 'object') {
      const url = cleanText((offer as Record<string, unknown>).url);
      if (url) return url;
    }
  }
  return cleanText(node.url);
}

function getImageUrl(node: Record<string, unknown>): string | null {
  const image = asArray(node.image)[0];
  if (typeof image === 'string') return cleanText(image);
  if (image && typeof image === 'object') return cleanText((image as Record<string, unknown>).url);
  return null;
}

function getOrganizer(node: Record<string, unknown>): string | null {
  const organizer = asArray(node.organizer)[0];
  if (typeof organizer === 'string') return cleanText(organizer);
  if (organizer && typeof organizer === 'object') return cleanText((organizer as Record<string, unknown>).name);
  return null;
}

function fingerprint(parts: Array<string | null | undefined>): string {
  return createHash('sha256')
    .update(parts.map((part) => (part ?? '').toLowerCase().trim()).join('|'))
    .digest('hex');
}

function normalizeEvent(node: Record<string, unknown>, source: EventSourceRow): NormalizedEvent | null {
  const title = firstString(node.name, node.headline);
  if (!title) return null;

  const startAt = firstString(node.startDate);
  const endAt = firstString(node.endDate);
  const start = parseDateParts(startAt);
  const end = parseDateParts(endAt);
  const venue = getLocationName(node.location);
  const address = getAddress(node.location);
  const eventUrl = firstString(node.url, node['@id'], source.source_url);
  const eventFingerprint = fingerprint([source.id, title, startAt, venue, eventUrl]);

  let confidence = 40;
  if (startAt) confidence += 20;
  if (venue || address) confidence += 15;
  if (eventUrl) confidence += 10;
  if (node.description) confidence += 10;
  if (getImageUrl(node)) confidence += 5;

  return {
    source_id: source.id,
    source_name: source.source_name,
    source_url: source.source_url,
    source_event_url: eventUrl,
    external_id: cleanText(node.identifier) ?? cleanText(node['@id']),
    title,
    start_at: startAt,
    end_at: endAt,
    start_date: start.date,
    start_time: start.time,
    end_date: end.date,
    end_time: end.time,
    venue,
    address,
    city: source.city,
    region: source.region,
    description: cleanText(node.description),
    image_url: getImageUrl(node),
    ticket_url: getOfferUrl(node),
    organizer: getOrganizer(node),
    category: source.category,
    confidence_score: Math.min(confidence, 100),
    duplicate_status: 'new',
    review_status: 'pending_review',
    event_fingerprint: eventFingerprint,
    raw_payload: node,
  };
}

function sourceHost(source: EventSourceRow): string {
  try {
    return new URL(source.source_url).hostname.toLowerCase();
  } catch {
    return '';
  }
}

function absoluteUrl(href: string | null | undefined, baseUrl: string): string | null {
  if (!href) return null;
  try {
    return new URL(href, baseUrl).toString();
  } catch {
    return null;
  }
}

function parseMonthDayFromTitle(title: string): string | null {
  const match = title.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2})\b/i);
  if (!match) return null;

  const monthMap: Record<string, string> = {
    january: '01',
    february: '02',
    march: '03',
    april: '04',
    may: '05',
    june: '06',
    july: '07',
    august: '08',
    september: '09',
    october: '10',
    november: '11',
    december: '12',
  };

  const month = monthMap[match[1].toLowerCase()];
  const day = match[2].padStart(2, '0');
  const year = String(new Date().getFullYear());
  return month ? `${year}-${month}-${day}` : null;
}

function parseTimeRange(text: string): { start_time: string | null; end_time: string | null } {
  const match = text.match(/(\d{1,2}:\d{2})\s*(am|pm)\s*-\s*(\d{1,2}:\d{2})\s*(am|pm)/i);
  if (!match) return { start_time: null, end_time: null };

  return {
    start_time: toTwentyFourHour(match[1], match[2]),
    end_time: toTwentyFourHour(match[3], match[4]),
  };
}

function toTwentyFourHour(time: string, meridiem: string): string {
  const [hourPart, minute] = time.split(':');
  let hour = Number(hourPart);
  const lower = meridiem.toLowerCase();
  if (lower === 'pm' && hour !== 12) hour += 12;
  if (lower === 'am' && hour === 12) hour = 0;
  return `${String(hour).padStart(2, '0')}:${minute}`;
}

function parseGreenBayFoodTruckEvents($: cheerio.CheerioAPI, source: EventSourceRow): NormalizedEvent[] {
  const seen = new Set<string>();
  const events: NormalizedEvent[] = [];

  $('h1 a, h2 a, h3 a, h4 a, h5 a').each((_, element) => {
    const title = cleanText($(element).text());
    if (!title || title.toLowerCase() === 'view event') return;

    const eventUrl = absoluteUrl($(element).attr('href'), source.source_url);
    const fingerprintKey = `${title}|${eventUrl ?? ''}`.toLowerCase();
    if (seen.has(fingerprintKey)) return;
    seen.add(fingerprintKey);

    const nearbyText = cleanText($(element).closest('h1,h2,h3,h4,h5').nextUntil('h1,h2,h3,h4,h5').text()) ?? '';
    const { start_time, end_time } = parseTimeRange(nearbyText);
    const start_date = parseMonthDayFromTitle(title);
    const eventFingerprint = fingerprint([source.id, title, start_date, eventUrl]);
    const start_at = start_date && start_time ? `${start_date}T${start_time}:00` : null;
    const end_at = start_date && end_time ? `${start_date}T${end_time}:00` : null;

    let confidence = 45;
    if (eventUrl) confidence += 15;
    if (start_date) confidence += 10;
    if (start_time && start_time !== '00:00') confidence += 10;

    events.push({
      source_id: source.id,
      source_name: source.source_name,
      source_url: source.source_url,
      source_event_url: eventUrl,
      external_id: eventUrl ?? eventFingerprint,
      title,
      start_at,
      end_at,
      start_date,
      start_time,
      end_date: start_date,
      end_time,
      venue: null,
      address: null,
      city: source.city,
      region: source.region,
      description: null,
      image_url: null,
      ticket_url: eventUrl,
      organizer: 'Green Bay Food Truck Coalition',
      category: source.category ?? 'Food Trucks',
      confidence_score: Math.min(confidence, 100),
      duplicate_status: 'new',
      review_status: 'pending_review',
      event_fingerprint: eventFingerprint,
      raw_payload: {
        parser: 'greenbayfoodtrucks_html_fallback',
        title,
        nearby_text: nearbyText,
        parsed_from: source.source_url,
      },
    });
  });

  return events;
}

async function fetchWithTimeout(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), env.REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'User-Agent': env.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7',
      },
    });

    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`);
    return await response.text();
  } finally {
    clearTimeout(timeout);
  }
}

function extractJsonLdEvents(html: string, source: EventSourceRow): NormalizedEvent[] {
  const $ = cheerio.load(html);
  const events: NormalizedEvent[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).text();
    if (!raw.trim()) return;

    try {
      const parsed = JSON.parse(raw);
      const nodes = flattenJsonLd(parsed).filter(isEventNode);
      for (const node of nodes) {
        const event = normalizeEvent(node, source);
        if (event) events.push(event);
      }
    } catch (error) {
      console.warn(`[${source.source_name}] skipped invalid JSON-LD block`, error);
    }
  });

  if (events.length) return events;

  if (sourceHost(source).includes('greenbayfoodtrucks.com')) {
    const fallbackEvents = parseGreenBayFoodTruckEvents($, source);
    if (fallbackEvents.length) {
      console.log(`Used Green Bay Food Truck Coalition HTML fallback parser for ${source.source_name}.`);
      return fallbackEvents;
    }
  }

  return events;
}

async function callIntake<T>(action: string, payload: Record<string, unknown> = {}): Promise<T> {
  const response = await fetch(env.LOVABLE_EVENT_IMPORT_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-ingest-token': env.EVENT_INGEST_TOKEN,
    },
    body: JSON.stringify({ action, ...payload }),
  });

  const body = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = typeof body?.error === 'string' ? body.error : `HTTP ${response.status}`;
    throw new Error(`Intake ${action} failed: ${message}`);
  }

  return body as T;
}

async function updateSourceStatus(sourceId: string, crawlStatus: string, lastError: string | null = null) {
  try {
    await callIntake('update_source_status', {
      source_id: sourceId,
      crawl_status: crawlStatus,
      last_error: lastError,
    });
  } catch (error) {
    console.error(`Failed to update source ${sourceId}:`, error);
  }
}

async function run() {
  const sourceResponse = await callIntake<{ sources: EventSourceRow[] }>('list_sources', {
    max_sources: env.MAX_SOURCES,
  });

  const sources = sourceResponse.sources ?? [];
  let totalProcessed = 0;
  console.log(`Loaded ${sources.length} active event source(s).`);

  for (const source of sources) {
    console.log(`Crawling ${source.source_name}: ${source.source_url}`);

    try {
      await updateSourceStatus(source.id, 'running');
      const html = await fetchWithTimeout(source.source_url);
      const events = extractJsonLdEvents(html, source);

      if (!events.length) {
        await updateSourceStatus(source.id, 'no_events');
        console.log(`No JSON-LD or supported HTML events found for ${source.source_name}.`);
        continue;
      }

      await callIntake('upsert_events', { events });
      totalProcessed += events.length;
      await updateSourceStatus(source.id, 'success');
      console.log(`Queued ${events.length} event candidate(s) from ${source.source_name}.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateSourceStatus(source.id, 'failed', message.slice(0, 1000));
      console.error(`Failed ${source.source_name}: ${message}`);
    }
  }

  console.log(`Crawler finished. Candidate events processed: ${totalProcessed}.`);
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
