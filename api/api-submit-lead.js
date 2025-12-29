export default async function handler(request, response) {
  response.setHeader('Access-Control-Allow-Origin', '*');
  response.setHeader('Access-Control-Allow-Methods', 'POST');
  
  if (request.method === 'POST') {
    console.log('NEW LEAD:', request.body);
    response.status(200).json({ success: true });
  } else {
    response.status(405).json({ error: 'Method not allowed' });
  }
}
