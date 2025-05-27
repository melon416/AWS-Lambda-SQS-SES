import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

// Initialize AWS clients
const sesClient = new SESClient({ region: 'us-east-1' });

const FROM_EMAIL = 'info@ticketsqueeze.com';

/**
 * Lambda function to process SQS messages and send emails via SES
 * 
 * Expected SQS message format:
 * {
 *   "emails": ["email1@example.com", "email2@example.com"],
 *   "subject": "Newsletter Subject",
 *   "html_body": "<html>Newsletter content</html>"
 * }
 */
export const handler = async (event) => {
    console.log('Received event:', JSON.stringify(event, null, 2));
    
    let successfulEmails = 0;
    let failedEmails = 0;
    const results = [];
    const errors = [];

    try {
        // Validate event structure
        if (!event) {
            throw new Error('Event is null or undefined');
        }

        if (!event.Records) {
            throw new Error('Event does not contain Records property');
        }

        if (!Array.isArray(event.Records)) {
            throw new Error('Event.Records is not an array');
        }

        if (event.Records.length === 0) {
            console.log('No records to process');
            return {
                statusCode: 200,
                body: JSON.stringify({
                    message: 'No records to process',
                    summary: {
                        successful_emails: 0,
                        failed_emails: 0,
                        total_processed: 0
                    }
                })
            };
        }

        console.log(`Processing ${event.Records.length} SQS records`);

        // Process each SQS message
        for (const record of event.Records) {
            try {
                console.log('Processing record:', JSON.stringify(record, null, 2));
                
                // Validate record structure
                if (!record.body) {
                    throw new Error('Record does not contain body property');
                }

                // Parse the message body
                const messageBody = JSON.parse(record.body);
                console.log('Message body:', messageBody);
                
                // Validate required fields
                if (!messageBody.emails || !Array.isArray(messageBody.emails)) {
                    throw new Error('Missing or invalid emails array');
                }
                if (!messageBody.subject) {
                    throw new Error('Missing subject');
                }
                if (!messageBody.html_body) {
                    throw new Error('Missing html_body');
                }

                const { emails, subject, html_body } = messageBody;
                
                // Create plain text version by stripping HTML
                const textBody = html_body.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

                console.log(`Processing ${emails.length} emails for subject: ${subject}`);

                // Send emails for each address in the batch
                for (const email of emails) {
                    try {
                        console.log(`Sending email to: ${email}`);
                        
                        const sendEmailCommand = new SendEmailCommand({
                            Source: FROM_EMAIL,
                            Destination: { 
                                ToAddresses: [email] 
                            },
                            Message: {
                                Subject: { 
                                    Data: subject, 
                                    Charset: 'UTF-8' 
                                },
                                Body: {
                                    Html: { 
                                        Data: html_body, 
                                        Charset: 'UTF-8' 
                                    },
                                    Text: { 
                                        Data: textBody, 
                                        Charset: 'UTF-8' 
                                    },
                                },
                            },
                        });
                        
                        const result = await sesClient.send(sendEmailCommand);
                        console.log(`Email sent successfully to ${email}. MessageId: ${result.MessageId}`);
                        
                        successfulEmails++;
                        results.push(`✅ Sent to ${email} (MessageId: ${result.MessageId})`);
                        
                    } catch (emailError) {
                        console.error(`Error sending email to ${email}:`, emailError);
                        failedEmails++;
                        
                        // Handle specific SES errors
                        let errorMessage = emailError.message;
                        if (emailError.name === 'MessageRejected') {
                            errorMessage = `Email rejected by SES: ${emailError.message}`;
                        } else if (emailError.name === 'MailFromDomainNotVerified') {
                            errorMessage = `Domain not verified: ${FROM_EMAIL}`;
                        } else if (emailError.name === 'InvalidParameterValue') {
                            errorMessage = `Invalid email address: ${email}`;
                        }
                        
                        results.push(`❌ Failed to send to ${email}: ${errorMessage}`);
                        errors.push(`${email}: ${errorMessage}`);
                    }
                }

                console.log(`Completed processing message. Successful: ${successfulEmails}, Failed: ${failedEmails}`);

            } catch (messageError) {
                console.error('Error processing message:', messageError);
                const errorMsg = `Error processing message: ${messageError.message}`;
                results.push(`❌ ${errorMsg}`);
                errors.push(errorMsg);
                failedEmails++;
            }
        }

        // Return summary
        const response = {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Processing completed',
                summary: {
                    successful_emails: successfulEmails,
                    failed_emails: failedEmails,
                    total_processed: successfulEmails + failedEmails
                },
                results: results,
                errors: errors.length > 0 ? errors : undefined
            })
        };

        console.log('Final response:', response);
        return response;

    } catch (error) {
        console.error('Fatal error processing SQS event:', error);
        
        return {
            statusCode: 500,
            body: JSON.stringify({
                error: `Server error: ${error.message}`,
                eventReceived: event,
                summary: {
                    successful_emails: successfulEmails,
                    failed_emails: failedEmails,
                    total_processed: successfulEmails + failedEmails
                },
                results: results,
                errors: errors
            })
        };
    }
}; 