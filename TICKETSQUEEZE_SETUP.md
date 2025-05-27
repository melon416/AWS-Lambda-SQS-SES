# TicketSqueeze Newsletter Email Automation Setup

## 🎫 Quick Setup Guide for TicketSqueeze

### Current Configuration
- **AWS Account**: 729407190052
- **SQS Queue**: `TicketSqueeze-Email-Queue.fifo`
- **Sender Email**: `info@ticketsqueeze.com`
- **Domain**: `ticketsqueeze.com`

## 🔧 Issues Fixed in Your Lambda Function

### 1. **Import Syntax Error**
❌ **Before:**
```javascript
const { SESClient, SendEmailCommand } = import('@aws-sdk/client-ses');
```

✅ **After:**
```javascript
const { SESClient, SendEmailCommand } = require('@aws-sdk/client-ses');
```

### 2. **Manual Message Deletion Removed**
- SQS automatically deletes messages when Lambda returns successfully
- Manual deletion can cause issues and is unnecessary

### 3. **Better Error Handling**
- Added specific SES error handling
- Improved logging for debugging
- Proper validation of message format

## 📦 Dependencies

Update your `package.json`:
```json
{
  "dependencies": {
    "@aws-sdk/client-ses": "^3.450.0"
  }
}
```

## 📧 Expected Message Format

Your PHP application should send messages to the SQS queue in this format:

```json
{
  "emails": [
    "subscriber1@example.com",
    "subscriber2@example.com",
    "subscriber3@example.com"
  ],
  "subject": "Your Newsletter Subject",
  "html_body": "<html><body><h1>Newsletter Content</h1><p>Your HTML content here</p></body></html>"
}
```

## 🚀 Deployment Steps

### 1. **Verify SES Domain and Email**
```bash
# Verify the domain
aws ses verify-domain-identity --domain ticketsqueeze.com --region us-east-1

# Verify the sender email
aws ses verify-email-identity --email-address info@ticketsqueeze.com --region us-east-1
```

### 2. **Check SES Status**
```bash
# Check verification status
aws ses get-identity-verification-attributes --identities ticketsqueeze.com info@ticketsqueeze.com --region us-east-1
```

### 3. **Deploy Lambda Function**

#### Option A: Using AWS Console
1. Go to [Lambda Console](https://console.aws.amazon.com/lambda/home?region=us-east-1)
2. Create new function or update existing
3. Copy the code from `index.js`
4. Set runtime to Node.js 18.x
5. Add the SES permissions to the execution role

#### Option B: Using ZIP Upload
```bash
# Install dependencies
npm install

# Create deployment package
zip -r ticketsqueeze-lambda.zip index.js node_modules/ package.json

# Upload via AWS CLI
aws lambda update-function-code \
    --function-name your-function-name \
    --zip-file fileb://ticketsqueeze-lambda.zip \
    --region us-east-1
```

### 4. **Configure SQS Trigger**
1. Go to your Lambda function in the console
2. Add SQS trigger
3. Select your queue: `TicketSqueeze-Email-Queue.fifo`
4. Set batch size to 10 (or lower for testing)

## 🔍 Testing

### 1. **Test with Sample Message**
Send a test message to your SQS queue:

```bash
aws sqs send-message \
    --queue-url "https://sqs.us-east-1.amazonaws.com/729407190052/TicketSqueeze-Email-Queue.fifo" \
    --message-body '{"emails":["test@example.com"],"subject":"Test Newsletter","html_body":"<h1>Test</h1><p>This is a test email.</p>"}' \
    --message-group-id "test-group" \
    --message-deduplication-id "test-$(date +%s)" \
    --region us-east-1
```

### 2. **Monitor Logs**
Check CloudWatch logs for your Lambda function:
```bash
aws logs describe-log-streams \
    --log-group-name "/aws/lambda/your-function-name" \
    --region us-east-1
```

## ⚠️ Important Notes

### SES Sandbox Mode
If your SES is in sandbox mode:
- You can only send to verified email addresses
- Request production access: [SES Console](https://console.aws.amazon.com/ses/home?region=us-east-1#reputation-dashboard)

### FIFO Queue Considerations
- Messages require `MessageGroupId` and `MessageDeduplicationId`
- Ensure your PHP application includes these when sending to the queue

### IAM Permissions
Your Lambda execution role needs these permissions:
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
        },
        {
            "Effect": "Allow",
            "Action": [
                "sqs:ReceiveMessage",
                "sqs:DeleteMessage",
                "sqs:GetQueueAttributes"
            ],
            "Resource": "arn:aws:sqs:us-east-1:729407190052:TicketSqueeze-Email-Queue.fifo"
        }
    ]
}
```

## 🔗 Useful Links

- **AWS Console**: https://729407190052.signin.aws.amazon.com/console
- **SES Console**: https://console.aws.amazon.com/ses/home?region=us-east-1
- **Lambda Console**: https://console.aws.amazon.com/lambda/home?region=us-east-1
- **SQS Console**: https://console.aws.amazon.com/sqs/v2/home?region=us-east-1

## 🐛 Troubleshooting

### Common Issues:

1. **"Domain not verified" error**
   - Verify `ticketsqueeze.com` in SES console
   - Add DNS records provided by AWS

2. **"Email address not verified" error**
   - Verify `info@ticketsqueeze.com` in SES console
   - Check if you're in sandbox mode

3. **Lambda timeout**
   - Increase timeout in Lambda configuration
   - Consider reducing batch size

4. **Messages not processing**
   - Check SQS trigger configuration
   - Verify Lambda execution role permissions
   - Check CloudWatch logs for errors

## 📞 Support

If you encounter issues:
1. Check CloudWatch logs first
2. Verify SES domain/email status
3. Test with a single email first
4. Ensure proper IAM permissions 