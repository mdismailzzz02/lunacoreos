import { requestDriveAccess } from './googleAuth';

const BASE_URL = 'https://gmail.googleapis.com/gmail/v1/users/me';

/**
 * Helper to get active Google token
 */
const getToken = async (isSilent = false) => {
    const token = await requestDriveAccess(isSilent);
    if (!token) throw new Error('Google Authentication required');
    return token;
};

/**
 * Fetch a list of message IDs from the inbox
 */
export const getInbox = async (maxResults = 20, pageToken = '', query = 'in:inbox', isSilent = true) => {
    const token = await getToken(isSilent);
    let url = `${BASE_URL}/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    
    const res = await fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!res.ok) throw new Error('Failed to fetch inbox messages');
    return await res.json();
};

/**
 * Fetch a specific message by ID and parse it
 */
export const getMessage = async (messageId, isSilent = true) => {
    const token = await getToken(isSilent);
    const res = await fetch(`${BASE_URL}/messages/${messageId}?format=full`, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    });
    if (!res.ok) throw new Error(`Failed to fetch message ${messageId}`);
    
    const data = await res.json();
    return parseMessage(data);
};

/**
 * Helper to decode base64url encoded strings
 */
function decodeBase64Url(str) {
    if (!str) return '';
    try {
        const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
        const binString = atob(base64);
        const bytes = new Uint8Array(binString.length);
        for (let i = 0; i < binString.length; i++) {
            bytes[i] = binString.charCodeAt(i);
        }
        const decoder = new TextDecoder('utf-8');
        return decoder.decode(bytes);
    } catch (e) {
        return '';
    }
}

/**
 * Recursively find the body parts of an email
 */
function getBodyParts(parts) {
    let body = { text: '', html: '' };
    if (!parts) return body;

    for (let part of parts) {
        if (part.mimeType === 'text/plain') {
            body.text += decodeBase64Url(part.body?.data || '');
        } else if (part.mimeType === 'text/html') {
            body.html += decodeBase64Url(part.body?.data || '');
        } else if (part.parts) {
            const nested = getBodyParts(part.parts);
            body.text += nested.text;
            body.html += nested.html;
        }
    }
    return body;
}

/**
 * Parse the raw Gmail API message object into a simpler format
 */
function parseMessage(message) {
    const payload = message.payload;
    if (!payload) return message;

    const headers = payload.headers || [];
    const getHeader = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';

    let textBody = '';
    let htmlBody = '';

    if (payload.parts) {
        const parts = getBodyParts(payload.parts);
        textBody = parts.text;
        htmlBody = parts.html;
    } else if (payload.body && payload.body.data) {
        if (payload.mimeType === 'text/html') {
            htmlBody = decodeBase64Url(payload.body.data);
        } else {
            textBody = decodeBase64Url(payload.body.data);
        }
    }

    return {
        id: message.id,
        threadId: message.threadId,
        snippet: message.snippet,
        subject: getHeader('Subject'),
        from: getHeader('From'),
        to: getHeader('To'),
        date: getHeader('Date'),
        messageIdHeader: getHeader('Message-ID'),
        textBody,
        htmlBody
    };
}

/**
 * Send an email
 */
export const sendEmail = async (to, subject, body, threadId = null, messageId = null) => {
    const token = await getToken();
    
    const utf8Subject = `=?utf-8?B?${btoa(unescape(encodeURIComponent(subject)))}?=`;
    
    let emailLines = [
        `To: ${to}`,
        `Subject: ${utf8Subject}`,
        'Content-Type: text/html; charset="UTF-8"',
        'MIME-Version: 1.0'
    ];

    if (threadId && messageId) {
        emailLines.push(`In-Reply-To: ${messageId}`);
        emailLines.push(`References: ${messageId}`);
    }

    emailLines.push('', body);
    
    const emailStr = emailLines.join('\r\n');
    const base64EncodedEmail = btoa(unescape(encodeURIComponent(emailStr))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    
    const payload = { raw: base64EncodedEmail };
    if (threadId) {
        payload.threadId = threadId;
    }

    const res = await fetch(`${BASE_URL}/messages/send`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
    });
    
    if (!res.ok) throw new Error('Failed to send email');
    return await res.json();
};

/**
 * Archive an email (Remove INBOX label)
 */
export const archiveEmail = async (id) => {
    const token = await getToken(false);
    const res = await fetch(`${BASE_URL}/messages/${id}/modify`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            removeLabelIds: ['INBOX']
        })
    });
    if (!res.ok) throw new Error('Failed to archive email');
    return await res.json();
};

/**
 * Delete an email (Move to TRASH)
 */
export const deleteEmail = async (id) => {
    const token = await getToken(false);
    const res = await fetch(`${BASE_URL}/messages/${id}/modify`, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            addLabelIds: ['TRASH'],
            removeLabelIds: ['INBOX']
        })
    });
    if (!res.ok) throw new Error('Failed to delete email');
    return await res.json();
};
