require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const path = require('path');

const app = express();
const port = process.env.PORT || 5000;
const contactRecipient = 'goutamjaiswal0613@gmail.com';
const requiredEnvironment = ['SMTP_HOST', 'SMTP_PORT', 'SMTP_USER', 'SMTP_PASS'];

app.use(express.json({ limit: '10kb' }));
app.use(express.static(__dirname));

function cleanText(value, maximumLength) {
  return typeof value === 'string' ? value.trim().slice(0, maximumLength) : '';
}

function escapeHtml(value) {
  return value.replace(/[&<>'"]/g, character => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  })[character]);
}

app.post('/api/contact', async (request, response) => {
  const name = cleanText(request.body.NAME, 100);
  const email = cleanText(request.body.EMAIL, 254);
  const subject = cleanText(request.body.SUBJECT, 150);
  const message = cleanText(request.body.MESSAGE, 5000);

  if (!name || !email || !message) {
    return response.status(400).json({ success: false, error: 'Name, email, and message are required.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return response.status(400).json({ success: false, error: 'Please enter a valid email address.' });
  }

  const missingConfiguration = requiredEnvironment.filter(key => !process.env[key]);
  if (missingConfiguration.length) {
    console.error(`Contact form is not configured: ${missingConfiguration.join(', ')}`);
    return response.status(503).json({ success: false, error: 'The contact service is temporarily unavailable.' });
  }

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: contactRecipient,
      replyTo: email,
      subject: `[Portfolio contact] ${subject || 'New message from ' + name}`,
      text: `Name: ${name}\nEmail: ${email}\nSubject: ${subject || '(none)'}\n\nMessage:\n${message}`,
      html: `<p><strong>Name:</strong> ${escapeHtml(name)}</p><p><strong>Email:</strong> ${escapeHtml(email)}</p><p><strong>Subject:</strong> ${escapeHtml(subject || '(none)')}</p><p><strong>Message:</strong></p><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`
    });
    return response.status(200).json({ success: true });
  } catch (error) {
    console.error('Unable to send contact email:', error.message);
    return response.status(502).json({ success: false, error: 'Unable to send your message right now. Please try again later.' });
  }
});

app.listen(port, () => console.log(`Portfolio site is running on port ${port}`));
