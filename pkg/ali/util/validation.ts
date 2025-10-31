import ipaddr from "ipaddr.js";

/**
 * Converts an IPv4 address string to its 32-bit integer representation.
 * @param ip The IPv4 address string (e.g., "192.168.1.1").
 * @returns The unsigned 32-bit integer representation of the IP.
 */
function ipToLong(ip: string): number {
  // Use `>>> 0` to treat the result as an unsigned 32-bit integer.
  return (
    ip
      .split(".")
      .reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

/**
 * Parses a CIDR string and returns its start and end IP addresses as numbers.
 * @param cidr The CIDR string (e.g., "192.168.1.0/24").
 * @returns An object with `start` and `end` as numbers, or `null` if the CIDR is invalid.
 */
function getCidrRange(cidr: string): { start: number; end: number } | null {
  if (!cidr) {
    return null;
  }
  const parts = cidr.split("/");

  if (parts.length !== 2) {
    return null;
  }

  const [ip, prefixStr] = parts;
  const prefix = parseInt(prefixStr, 10);

  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return null; // Invalid prefix
  }

  // Basic IP format validation
  const ipParts = ip.split(".");

  if (
    ipParts.length !== 4 ||
    ipParts.some(
      (part) =>
        isNaN(parseInt(part, 10)) ||
        parseInt(part, 10) < 0 ||
        parseInt(part, 10) > 255
    )
  ) {
    return null;
  }

  const ipLong = ipToLong(ip);

  // In JavaScript, bitwise operations are on signed 32-bit integers.
  // We use `>>> 0` to treat numbers as unsigned.
  const mask = (0xffffffff << (32 - prefix)) >>> 0;

  const start = ipLong & mask;
  // The end of the range is the start | inverted mask.
  const end = start | (~mask >>> 0);

  return { start, end };
}

export function doCidrOverlap(cidr1: string, cidr2: string): boolean {
  const range1 = getCidrRange(cidr1);
  const range2 = getCidrRange(cidr2);

  if (!range1 || !range2) {
    return false;
  }

  // Two ranges [a, b] and [c, d] overlap if a <= d and c <= b.
  return range1.start <= range2.end && range2.start <= range1.end;
}

export function isValidCIDR(cidr) {
  return ipaddr.isValidCIDR(cidr);
}
