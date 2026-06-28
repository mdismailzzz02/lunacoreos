/**
 * cryptoService.js
 * ─────────────────────────────────────────────────────────────────────
 * Client-side AES-256-GCM encryption/decryption using the browser's
 * native Web Crypto API. No external dependencies needed.
 *
 * Security model:
 *  - The CryptoKey is derived from the master password via PBKDF2.
 *  - The key is held in memory only (never written to storage).
 *  - Every encrypt call generates a fresh random 12-byte IV.
 *  - Only base64-encoded ciphertext + IV ever reach Supabase.
 * ─────────────────────────────────────────────────────────────────────
 */

const SALT = 'lunacoreos-passwords-v1'; // Fixed salt for deterministic key derivation
const PBKDF2_ITERATIONS = 200_000;

// In-memory key store (cleared on page unload)
let _sessionKey = null;

/** Convert a string to a Uint8Array */
const strToBytes = (str) => new TextEncoder().encode(str);

/** Convert a Uint8Array to a base64 string */
const bytesToB64 = (bytes) =>
    btoa(String.fromCharCode(...new Uint8Array(bytes)));

/** Convert a base64 string to a Uint8Array */
const b64ToBytes = (b64) =>
    Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));

/**
 * Derives an AES-256-GCM CryptoKey from the given master password.
 * Stores the key in module-level memory for the session.
 *
 * @param {string} masterPassword
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKeyFromMaster(masterPassword) {
    const keyMaterial = await crypto.subtle.importKey(
        'raw',
        strToBytes(masterPassword),
        { name: 'PBKDF2' },
        false,
        ['deriveKey']
    );

    const key = await crypto.subtle.deriveKey(
        {
            name: 'PBKDF2',
            salt: strToBytes(SALT),
            iterations: PBKDF2_ITERATIONS,
            hash: 'SHA-256',
        },
        keyMaterial,
        { name: 'AES-GCM', length: 256 },
        false,      // non-extractable for security
        ['encrypt', 'decrypt']
    );

    _sessionKey = key;
    return key;
}

/**
 * Returns the current session key, throwing if none is set.
 * @returns {CryptoKey}
 */
export function getSessionKey() {
    if (!_sessionKey) {
        throw new Error(
            '[CryptoService] No session key loaded. Call deriveKeyFromMaster() first.'
        );
    }
    return _sessionKey;
}

/**
 * Clears the in-memory session key (call on logout).
 */
export function clearSessionKey() {
    _sessionKey = null;
}

/**
 * Whether a session key is currently loaded.
 * @returns {boolean}
 */
export function hasSessionKey() {
    return _sessionKey !== null;
}

/**
 * Encrypts a plaintext string.
 *
 * @param {string} plaintext - The password to encrypt
 * @param {CryptoKey} [key] - Optional key override; defaults to session key
 * @returns {Promise<{ enc_password: string, enc_iv: string }>}
 */
export async function encryptPassword(plaintext, key) {
    const k = key || getSessionKey();
    const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for AES-GCM

    const cipherBuffer = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        k,
        strToBytes(plaintext)
    );

    return {
        enc_password: bytesToB64(cipherBuffer),
        enc_iv: bytesToB64(iv),
    };
}

/**
 * Decrypts a previously encrypted password.
 *
 * @param {string} enc_password - base64-encoded ciphertext
 * @param {string} enc_iv       - base64-encoded IV
 * @param {CryptoKey} [key]     - Optional key override; defaults to session key
 * @returns {Promise<string>} - Plaintext password
 */
export async function decryptPassword(enc_password, enc_iv, key) {
    const k = key || getSessionKey();

    const plainBuffer = await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv: b64ToBytes(enc_iv) },
        k,
        b64ToBytes(enc_password)
    );

    return new TextDecoder().decode(plainBuffer);
}

/**
 * Scores password strength.
 * Returns 'weak' | 'fair' | 'strong'
 *
 * @param {string} password
 * @returns {'weak'|'fair'|'strong'}
 */
export function scorePasswordStrength(password) {
    if (!password) return 'weak';
    let score = 0;
    if (password.length >= 8)  score++;
    if (password.length >= 14) score++;
    if (/[A-Z]/.test(password)) score++;
    if (/[a-z]/.test(password)) score++;
    if (/[0-9]/.test(password)) score++;
    if (/[^A-Za-z0-9]/.test(password)) score++;

    if (score <= 2) return 'weak';
    if (score <= 4) return 'fair';
    return 'strong';
}

/**
 * Copies text to clipboard and auto-clears after `clearAfterMs` milliseconds.
 *
 * @param {string} text
 * @param {number} clearAfterMs - defaults to 30,000 (30 seconds)
 * @returns {Promise<void>}
 */
export async function copyWithAutoClear(text, clearAfterMs = 30_000) {
    await navigator.clipboard.writeText(text);
    setTimeout(async () => {
        try {
            // Only clear if it still matches what we set (user may have overwritten it)
            const current = await navigator.clipboard.readText();
            if (current === text) {
                await navigator.clipboard.writeText('');
            }
        } catch {
            // Clipboard read can fail if the tab isn't focused — acceptable
        }
    }, clearAfterMs);
}
