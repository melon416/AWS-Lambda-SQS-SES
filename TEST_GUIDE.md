# Lambda Function Test Guide

This guide explains how to test your AWS Lambda function for email sending via SES using the provided test cases.

## Test Files Available

### 1. `test-simple.json` - Basic Functionality Test
**Purpose**: Simple test with one email to verify basic functionality
**What it tests**:
- Single email sending
- Basic HTML email processing
- Function execution flow

**Expected Result**: 
- One email sent successfully
- Clean logs showing processing steps
- Success response with summary

### 2. `lambda-test-event.json` - Comprehensive Test
**Purpose**: Full-featured test simulating real-world usage
**What it tests**:
- Multiple emails in one batch (2 emails)
- Multiple SQS records (2 messages)
- Different email types (newsletter + verification)
- Realistic HTML content processing

**Expected Result**:
- 3 emails sent total (2 from first record, 1 from second record)
- Detailed processing logs for each message
- Complete summary with success/failure counts

### 3. `test-error-cases.json` - Error Handling Test
**Purpose**: Test error handling and validation
**What it tests**:
- Empty emails array
- Missing required fields (emails field)
- Invalid JSON format in message body

**Expected Result**:
- Function should handle errors gracefully
- Clear error messages in response
- No emails sent, but function doesn't crash

## How to Run Tests

### Step 1: Update Your Lambda Function
1. Copy the code from `index.mjs` to your Lambda function in AWS Console
2. Make sure the handler is set to `index.handler`
3. Ensure runtime is set to Node.js 18.x or later

### Step 2: Create Test Events
1. In the Lambda Console, go to the "Test" tab
2. Create a new test event
3. Copy the JSON from one of the test files
4. Name the test event appropriately (e.g., "SimpleTest", "ComprehensiveTest", "ErrorTest")

### Step 3: Run Tests in Order

#### Test 1: Simple Test
```json
Use: test-simple.json
Expected: 1 email sent successfully
```

#### Test 2: Comprehensive Test
```json
Use: lambda-test-event.json
Expected: 3 emails sent successfully
```

#### Test 3: Error Handling Test
```json
Use: test-error-cases.json
Expected: Graceful error handling, 0 emails sent
```

## What to Look For in Logs

### Successful Test Logs Should Show:
```
START RequestId: [id] Version: $LATEST
Received event: [event details]
Processing 1 SQS records
Processing record: [record details]
Message body: [parsed message]
Processing X emails for subject: [subject]
Sending email to: [email]
Email sent successfully to [email]. MessageId: [message-id]
Completed processing message. Successful: X, Failed: 0
Final response: [response object]
END RequestId: [id]
```

### Error Test Logs Should Show:
```
START RequestId: [id] Version: $LATEST
Received event: [event details]
Processing X SQS records
Processing record: [record details]
Error processing message: [error description]
Final response: [response with errors]
END RequestId: [id]
```

## Common Issues and Solutions

### Issue: "Email address not verified"
**Solution**: Verify your sender email (`info@ticketsqueeze.com`) in SES Console

### Issue: "Domain not verified"
**Solution**: Verify the domain `ticketsqueeze.com` in SES Console

### Issue: "Access denied" or permission errors
**Solution**: Check IAM role permissions for SES:SendEmail

### Issue: Function timeout
**Solution**: Increase timeout in Lambda configuration (recommend 30 seconds)

## SES Verification Requirements

Before testing with real emails, ensure:

1. **Sender Email Verified**: `info@ticketsqueeze.com` must be verified in SES
2. **Domain Verified** (Optional but recommended): Verify `ticketsqueeze.com` domain
3. **Test Emails**: For testing, use verified email addresses or SES mailbox simulator:
   - `success@simulator.amazonses.com` - Always succeeds
   - `bounce@simulator.amazonses.com` - Always bounces
   - `complaint@simulator.amazonses.com` - Always complains

## Test Sequence Recommendation

1. **Start with Simple Test**: Verify basic functionality
2. **Run Comprehensive Test**: Test full workflow
3. **Test Error Handling**: Ensure robust error handling
4. **Production Test**: Use real email addresses (only after verification)

## Monitoring and Debugging

- **CloudWatch Logs**: Check `/aws/lambda/[YourFunctionName]` log group
- **SES Console**: Monitor sending statistics and bounce/complaint rates
- **Lambda Metrics**: Monitor invocation count, duration, and errors

## Security Notes

- Never use real email addresses in test files committed to version control
- Always use SES sandbox mode for testing until ready for production
- Monitor SES sending quotas and rates to avoid service limits 