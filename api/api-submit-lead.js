export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { fullName, dob, phone, email, address, city, state, zip } = req.body;
    
    // YOUR EXISTING AIRTABLE SETUP
    const airtableResponse = await fetch('https://api.airtable.com/v0/YOUR_BASE_ID/YOUR_TABLE_ID', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer YOUR_AIRTABLE_API_KEY',  // Your existing key
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        fields: {
          'Full Name': fullName,
          'DOB': dob,
          'Phone': phone,
          'Email': email,
          'Address': address,
          'City': city,
          'State': state,
          'ZIP': zip,
          'Timestamp': new Date().toISOString(),
          'Status': 'new_lead'
        }
      })
    });

    if (!airtableResponse.ok) {
      throw new Error('Airtable save failed');
    }

    res.status(200).json({ success: true, message: 'Lead saved to Airtable' });
    
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to save lead' });
  }
}
