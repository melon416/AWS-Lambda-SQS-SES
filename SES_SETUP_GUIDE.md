# AWS SES Setup Guide for TicketSqueeze Email System

## Current Status
✅ **Sender Email Verified**: `info@ticketsqueeze.com` is verified  
✅ **Lambda Function**: Working correctly  
✅ **SQS Queue**: `TicketSqueeze-Email-Queue.fifo` configured  

## The Permission Issue Explained

The error you encountered:
```
User `arn:aws:sts::729407190052:assumed-role/Lambda-Email-Full/TicketSqueeze-SQS-SES` is not authorized to perform `ses:SendEmail` on resource `arn:aws:ses:us-east-1:729407190052:identity/dima.barabolia@proton.me`
```

This happens because **AWS SES is in Sandbox Mode** by default. In sandbox mode:
- ✅ You can send FROM verified email addresses (like `info@ticketsqueeze.com`)
- ❌ You can only send TO verified email addresses or SES simulator addresses

## Solution Options

### Option 1: Use SES Simulator Addresses (Immediate Testing)
These special addresses work in sandbox mode without verification:

```json
{
  "emails": [
    "success@simulator.amazonses.com",    // Always succeeds
    "bounce@simulator.amazonses.com",     // Simulates bounce
    "complaint@simulator.amazonses.com"   // Simulates complaint
  ]
}
```

### Option 2: Verify Recipient Email Addresses
1. Go to **AWS SES Console** → **Verified identities**
2. Click **Create identity**
3. Choose **Email address**
4. Enter `dima.barabolia@proton.me`
5. Click **Create identity**
6. Check the email inbox and click the verification link

### Option 3: Request Production Access (Recommended for Production)
1. Go to **AWS SES Console** → **Account dashboard**
2. Click **Request production access**
3. Fill out the request form:
   - **Use case**: Transactional emails (newsletters, notifications)
   - **Website URL**: Your domain
   - **Describe how you handle bounces/complaints**
   - **Describe your email content**
4. Wait for AWS approval (usually 24-48 hours)

## Testing Strategy

### Phase 1: Sandbox Testing (Now)
Use the updated test files with SES simulator addresses:

**Test with `test-simple.json`:**
```bash
# Expected result: 1 successful email
{
  "successful_emails": 1,
  "failed_emails": 0,
  "results": ["✅ Sent to success@simulator.amazonses.com"]
}
```

**Test with `lambda-test-event.json`:**
```bash
# Expected result: 2 successful, 1 bounce
{
  "successful_emails": 2,
  "failed_emails": 1,
  "results": [
    "✅ Sent to success@simulator.amazonses.com",
    "❌ Failed to send to bounce@simulator.amazonses.com: (bounce simulation)"
  ]
}
```

### Phase 2: Verified Recipients Testing
After verifying `dima.barabolia@proton.me`:
```json
{
  "emails": ["dima.barabolia@proton.me"],
  "subject": "Test Email",
  "html_body": "<h1>Test successful!</h1>"
}
```

### Phase 3: Production Testing
After getting production access, you can send to any valid email address.

## Current IAM Permissions Check

Your Lambda role `Lambda-Email-Full` should have these permissions:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ses:SendEmail",
        "ses:SendRawEmail"
      ],
      "Resource": "*"
    }
  ]
}
```

## Monitoring and Limits

### Sandbox Limits:
- **200 emails per 24 hours**
- **1 email per second**
- **Only verified recipients**

### Production Limits (after approval):
- **Higher sending quota** (starts at 200/day, can be increased)
- **Higher sending rate** (starts at 1/second, can be increased)
- **Send to any valid email address**

## Next Steps for Testing

1. **Immediate testing**: Use the updated test files with SES simulator addresses
2. **Verify your own email**: Add `dima.barabolia@proton.me` as a verified identity
3. **Request production access**: Fill out the production access request form
4. **Monitor metrics**: Check SES dashboard for bounce/complaint rates

## Troubleshooting Commands

Check if your sender email is verified:
```bash
aws ses get-identity-verification-attributes --identities info@ticketsqueeze.com --region us-east-1
```

Check current sending quota:
```bash
aws ses get-sending-quota --region us-east-1
```

Check sending statistics:
```bash
aws ses get-sending-statistics --region us-east-1
```

## Production Readiness Checklist

- [ ] Request and receive production access
- [ ] Set up bounce and complaint handling
- [ ] Configure SNS topics for notifications
- [ ] Set up CloudWatch alarms for monitoring
- [ ] Implement email list management
- [ ] Add unsubscribe functionality (required by law) 