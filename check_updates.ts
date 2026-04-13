import TelegramBot from 'node-telegram-bot-api';
import dotenv from 'dotenv';
dotenv.config();

const token = process.env.TELEGRAM_BOT_TOKEN;

async function checkUpdates() {
  if (!token) {
    console.error('TELEGRAM_BOT_TOKEN not set');
    return;
  }
  
  const bot = new TelegramBot(token, { polling: false });
  try {
    const me = await bot.getMe();
    console.log(`Bot: @${me.username}`);
    
    const updates = await bot.getUpdates({ limit: 10, offset: -10 });
    console.log(`Updates received: ${updates.length}`);
    console.log(JSON.stringify(updates, null, 2));
  } catch (err: any) {
    console.error('Error checking updates:', err.message);
  }
}

checkUpdates();
