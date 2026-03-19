/**
 * Download email attachment functionality
 */
const fs = require('fs');
const path = require('path');
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * Download attachment handler
 * @param {object} args - Tool arguments
 * @param {string} args.emailId - Email ID (required)
 * @param {string} args.attachmentId - Attachment ID (required)
 * @param {string} args.savePath - Optional file path to save the attachment
 * @returns {object} - MCP response
 */
async function handleDownloadAttachment(args) {
  const emailId = args.emailId;
  const attachmentId = args.attachmentId;
  const savePath = args.savePath;

  if (!emailId) {
    return {
      content: [{
        type: "text",
        text: "Email ID is required."
      }]
    };
  }

  if (!attachmentId) {
    return {
      content: [{
        type: "text",
        text: "Attachment ID is required."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    const endpoint = `me/messages/${encodeURIComponent(emailId)}/attachments/${encodeURIComponent(attachmentId)}`;

    try {
      const attachment = await callGraphAPI(accessToken, 'GET', endpoint);

      if (!attachment) {
        return {
          content: [{
            type: "text",
            text: "Attachment not found."
          }]
        };
      }

      if (savePath) {
        // Decode base64 content and save to file
        const resolvedPath = path.resolve(savePath);
        const dir = path.dirname(resolvedPath);

        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        const buffer = Buffer.from(attachment.contentBytes, 'base64');
        fs.writeFileSync(resolvedPath, buffer);

        return {
          content: [{
            type: "text",
            text: `Attachment "${attachment.name}" saved successfully to: ${resolvedPath}\nSize: ${(buffer.length / 1024).toFixed(1)} KB`
          }]
        };
      } else {
        // Return attachment metadata and base64 content as JSON
        return {
          content: [{
            type: "text",
            text: JSON.stringify({
              name: attachment.name,
              contentType: attachment.contentType,
              size: attachment.size,
              contentBytes: attachment.contentBytes
            }, null, 2)
          }]
        };
      }
    } catch (error) {
      console.error(`Error downloading attachment: ${error.message}`);

      if (error.message.includes("doesn't belong to the targeted mailbox")) {
        return {
          content: [{
            type: "text",
            text: "The email ID seems invalid or doesn't belong to your mailbox. Please try with a different email ID."
          }]
        };
      } else if (error.message.includes("UNAUTHORIZED")) {
        return {
          content: [{
            type: "text",
            text: "Authentication failed. Please re-authenticate and try again."
          }]
        };
      } else {
        return {
          content: [{
            type: "text",
            text: `Failed to download attachment: ${error.message}`
          }]
        };
      }
    }
  } catch (error) {
    if (error.message === 'Authentication required') {
      return {
        content: [{
          type: "text",
          text: "Authentication required. Please use the 'authenticate' tool first."
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Error accessing email: ${error.message}`
      }]
    };
  }
}

module.exports = handleDownloadAttachment;
