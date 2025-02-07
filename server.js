
// server.js
const express = require('express');
const axios = require('axios');

const app = express();

// Middleware to parse JSON bodies
app.use(express.json());

// Shopify store configuration
const shopName = 'vaseegrahveda'; // Your Shopify store name
const apiVersion = ' 2025-01';      // Shopify API version
const accessToken = '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'; // Your Shopify access token

// Shopify location ID (hard-coded since no .env file is used)
// Replace with your actual Shopify location ID
const location_id = '85569405222';

/**
 * Endpoint to adjust a Shopify product's inventory.
 * URL Parameter: shopifyProductId (Shopify Product ID)
 * Body JSON: { "stock_quantity": <adjustment value> }
 *
 * Note: The "stock_quantity" value here is treated as a relative adjustment.
 * For example, if you send {"stock_quantity": 5}, it will increase the available
 * inventory by 5. Similarly, {"stock_quantity": -3} will reduce the available
 * inventory by 3.
 */
app.put('/shopify/products/:shopifyProductId', async (req, res) => {
  console.log('Received Request Body:', req.body);

  const { shopifyProductId } = req.params;
  const { stock_quantity } = req.body;
  if (stock_quantity === null || typeof stock_quantity === 'undefined') {
    return res.status(400).json({
      success: false,
      message: 'stock_quantity must be provided and cannot be null.',
    });
  }

  console.log('Stock Quantity:', stock_quantity); // Debugging Line


  try {
    // 1. Retrieve the Shopify product details
    const productResponse = await axios.get(
      `https://${shopName}.myshopify.com/admin/api/${apiVersion}/products/${shopifyProductId}.json`,
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
        },
      }
    );

    const product = productResponse.data.product;
    if (!product) {
      return res.status(404).json({
        success: false,
        message: 'Product not found in Shopify.',
      });
    }

    // 2. Extract the first variant's inventory_item_id
    const variant = product.variants && product.variants[0];
    if (!variant) {
      return res.status(404).json({
        success: false,
        message: 'No variant found for the product.',
      });
    }
    const inventory_item_id = variant.inventory_item_id;
    if (!inventory_item_id) {
      return res.status(400).json({
        success: false,
        message: 'Product variant does not have an inventory_item_id.',
      });
    }

    // 3. Adjust the inventory level using Shopify's Inventory Levels API (adjust endpoint)
    const updateResponse = await axios.post(
      `https://${shopName}.myshopify.com/admin/api/${apiVersion}/inventory_levels/adjust.json`,
      {
        location_id,
        inventory_item_id,
        available_adjustment: stock_quantity, // Relative adjustment
      },
      {
        headers: {
          'X-Shopify-Access-Token': accessToken,
          'Content-Type': 'application/json',
        },
      }
    );

    res.status(200).json({
      success: true,
      message: 'Shopify product inventory adjusted successfully.',
      data: updateResponse.data,
    });
  } catch (error) {
    console.error('Error adjusting Shopify product:', error.response ? error.response.data : error);
    res.status(500).json({
      success: false,
      message: 'Failed to adjust Shopify product inventory.',
      error: error.message,
    });
  }
});

// A simple test endpoint to check JSON parsing
app.put('/test', (req, res) => {
  console.log('Test endpoint body:', req.body);
  res.json({ received: req.body });
});

// Define the port to run on (defaults to 3000)
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
