export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).end();

  const response = await fetch(
    'https://api.hubapi.com/crm/v3/objects/companies',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.REACT_APP_HUBSPOT_TOKEN}`,
      },
      body: JSON.stringify(req.body),
    }
  );

  const data = await response.json();
  res.status(response.status).json(data);
}
