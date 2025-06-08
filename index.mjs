import { SESClient, SendRawEmailCommand } from '@aws-sdk/client-ses';
import { parse } from 'node-html-parser';
import axios from 'axios';
import nodemailer from 'nodemailer';

const sesClient = new SESClient({ region: 'us-east-1' });
const FROM_EMAIL = 'info@ticketsqueeze.com';

function stripHtmlTags(html) {
  return html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
}

async function embedImages(html) {
  const root = parse(html);
  const attachments = [];
  const urlToCid = new Map();
  let cidCounter = 0;

  const replaceImage = async (url) => {
    if (!url.startsWith('http')) return url;
    if (urlToCid.has(url)) return urlToCid.get(url);

    const cid = `img${cidCounter++}@inline`;
    try {
      const res = await axios.get(url, { responseType: 'arraybuffer' });
      const contentType = res.headers['content-type'];
      attachments.push({
        cid,
        content: Buffer.from(res.data),
        contentType,
        filename: url.split('/').pop(),
      });
      urlToCid.set(url, `cid:${cid}`);
      return `cid:${cid}`;
    } catch (err) {
      console.error(`Failed to fetch ${url}:`, err.message);
      return url;
    }
  };

  // Replace <img src="">
  const imgTags = root.querySelectorAll('img');
  for (const img of imgTags) {
    const src = img.getAttribute('src');
    if (src) {
      const newSrc = await replaceImage(src);
      img.setAttribute('src', newSrc);
    }
  }

  // Replace background-image:url(...)
  const tagsWithStyle = root.querySelectorAll('[style]');
  for (const tag of tagsWithStyle) {
    let style = tag.getAttribute('style');
    const matches = style.match(/url\(['"]?(https?:\/\/[^'")]+)['"]?\)/);
    if (matches) {
      const newUrl = await replaceImage(matches[1]);
      style = style.replace(matches[1], newUrl);
      tag.setAttribute('style', style);
    }
  }

  return { html: root.toString(), attachments };
}

export const handler = async (event) => {
  console.log('Received event:', JSON.stringify(event, null, 2));

  let successfulEmails = 0;
  let failedEmails = 0;
  const results = [];
  const errors = [];

  try {
    const records = event?.Records ?? [];
    if (!Array.isArray(records) || records.length === 0) {
      return {
        statusCode: 200,
        body: JSON.stringify({
          message: 'No records to process',
          summary: { successful_emails: 0, failed_emails: 0, total_processed: 0 },
        }),
      };
    }

    for (const record of records) {
      try {
        const messageBody = JSON.parse(record.body);
        const { emails, subject, html_body } = messageBody;

        if (!emails?.length || !subject || !html_body) {
          throw new Error('Missing required fields (emails, subject, html_body)');
        }

        const textBody = stripHtmlTags(html_body);
        const { html, attachments } = await embedImages(html_body);

        console.log('\n=== Email Structure ===');
        console.log('HTML Content:', html);
        console.log('\n=== Attachments ===');
        console.log(JSON.stringify(attachments.map(att => ({
            filename: att.filename,
            contentType: att.contentType,
            cid: att.cid,
            contentLength: att.content ? att.content.length : 0
        })), null, 2));

        for (const email of emails) {
          try {
            // Create email message
            const mailOptions = {
              from: FROM_EMAIL,
              to: email,
              subject,
              text: textBody,
              html,
              attachments
            };

            // Create a transporter
            const transporter = nodemailer.createTransport({
              streamTransport: true
            });

            // Generate raw email
            const rawEmail = await new Promise((resolve, reject) => {
              transporter.sendMail(mailOptions, (err, info) => {
                if (err) {
                  reject(err);
                  return;
                }
                
                let emailData = '';
                info.message.on('data', chunk => {
                  emailData += chunk.toString();
                });
                info.message.on('end', () => {
                  resolve(Buffer.from(emailData));
                });
                info.message.on('error', reject);
              });
            });

            // Send raw email using SES
            const command = new SendRawEmailCommand({
              RawMessage: { Data: rawEmail }
            });

            const result = await sesClient.send(command);
            successfulEmails++;
            results.push(`✅ Sent to ${email} (MessageId: ${result.MessageId})`);
            console.log(`Sent to ${email}`);
          } catch (emailErr) {
            failedEmails++;
            const msg = `❌ Failed to send to ${email}: ${emailErr.message}`;
            errors.push(msg);
            results.push(msg);
            console.error(msg);
          }
        }
      } catch (msgErr) {
        failedEmails++;
        const errorMsg = `❌ Message error: ${msgErr.message}`;
        results.push(errorMsg);
        errors.push(errorMsg);
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Processing completed',
        summary: {
          successful_emails: successfulEmails,
          failed_emails: failedEmails,
          total_processed: successfulEmails + failedEmails,
        },
        results,
        errors: errors.length > 0 ? errors : undefined,
      }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: `Server error: ${err.message}`,
        summary: {
          successful_emails: successfulEmails,
          failed_emails: failedEmails,
          total_processed: successfulEmails + failedEmails,
        },
        results,
        errors,
      }),
    };
  }
};
