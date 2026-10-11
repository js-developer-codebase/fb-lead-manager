import { test, describe } from 'node:test';
import assert from 'node:assert';
import crypto from 'node:crypto';
import { CryptoService } from '../src/services/crypto.service.js';
import { FormMapperService } from '../src/services/form-mapper.service.js';

describe('CryptoService Unit Tests', () => {
  test('should encrypt and decrypt plaintext using AES-256-GCM', () => {
    const secret = 'EAABsbCS19...super_secret_page_access_token_12345';
    const encrypted = CryptoService.encrypt(secret);

    assert.ok(encrypted.ciphertext, 'Ciphertext should not be empty');
    assert.ok(encrypted.iv, 'IV should not be empty');
    assert.ok(encrypted.authTag, 'Auth tag should not be empty');

    const decrypted = CryptoService.decrypt(encrypted.ciphertext, encrypted.iv, encrypted.authTag);
    assert.strictEqual(decrypted, secret, 'Decrypted value should match original plaintext');
  });

  test('should correctly normalize and hash email according to Meta CAPI specification', () => {
    const rawEmail = '  John.Doe@Example.COM  ';
    const expected = crypto.createHash('sha256').update('john.doe@example.com').digest('hex');

    const result = CryptoService.hashEmail(rawEmail);
    assert.strictEqual(result, expected);
  });

  test('should correctly normalize and hash phone number according to Meta CAPI specification', () => {
    const rawPhone = '+91 (987) 654-3210';
    const expected = crypto.createHash('sha256').update('919876543210').digest('hex');

    const result = CryptoService.hashPhone(rawPhone);
    assert.strictEqual(result, expected);
  });

  test('should verify Facebook X-Hub-Signature-256 HMAC', () => {
    const appSecret = 'my_facebook_app_secret_abc123';
    const payload = JSON.stringify({ object: 'page', entry: [] });
    const expectedHash = crypto.createHmac('sha256', appSecret).update(payload).digest('hex');
    const header = `sha256=${expectedHash}`;

    assert.strictEqual(CryptoService.verifyHubSignature(payload, header, appSecret), true);
    assert.strictEqual(CryptoService.verifyHubSignature(payload, 'sha256=invalidhash', appSecret), false);
  });
});

describe('FormMapperService Unit Tests', () => {
  test('should construct CRM payload with user-input project name and location', () => {
    const leadData = {
      fullName: 'Vikram Malhotra',
      email: 'vikram@example.com',
      phoneNumber: '+919988776655',
      rawFormAnswers: {
        budget: '1.5 Cr - 2 Cr'
      }
    };

    const mockMapping: any = {
      formId: '101123456789001',
      projectName: 'Godrej Palm Retreat',
      location: 'Bangalore - Sarjapur Road',
      targetFields: {
        projectNameField: 'project_name',
        locationField: 'location',
        fullNameField: 'name',
        phoneField: 'phone',
        emailField: 'email'
      },
      customQuestionMappings: [
        { fbQuestionKey: 'budget', crmFieldKey: 'budget_range' }
      ]
    };

    const payload = FormMapperService.buildCrmPayload(
      leadData,
      mockMapping,
      'leadgen_99999',
      new Date('2026-10-12T00:00:00Z')
    );

    assert.strictEqual(payload.project_name, 'Godrej Palm Retreat');
    assert.strictEqual(payload.location, 'Bangalore - Sarjapur Road');
    assert.strictEqual(payload.name, 'Vikram Malhotra');
    assert.strictEqual(payload.email, 'vikram@example.com');
    assert.strictEqual(payload.phone, '+919988776655');
    assert.strictEqual(payload.budget_range, '1.5 Cr - 2 Cr');
    assert.strictEqual(payload.fb_form_id, '101123456789001');
  });
});
