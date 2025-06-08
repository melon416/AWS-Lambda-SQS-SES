<?php

require 'vendor/autoload.php';

use Aws\Sqs\SqsClient;
use Aws\Exception\AwsException;

// Test HTML content with the Red Rocks newsletter
$testHtml = <<<HTML
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Testing Red Rocks Newsletter</title>
  </head>
  <body>
    <div id="newsletter_container" style="width:800px;margin:0 auto; border:2px solid #000;font-family:arial">
      <div id="ts_newsletter" style="font-family:arial;background-color:#fff">
        <div id="newsletter_topbar" style="font-weight:bold;color:#fff;text-align:center;text-transform:uppercase;font-size:2rem;padding:10px;background-color:#1a2026">
          Testing Red Rocks Newsletter
        </div>
        <div id="newsletter_header" style="background-image:url("https://affiliates.ticketsqueeze.com/images/newsletters/newsletter-background.jpg"); background-size:cover;background-repeat:no-repeat; background-position:center center; padding:10px;color:#fff;text-transform:uppercase; text-align:center;">
          <h1 style="font-size:2.8rem;margin:10% 0; font-weight:bold; font-family:impact,oswald,arial">
            Amazon <span style="color: rgba(244,244,244,0.5)">SES</span>
          </h1>
        </div>
        <div id="newsletter_poweredby" style="color:#fff;text-align:center; text-transform:uppercase;font-size:0.8rem;font-weight:600; padding:10px;background-color:#1a2026">
          <div style="float:left;">
            <img src="https://affiliates.ticketsqueeze.com/images/newsletters/five-star.png" alt="5 star" width="114" height="20">
            <span style="position:relative;top:-5px;white-space:nowrap">100% Buyer Protection</span>
          </div>
          <div style="float:left;padding:5px;">
            <span style="padding:0px 30px;white-space:nowrap;">
              <a href="http://www.ticketsqueeze.com" style="text-decoration:none;color:#fff">Powered by TicketSqueeze.com</a>
            </span>
          </div>
          <div style="float:right;">
            <img src="https://affiliates.ticketsqueeze.com/images/newsletters/shopper-approve.png" alt="shopper approved" width="160" height="25">
          </div>
          <br style="clear:both">
        </div>
        <div id="newsletter_featured" style="background-color:#fff">
          <p id="ts_newsletter_featured_image" style="margin:0px">
            <a href="https://www.ticketsqueeze.com/tickets/6837944/buy-tickets?utm_source=newsletter-0625">
              <img src="https://affiliates.ticketsqueeze.com/images/events/300919/01-wwe-nxt-aaa-worlds-collide-2025.png" style="max-width:100%">
            </a>
          </p>
          <p id="ts_newsletter_featured_text" style="color:#4E8CAF;font-size:.8rem;margin:10px 20px;text-align:center">
            Dr. Dog is here to provide the perfect summer day in Morrison, Colorado. The band's going to be promoting their new self-titled album. Yes, after a ton of years in the business, they finally decided to release an album titled Dr. Dog. Without a doubt, this stop at the Red Rocks on Tuesday, July 1st, is set to be one of the marquee moments of the entire tour.
          </p>
        </div>
      </div>
    </div>
  </body>
</html>
HTML;

// Verify image URLs are accessible
function checkImageUrl($url) {
    $headers = get_headers($url);
    return $headers && strpos($headers[0], '200') !== false;
}

// Check all image URLs
$imageUrls = [
    'https://affiliates.ticketsqueeze.com/images/newsletters/newsletter-background.jpg',
    'https://affiliates.ticketsqueeze.com/images/newsletters/five-star.png',
    'https://affiliates.ticketsqueeze.com/images/newsletters/shopper-approve.png',
    'https://affiliates.ticketsqueeze.com/images/events/300919/01-wwe-nxt-aaa-worlds-collide-2025.png'
];

echo "\nChecking image URLs:\n";
foreach ($imageUrls as $url) {
    echo $url . " - " . (checkImageUrl($url) ? "✅ Accessible" : "❌ Not accessible") . "\n";
}

try {
    // Initialize SQS client
    $sqsClient = new SqsClient([
        'version' => 'latest',
        'region'  => 'us-east-1'
    ]);

    $queueUrl = 'https://sqs.us-east-1.amazonaws.com/729407190052/TicketSqueeze-Email-Queue.fifo';
    
    // Prepare message body according to Lambda function expectations
    $messageBody = [
        'emails' => ['success@simulator.amazonses.com'], // Using SES simulator for testing
        'subject' => 'Red Rocks Newsletter - July Events',
        'html_body' => $testHtml
    ];
    
    // Log the HTML content for verification
    echo "\nHTML Content Analysis:\n";
    echo "Total <img> tags: " . substr_count($testHtml, '<img') . "\n";
    echo "Background images: " . substr_count($testHtml, 'background-image:url') . "\n";
    
    // Generate a unique message ID for deduplication
    $messageId = 'test-' . time() . '-' . uniqid();
    
    // Prepare message parameters
    $params = [
        'QueueUrl' => $queueUrl,
        'MessageBody' => json_encode($messageBody),
        'MessageGroupId' => 'newsletter_test',
        'MessageDeduplicationId' => $messageId
    ];

    // Send message
    $result = $sqsClient->sendMessage($params);
    
    echo "Message sent successfully!\n";
    echo "MessageId: " . $result['MessageId'] . "\n";
    echo "SequenceNumber: " . ($result['SequenceNumber'] ?? 'N/A') . "\n";
    echo "\nMessage Details:\n";
    echo "To: " . implode(', ', $messageBody['emails']) . "\n";
    echo "Subject: " . $messageBody['subject'] . "\n";
    echo "Images in HTML: " . substr_count($testHtml, '<img') . "\n";

} catch (AwsException $e) {
    echo "Error sending message: " . $e->getMessage() . "\n";
    echo "Error Code: " . $e->getAwsErrorCode() . "\n";
    echo "Request ID: " . $e->getRequestId() . "\n";
} catch (Exception $e) {
    echo "Unexpected error: " . $e->getMessage() . "\n";
} 