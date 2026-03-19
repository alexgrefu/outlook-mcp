/**
 * OneDrive folder operations (create/delete)
 */
const { callGraphAPI } = require('../utils/graph-api');
const { ensureAuthenticated } = require('../auth');
const { getUserUpn, toUserDriveEndpoint } = require('./drive-helper');

/**
 * Create folder handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleCreateFolder(args) {
  const path = args.path;
  const name = args.name;

  if (!name) {
    return {
      content: [{
        type: "text",
        text: "Folder name is required."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    // Build parent folder endpoint
    let endpoint;
    if (!path || path === '/' || path === 'root') {
      endpoint = 'me/drive/root/children';
    } else {
      const normalizedPath = path.replace(/^\/+|\/+$/g, '');
      endpoint = `me/drive/root:/${normalizedPath}:/children`;
    }

    const body = {
      name: name,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename'
    };

    const response = await callGraphAPI(accessToken, 'POST', endpoint, body);

    if (!response || !response.id) {
      return {
        content: [{
          type: "text",
          text: "Failed to create folder."
        }]
      };
    }

    return {
      content: [{
        type: "text",
        text: `Successfully created folder "${response.name}"\n\nID: ${response.id}\nWeb URL: ${response.webUrl}`
      }]
    };
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
        text: `Error creating folder: ${error.message}`
      }]
    };
  }
}

/**
 * Delete item handler
 * @param {object} args - Tool arguments
 * @returns {object} - MCP response
 */
async function handleDeleteItem(args) {
  const itemId = args.itemId;
  const path = args.path;

  if (!itemId && !path) {
    return {
      content: [{
        type: "text",
        text: "Either itemId or path is required."
      }]
    };
  }

  try {
    const accessToken = await ensureAuthenticated();

    // Get item details first (to confirm existence and get name)
    let endpoint;
    if (itemId) {
      endpoint = `me/drive/items/${itemId}`;
    } else {
      const normalizedPath = path.replace(/^\/+|\/+$/g, '');
      endpoint = `me/drive/root:/${normalizedPath}`;
    }

    // Get item info first — try me/drive, fall back to users/{upn}/drive on 404
    let itemInfo;
    try {
      itemInfo = await callGraphAPI(accessToken, 'GET', endpoint);
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('itemNotFound')) {
        const upn = await getUserUpn(accessToken);
        const fallbackEndpoint = toUserDriveEndpoint(endpoint, upn);
        itemInfo = await callGraphAPI(accessToken, 'GET', fallbackEndpoint);
      } else {
        throw error;
      }
    }

    if (!itemInfo || !itemInfo.id) {
      return {
        content: [{
          type: "text",
          text: "Item not found."
        }]
      };
    }

    const itemName = itemInfo.name;
    const isFolder = !!itemInfo.folder;

    // Delete the item — try me/drive, fall back to users/{upn}/drive on 404
    const deleteEndpoint = `me/drive/items/${itemInfo.id}`;
    try {
      await callGraphAPI(accessToken, 'DELETE', deleteEndpoint);
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('itemNotFound')) {
        const upn = await getUserUpn(accessToken);
        const fallbackDeleteEndpoint = toUserDriveEndpoint(deleteEndpoint, upn);
        await callGraphAPI(accessToken, 'DELETE', fallbackDeleteEndpoint);
      } else {
        throw error;
      }
    }

    return {
      content: [{
        type: "text",
        text: `Successfully deleted ${isFolder ? 'folder' : 'file'} "${itemName}".`
      }]
    };
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
        text: `Error deleting item: ${error.message}`
      }]
    };
  }
}

module.exports = {
  handleCreateFolder,
  handleDeleteItem
};
