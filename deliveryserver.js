// ./deliveryserver.js

import express from 'express';
import Imap from 'imap';
import { config } from 'dotenv';
import iconv from 'iconv-lite'; // Import iconv-lite for decoding UTF-8 Q-encoded subjects
import cors from 'cors'; // Import CORS

config();

const app = express();
const port = 8002;

app.use(cors({ origin: 'http://localhost:5173' })); // Allow requests from the frontend origin

const imapConfig = {
  user: process.env.GMAIL_USER,
  password: process.env.GMAIL_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
};

const imap = new Imap(imapConfig);

const fetchRecentTrackingNumbers = (cb) => {
  imap.search([['FROM', 'auto-reply@usps.com']], (err, results) => {
    if (err) {
      console.error('Error searching emails:', err);
      cb([]);
      return;
    }
    if (results.length === 0) {
      console.log('No emails found from auto-reply@usps.com.');
      cb([]);
      return;
    }

    // Fetch the last 5 messages
    const fetch = imap.fetch(results.slice(-5), { bodies: 'HEADER.FIELDS (SUBJECT)' });
    const emailSubjects = [];

    fetch.on('message', (msg) => {
      let fullSubject = ''; // Variable to accumulate multi-line subject

      msg.on('body', (stream) => {
        stream.on('data', (chunk) => {
          fullSubject += chunk.toString('utf8');
        });

        stream.once('end', () => {
          // Concatenate lines and decode Q-encoded subjects
          fullSubject = fullSubject.replace(/\r\n\s+/g, ' '); // Concatenate lines with spacing

          const matches = fullSubject.match(/=\?UTF-8\?Q\?(.+?)\?=/gi);
          if (matches) {
            const decodedSubject = matches
              .map((part) =>
                iconv.decode(Buffer.from(part.replace(/=\?UTF-8\?Q\?/i, '').replace(/\?=/, '').replace(/_/g, ' '), 'utf8'), 'utf8')
              )
              .join('');
            emailSubjects.push(decodedSubject.trim());
          }
        });
      });
    });

    fetch.once('end', () => {
      console.log('Last 5 tracking numbers:', emailSubjects);
      cb(emailSubjects);
      imap.end();
    });
  });
};

// Define the /api/fetch_emails route
app.get('/api/fetch_emails', (req, res) => {
  imap.once('ready', () => {
    console.log('IMAP connection established. Checking inbox...');

    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Error opening inbox:', err);
        imap.end();
        return res.status(500).send('Error opening inbox');
      }

      console.log(`Connected to mailbox: ${box.name}. Total messages: ${box.messages.total}`);

      fetchRecentTrackingNumbers((trackingNumbers) => {
        res.json({ trackingNumbers });
      });
    });
  });

  imap.once('error', (err) => {
    console.error('IMAP error:', err);
    res.status(500).send('IMAP error');
  });

  imap.once('end', () => {
    console.log('IMAP connection closed');
  });

  // Connect to the IMAP server
  imap.connect();
});

app.listen(port, () => {
  console.log(`✅ Delivery Server is running on port ${port}`);
});
