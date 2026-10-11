import crypto from 'crypto';
import { config } from '../config/environment.js';

export class CryptoService {
  private static readonly ALGORITHM = 'aes-256-gcm';
  private static readonly IV_LENGTH = 12; // 96 bits for GCM
  private static readonly AUTH_TAG_LENGTH = 16;

  /**
   * Derives a 32-byte key buffer from config.security.masterKey
   */
  private static getKey(): Buffer {
    const rawKey = config.security.masterKey;
    if (rawKey.length === 64) {
      // 32-byte hex string
      return Buffer.from(rawKey, 'hex');
    }
    // Hash key if arbitrary length string to guarantee 32 bytes
    return crypto.createHash('sha256').update(rawKey).digest();
  }

  /**
   * Encrypts plaintext using AES-256-GCM
   */
  public static encrypt(plainText: string): { ciphertext: string; iv: string; authTag: string } {
    if (!plainText) {
      return { ciphertext: '', iv: '', authTag: '' };
    }
    const iv = crypto.randomBytes(this.IV_LENGTH);
    const key = this.getKey();
    const cipher = crypto.createCipheriv(this.ALGORITHM, key, iv);

    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    const authTag = cipher.getAuthTag().toString('hex');

    return {
      ciphertext: encrypted,
      iv: iv.toString('hex'),
      authTag
    };
  }

  /**
   * Decrypts ciphertext using AES-256-GCM
   */
  public static decrypt(ciphertext: string, ivHex: string, authTagHex: string): string {
    if (!ciphertext || !ivHex || !authTagHex) {
      return '';
    }
    const key = this.getKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const decipher = crypto.createDecipheriv(this.ALGORITHM, key, iv);

    decipher.setAuthTag(authTag);
    let decrypted = decipher.update(ciphertext, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Hashes PII field using SHA-256 for Meta Conversions API
   */
  public static hashSha256(value: string): string {
    if (!value) return '';
    return crypto.createHash('sha256').update(value.trim()).digest('hex');
  }

  /**
   * Normalizes and hashes email for Meta Conversions API
   * Spec: trim leading/trailing whitespace, lowercase, then SHA-256
   */
  public static hashEmail(email: string): string {
    if (!email) return '';
    const normalized = email.trim().toLowerCase();
    return this.hashSha256(normalized);
  }

  /**
   * Normalizes and hashes phone number for Meta Conversions API
   * Spec: remove non-digits, remove leading zeros, format with country code, then SHA-256
   */
  public static hashPhone(phone: string): string {
    if (!phone) return '';
    // Strip everything except digits
    let cleaned = phone.replace(/[^\d]/g, '');
    cleaned = cleaned.replace(/^0+/, '');
    return this.hashSha256(cleaned);
  }

  /**
   * Verifies Facebook X-Hub-Signature-256 HMAC
   */
  public static verifyHubSignature(rawBody: Buffer | string, signatureHeader: string, appSecret: string): boolean {
    if (!signatureHeader || !appSecret) return false;

    const parts = signatureHeader.split('=');
    if (parts.length !== 2 || parts[0] !== 'sha256') {
      return false;
    }
    const signature = parts[1];
    const expected = crypto
      .createHmac('sha256', appSecret)
      .update(rawBody)
      .digest('hex');

    try {
      const sigBuf = Buffer.from(signature, 'hex');
      const expectedBuf = Buffer.from(expected, 'hex');
      if (sigBuf.length !== expectedBuf.length) return false;
      return crypto.timingSafeEqual(sigBuf, expectedBuf);
    } catch {
      return false;
    }
  }
}
