/**
 * E2E message encryption for 1:1 chats using X25519 ECDH + HKDF-SHA256 + AES-256-GCM.
 * (Full Signal Double Ratchet requires native libsignal; this uses the same primitives per project standards.)
 */

import "react-native-get-random-values";

import { gcm } from "@noble/ciphers/aes.js";
import { x25519 } from "@noble/curves/ed25519.js";
import { hkdf } from "@noble/hashes/hkdf.js";
import { sha256 } from "@noble/hashes/sha2.js";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";

import { getPublicKeyBundle, putPublicKeyBundle, type PublicKeyBundle } from "../api/keys";
import { base64ToBytes, bytesToBase64 } from "./bytes";

const E2E_VERSION = 1;
const ROOT_INFO = new TextEncoder().encode("orachat-root-v1");
const IDENTITY_SK_KEY = "orachat_e2e_identity_sk";
const SESSIONS_KEY = "orachat_e2e_sessions";

type PeerSession = {
  rootKeyB64: string;
  sendN: number;
  lastRecvN: number;
};

type SessionsMap = Record<string, PeerSession>;

async function randomBytes(n: number): Promise<Uint8Array> {
  return await Crypto.getRandomBytesAsync(n);
}

function deriveRoot(sharedSecret: Uint8Array): Uint8Array {
  return hkdf(sha256, sharedSecret, undefined, ROOT_INFO, 32);
}

function deriveMessageKey(rootKey: Uint8Array, senderId: string, n: number): Uint8Array {
  const info = new TextEncoder().encode(`orachat-msg|${senderId}|${n}`);
  return hkdf(sha256, rootKey, undefined, info, 32);
}

function utf8Encode(s: string): Uint8Array {
  return new TextEncoder().encode(s);
}

function utf8Decode(b: Uint8Array): string {
  return new TextDecoder().decode(b);
}

async function loadIdentitySk(): Promise<Uint8Array | null> {
  const b64 = await SecureStore.getItemAsync(IDENTITY_SK_KEY);
  if (!b64) return null;
  return base64ToBytes(b64);
}

async function saveIdentitySk(sk: Uint8Array): Promise<void> {
  await SecureStore.setItemAsync(IDENTITY_SK_KEY, bytesToBase64(sk), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

async function loadSessions(): Promise<SessionsMap> {
  const raw = await SecureStore.getItemAsync(SESSIONS_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as SessionsMap;
  } catch {
    return {};
  }
}

async function saveSessions(map: SessionsMap): Promise<void> {
  await SecureStore.setItemAsync(SESSIONS_KEY, JSON.stringify(map), {
    keychainAccessible: SecureStore.WHEN_UNLOCKED,
  });
}

/** Create X25519 identity if missing; returns public key bytes. */
export async function ensureIdentityKeys(): Promise<{ publicKey: Uint8Array }> {
  let sk = await loadIdentitySk();
  if (!sk) {
    const kp = x25519.keygen();
    sk = kp.secretKey;
    await saveIdentitySk(sk);
  }
  const publicKey = x25519.getPublicKey(sk);
  return { publicKey };
}

/** Ensure identity exists and publish public keys to the server. */
export async function bootstrapE2EForUser(userId: string, baseUrl?: string): Promise<void> {
  await ensureIdentityKeys();
  await publishKeysForUser(userId, baseUrl);
}

/** Build server bundle and upload. Uses identity + a signed prekey (second keypair). */
export async function publishKeysForUser(userId: string, baseUrl?: string): Promise<void> {
  const { publicKey: idPub } = await ensureIdentityKeys();
  const sk = await loadIdentitySk();
  if (!sk) throw new Error("E2E: missing identity key");

  const preKp = x25519.keygen();
  const bundle: PublicKeyBundle = {
    identity_key_b64: bytesToBase64(idPub),
    signed_prekey_public_b64: bytesToBase64(preKp.publicKey),
    signed_prekey_id: 1,
  };
  await putPublicKeyBundle(userId, bundle, baseUrl);
}

async function getOrCreateSession(
  localUserId: string,
  peerId: string,
  baseUrl?: string
): Promise<PeerSession> {
  const sessions = await loadSessions();
  if (sessions[peerId]) return sessions[peerId]!;

  const bundle = await getPublicKeyBundle(peerId, baseUrl);
  if (!bundle) {
    throw new Error(
      "This contact has not published encryption keys yet. They need to open the app after updating."
    );
  }

  const sk = await loadIdentitySk();
  if (!sk) throw new Error("E2E: not initialized");

  const peerPub = base64ToBytes(bundle.identity_key_b64);
  const shared = x25519.getSharedSecret(sk, peerPub);
  const root = deriveRoot(shared);
  const session: PeerSession = {
    rootKeyB64: bytesToBase64(root),
    sendN: 0,
    lastRecvN: 0,
  };
  sessions[peerId] = session;
  await saveSessions(sessions);
  return session;
}

async function updateSession(peerId: string, patch: Partial<PeerSession>): Promise<void> {
  const sessions = await loadSessions();
  const cur = sessions[peerId];
  if (!cur) return;
  sessions[peerId] = { ...cur, ...patch };
  await saveSessions(sessions);
}

type Envelope = {
  v: number;
  sid: string;
  n: number;
  nonce: string;
  ct: string;
};

export async function encryptOutgoingMessage(
  plaintext: string,
  localUserId: string,
  peerId: string,
  baseUrl?: string
): Promise<string> {
  const session = await getOrCreateSession(localUserId, peerId, baseUrl);
  const rootKey = base64ToBytes(session.rootKeyB64);
  const n = session.sendN + 1;
  const msgKey = deriveMessageKey(rootKey, localUserId, n);
  const nonce = await randomBytes(12);
  const aes = gcm(msgKey, nonce);
  const ct = aes.encrypt(utf8Encode(plaintext));

  const envelope: Envelope = {
    v: E2E_VERSION,
    sid: localUserId,
    n,
    nonce: bytesToBase64(nonce),
    ct: bytesToBase64(ct),
  };

  await updateSession(peerId, { sendN: n });

  return bytesToBase64(utf8Encode(JSON.stringify(envelope)));
}

export async function decryptIncomingMessage(
  ciphertextField: string,
  senderId: string,
  localUserId: string,
  baseUrl?: string
): Promise<string> {
  let json: string;
  try {
    json = utf8Decode(base64ToBytes(ciphertextField));
  } catch {
    return ciphertextField;
  }

  let envelope: Envelope;
  try {
    envelope = JSON.parse(json) as Envelope;
  } catch {
    return ciphertextField;
  }

  if (envelope.v !== E2E_VERSION || !envelope.sid || typeof envelope.n !== "number") {
    return ciphertextField;
  }

  const session = await getOrCreateSession(localUserId, senderId, baseUrl);

  if (envelope.n <= session.lastRecvN) {
    throw new Error("E2E: duplicate or replayed message");
  }

  const rootKey = base64ToBytes(session.rootKeyB64);
  const msgKey = deriveMessageKey(rootKey, envelope.sid, envelope.n);
  const nonce = base64ToBytes(envelope.nonce);
  const ct = base64ToBytes(envelope.ct);
  const aes = gcm(msgKey, nonce);
  let plain: Uint8Array;
  try {
    plain = aes.decrypt(ct);
  } catch {
    throw new Error("E2E: decryption failed (wrong key or corrupted message)");
  }

  await updateSession(senderId, { lastRecvN: envelope.n });

  return utf8Decode(plain);
}
