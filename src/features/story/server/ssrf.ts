import "server-only";

import { isIP } from "node:net";
import { lookup } from "node:dns/promises";

import { StoryError } from "../model";

export type HostResolver = (hostname: string) => Promise<readonly string[]>;

function ipv4Number(address: string): number {
  return address.split(".").reduce((result, part) => (result * 256 + Number(part)) >>> 0, 0);
}

function ipv4InCidr(address: string, base: string, bits: number): boolean {
  const mask = bits === 0 ? 0 : (0xffffffff << (32 - bits)) >>> 0;
  return (ipv4Number(address) & mask) === (ipv4Number(base) & mask);
}

export function isBlockedNetworkAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) {
    return [
      ["0.0.0.0", 8], ["10.0.0.0", 8], ["100.64.0.0", 10], ["127.0.0.0", 8],
      ["169.254.0.0", 16], ["172.16.0.0", 12], ["192.0.0.0", 24], ["192.0.2.0", 24],
      ["192.168.0.0", 16], ["198.18.0.0", 15], ["198.51.100.0", 24], ["203.0.113.0", 24],
      ["224.0.0.0", 4], ["240.0.0.0", 4],
    ].some(([base, bits]) => ipv4InCidr(address, base as string, bits as number));
  }
  if (version === 6) {
    const normalized = address.toLowerCase();
    if (normalized.startsWith("::ffff:")) {
      const tail = normalized.slice(7);
      if (isIP(tail) === 4) return isBlockedNetworkAddress(tail);
      const groups = tail.split(":");
      if (groups.length === 2) {
        const high = Number.parseInt(groups[0] ?? "", 16);
        const low = Number.parseInt(groups[1] ?? "", 16);
        if (Number.isFinite(high) && Number.isFinite(low)) {
          return isBlockedNetworkAddress(`${high >>> 8}.${high & 255}.${low >>> 8}.${low & 255}`);
        }
      }
      return true;
    }
    return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") ||
      normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb") ||
      normalized.startsWith("2001:db8:") || normalized.startsWith("ff");
  }
  return true;
}

const defaultResolver: HostResolver = async (hostname) => (await lookup(hostname, { all: true, verbatim: true })).map((item) => item.address);

export async function validateMediaUrl(rawUrl: string, allowedHosts: ReadonlySet<string>, resolver: HostResolver = defaultResolver): Promise<URL> {
  let url: URL;
  try { url = new URL(rawUrl); } catch { throw new StoryError("STORY_MEDIA_HOST_NOT_ALLOWED"); }
  const hostname = url.hostname.toLowerCase();
  if (url.protocol !== "https:" || url.username || url.password || url.port || !allowedHosts.has(hostname) || isIP(hostname) !== 0) {
    throw new StoryError("STORY_MEDIA_HOST_NOT_ALLOWED");
  }
  let addresses: readonly string[];
  try { addresses = await resolver(hostname); } catch (error) { throw new StoryError("STORY_DOWNLOAD_FAILED", { cause: error }); }
  if (addresses.length === 0 || addresses.some(isBlockedNetworkAddress)) throw new StoryError("STORY_MEDIA_HOST_NOT_ALLOWED");
  return url;
}
