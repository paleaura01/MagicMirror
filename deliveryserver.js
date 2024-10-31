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
    imap.openBox('INBOX', false, (err, box) => {
      if (err) {
        console.error('Error opening inbox:', err);
        imap.end();
        return res.status(500).send({ error: 'Error opening inbox' });
      }

      fetchRecentTrackingNumbers(imap, (trackingNumbers) => {
        res.json({ trackingNumbers });
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

function fetchRecentTrackingNumbers(imap, cb) {
    imap.search([['FROM', 'auto-reply@usps.com']], (err, results) => {
      if (err) {
        console.error('Error searching emails:', err);
        cb([]);
        return;
      }
      if (results.length === 0) {
        cb([]);
        return;
      }

      // Fetch the last 8 messages
      const fetch = imap.fetch(results.slice(-8), { bodies: 'HEADER.FIELDS (SUBJECT)' });
      const emailSubjects = [];

      fetch.on('message', (msg) => {
        let fullSubject = '';

        msg.on('body', (stream) => {
          stream.on('data', (chunk) => {
            fullSubject += chunk.toString('utf8');
          });

          stream.once('end', () => {
            fullSubject = fullSubject.replace(/\r\n\s+/g, ' ');

            const matches = fullSubject.match(/=\?UTF-8\?Q\?(.+?)\?=/gi);
            if (matches) {
              const decodedSubject = matches
                .map((part) =>
                  iconv.decode(Buffer.from(part.replace(/=\?UTF-8\?Q\?/i, '').replace(/\?=/, '').replace(/_/g, ' '), 'utf8'), 'utf8')
                )
                .join('');

              // Refine the format to match the desired output
              const formattedSubject = decodedSubject
                .replace(/USPS=C2=AE\s+/i, '') // Remove USPS trademark
                .replace(/Expected\s+|on\s+|by\s+/gi, '') // Remove "Expected", "on", and "by"
                .replace(/\b(arriving|between)\b\s+/gi, '') // Remove "arriving" and "between"
                .replace(/(\d{1,2}:\d{2}[ap]m)\s+(\d+)/i, '$1 - $2') // Add dash before tracking number
                .replace(/^(Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+/i, '') // Remove weekday if it appears at the start
                .replace(/\s+/g, ' ') // Remove extra whitespace
                .trim();
            
              // Remove "Delivery" if it’s at the beginning of the string
              const finalSubject = formattedSubject.startsWith('Delivery')
                ? formattedSubject.slice('Delivery'.length).trim()
                : formattedSubject;

              emailSubjects.push(finalSubject);
            }
          });
        });
      });

      fetch.once('end', () => {
        cb(emailSubjects.reverse()); // Reverse the order to show the newest emails at the top
      });

      fetch.once('error', (err) => {
        console.error('Fetch error:', err);
        cb([]);
      });
    });
}

  

app.listen(port, () => {
  console.log(`✅ Delivery Server is running on port ${port}`);
});
