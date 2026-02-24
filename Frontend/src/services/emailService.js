import axios from 'axios';
import getApiBaseUrl from '../apiBase';

const API_URL = getApiBaseUrl();

/**
 * Send email using the authenticated user's work email
 * @param {Object} emailData - Email data
 * @param {string} emailData.to - Recipient email address
 * @param {string} emailData.toName - Recipient name (optional)
 * @param {string} emailData.subject - Email subject
 * @param {string} emailData.html - Email body in HTML format
 * @param {string} emailData.text - Email body in plain text (optional)
 * @param {Array} emailData.cc - CC recipients (optional)
 * @param {Array} emailData.bcc - BCC recipients (optional)
 * @returns {Promise<Object>} Response from server
 */
export async function sendEmail(emailData) {
  try {
    const token = localStorage.getItem('token') || 
                  (() => {
                    try {
                      const user = JSON.parse(localStorage.getItem('crm_user') || 'null');
                      return user?.token;
                    } catch {
                      return null;
                    }
                  })();

    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const response = await axios.post(
      `${API_URL}/api/emails/send`,
      emailData,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error sending email:', error);
    
    if (error.response) {
      // Server responded with error
      throw new Error(error.response.data.error || error.response.data.message || 'Failed to send email');
    } else if (error.request) {
      // Request made but no response
      throw new Error('Network error. Please check your connection and try again.');
    } else {
      // Error setting up request
      throw new Error(error.message || 'Failed to send email');
    }
  }
}

/**
 * Test email configuration for authenticated user
 * @returns {Promise<Object>} Test result
 */
export async function testEmailConfiguration() {
  try {
    const token = localStorage.getItem('token') || 
                  (() => {
                    try {
                      const user = JSON.parse(localStorage.getItem('crm_user') || 'null');
                      return user?.token;
                    } catch {
                      return null;
                    }
                  })();

    if (!token) {
      throw new Error('Authentication token not found. Please log in again.');
    }

    const response = await axios.get(
      `${API_URL}/api/emails/test`,
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    return response.data;
  } catch (error) {
    console.error('Error testing email configuration:', error);
    
    if (error.response) {
      throw new Error(error.response.data.error || error.response.data.message || 'Failed to test email configuration');
    } else if (error.request) {
      throw new Error('Network error. Please check your connection and try again.');
    } else {
      throw new Error(error.message || 'Failed to test email configuration');
    }
  }
}

