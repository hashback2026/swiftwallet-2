const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizePhone(phone) {
  phone = phone.trim();

  if (phone.startsWith('0')) {
    return '254' + phone.substring(1);
  }

  if (phone.startsWith('+254')) {
    return phone.replace('+', '');
  }

  return phone;
}

app.post('/send-bulk-stk', async (req, res) => {
  try {
    const {
      numbers,
      amount,
      external_reference
    } = req.body;

    if (!numbers || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Numbers and amount are required'
      });
    }

    const phoneNumbers = numbers
      .split('\\n')
      .map(num => normalizePhone(num))
      .filter(Boolean);

    const results = [];

    for (const phone of phoneNumbers) {
      try {
        const payload = {
          amount: Number(amount),
          phone_number: phone,
          external_reference: external_reference || `REF-${Date.now()}`
        };

        const response = await axios.post(
          process.env.API_URL,
          payload,
          {
            headers: {
              'Authorization': `Bearer ${process.env.API_KEY}`,
              'Content-Type': 'application/json'
            }
          }
        );

        results.push({
          phone,
          success: true,
          response: response.data
        });

      } catch (error) {
        results.push({
          phone,
          success: false,
          error: error.response?.data || error.message
        });
      }

      await sleep(2000);
    }

    res.json({
      success: true,
      total: results.length,
      results
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
