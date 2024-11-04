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

      fetchEmailsForEachSender(imap, (emails) => {
        // Sort emails by date after all have been fetched
        emails.sort((a, b) => new Date(b.date) - new Date(a.date));
        console.log("Final sorted emails:");
        emails.forEach((email, index) => {
          console.log(`Email ${index + 1} - Date: ${email.date}, Sender: ${email.sender}, Subject: ${email.subject}`);
        });
        res.json({ emails });
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
  const senders = [
    { email: 'auto-reply@usps.com', logo: '/src/modules/delivery/pics/United-States-Postal-Service-Logo.png' },
    { email: 'order-update@amazon.com', logo: '/src/modules/delivery/pics/Amazon-Logo.png' },
    { email: 'shipment-tracking@amazon.com', logo: '/src/modules/delivery/pics/Amazon-Logo.png' },
    { email: 'help@walmart.com', logo: '/src/modules/delivery/pics/Walmart-Logo.png' }
  ];
  const emails = [];

  const fetchEmails = (senderInfo, callback) => {
    const { email, logo } = senderInfo;
    console.log(`Searching emails from sender: ${email}`);

    imap.search([['FROM', email]], (err, results) => {
      if (err) {
        console.error(`Error searching emails for sender ${email}:`, err);
        callback();
        return;
      }
      if (results.length === 0) {
        console.log(`No emails found for sender: ${email}`);
        callback();
        return;
      }

      console.log(`Found ${results.length} emails for sender ${email}. Fetching headers...`);

      const fetch = imap.fetch(results.slice(-8), { bodies: 'HEADER.FIELDS (SUBJECT DATE)' });

      fetch.on('message', (msg) => {
        let fullSubject = '';
        let dateHeader = '';

        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            const text = chunk.toString('utf8');
            const subjectMatch = text.match(/Subject: (.*)/i);
            if (subjectMatch) {
              fullSubject += subjectMatch[1].trim();
            }
            const dateMatch = text.match(/Date: (.*)/i);
            if (dateMatch) {
              dateHeader = dateMatch[1].trim();
            }
          });

          stream.once('end', () => {
            // Decode subject
            const matches = fullSubject.match(/=\?UTF-8\?Q\?(.+?)\?=/gi);
            const subject = matches
              ? matches.map((part) =>
                  iconv.decode(Buffer.from(part.replace(/=\?UTF-8\?Q\?/i, '').replace(/\?=/, '').replace(/_/g, ' '), 'utf8'), 'utf8')
                ).join('')
              : fullSubject;

            // Parse the date, or set to null if invalid
            const parsedDate = new Date(dateHeader);
            const emailDate = isNaN(parsedDate) ? null : parsedDate.toISOString();

            if (!emailDate) {
              console.warn(`Invalid date parsed for email from ${email}: ${dateHeader}`);
            }

            console.log(`Fetched email - Date: ${emailDate}, Sender: ${email}, Subject: ${subject}`);

            emails.push({ sender: email, subject, date: emailDate, logo });
          });
        });
      });

      fetch.once('end', () => {
        console.log(`Completed fetching emails for sender ${email}`);
        callback();
      });

      fetch.once('error', (err) => {
        console.error(`Fetch error for sender ${email}:`, err);
        callback();
      });
    });
  };

  let senderIndex = 0;

  const processNextSender = () => {
    if (senderIndex < senders.length) {
      const sender = senders[senderIndex];
      senderIndex += 1;
      fetchEmails(sender, processNextSender);
    } else {
      console.log('All senders processed.');
      cb(emails);
    }
  };

  processNextSender();
}

app.listen(port, () => {
  console.log(`✅ Delivery Server is running on port ${port}`);
});
