const AWS = require('aws-sdk');

// Initialize AWS services
const ses = new AWS.SES({ region: process.env.AWS_REGION || 'us-east-1' });
const sqs = new AWS.SQS({ region: process.env.AWS_REGION || 'us-east-1' });

exports.handler = async (event) => {
    console.log('Processing SQS messages:', JSON.stringify(event, null, 2));
    
    const results = {
        successful: 0,
        failed: 0,
        errors: []
    };
    
    // Process each SQS record
    for (const record of event.Records) {
        try {
            // Parse the message body
            const messageBody = JSON.parse(record.body);
            console.log('Processing message:', messageBody);
            
            // Validate required fields
            if (!messageBody.to || !messageBody.subject || !messageBody.htmlBody) {
                throw new Error('Missing required fields: to, subject, or htmlBody');
            }
            
            // Prepare SES email parameters
            const emailParams = {
                Source: process.env.FROM_EMAIL || messageBody.from,
                Destination: {
                    ToAddresses: Array.isArray(messageBody.to) ? messageBody.to : [messageBody.to]
                },
                Message: {
                    Subject: {
                        Data: messageBody.subject,
                        Charset: 'UTF-8'
                    },
                    Body: {
                        Html: {
                            Data: messageBody.htmlBody,
                            Charset: 'UTF-8'
                        }
                    }
                }
            };
            
            // Add text body if provided
            if (messageBody.textBody) {
                emailParams.Message.Body.Text = {
                    Data: messageBody.textBody,
                    Charset: 'UTF-8'
                };
            }
            
            // Add reply-to if provided
            if (messageBody.replyTo) {
                emailParams.ReplyToAddresses = Array.isArray(messageBody.replyTo) 
                    ? messageBody.replyTo 
                    : [messageBody.replyTo];
            }
            
            // Send email via SES
            const result = await ses.sendEmail(emailParams).promise();
            console.log('Email sent successfully:', result.MessageId);
            
            results.successful++;
            
        } catch (error) {
            console.error('Error processing message:', error);
            results.failed++;
            results.errors.push({
                messageId: record.messageId,
                error: error.message
            });
            
            // For partial batch failures, we can return specific failed records
            // This allows SQS to retry only the failed messages
        }
    }
    
    console.log('Processing complete:', results);
    
    // If there are failures, we can implement partial batch failure response
    if (results.failed > 0) {
        const failedRecords = event.Records.filter((record, index) => 
            results.errors.some(error => error.messageId === record.messageId)
        );
        
        return {
            batchItemFailures: failedRecords.map(record => ({
                itemIdentifier: record.messageId
            }))
        };
    }
    
    return {
        statusCode: 200,
        body: JSON.stringify({
            message: 'Emails processed successfully',
            results: results
        })
    };
}; 