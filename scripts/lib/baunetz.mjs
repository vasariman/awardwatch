// Fetches and parses the BauNetz "Wettbewerbe" (competitions) RSS feed.
// BauNetz is a German architecture portal; this feed is architecture-only
// and gives structured German-language fields inside each item's HTML
// description (Ort, Wettbewerbstyp, Gebäudetyp, Auslober, Teilnehmer, ...).
// There is no official JS/JSON API for this feed, so we parse the RSS by
// hand rather than adding an XML-parser dependency for one well-understood,
// stable feed shape.
import { computeStatus, slugify } from "./util.mjs";

export const BAUNETZ_RSS_URL = "https://www.baunetz.de/wettbewerbe/rss.xml";

// Covers XML predefined entities, the full HTML4 Latin-1 named-entity set
// (this feed embeds HTML inside CDATA and regularly uses named entities for
// German umlauts/ß and other European accented letters), plus numeric
// decimal/hex character references.
const NAMED_ENTITIES = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  iexcl: "¡", cent: "¢", pound: "£", curren: "¤", yen: "¥", brvbar: "¦",
  sect: "§", uml: "¨", copy: "©", ordf: "ª", laquo: "«", not: "¬",
  shy: "­", reg: "®", macr: "¯", deg: "°", plusmn: "±", sup2: "²",
  sup3: "³", acute: "´", micro: "µ", para: "¶", middot: "·", cedil: "¸",
  sup1: "¹", ordm: "º", raquo: "»", frac14: "¼", frac12: "½", frac34: "¾",
  iquest: "¿",
  Agrave: "À", Aacute: "Á", Acirc: "Â", Atilde: "Ã", Auml: "Ä", Aring: "Å",
  AElig: "Æ", Ccedil: "Ç", Egrave: "È", Eacute: "É", Ecirc: "Ê", Euml: "Ë",
  Igrave: "Ì", Iacute: "Í", Icirc: "Î", Iuml: "Ï", ETH: "Ð", Ntilde: "Ñ",
  Ograve: "Ò", Oacute: "Ó", Ocirc: "Ô", Otilde: "Õ", Ouml: "Ö", times: "×",
  Oslash: "Ø", Ugrave: "Ù", Uacute: "Ú", Ucirc: "Û", Uuml: "Ü", Yacute: "Ý",
  THORN: "Þ", szlig: "ß",
  agrave: "à", aacute: "á", acirc: "â", atilde: "ã", auml: "ä", aring: "å",
  aelig: "æ", ccedil: "ç", egrave: "è", eacute: "é", ecirc: "ê", euml: "ë",
  igrave: "ì", iacute: "í", icirc: "î", iuml: "ï", eth: "ð", ntilde: "ñ",
  ograve: "ò", oacute: "ó", ocirc: "ô", otilde: "õ", ouml: "ö", divide: "÷",
  oslash: "ø", ugrave: "ù", uacute: "ú", ucirc: "û", uuml: "ü", yacute: "ý",
  thorn: "þ", yuml: "ÿ",
  euro: "€", ndash: "–", mdash: "—", hellip: "…",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”",
};

function decodeXmlEntities(str) {
  return str
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&([a-zA-Z]+);/g, (m, name) => NAMED_ENTITIES[name] ?? m);
}

function stripTags(html) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

async function fetchDecoded(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": "AwardWatch-ResearchBot/1.0 (+manual test run)" },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} ${res.statusText}`);
  }
  const buf = new Uint8Array(await res.arrayBuffer());
  // Sniff the declared XML encoding from the first bytes (always ASCII-safe
  // to read as latin1), then re-decode the full buffer correctly.
  const head = new TextDecoder("latin1").decode(buf.slice(0, 200));
  const match = head.match(/encoding=["']([\w-]+)["']/i);
  const declaredEncoding = match ? match[1].toLowerCase() : "utf-8";
  try {
    return new TextDecoder(declaredEncoding).decode(buf);
  } catch {
    return new TextDecoder("utf-8").decode(buf);
  }
}

function extractField(descriptionText, label) {
  const re = new RegExp(
    `<td[^>]*>\\s*${label}\\s*:?\\s*</td>\\s*<td[^>]*>([\\s\\S]*?)</td>`,
    "i"
  );
  const m = descriptionText.match(re);
  if (!m) return null;
  const value = stripTags(decodeXmlEntities(m[1])).trim();
  return value || null;
}

function extractDeadline(descriptionText) {
  // The feed has one unlabeled row that holds the submission deadline as
  // DD.MM.YYYY. Search the whole block for that pattern rather than relying
  // on a label, since the label is inconsistently present across items.
  const m = descriptionText.match(/(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  const [, dd, mm, yyyy] = m;
  return `${yyyy}-${mm}-${dd}`;
}

function guessTargetAudience(teilnehmer) {
  if (!teilnehmer) return "open";
  const t = teilnehmer.toLowerCase();
  if (/student|studierende|absolvent/.test(t)) return "students";
  if (/architekt|planer|ingenieur|büro|freiberuf/.test(t)) return "professionals";
  return "open";
}

function parseItem(itemXml, today) {
  const title = decodeXmlEntities(
    (itemXml.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || "").trim()
  );
  const link = (itemXml.match(/<link>([\s\S]*?)<\/link>/i)?.[1] || "").trim();
  const pubDate = (itemXml.match(/<pubDate>([\s\S]*?)<\/pubDate>/i)?.[1] || "").trim();
  const descriptionRaw =
    itemXml.match(/<description>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/description>/i)?.[1] ||
    itemXml.match(/<description>([\s\S]*?)<\/description>/i)?.[1] ||
    "";

  if (!title || !link) return null;

  const ort = extractField(descriptionRaw, "Ort");
  const wettbewerbstyp = extractField(descriptionRaw, "Wettbewerbstyp");
  const gebaeudetyp = extractField(descriptionRaw, "Geb\\u00e4udetyp") || extractField(descriptionRaw, "Gebäudetyp");
  const auslober = extractField(descriptionRaw, "Auslober");
  const zulassungsbereich = extractField(descriptionRaw, "Zulassungsbereich");
  const teilnehmer = extractField(descriptionRaw, "Teilnehmer");
  const deadline = extractDeadline(descriptionRaw);

  const targetAudience = guessTargetAudience(teilnehmer);

  const longDescriptionParts = [
    ort && `Ort: ${ort}`,
    wettbewerbstyp && `Wettbewerbstyp: ${wettbewerbstyp}`,
    gebaeudetyp && `Gebäudetyp: ${gebaeudetyp}`,
    auslober && `Auslober: ${auslober}`,
    zulassungsbereich && `Zulassungsbereich: ${zulassungsbereich}`,
    teilnehmer && `Teilnehmer: ${teilnehmer}`,
  ].filter(Boolean);

  return {
    slug: slugify(`${title}-${ort || ""}`) || slugify(title),
    title,
    organizer: auslober || null,
    deadline,
    category: "Architecture", // BauNetz Wettbewerbe is an architecture-only feed
    targetAudience,
    studentTag: targetAudience === "students",
    country: zulassungsbereich || ort || null,
    entryFee: null, // not present in this feed
    registrationUrl: link,
    prizeMoney: null, // not present in this feed
    resultDate: null, // not present in this feed
    shortDescription: [wettbewerbstyp, ort && `in ${ort}`, auslober && `— ${auslober}`]
      .filter(Boolean)
      .join(" ")
      .trim() || `Architecture competition listed on BauNetz.`,
    longDescription:
      longDescriptionParts.length > 0
        ? `Sourced from BauNetz Wettbewerbe (German-language listing, not yet translated). ${longDescriptionParts.join(". ")}.`
        : "Sourced from BauNetz Wettbewerbe (German-language listing, not yet translated).",
    submissionFormat: null, // not present in this feed
    status: deadline ? computeStatus(deadline, today) : null,
    _rss: { pubDate, sourceLanguage: "de" },
  };
}

export async function fetchBaunetzCompetitions(today = new Date()) {
  let xml;
  try {
    xml = await fetchDecoded(BAUNETZ_RSS_URL);
  } catch (err) {
    return {
      ok: false,
      url: BAUNETZ_RSS_URL,
      error: err.message,
      items: [],
    };
  }

  const itemBlocks = xml.match(/<item>[\s\S]*?<\/item>/gi) || [];
  const items = [];
  for (const block of itemBlocks) {
    try {
      const parsed = parseItem(block, today);
      if (parsed) items.push(parsed);
    } catch (err) {
      console.error(`  ⚠ Could not parse a BauNetz RSS item, skipping it: ${err.message}`);
    }
  }

  return { ok: true, url: BAUNETZ_RSS_URL, error: null, items };
}
