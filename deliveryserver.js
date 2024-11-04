// ./deliveryserver.js

import express from 'express';
import Imap from 'imap';
import { config } from 'dotenv';
import iconv from 'iconv-lite';
import cors from 'cors';

config();

const app = express();
const port = 8002;

app.use(cors({ origin: 'http://localhost:5173' }));

const imapConfig = {
  user: process.env.GMAIL_USER,
  password: process.env.GMAIL_PASSWORD,
  host: 'imap.gmail.com',
  port: 993,
  tls: true,
  tlsOptions: { rejectUnauthorized: false },
};

function createImapConnection() {
  return new Imap(imapConfig);
}

app.get('/api/fetch_emails', (req, res) => {
  const imap = createImapConnection();

  imap.once('ready', () => {
    console.log('IMAP connection ready.');
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Error opening inbox:', err);
        imap.end();
        return res.status(500).send({ error: 'Error opening inbox' });
      }

      fetchEmailsForEachSender(imap, (trackingEmails) => {
        res.json({ trackingEmails });
        imap.end();
      });
    });
  });

  imap.once('error', (err) => {
    console.error('IMAP error:', err);
    if (!res.headersSent) {
      res.status(500).send({ error: 'IMAP error' });
    }
  });

  imap.once('end', () => {
    console.log('IMAP connection closed');
  });

  imap.connect();
});

function fetchEmailsForEachSender(imap, cb) {
  const senders = ['auto-reply@usps.com', 'order-update@amazon.com', 'shipment-tracking@amazon.com'];
  const emailSubjects = [];

  const fetchEmails = (sender, callback) => {
    console.log(`Searching emails from sender: ${sender}`);

    imap.search([['FROM', sender]], (err, results) => {
      if (err) {
        console.error(`Error searching emails for sender ${sender}:`, err);
        callback();
        return;
      }
      if (results.length === 0) {
        console.log(`No emails found for sender: ${sender}`);
        callback();
        return;
      }

      console.log(`Found ${results.length} emails for sender ${sender}. Fetching headers...`);

      const fetch = imap.fetch(results.slice(-8), { bodies: 'HEADER.FIELDS (SUBJECT)' });

      fetch.on('message', (msg) => {
        let fullSubject = '';

        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            fullSubject += chunk.toString('utf8');
          });

          stream.once('end', () => {
            const matches = fullSubject.match(/=\?UTF-8\?Q\?(.+?)\?=/gi);
            if (matches) {
              const decodedSubject = matches
                .map((part) =>
                  iconv.decode(Buffer.from(part.replace(/=\?UTF-8\?Q\?/i, '').replace(/\?=/, '').replace(/_/g, ' '), 'utf8'), 'utf8')
                )
                .join('');
              console.log(`Decoded subject for ${sender}: ${decodedSubject}`);
              emailSubjects.push(decodedSubject);
            } else {
              console.log(`Non-encoded subject for ${sender}: ${fullSubject}`);
              emailSubjects.push(fullSubject);
            }
          });
        });
      });

      fetch.once('end', () => {
        console.log(`Completed fetching emails for sender ${sender}`);
        callback();
      });

      fetch.once('error', (err) => {
        console.error(`Fetch error for sender ${sender}:`, err);
        callback();
      });
    });
  };

  // Process each sender one by one
  let senderIndex = 0;

  const processNextSender = () => {
    if (senderIndex < senders.length) {
      const sender = senders[senderIndex];
      senderIndex += 1;
      fetchEmails(sender, processNextSender);
    } else {
      console.log('All senders processed.');
      cb(emailSubjects.reverse());
    }
  };

  processNextSender();
}

app.listen(port, () => {
  console.log(`✅ Delivery Server is running on port ${port}`);
});
