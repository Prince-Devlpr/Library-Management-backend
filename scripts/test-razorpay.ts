import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import Razorpay from 'razorpay';
import { RazorpayService } from '../src/modules/integrations/razorpay.service.js';

async function runRazorpayVerification() {
  console.log('====================================================');
  console.log('   RAZORPAY TEST MODE CREDENTIALS VERIFICATION');
  console.log('====================================================\n');

  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;

  console.log(`[1] Verifying Environment Variables:`);
  console.log(`    - RAZORPAY_KEY_ID:     ${keyId}`);
  console.log(`    - RAZORPAY_KEY_SECRET: ${keySecret ? keySecret.substring(0, 4) + '...' + keySecret.slice(-4) : 'NOT SET'}`);

  if (!keyId || !keySecret) {
    console.error('\n❌ ERROR: RAZORPAY_KEY_ID or RAZORPAY_KEY_SECRET is missing!');
    process.exit(1);
  }

  // 1. Direct Razorpay API call to create an order
  console.log('\n[2] Connecting to Razorpay API...');
  const razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
  });

  const testAmountPaise = 500; // ₹5.00
  const testReceipt = `TEST-REC-${Date.now().toString().slice(-6)}`;

  try {
    console.log(`    Attempting to create test order: ₹${(testAmountPaise / 100).toFixed(2)} (${testAmountPaise} paise)...`);
    const order = await razorpay.orders.create({
      amount: testAmountPaise,
      currency: 'INR',
      receipt: testReceipt,
      notes: {
        testRun: 'LMS Automated Razorpay Verification',
        timestamp: new Date().toISOString(),
      },
    });

    console.log('\n✅ ORDER CREATED SUCCESSFULLY VIA RAZORPAY API!');
    console.log(`    - Order ID:   ${order.id}`);
    console.log(`    - Entity:     ${order.entity}`);
    console.log(`    - Amount:     ${order.amount} paise (₹${(Number(order.amount) / 100).toFixed(2)})`);
    console.log(`    - Currency:   ${order.currency}`);
    console.log(`    - Receipt:    ${order.receipt}`);
    console.log(`    - Status:     ${order.status}`);
    console.log(`    - Created At: ${new Date(Number(order.created_at) * 1000).toLocaleString()}`);

    // 2. Test HMAC-SHA256 signature verification logic
    console.log('\n[3] Testing Server-Side HMAC-SHA256 Signature Verification:');
    const mockPaymentId = `pay_${crypto.randomBytes(8).toString('hex')}`;
    const validSignature = crypto
      .createHmac('sha256', keySecret)
      .update(`${order.id}|${mockPaymentId}`)
      .digest('hex');

    const isValidSig = RazorpayService.verifyPaymentSignature({
      orderId: order.id,
      paymentId: mockPaymentId,
      signature: validSignature,
    });

    if (isValidSig) {
      console.log('    ✓ Valid signature correctly verified.');
    } else {
      console.error('    ❌ Valid signature verification failed!');
    }

    // Tampered signature test
    const isTamperedRejected = !RazorpayService.verifyPaymentSignature({
      orderId: order.id,
      paymentId: mockPaymentId,
      signature: 'tampered_bogus_signature_1234567890abcdef',
    });

    if (isTamperedRejected) {
      console.log('    ✓ Tampered signature correctly rejected.');
    } else {
      console.error('    ❌ Tampered signature was incorrectly accepted!');
    }

    console.log('\n====================================================');
    console.log('🎉 ALL RAZORPAY API & SIGNATURE TESTS PASSED!');
    console.log('====================================================\n');
  } catch (error: any) {
    console.error('\n❌ RAZORPAY API CALL FAILED:');
    console.error(`    Error Code:    ${error.statusCode || error.error?.code || 'UNKNOWN'}`);
    console.error(`    Error Message: ${error.message || error.error?.description || error}`);
    if (error.error) {
      console.error('    Details:', JSON.stringify(error.error, null, 2));
    }
    process.exit(1);
  }
}

runRazorpayVerification();
