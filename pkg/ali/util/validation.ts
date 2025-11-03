import ipaddr from "ipaddr.js";

function ipToLong(ip: string): number {
  return (
    ip.split(".").reduce((acc, octet) => (acc << 8) + parseInt(octet, 10), 0) >>> 0
  );
}

function getCidrRange(cidr: string): { start: number; end: number } | null {
  const parts = cidr.split("/");

  if (parts.length !== 2) {
    return null;
  }

  const [ip, prefString] = parts;
  const prefix = parseInt(prefString, 10);

  if (isNaN(prefix) || prefix < 0 || prefix > 32) {
    return null; 
  }
  const ipParts = ip.split(".");

  if (ipParts.length !== 4 ) {
      return null;
  }
  for( let i= 0 ; i< ipParts.length ; i++){
    const part = ipParts[i];
    if(isNaN(parseInt(part, 10)) ||
      parseInt(part, 10) < 0 ||
      parseInt(part, 10) > 255){
        return null;
      }
  }

  const ipLong = ipToLong(ip);
  const mask = (0xffffffff << (32 - prefix)) >>> 0;

  const start = ipLong & mask;
  const end = start | (~mask >>> 0);

  return { start, end };
}

export function doCidrOverlap(cidr1: string, cidr2: string): boolean {
  if (!isValidCIDR(cidr1) || !isValidCIDR(cidr2)) {
    return false;
  }
  if (!cidr1 || !cidr2) {
    return false;
  }
  const range1 = getCidrRange(cidr1);
  const range2 = getCidrRange(cidr2);

  if (!range1 || !range2) {
    return false;
  }
  return range1.start <= range2.end && range2.start <= range1.end;
}

export function isValidCIDR(cidr: string) {
  return ipaddr.isValidCIDR(cidr);
}
