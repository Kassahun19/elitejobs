import fetch from 'node-fetch';

async function checkBotStatus() {
  try {
    const response = await fetch('http://localhost:3000/api/bot-status');
    const data = await response.json();
    console.log('Bot Status:', JSON.stringify(data, null, 2));
  } catch (err: any) {
    console.error('Error checking bot status:', err.message);
  }
}

checkBotStatus();
