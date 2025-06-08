# AWS Email Service with Lambda and SQS

This project implements an email service using AWS Lambda and SQS for processing emails with embedded images.

## Project Structure
```
.
├── index.mjs              # Lambda function code
├── package.json          # Node.js dependencies
├── tf/                   # Terraform configuration
│   ├── main.tf          # Main Terraform configuration
│   ├── variables.tf     # Input variables
│   └── outputs.tf       # Output values
└── README.md            # Project documentation
```

## Infrastructure Components

- AWS Lambda function for processing emails
- SQS queue for message processing
- CloudWatch Logs for monitoring
- IAM roles and policies for security

## Prerequisites

- AWS CLI configured with appropriate credentials
- Terraform installed (version >= 1.0.0)
- Node.js 18.x or later
- npm or yarn package manager

## Deployment Steps

1. **Prepare Lambda Package**
   ```bash
   # Install dependencies
   npm install

   # Create deployment package
   zip -r lambda_function.zip index.mjs node_modules package.json
   ```

2. **Initialize Terraform**
   ```bash
   cd tf
   terraform init
   ```

3. **Review Changes**
   ```bash
   terraform plan
   ```

4. **Deploy Infrastructure**
   ```bash
   terraform apply
   ```

5. **Verify Deployment**
   ```bash
   # Check Lambda function
   aws lambda get-function --function-name email-service

   # Check SQS queue
   aws sqs get-queue-url --queue-name email-processing-queue
   ```

## Configuration

The following variables can be configured in `tf/terraform.tfvars`:

```hcl
aws_region         = "us-east-1"
lambda_function_name = "email-service"
lambda_timeout     = 30
lambda_memory_size = 256
from_email         = "info@ticketsqueeze.com"
sqs_queue_name     = "email-processing-queue"
log_retention_days = 14
```

## Usage

To send an email, publish a message to the SQS queue with the following structure:

```json
{
  "emails": ["recipient@example.com"],
  "subject": "Test Email",
  "html_body": "<html><body><img src='https://example.com/image.jpg'></body></html>"
}
```

## Monitoring

- CloudWatch Logs: `/aws/lambda/email-service`
- CloudWatch Metrics: Lambda and SQS metrics
- SQS Console: Message processing status

## Cleanup

To destroy all resources:

```bash
cd tf
terraform destroy
```

## Security

- IAM roles with least privilege
- SQS queue with appropriate access controls
- CloudWatch Logs retention policy
- SES email sending permissions

## Support

For issues or questions, please create an issue in the repository. 