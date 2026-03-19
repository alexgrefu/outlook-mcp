/**
 * List email attachments functionality
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');

/**
 * List attachments handler
 * @param {object} args - Tool arguments
 * @param {string} args.emailId - Email ID (required)
 * @returns {object} - MCP response
 */
async function handleListAttachments(args) {
  const emailId = args.emailId;

  if (!emailId) {
    return {
      content: [{
        type: "text",
        text: "Email ID is required."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    const endpoint = `me/messages/${encodeURIComponent(emailId)}/attachments`;
    const queryParams = {
      $select: 'id,name,contentType,size,isInline'
    };

    try {
      const result = await callGraphAPI(accessToken, 'GET', endpoint, null, queryParams);

      const attachments = result.value || [];

      if (attachments.length === 0) {
        return {
          content: [{
            type: "text",
            text: "This email has no attachments."
          }]
        };
      }

      const formatted = attachments.map((att, i) => {
        const sizeKB = (att.size / 1024).toFixed(1);
        return `${i + 1}. ${att.name}
   ID: ${att.id}
   Type: ${att.contentType}
   Size: ${sizeKB} KB
   Inline: ${att.isInline ? 'Yes' : 'No'}`;
      }).join('\n\n');

      return {
        content: [{
          type: "text",
          text: `Found ${attachments.length} attachment(s):\n\n${formatted}`
        }]
      };
    } catch (error) {
      console.error(`Error listing attachments: ${error.message}`);

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
            text: `Failed to list attachments: ${error.message}`
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

module.exports = handleListAttachments;
