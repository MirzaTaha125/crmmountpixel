import emailjs from '@emailjs/browser';

/**
 * Sends an email using EmailJS
 * @param {Object} params
 * @param {string} params.to_name - Recipient's name
 * @param {string} params.to_email - Recipient's email
 * @param {string} params.subject - Email subject
 * @param {string} params.message - Email message
 * @returns {Promise}
 */
export function sendEmailWithEmailJS({ to_name, to_email, subject, message }) {
  // TODO: Replace with your actual EmailJS service/template/public key
  const SERVICE_ID = 'YOUR_SERVICE_ID';
  const TEMPLATE_ID = 'YOUR_TEMPLATE_ID';
  const PUBLIC_KEY = 'YOUR_PUBLIC_KEY';

  return emailjs.send(
    SERVICE_ID,
    TEMPLATE_ID,
    {
      to_name,
      to_email,
      subject,
      message,
    },
    PUBLIC_KEY
  );
} 