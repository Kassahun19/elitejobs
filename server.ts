import express from "express";
import dotenv from "dotenv";
dotenv.config();
console.log("🔥 [SERVER] server.ts is being executed...");
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import fs from "fs";
import nodemailer from "nodemailer";
import twilio from "twilio";
import TelegramBot from "node-telegram-bot-api";
import { initDB, User, Job, Receipt, Notification, BotUser, System, Application, Message, AuditLog, Transaction } from "./src/lib/db.ts";
import { Op } from "sequelize";

// Helper for Audit Logging
const logAudit = async (userId: string | null, action: string, details: any = {}, req?: any) => {
  try {
    const ipAddress = req?.ip || req?.headers['x-forwarded-for'] || 'unknown';
    await AuditLog.create({
      id: nanoid(),
      userId,
      action,
      details,
      ipAddress
    });
    console.log(`📝 [AUDIT] ${action} by ${userId || 'system'}`);
  } catch (err) {
    console.error(`❌ [AUDIT ERROR] Failed to log action ${action}:`, err);
  }
};

// Initialize Database
// initDB() is now called inside startServer()

// Auto-bootstrap admin
const bootstrapAdmin = async () => {
  try {
    const adminEmail = 'kassahunmulatu273@gmail.com';
    const admin = await User.findOne({ where: { email: adminEmail } });
    if (!admin) {
      console.log(`🔥 [SERVER] Bootstrapping admin user: ${adminEmail}`);
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const uid = nanoid();
      await User.create({
        uid,
        email: adminEmail,
        password: hashedPassword,
        displayName: "System Admin",
        role: "admin",
        subscription: { type: 'lifetime', status: 'active', expiresAt: '2099-12-31' },
        viewedJobsCount: 0,
        isVerified: true,
      });
      console.log(`✅ [SERVER] Admin user bootstrapped!`);
    } else if (!(admin as any).password) {
      console.log(`🔥 [SERVER] Admin user exists but password missing. Updating...`);
      const hashedPassword = await bcrypt.hash("admin123", 10);
      await admin.update({ password: hashedPassword });
      console.log(`✅ [SERVER] Admin password updated!`);
    }
  } catch (err: any) {
    console.error(`❌ [SERVER] Admin bootstrap FAILED: ${err.message}`);
  }
};

// bootstrapAdmin() is now called inside startServer()

console.log(`[SERVER] Starting in ${process.env.NODE_ENV} mode`);
console.log(`[SERVER] Environment Variables:`, {
  PROJECT_ID: process.env.GOOGLE_CLOUD_PROJECT,
  K_SERVICE: process.env.K_SERVICE,
  NODE_ENV: process.env.NODE_ENV
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

// Cleanup function to permanently remove jobs 5 days after deadline
const cleanupJobs = async () => {
  try {
    const now = new Date();
    const fiveDaysInMs = 5 * 24 * 60 * 60 * 1000;
    
    const jobs = await Job.findAll();
    let removedCount = 0;
    
    for (const job of jobs) {
      const jobData = job.get({ plain: true });
      if (!jobData.deadline) continue;
      
      const deadlineDate = new Date(jobData.deadline);
      // Set to end of day for deadline to be fair
      deadlineDate.setHours(23, 59, 59, 999);
      const expirationDate = new Date(deadlineDate.getTime() + fiveDaysInMs);
      
      if (expirationDate <= now) {
        await job.destroy();
        removedCount++;
      }
    }

    if (removedCount > 0) {
      console.log(`[CLEANUP] Removed ${removedCount} expired jobs. Application records are preserved.`);
    }
  } catch (error) {
    console.error('[CLEANUP ERROR]', error);
  }
};

// Run cleanup on start
// cleanupJobs() is now called inside startServer()

// Run cleanup every 6 hours
setInterval(cleanupJobs, 6 * 60 * 60 * 1000);

const JWT_SECRET = "elite-jobs-ethiopia-secret-key-2026";

// Helper to wrap async routes
const asyncHandler = (fn: any) => (req: any, res: any, next: any) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Packages Configuration
const PACKAGES = [
  { id: 'basic', name: 'Basic Access', price: '200 ETB', description: 'Full access to all job posts for 1 month.' },
  { id: 'standard', name: 'Standard Access', price: '500 ETB', description: 'Full access to all job posts for 3 months.' },
  { id: 'lifetime', name: 'Lifetime Access', price: '1000 ETB', description: 'Unlimited lifetime access to all job posts.' }
];

// Payment Details
const PAYMENT_INFO = `🏦 *Payment Instructions*\n\nPlease transfer the exact amount to one of the following accounts:\n\n` +
  `🔹 *Commercial Bank of Ethiopia (CBE)*\n` +
  `   Account: \`1000183217198\`\n\n` +
  `🔹 *Bank of Abyssinia (BOA)*\n` +
  `   Account: \`32419186\`\n\n` +
  `🔹 *Bunna Bank*\n` +
  `   Account: \`3609501002452\`\n\n` +
  `🔹 *Telebirr / Mobile*\n` +
  `   Number: \`0915508167\`\n\n` +
  `👤 *Account Name:* Kassahun Mulatu Kebede\n\n` +
  `⚠️ *Important:* After payment, please send the *Transaction ID* or a *Screenshot* of the receipt here.`;

// Initialize Telegram Bot
let bot: TelegramBot | null = null;
let botStatus = "Not Initialized";
let lastBotError: string | null = null;
let botMessageHistory: any[] = [];
let botLogHistory: string[] = [];

const botLog = (message: string) => {
  const logMsg = `[${new Date().toISOString()}] ${message}`;
  console.log(logMsg);
  botLogHistory.push(logMsg);
  if (botLogHistory.length > 100) botLogHistory.shift();
};

const initBot = async () => {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    console.warn("⚠️ [BOT] TELEGRAM_BOT_TOKEN is not set. Telegram bot will not be initialized.");
    botStatus = "Missing Token";
    return;
  }

  try {
    botLog("🤖 Initializing Telegram Bot with token...");
    botStatus = "Initializing";
    // Initialize without polling first
    bot = new TelegramBot(token, { polling: false });
    botLog("✅ Telegram Bot instance created.");
    
    // Register handlers IMMEDIATELY before any async calls
    // This ensures they are ready as soon as polling starts
    botLog("🔥 Registering handlers...");
    
    // Handle /start command
    bot.on('message', (msg) => {
      botLog(`📩 Message received from ${msg.chat.id}: ${msg.text || '[No Text]'}`);
      botMessageHistory.push({
        timestamp: new Date().toISOString(),
        chatId: msg.chat.id,
        text: msg.text,
        username: msg.from?.username
      });
      if (botMessageHistory.length > 50) botMessageHistory.shift();
    });

    bot.onText(/\/start/, async (msg) => {
      const chatId = msg.chat.id;
      botLog(`🚀 /start received from ${chatId} (${msg.from?.username || 'no-username'})`);
      
      try {
        // 1. Send welcome message IMMEDIATELY to be responsive
        const welcomeMsg = `👋 *Welcome to EliteJobs Ethiopia!*\n\nI am the official bot for EliteJobs. You can browse jobs, manage subscriptions, and more.\n\nPlease select how you would like to proceed:`;
        
        const opts = {
          parse_mode: 'Markdown' as const,
          reply_markup: {
            inline_keyboard: [
              [
                { text: "👤 User", callback_data: 'proceed_user' },
                { text: "🔐 Admin", callback_data: 'proceed_admin' }
              ]
            ]
          }
        };
        
        botLog(`📤 Sending welcome message to ${chatId}...`);
        await bot?.sendMessage(chatId, welcomeMsg, opts);
        botLog(`✅ Welcome message sent to ${chatId}`);

        // 2. Handle background user registration/sync
        getBotUser(chatId, msg.from?.username).catch(err => {
          botLog(`⚠️ Error in background user sync for ${chatId}: ${err.message}`);
        });

      } catch (e: any) {
        botLog(`❌ Fatal error in /start handler for ${chatId}: ${e.message}`);
        // Fallback message if something goes wrong
        bot?.sendMessage(chatId, "⚠️ Sorry, I encountered an error. Please try again in a moment or use /help.").catch(() => {});
      }
    });

    // Handle /ping command for diagnostics
    bot.onText(/\/ping/, async (msg) => {
      console.log(`🏓 [BOT] /ping received from ${msg.chat.id}`);
      try {
        await bot?.sendMessage(msg.chat.id, "🏓 Pong! Bot is alive and responding.");
      } catch (err: any) {
        console.error(`❌ [BOT] Error responding to /ping:`, err.message);
      }
    });

    // Handle /help command
    bot.onText(/\/help/, async (msg) => {
      const chatId = msg.chat.id;
      console.log(`📖 [BOT] /help received from ${chatId}`);
      try {
        const helpMsg = `📖 *EliteJobs Ethiopia Bot Help*\n\n` +
          `• /start - Start the bot and see main menu\n` +
          `• /stats - View platform statistics\n` +
          `• /ping - Check if bot is alive\n` +
          `• /help - Show this help message\n\n` +
          `If you have any issues, please contact our support team.`;
        await bot?.sendMessage(chatId, helpMsg, { parse_mode: 'Markdown' });
      } catch (err: any) {
        console.error(`❌ [BOT] Error responding to /help:`, err.message);
      }
    });

    // Handle /stats command
    bot.onText(/\/stats/, async (msg) => {
      const chatId = msg.chat.id;
      
      const usersCount = await User.count();
      const jobsCount = await Job.count();
      const receiptsCount = await Receipt.count();
      const pendingReceiptsCount = await Receipt.count({ where: { status: 'pending' } });

      const statsMsg = `📊 *Platform Stats*\n\n` +
        `👥 *Total Users:* ${usersCount}\n` +
        `💼 *Total Jobs:* ${jobsCount}\n` +
        `📄 *Total Receipts:* ${receiptsCount}\n` +
        `⏳ *Pending Approvals:* ${pendingReceiptsCount}\n\n` +
        `💾 *Persistence:* ${process.env.DB_DIALECT === 'mysql' ? '✅ Permanent (MySQL)' : '⚠️ Temporary (SQLite)'}\n` +
        `🌐 *Bot Mode:* ${bot?.isPolling() ? 'Polling' : 'Webhook (24/7)'}\n\n` +
        `_Note: If persistence is temporary, data will be lost on server restart. Use a remote MySQL database for permanent storage._`;

      bot?.sendMessage(chatId, statsMsg, { parse_mode: 'Markdown' });
    });

    // Handle Callback Queries
    bot.on('callback_query', async (callbackQuery) => {
      const message = callbackQuery.message;
      const category = callbackQuery.data;
      const chatId = message?.chat.id || callbackQuery.from.id;
      
      let answered = false;
      const answer = async (options?: any) => {
        if (!answered) {
          try {
            await bot?.answerCallbackQuery(callbackQuery.id, options);
            answered = true;
          } catch (e) {
            // Ignore if already answered or failed
          }
        }
      };

      // 1. Answer IMMEDIATELY to stop the loading spinner in Telegram
      await answer();

      if (!chatId || !category) {
        botLog(`⚠️ Callback query missing chatId or category`);
        return;
      }

      botLog(`🔘 Button Clicked: "${category}" from Chat ID: ${chatId}`);
      
      try {
        botLog(`🔍 Fetching bot user for ${chatId}...`);
        const botUser = await getBotUser(chatId);
        botLog(`✅ Bot user fetched: role=${botUser?.role}, state=${botUser?.state}`);

        if (!botUser) {
          botLog(`❌ Could not find or create bot user for ${chatId}`);
          await bot?.sendMessage(chatId, "⚠️ Sorry, I couldn't retrieve your profile. Please try /start again.");
          return;
        }

        // --- INITIAL SELECTION ---
        if (category === 'proceed_user') {
          botLog(`👤 Processing "proceed_user" for ${chatId}`);
          await updateBotUser(chatId, { role: 'user', state: 'IDLE' });
          const userMsg = `✅ *Proceeding as User*\n\nI am your automated assistant. You can browse our service packages, view jobs, and submit payments directly through me.\n\nWhat would you like to do?`;
          const opts = {
            parse_mode: 'Markdown' as const,
            reply_markup: {
              inline_keyboard: [
                [{ text: "💼 Browse Jobs", callback_data: 'browse_jobs' }],
                [{ text: "📦 Browse Packages", callback_data: 'browse_packages' }],
                [{ text: "📄 My Submissions", callback_data: 'my_submissions' }]
              ]
            }
          };
          await bot?.sendMessage(chatId, userMsg, opts);
          botLog(`✅ User menu sent to ${chatId}`);
          return;
        }

        if (category === 'proceed_admin') {
          botLog(`🔐 Processing "proceed_admin" for ${chatId}`);
          await updateBotUser(chatId, { role: 'admin', state: 'AWAITING_ADMIN_USERNAME' });
          await bot?.sendMessage(chatId, "🔐 *Admin Login*\n\nPlease enter your *User Name*:");
          botLog(`✅ Admin login prompt sent to ${chatId}`);
          return;
        }

      // --- USER ACTIONS ---
      else if (category.startsWith('browse_jobs')) {
        const page = parseInt(category.split('_')[2] || '0');
        const pageSize = 5;
        
        const activeJobs = await Job.findAll({ where: { status: 'active' } });
        const activeJobsData = activeJobs.map(j => j.get({ plain: true }));
        
        const totalPages = Math.ceil(activeJobsData.length / pageSize);
        const paginatedJobs = activeJobsData.slice(page * pageSize, (page + 1) * pageSize);

        if (activeJobsData.length === 0) {
          await bot?.sendMessage(chatId, "No active jobs found at the moment.");
        } else {
          let msg = `💼 *Latest Jobs on EliteJobs Ethiopia* (Page ${page + 1}/${totalPages})\n\n`;
          const jobButtons = paginatedJobs.map((j: any) => {
            const isDeadlinePassed = j.deadline ? new Date(j.deadline) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
            return ([{
              text: `👁️ View: ${j.title}${isDeadlinePassed ? ' (EXPIRED)' : ''}`, callback_data: `view_job_${j.id}`
            }]);
          });

          // Add pagination buttons
          const navButtons = [];
          if (page > 0) navButtons.push({ text: "⬅️ Previous", callback_data: `browse_jobs_${page - 1}` });
          if (page < totalPages - 1) navButtons.push({ text: "Next ➡️", callback_data: `browse_jobs_${page + 1}` });
          
          if (navButtons.length > 0) jobButtons.push(navButtons);

          const opts = {
            parse_mode: 'Markdown' as const,
            reply_markup: { inline_keyboard: jobButtons }
          };

          if (message?.text?.includes('Latest Jobs')) {
            await bot?.editMessageText(msg, { chat_id: chatId, message_id: message.message_id, ...opts });
          } else {
            await bot?.sendMessage(chatId, msg, opts);
          }
        }
      }

      else if (category.startsWith('view_job_')) {
        const jobId = category.replace('view_job_', '');
        const jobInstance = await Job.findByPk(jobId);
        if (jobInstance) {
          const job = jobInstance.get({ plain: true }) as any;
          const isDeadlinePassed = job.deadline ? new Date(job.deadline) < new Date(new Date().setHours(0, 0, 0, 0)) : false;
          
          let msg = `💼 *${job.title}*\n` +
            `🏢 *Company:* ${job.company}\n` +
            `📍 *Location:* ${job.location}\n` +
            `💰 *Salary:* ${job.salary}\n` +
            `📅 *Deadline:* ${job.deadline}${isDeadlinePassed ? ' ⚠️ *EXPIRED*' : ''}\n\n` +
            `📝 *Description:*\n${job.description}\n\n` +
            `✅ *Required Skills:* ${job.requiredSkills.join(', ')}`;

          if (isDeadlinePassed) {
            msg += `\n\n🚫 *This application has expired.*`;
          }

          const inline_keyboard = [];
          if (!isDeadlinePassed) {
            inline_keyboard.push([{ text: "🚀 How to Apply", callback_data: `apply_info_${jobId}` }]);
          }
          inline_keyboard.push([{ text: "⬅️ Back to Jobs", callback_data: 'browse_jobs' }]);

          const opts = {
            parse_mode: 'Markdown' as const,
            reply_markup: {
              inline_keyboard
            }
          };
          await bot?.sendMessage(chatId, msg, opts);
        }
      }

      else if (category.startsWith('apply_info_')) {
        const jobId = category.replace('apply_info_', '');
        const isSubscribed = botUser.subscriptionStatus === 'approved' || (botUser.role === 'admin' && botUser.isAdminAuthenticated);
        
        if (isSubscribed) {
          const jobInstance = await Job.findByPk(jobId);
          const j = jobInstance?.get({ plain: true }) as any;
          const msg = `🚀 *How to Apply for ${j?.title}*\n\n` +
            `*Method:* ${j?.applicationProcess?.type?.toUpperCase() || 'N/A'}\n` +
            `*Value:* \`${j?.applicationProcess?.value || 'N/A'}\`\n\n` +
            `*Instructions:* ${j?.applicationProcess?.instructions || 'Follow the employer instructions.'}`;
          
          await bot?.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        } else {
          const msg = `⚠️ *Access Restricted*\n\nTo view application details, you need an active subscription.\n\n` +
            `Please buy a package to get full access to all job details and application info.`;
          
          const opts = {
            parse_mode: 'Markdown' as const,
            reply_markup: {
              inline_keyboard: [
                [{ text: "📦 Browse Packages", callback_data: 'browse_packages' }],
                [{ text: "⬅️ Back to Job", callback_data: `view_job_${jobId}` }]
              ]
            }
          };
          await bot?.sendMessage(chatId, msg, opts);
        }
      }

      else if (category === 'browse_packages') {
        const packageButtons = PACKAGES.map(pkg => ([{
          text: `${pkg.name} - ${pkg.price}`,
          callback_data: `select_pkg_${pkg.id}`
        }]));

        const msg = "✨ *Available Service Packages*\n\n" +
          "🚀 *Unlock Your Career Potential!*\n\n" +
          "To start applying for your dream jobs, you'll need an active subscription. Choose a plan that fits your needs—whether it's for **1 month**, **3 months**, or **Lifetime access**. \n\n" +
          "Simply select a package below, follow the payment instructions, and send us your receipt. Once verified, you'll have instant access to apply for any job on our platform!\n\n" +
          "🏦 *Bank Details Summary:*\n" +
          "• CBE: `1000183217198`\n" +
          "• BOA: `32419186`\n" +
          "• Bunna: `3609501002452`\n" +
          "• Telebirr: `0915508167`\n" +
          "👤 *Name:* Kassahun Mulatu Kebede\n\n" +
          "Select a package below to get started:";

        await bot?.sendMessage(chatId, msg, {
          parse_mode: 'Markdown',
          reply_markup: { inline_keyboard: packageButtons }
        });
      }

      else if (category.startsWith('select_pkg_')) {
        const pkgId = category.replace('select_pkg_', '');
        const pkg = PACKAGES.find(p => p.id === pkgId);
        if (pkg) {
          // Check if user already has a pending receipt for this package
          const pendingReceipt = await Receipt.findOne({
            where: {
              telegramChatId: chatId,
              packageType: pkg.name,
              status: 'pending'
            }
          });
            
          if (pendingReceipt) {
            await answer();
            await bot?.sendMessage(chatId, `⏳ *Pending Request*\n\nYou already have a pending payment verification for the *${pkg.name}* package. Please wait for admin approval.`, { parse_mode: 'Markdown' });
            return;
          }

          await updateBotUser(chatId, { selectedPackage: pkgId, state: 'AWAITING_PAYMENT' });
          const pkgMsg = `📦 *${pkg.name}*\n💰 *Price:* ${pkg.price}\n📝 *Description:* ${pkg.description}\n\n${PAYMENT_INFO}`;
          
          await bot?.sendMessage(chatId, pkgMsg, {
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [[{ text: "✅ I have paid", callback_data: 'confirm_payment' }]]
            }
          });
        }
      }

      else if (category === 'confirm_payment') {
        const pkg = PACKAGES.find(p => p.id === botUser.selectedPackage);
        if (!pkg) {
          await answer();
          await bot?.sendMessage(chatId, "❌ Please select a package first.");
          return;
        }

        const pendingReceipt = await Receipt.findOne({
          where: {
            telegramChatId: chatId,
            packageType: pkg.name,
            status: 'pending'
          }
        });
          
        if (pendingReceipt) {
          await answer();
          await bot?.sendMessage(chatId, `⏳ *Pending Request*\n\nYou already have a pending payment verification for the *${pkg.name}* package.`, { parse_mode: 'Markdown' });
          return;
        }

        await updateBotUser(chatId, { state: 'SUBMITTING_PROOF' });
        await bot?.sendMessage(chatId, "📝 *Submit Payment Proof*\n\nPlease send your *Transaction ID* as a text message or upload a *Screenshot* of your payment receipt now.\n\nI am waiting for your submission. You can also cancel if you made a mistake.", {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [[{ text: "❌ Cancel Submission", callback_data: 'cancel_submission' }]]
          }
        });
      }

      else if (category === 'cancel_submission') {
        await updateBotUser(chatId, { state: 'IDLE', selectedPackage: null });
        await bot?.sendMessage(chatId, "✅ Submission cancelled. What would you like to do next?", {
          reply_markup: {
            inline_keyboard: [
              [{ text: "💼 Browse Jobs", callback_data: 'browse_jobs' }],
              [{ text: "📦 Browse Packages", callback_data: 'browse_packages' }]
            ]
          }
        });
      }

      else if (category === 'final_submit') {
        const pending = botUser.pendingReceipt;
        if (!pending) {
          await answer();
          await bot?.sendMessage(chatId, "❌ No pending submission found. Please start over.");
          return;
        }

        const receiptId = nanoid();
        const newReceipt = {
          id: receiptId,
          seekerUid: `tg_${chatId}`,
          userName: pending.userName,
          userEmail: 'telegram@user.com',
          packageType: pending.packageType,
          transactionId: pending.transactionId,
          receiptUrl: pending.fileId,
          status: 'pending',
          telegramChatId: chatId
        };

        await Receipt.create(newReceipt);
        
        const notificationId = nanoid();
        await Notification.create({
          id: notificationId,
          message: `New payment submission from ${newReceipt.userName} for ${newReceipt.packageType}`,
          type: 'payment_submission',
          read: false
        });

        await updateBotUser(chatId, { state: 'IDLE', selectedPackage: null, pendingReceipt: null });

        // Immediate feedback to the user
        await answer({ text: "✅ Submission Received! Our team will verify it shortly.", show_alert: true });
        await bot?.sendMessage(chatId, "✅ *Submission Received!*\n\nOur team will verify your payment shortly. You will receive a notification here once it's approved.", { parse_mode: 'Markdown' });

        // Notify Admins
        const authenticatedAdmins = await BotUser.findAll({ where: { isAdminAuthenticated: true } });
        
        const adminMsg = `🔔 *New Payment Submission*\n\n👤 *User:* ${newReceipt.userName}\n📦 *Package:* ${newReceipt.packageType}\n📝 *Proof:* ${pending.transactionId}\n\n_Please verify and take action:_`;
        
        const adminOpts = {
          parse_mode: 'Markdown' as const,
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Approve", callback_data: `approve_${receiptId}` }, { text: "❌ Reject", callback_data: `reject_${receiptId}` }]
            ]
          }
        };

        for (const admin of authenticatedAdmins) {
          const adminData = admin.get({ plain: true });
          if (pending.fileId) {
            await bot?.sendPhoto(adminData.chatId, pending.fileId, { caption: adminMsg, ...adminOpts });
          } else {
            await bot?.sendMessage(adminData.chatId, adminMsg, adminOpts);
          }
        }
      }

      else if (category === 'my_submissions') {
        const userReceipts = await Receipt.findAll({ where: { telegramChatId: chatId } });
        
        if (userReceipts.length === 0) {
          await bot?.sendMessage(chatId, "You haven't submitted any payments yet.");
        } else {
          let msg = "📄 *Your Payment Submissions*\n\n";
          userReceipts.forEach((r: any, i: number) => {
            const rData = r.get({ plain: true });
            const statusEmoji = rData.status === 'approved' ? '✅' : rData.status === 'rejected' ? '❌' : '⏳';
            msg += `${i+1}. *Package:* ${rData.packageType}\n   *Status:* ${statusEmoji} ${rData.status.toUpperCase()}\n   *Date:* ${new Date(rData.createdAt).toLocaleDateString()}\n\n`;
          });
          await bot?.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        }
      }

      else if (category === 'stats') {
        // Only authenticated admins can see stats now
        if (!botUser.isAdminAuthenticated) {
          await answer();
          await bot?.sendMessage(chatId, "🔐 *Unauthorized*\n\nPlease login as an Admin to view platform stats.", { parse_mode: 'Markdown' });
          return;
        }
        
        const userCount = await User.count();
        const jobCount = await Job.count();
        const receiptCount = await Receipt.count();
        const pendingReceiptsCount = await Receipt.count({ where: { status: 'pending' } });

        const statsMsg = `📊 *Platform Stats*\n\n` +
          `👥 *Total Users:* ${userCount}\n` +
          `💼 *Total Jobs:* ${jobCount}\n` +
          `📄 *Total Receipts:* ${receiptCount}\n` +
          `⏳ *Pending Approvals:* ${pendingReceiptsCount}`;
        await bot?.sendMessage(chatId, statsMsg, { parse_mode: 'Markdown' });
      }

      else if (category === 'admin_pending') {
        if (!botUser.isAdminAuthenticated) {
          await answer();
          return;
        }
        const pendingInstances = await Receipt.findAll({ where: { status: 'pending' } });
        const pending = pendingInstances.map(r => r.get({ plain: true })) as any[];

        if (pending.length === 0) {
          await bot?.sendMessage(chatId, "✅ No pending receipts to review.");
        } else {
          let msg = "⏳ *Pending Payment Receipts*\n\n";
          pending.forEach((rData: any, i: number) => {
            msg += `${i+1}. *User:* ${rData.userName}\n   *Package:* ${rData.packageType}\n   *ID:* ${rData.id}\n\n`;
          });
          await bot?.sendMessage(chatId, msg, { 
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: pending.slice(0, 5).map(r => ([{
                text: `Review ${r.userName}`, callback_data: `review_${r.id}`
              }]))
            }
          });
        }
      }

      else if (category.startsWith('review_')) {
        if (!botUser.isAdminAuthenticated) {
          await answer();
          return;
        }
        const id = category.replace('review_', '');
        const receiptInstance = await Receipt.findByPk(id);
        if (receiptInstance) {
          const r = receiptInstance.get({ plain: true }) as any;
          const msg = `🧐 *Reviewing Receipt*\n\n👤 *User:* ${r.userName}\n📧 *Email:* ${r.userEmail}\n📦 *Package:* ${r.packageType}\n📝 *Proof:* ${r.transactionId || 'Photo'}`;
          const opts = {
            parse_mode: 'Markdown' as const,
            reply_markup: {
              inline_keyboard: [
                [
                  { text: "✅ Approve", callback_data: `approve_${id}` },
                  { text: "❌ Reject", callback_data: `reject_${id}` }
                ]
              ]
            }
          };
          if (r.receiptUrl && !r.receiptUrl.startsWith('data:')) {
            await bot?.sendPhoto(chatId, r.receiptUrl, { caption: msg, ...opts });
          } else {
            await bot?.sendMessage(chatId, msg, opts);
          }
        }
      }

      else if (category === 'admin_users') {
        if (!botUser.isAdminAuthenticated) {
          await answer();
          return;
        }
        const usersCount = await User.count();
        const premiumUsersCount = await User.count({ where: { 'subscription.status': 'approved' } });
        const msg = `👥 *User Management*\n\nTotal Users: ${usersCount}\nPremium Users: ${premiumUsersCount}\n\n_Detailed user management is available on the web dashboard._`;
        await bot?.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
      }

      else if (category === 'admin_notifications') {
        if (!botUser.isAdminAuthenticated) {
          await answer();
          return;
        }
        const notifications = await Notification.findAll({ order: [['createdAt', 'DESC']], limit: 5 });
        const recent = notifications.map(n => n.get({ plain: true }));

        if (recent.length === 0) {
          await bot?.sendMessage(chatId, "No recent notifications.");
        } else {
          let msg = "🔔 *Recent Notifications (Latest 5)*\n\n";
          recent.forEach((n: any, i: number) => {
            msg += `${i+1}. ${n.message}\n   _${new Date(n.createdAt).toLocaleString()}_\n\n`;
          });
          await bot?.sendMessage(chatId, msg, { parse_mode: 'Markdown' });
        }
      }

      // --- ADMIN ACTIONS ---
      else if (category.startsWith('approve_') || category.startsWith('admin_approve_')) {
        if (!botUser.isAdminAuthenticated) {
          await answer({ text: "Unauthorized. Please login as admin." });
          await bot?.sendMessage(chatId, "❌ *Unauthorized*\n\nPlease login as an Admin to perform this action.", { parse_mode: 'Markdown' });
          return;
        }
        const receiptId = category.replace('approve_', '').replace('admin_approve_', '');
        const receiptInstance = await Receipt.findByPk(receiptId);
        
        if (receiptInstance) {
          const receipt = receiptInstance.get({ plain: true }) as any;
          if (receipt.status !== 'pending') {
            await answer({ text: "Action already performed." });
            await bot?.sendMessage(chatId, `⚠️ *Duplicate Action*\n\nThis receipt has already been *${receipt.status}*.`, { parse_mode: 'Markdown' });
            return;
          }
          
          await receiptInstance.update({ status: 'approved' });
          
          // Update user subscription
          const userInstance = await User.findByPk(receipt.seekerUid);
          let user = userInstance ? userInstance.get({ plain: true }) as any : null;
          
          // If user doesn't exist (Telegram-only user), create a shadow user
          if (!user && receipt.seekerUid && receipt.seekerUid.startsWith('tg_')) {
            user = {
              uid: receipt.seekerUid,
              email: `tg_${receipt.telegramChatId}@telegram.user`,
              password: 'TELEGRAM_USER_NO_PASSWORD',
              displayName: receipt.userName,
              role: 'seeker',
              subscription: { type: receipt.packageType, status: 'approved', expiresAt: '' },
              viewedJobsCount: 0,
              isVerified: true,
              createdAt: new Date().toISOString(),
            };
            await User.create(user);
          }

          if (user) {
            // Calculate expiration
            let days = 30;
            if (receipt.packageType === 'Standard Access') days = 90;
            if (receipt.packageType === 'Lifetime Access') days = 36500; // ~100 years
            
            const expiresAt = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
            
            const uInst = await User.findByPk(receipt.seekerUid);
            if (uInst) {
              await uInst.update({
                subscription: {
                  status: 'approved',
                  type: receipt.packageType,
                  expiresAt: expiresAt
                }
              });
            }
          }
          
          // Also update botUser record
          await updateBotUser(receipt.telegramChatId, { subscriptionStatus: 'approved' });
          
          // Notify User
          if (receipt.telegramChatId) {
            await bot?.sendMessage(receipt.telegramChatId, `🎉 *Payment Approved!*\n\nYour payment for the *${receipt.packageType}* package has been verified. You now have full access to the platform.\n\nThank you for choosing EliteJobs Ethiopia!`, { parse_mode: 'Markdown' });
          }
          
          // Update Admin Message
          const adminSuccessMsg = `✅ *Approved*\n\nUser: ${receipt.userName}\nPackage: ${receipt.packageType}\nID: ${receiptId}`;
          if (message?.photo) {
            await bot?.editMessageCaption(adminSuccessMsg, {
              chat_id: chatId,
              message_id: message?.message_id,
              parse_mode: 'Markdown'
            }).catch(e => console.error("Error editing caption:", e));
          } else {
            await bot?.editMessageText(adminSuccessMsg, {
              chat_id: chatId,
              message_id: message?.message_id,
              parse_mode: 'Markdown'
            }).catch(e => console.error("Error editing text:", e));
          }
          
          await answer({ text: "Payment approved successfully!" });
          await bot?.sendMessage(chatId, `✅ Success: Payment for ${receipt.userName} has been approved.`);
        } else {
          await answer({ text: "Receipt not found." });
          await bot?.sendMessage(chatId, "❌ Error: Receipt not found in database.");
        }
      }

      else if (category.startsWith('reject_') || category.startsWith('admin_reject_')) {
        if (!botUser.isAdminAuthenticated) {
          await answer({ text: "Unauthorized." });
          await bot?.sendMessage(chatId, "❌ *Unauthorized*\n\nPlease login as an Admin to perform this action.", { parse_mode: 'Markdown' });
          return;
        }
        const receiptId = category.replace('reject_', '').replace('admin_reject_', '');
        const receiptInstance = await Receipt.findByPk(receiptId);
        
        if (receiptInstance) {
          const receipt = receiptInstance.get({ plain: true }) as any;
          if (receipt.status !== 'pending') {
            await answer({ text: "Action already performed." });
            await bot?.sendMessage(chatId, `⚠️ *Duplicate Action*\n\nThis receipt has already been *${receipt.status}*.`, { parse_mode: 'Markdown' });
            return;
          }
          
          await receiptInstance.update({ status: 'rejected' });
          
          // Update user subscription
          const userInstance = await User.findByPk(receipt.seekerUid);
          if (userInstance) {
            const userData = userInstance.get({ plain: true }) as any;
            await userInstance.update({
              subscription: {
                ...userData.subscription,
                status: 'rejected'
              }
            });
          }
          
          // Also update botUser record
          await updateBotUser(receipt.telegramChatId, { subscriptionStatus: 'rejected' });
          
          // Notify User
          if (receipt.telegramChatId) {
            await bot?.sendMessage(receipt.telegramChatId, `❌ *Payment Rejected*\n\nYour payment submission for the *${receipt.packageType}* package was rejected. Please ensure the details are correct and try again, or contact support.`, { parse_mode: 'Markdown' });
          }
          
          // Update Admin Message
          const adminRejectMsg = `❌ *Rejected*\n\nUser: ${receipt.userName}\nPackage: ${receipt.packageType}\nID: ${receiptId}`;
          if (message?.photo) {
            await bot?.editMessageCaption(adminRejectMsg, {
              chat_id: chatId,
              message_id: message?.message_id,
              parse_mode: 'Markdown'
            }).catch(e => console.error("Error editing caption:", e));
          } else {
            await bot?.editMessageText(adminRejectMsg, {
              chat_id: chatId,
              message_id: message?.message_id,
              parse_mode: 'Markdown'
            }).catch(e => console.error("Error editing text:", e));
          }
          
          await answer({ text: "Payment rejected." });
          await bot?.sendMessage(chatId, `❌ Success: Payment for ${receipt.userName} has been rejected.`);
        } else {
          await answer({ text: "Receipt not found." });
          await bot?.sendMessage(chatId, "❌ Error: Receipt not found.");
        }
      }

      // --- JOB MODERATION ACTIONS ---
      else if (category.startsWith('approve_job_')) {
        if (!botUser.isAdminAuthenticated) {
          await answer({ text: "Unauthorized." });
          return;
        }
        const jobId = category.replace('approve_job_', '');
        const jobInstance = await Job.findByPk(jobId);
        if (jobInstance) {
          await jobInstance.update({ isApproved: true });
          await answer({ text: "Job approved successfully!", show_alert: true });
          
          const job = jobInstance.get({ plain: true }) as any;
          const successMsg = `✅ *Job Approved*\n\n💼 *Role:* ${job.title}\n🏢 *Company:* ${job.company}\n\n_This job is now live on the platform._`;
          
          await bot?.editMessageText(successMsg, {
            chat_id: chatId,
            message_id: message?.message_id,
            parse_mode: 'Markdown'
          }).catch(() => {});
        } else {
          await answer({ text: "Job not found." });
        }
      }

      else if (category.startsWith('reject_job_')) {
        if (!botUser.isAdminAuthenticated) {
          await answer({ text: "Unauthorized." });
          return;
        }
        const jobId = category.replace('reject_job_', '');
        const jobInstance = await Job.findByPk(jobId);
        if (jobInstance) {
          await jobInstance.update({ status: 'rejected', isApproved: false });
          await answer({ text: "Job rejected.", show_alert: true });
          
          const job = jobInstance.get({ plain: true }) as any;
          const rejectMsg = `❌ *Job Rejected*\n\n💼 *Role:* ${job.title}\n🏢 *Company:* ${job.company}\n\n_This job will not be shown to users._`;
          
          await bot?.editMessageText(rejectMsg, {
            chat_id: chatId,
            message_id: message?.message_id,
            parse_mode: 'Markdown'
          }).catch(() => {});
        } else {
          await answer({ text: "Job not found." });
        }
      }

      // Final fallback answer (if not already answered)
      // Note: We already answered at the top, so this is usually redundant but safe
    } catch (e: any) {
      botLog(`❌ Error in callback query handler: ${e.message}`);
      console.error(`[BOT] Error in callback query handler:`, e);
      try {
        await bot?.answerCallbackQuery(callbackQuery.id, { text: "An error occurred." });
      } catch (answerErr) {
        // Ignore if already answered
      }
    }
  });

    // Handle Text Messages and Photos (Consolidated)
    bot.on('message', async (msg) => {
      const chatId = msg.chat.id;
      const text = msg.text || "";
      console.log(`📩 [BOT] Received message from ${chatId}: "${text}"`);
      
      // Skip commands
      if (text.startsWith('/')) return;

      try {
        const botUser = await getBotUser(chatId);
        if (!botUser) return;

      // Admin Login Flow
      if (botUser.state === 'AWAITING_ADMIN_USERNAME') {
        if (msg.text === 'Admin') {
          await updateBotUser(chatId, { state: 'AWAITING_ADMIN_PASSWORD' });
          await bot?.sendMessage(chatId, "✅ Username accepted. Please enter your *Password*:", { parse_mode: 'Markdown' });
        } else {
          await bot?.sendMessage(chatId, "❌ Invalid Username. Please try again or use /start to reset.");
        }
        return;
      }

      if (botUser.state === 'AWAITING_ADMIN_PASSWORD') {
        if (msg.text === 'Kassahun@elitejobs') {
          await updateBotUser(chatId, { state: 'IDLE', isAdminAuthenticated: true });
          const adminMenuMsg = `🎉 *Login Successful!*\n\nYou are now authenticated as an Admin. What would you like to do?`;
          const opts = {
            parse_mode: 'Markdown' as const,
            reply_markup: {
              inline_keyboard: [
                [{ text: "📊 Platform Stats", callback_data: 'stats' }],
                [{ text: "⏳ Pending Receipts", callback_data: 'admin_pending' }],
                [{ text: "👥 View All Users", callback_data: 'admin_users' }],
                [{ text: "🔔 Recent Notifications", callback_data: 'admin_notifications' }]
              ]
            }
          };
          await bot?.sendMessage(chatId, adminMenuMsg, opts);
        } else {
          await bot?.sendMessage(chatId, "❌ Invalid Password. Please try again or use /start to reset.");
        }
        return;
      }

      if (botUser.state === 'SUBMITTING_PROOF') {
        const pkgId = botUser.selectedPackage;
        const pkg = PACKAGES.find(p => p.id === pkgId);
        
        let transactionId = msg.text || 'Photo Receipt';
        let fileId = '';
        
        if (msg.photo && msg.photo.length > 0) {
          fileId = msg.photo[msg.photo.length - 1].file_id;
          transactionId = msg.caption || 'Photo Receipt';
        }

        // Store pending receipt in user state for confirmation
        await updateBotUser(chatId, { 
          state: 'CONFIRMING_SUBMISSION',
          pendingReceipt: {
            packageType: pkg?.name || pkgId,
            transactionId: transactionId,
            fileId: fileId,
            userName: msg.from?.first_name || botUser.username || 'Telegram User'
          }
        });

        const confirmMsg = `🔍 *Review Your Submission*\n\n` +
          `📦 *Package:* ${pkg?.name}\n` +
          `📝 *Proof:* ${transactionId}\n` +
          `${fileId ? '🖼️ *Screenshot:* Attached' : ''}\n\n` +
          `Is this correct? Click "Confirm" to submit to our team.`;

        bot?.sendMessage(chatId, confirmMsg, {
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: "✅ Confirm & Submit", callback_data: 'final_submit' }],
              [{ text: "❌ Cancel & Retry", callback_data: 'confirm_payment' }]
            ]
          }
        });
        return;
      }

      // Default response for IDLE or unhandled states
      if (botUser.state === 'IDLE' || !botUser.state) {
        const menuMsg = `👋 *Main Menu*\n\nHow can I help you today?`;
        const opts = {
          parse_mode: 'Markdown' as const,
          reply_markup: {
            inline_keyboard: [
              [{ text: "💼 Browse Jobs", callback_data: 'browse_jobs' }],
              [{ text: "💎 Premium Packages", callback_data: 'pricing' }],
              [{ text: "📊 My Stats", callback_data: 'stats' }],
              [{ text: "📖 Help", callback_data: 'help' }]
            ]
          }
        };
        bot?.sendMessage(chatId, menuMsg, opts);
      } else {
        bot?.sendMessage(chatId, "⚠️ I'm not sure what to do next. Please use /start to reset.");
      }
    } catch (e) {
      console.error(`[BOT] Error in message handler:`, e);
    }
  });

    // Handle Polling Errors
    bot.on('polling_error', (err: any) => {
      if (err.code === 'ETELEGRAM' && err.message.includes('409 Conflict')) {
        console.log("ℹ️ [BOT] Polling conflict (likely another instance is running).");
        botStatus = "Conflict (409)";
        lastBotError = "Polling Conflict (409) - Another instance is likely running.";
        return;
      }
      console.error("❌ [BOT] Polling Error:", err.message);
      botStatus = `Polling Error: ${err.message}`;
      lastBotError = `Polling Error: ${err.message}`;
    });

    bot.on('webhook_error', (err: any) => {
      console.error("❌ [BOT] Webhook Error:", err.message);
      botStatus = `Webhook Error: ${err.message}`;
      lastBotError = `Webhook Error: ${err.message}`;
    });

    bot.on('error', (err: any) => {
      console.error("❌ [BOT] General Error:", err.message);
      botStatus = `Error: ${err.message}`;
      lastBotError = `General Error: ${err.message}`;
    });

    // Verify token and get bot info
    bot.getMe().then((me: any) => {
      console.log(`✅ [BOT] Bot verified successfully!`);
      console.log(`✅ [BOT] Username: @${me.username}`);
      console.log(`✅ [BOT] ID: ${me.id}`);
      botStatus = "Running";
      lastBotError = null; // Clear error on success
    }).catch((err: any) => {
      console.error("❌ [BOT] Failed to verify bot token:", err.message);
      botStatus = `Invalid Token: ${err.message}`;
      lastBotError = `Verification Error: ${err.message}`;
    });

    // Async setup in background
    (async () => {
      try {
        let appUrl = process.env.APP_URL;
        const isProd = process.env.NODE_ENV === 'production';
        botLog(`🤖 APP_URL is: ${appUrl || 'NOT SET'}`);
        botLog(`🌍 Environment: ${process.env.NODE_ENV}`);
        
        // Ensure we clear any existing webhooks before starting
        botLog("🧹 Clearing existing webhooks...");
        await bot?.deleteWebHook();
        
        // Use webhooks whenever APP_URL is available to ensure 24/7 responsiveness (waking up the server)
        if (appUrl && appUrl !== 'MY_APP_URL') {
          // Normalize URL: remove trailing slash
          appUrl = appUrl.replace(/\/$/, '');
          
          const webhookUrl = `${appUrl}/api/telegram-webhook`;
          
          // AI Studio specific: Default to polling on dev URLs because they are protected by login
          // This prevents the "302 Found" error from Telegram.
          if (appUrl.includes('ais-dev-')) {
            botLog(`⚠️ Detected AI Studio dev URL (${appUrl}). Webhooks will likely fail due to login protection.`);
            botLog(`⚠️ Defaulting to polling mode for reliability in development.`);
            throw new Error("AI Studio dev URL detected");
          }
          
          botLog(`🚀 Setting Telegram Webhook to: ${webhookUrl}`);
          try {
            const success = await bot?.setWebHook(webhookUrl);
            if (success) {
              const webhookInfo = await bot?.getWebHookInfo();
              botLog(`✅ Webhook established: ${JSON.stringify(webhookInfo)}`);
              
              // Check for immediate errors (like 302 or 404)
              // 302 usually means the URL is protected by a login (common in AI Studio dev URL)
              // 404 means the URL is not found (common if using an old shared URL)
              if (webhookInfo?.last_error_message?.includes('302') || webhookInfo?.last_error_message?.includes('404')) {
                botLog(`⚠️ Webhook is returning an error: ${webhookInfo.last_error_message}`);
                botLog(`⚠️ Falling back to polling mode for reliability.`);
                throw new Error(`Webhook returned ${webhookInfo.last_error_message}`);
              }
              
              botStatus = `Running (Webhook: ${appUrl})`;
            } else {
              throw new Error("setWebHook returned false");
            }
          } catch (webhookError: any) {
            botLog(`❌ Webhook setup failed, falling back to polling: ${webhookError.message}`);
            await bot?.deleteWebHook();
            await bot?.startPolling();
            botLog("🚀 Started polling (fallback).");
            botStatus = "Running (Polling Fallback)";
          }
        } else {
          botLog("✅ Starting polling mode...");
          await bot?.startPolling();
          const me = await bot?.getMe();
          botLog(`🚀 Started polling. Verified as @${me?.username}`);
          botStatus = `Running (Polling: @${me?.username})`;
        }
      } catch (e: any) {
        botLog(`❌ Async Setup Error: ${e.message}`);
        botStatus = `Error: ${e.message}`;
        lastBotError = e.message;
        // Final fallback to polling if everything else fails
        if (bot && !bot.isPolling()) {
          botLog("⚠️ Final fallback to polling mode...");
          try {
            await bot?.deleteWebHook();
            await bot?.startPolling();
            botStatus = "Running (Final Polling Fallback)";
          } catch (pollErr: any) {
            botLog(`❌ Final polling fallback failed: ${pollErr.message}`);
          }
        }
      }
    })();

  } catch (err: any) {
    console.error("❌ Failed to initialize Telegram Bot:", err.message);
  }
};

// Start bot initialization
// initBot() is now called inside startServer() after the server is ready

// Graceful shutdown
const stopBot = async () => {
  if (bot && bot.isPolling()) {
    console.log("Stopping Telegram Bot polling...");
    await bot.stopPolling();
  }
};

process.on('SIGINT', async () => {
  await stopBot();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await stopBot();
  process.exit(0);
});

// Helper: Check and update subscription expiration
const checkSubscriptionExpiration = async (user: any) => {
  if (!user || !user.subscription) return 'none';
  
  // If already expired, return expired
  if (user.subscription.status === 'expired') return 'expired';

  // Lifetime access never expires
  if (user.subscription.type === 'lifetime' && user.subscription.status === 'approved') {
    return 'approved';
  }

  if (user.subscription.status === 'approved' && user.subscription.expiresAt) {
    const expiresAt = new Date(user.subscription.expiresAt);
    if (isNaN(expiresAt.getTime())) return 'approved'; // Handle invalid dates as approved if status is approved
    
    const now = new Date();
    if (expiresAt < now) {
      console.log(`[SUBSCRIPTION] User ${user.uid} subscription expired. (Expired at: ${user.subscription.expiresAt})`);
      const userInstance = await User.findByPk(user.uid);
      if (userInstance) {
        await userInstance.update({
          subscription: { ...user.subscription, status: 'expired' }
        });
      }
      return 'expired';
    }
    return 'approved';
  }
  
  // If it's approved but no expiresAt, it might be an older record or lifetime
  if (user.subscription.status === 'approved' && !user.subscription.expiresAt) {
    return 'approved';
  }

  return user.subscription.status || 'none';
};

// Helper: Get or create bot user
const getBotUser = async (chatId: number, username?: string) => {
  botLog(`🔍 getBotUser called for ${chatId}`);
  try {
    botLog(`🔍 Finding BotUser in DB for ${chatId}...`);
    const botUserInstance = await BotUser.findByPk(chatId);
    let botUser = botUserInstance ? botUserInstance.get({ plain: true }) : null;
    
    // Try to find matching user in users to sync subscription
    const seekerUid = `tg_${chatId}`;
    botLog(`🔍 Finding shadow User in DB for ${seekerUid}...`);
    const userInstance = await User.findByPk(seekerUid);
    let user = userInstance ? userInstance.get({ plain: true }) : null;

    if (!user) {
      botLog(`👤 Creating shadow user for ${chatId}...`);
      // Create a shadow user in the main users collection to track subscription
      user = {
        uid: seekerUid,
        email: `tg_${chatId}@telegram.user`,
        password: await bcrypt.hash(nanoid(), 10), // Random password for shadow user
        displayName: username || `Telegram User ${chatId}`,
        role: 'seeker',
        subscription: { type: 'none', status: 'none', expiresAt: '' },
        isVerified: true,
      };
      try {
        await User.create(user);
        botLog(`✅ Created shadow user for chatId ${chatId}`);
      } catch (setErr: any) {
        botLog(`⚠️ Error creating shadow user for ${chatId}: ${setErr.message}`);
      }
    }
    
    // Always check expiration before syncing
    let subStatus = 'none';
    try {
      botLog(`🔍 Checking subscription for ${chatId}...`);
      subStatus = await checkSubscriptionExpiration(user);
      botLog(`✅ Subscription status for ${chatId}: ${subStatus}`);
    } catch (subErr: any) {
      botLog(`⚠️ Error checking subscription for ${chatId}: ${subErr.message}`);
      subStatus = user?.subscription?.status || 'none';
    }

    if (!botUser) {
      botLog(`👤 Creating BotUser record for ${chatId}...`);
      botUser = { 
        chatId, 
        username, 
        state: 'IDLE', 
        role: 'user', 
        isAdminAuthenticated: false,
        selectedPackage: null, 
        subscriptionStatus: subStatus,
      };
      try {
        await BotUser.create(botUser);
        botLog(`✅ Created botUser for chatId ${chatId}`);
      } catch (setErr: any) {
        botLog(`⚠️ Error creating botUser for ${chatId}: ${setErr.message}`);
      }
    } else if (botUser.subscriptionStatus !== subStatus) {
      // Sync if different
      botLog(`🔄 Syncing subscription status for ${chatId}...`);
      botUser.subscriptionStatus = subStatus;
      try {
        await (botUserInstance as any).update({ subscriptionStatus: subStatus });
        botLog(`✅ Synced subscription status for chatId ${chatId}: ${subStatus}`);
      } catch (updErr: any) {
        botLog(`⚠️ Error updating botUser for ${chatId}: ${updErr.message}`);
      }
    }
    return botUser;
  } catch (err: any) {
    botLog(`❌ Critical error in getBotUser for ${chatId}: ${err.message}`);
    // Return a minimal botUser object to allow the bot to continue
    return {
      chatId,
      username,
      state: 'IDLE',
      role: 'user',
      subscriptionStatus: 'none'
    };
  }
};

// Helper: Update bot user state
const updateBotUser = async (chatId: number, updates: any) => {
  const botUser = await BotUser.findByPk(chatId);
  if (botUser) {
    await botUser.update(updates);
  }
};

async function startServer() {
  console.log("🚀 [SERVER] Initializing Express app...");
  
  // 1. Initialize Database FIRST
  try {
    console.log("🔥 [SERVER] Calling initDB()...");
    await initDB();
    console.log("✅ [SERVER] initDB() completed.");
  } catch (dbErr: any) {
    console.error("❌ [SERVER] Database initialization CRITICAL failure:", dbErr.message);
  }

  // 2. Bootstrap Admin
  console.log("🔥 [SERVER] Calling bootstrapAdmin()...");
  await bootstrapAdmin();
  console.log("✅ [SERVER] bootstrapAdmin() completed.");

  // 3. Run Cleanup
  console.log("🔥 [SERVER] Calling cleanupJobs()...");
  cleanupJobs().catch(err => console.error("❌ [SERVER] Initial cleanup failed:", err));
  console.log("✅ [SERVER] cleanupJobs() triggered.");

  const app = express();
  app.set('trust proxy', 1);

  app.use(express.json({ limit: '50mb' })); // Allow larger payloads for receipt images

  // --- TELEGRAM WEBHOOK (MOVED TO TOP TO PREVENT REDIRECTS) ---
  app.all("/api/telegram-webhook", (req, res) => {
    console.log(`📥 [WEBHOOK] Received ${req.method} request on /api/telegram-webhook`);
    if (req.method === 'POST') {
      if (bot) {
        bot.processUpdate(req.body);
      } else {
        console.warn(`⚠️ [WEBHOOK] Bot not initialized, skipping update`);
      }
      return res.sendStatus(200);
    } else {
      return res.send("Telegram Webhook is active. Send a POST request to this endpoint.");
    }
  });

  // Request logging
  app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
  });

  // Health check
  app.get("/api/health", asyncHandler(async (req, res) => {
    let dbStatus = "Unknown";
    try {
      await System.upsert({ key: 'health-check', value: { lastCheck: new Date().toISOString() } });
      dbStatus = "Connected";
    } catch (err: any) {
      console.error("❌ [HEALTH] Database check failed:", err.message);
      dbStatus = `Error: ${err.message}`;
    }

    res.json({ 
      status: "ok", 
      env: process.env.NODE_ENV,
      botInitialized: !!bot,
      botStatus: botStatus,
      lastBotError: lastBotError,
      database: dbStatus,
      dialect: (System.sequelize as any).options.dialect
    });
  }));

  // Root diagnostic route
  app.get("/api/ping", (req, res) => {
    res.send("pong");
  });

  app.get("/api/bot/logs", (req, res) => {
    res.json({
      status: botStatus,
      lastError: lastBotError,
      logs: botLogHistory,
      messages: botMessageHistory
    });
  });

  app.get("/api/diag/admin", async (req, res) => {
    try {
      const adminEmail = 'kassahunmulatu273@gmail.com';
      const admin = await User.findOne({ where: { email: adminEmail } });
      if (!admin) {
        return res.json({ exists: false, message: `Admin user ${adminEmail} not found` });
      }
      const userData = admin.get({ plain: true });
      res.json({ 
        exists: true, 
        email: userData.email, 
        role: userData.role, 
        hasPassword: !!userData.password,
        uid: userData.uid
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/diag/metadata-project", async (req, res) => {
    try {
      const response = await fetch("http://metadata.google.internal/computeMetadata/v1/project/project-id", {
        headers: { "Metadata-Flavor": "Google" }
      });
      const projectId = await response.text();
      res.json({ projectId });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/diag/users", async (req, res) => {
    try {
      const users = await User.findAll();
      res.json(users.map(u => u.get({ plain: true })));
    } catch (err: any) {
      res.status(500).json({ error: err.message, stack: err.stack });
    }
  });

  app.get("/api/diag/env", (req, res) => {
    const env: any = {};
    for (const key in process.env) {
      if (!key.includes("KEY") && !key.includes("SECRET") && !key.includes("TOKEN") && !key.includes("PASSWORD")) {
        env[key] = process.env[key];
      }
    }
    res.json(env);
  });

  app.get("/api/diag/health-check", async (req, res) => {
    try {
      await System.upsert({ id: 'health-check', data: { 
        lastCheck: new Date().toISOString(),
        apiCheck: true
      }});
      const data = await System.findByPk('health-check');
      res.json({ 
        success: true, 
        message: "Database connection successful!", 
        data: data?.get({ plain: true }).data,
        dialect: (System.sequelize as any).options.dialect
      });
    } catch (err: any) {
      console.error("❌ [DIAG] Health check failed:", err);
      res.status(500).json({ 
        success: false, 
        error: err.message, 
        stack: err.stack
      });
    }
  });

  app.get("/api/diag/bootstrap-admin", async (req, res) => {
    try {
      const adminEmail = 'kassahunmulatu273@gmail.com';
      const adminUserInstance = await User.findOne({ where: { email: adminEmail } });
      
      if (adminUserInstance) {
        const user = adminUserInstance.get({ plain: true }) as any;
        if (user.password) {
          return res.json({ success: true, message: "Admin user already exists and has a password.", uid: user.uid });
        } else {
          // Update password if missing
          const hashedPassword = await bcrypt.hash("admin123", 10);
          await adminUserInstance.update({ password: hashedPassword });
          return res.json({ success: true, message: "Admin user existed but password was missing. Updated to 'admin123'.", uid: user.uid });
        }
      }

      // Create admin user
      const hashedPassword = await bcrypt.hash("admin123", 10);
      const uid = nanoid();
      const adminUser = {
        uid,
        email: adminEmail,
        password: hashedPassword,
        displayName: "System Admin",
        role: "admin",
        subscription: { type: 'lifetime', status: 'active', expiresAt: '2099-12-31' },
        viewedJobsCount: 0,
        isVerified: true,
      };

      await User.create(adminUser);
      res.json({ success: true, message: "Admin user created successfully. Password is 'admin123'.", uid });
    } catch (err: any) {
      console.error("❌ [BOOTSTRAP] Failed:", err);
      res.status(500).json({ error: "Bootstrap failed", message: err.message, stack: err.stack });
    }
  });

  app.get("/api/diag/list-users", async (req, res) => {
    try {
      const users = await User.findAll();
      const usersData = users.map(u => {
        const data = u.get({ plain: true }) as any;
        return {
          uid: data.uid,
          email: data.email,
          role: data.role,
          hasPassword: !!data.password,
          isVerified: data.isVerified
        };
      });
      res.json({ count: usersData.length, users: usersData });
    } catch (err: any) {
      res.status(500).json({ error: "Failed to list users", message: err.message });
    }
  });

  // Auth Middleware
  const authenticateToken = async (req: any, res: any, next: any) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Unauthorized" });

    try {
      const decoded: any = jwt.verify(token, JWT_SECRET);
      
      const userInstance = await User.findByPk(decoded.uid);
      if (!userInstance) {
        return res.status(401).json({ error: "User session expired or not found. Please log in again." });
      }

      const user = userInstance.get({ plain: true }) as any;

      // Check for subscription expiration using helper
      // This helper updates the user object and database if needed
      await checkSubscriptionExpiration(user);

      req.user = decoded;
      req.user.role = user.role; // Ensure role is attached for isAdmin middleware
      next();
    } catch (err: any) {
      console.error("Auth middleware error:", err.message);
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ error: "Session expired. Please log in again." });
      }
      if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ error: "Invalid session. Please log in again." });
      }
      return res.status(403).json({ error: "Forbidden: " + err.message });
    }
  };

  const isAdmin = (req: any, res: any, next: any) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin access required" });
    next();
  };

    // --- DIAGNOSTICS ---
  app.get("/api/bot-status", async (req, res) => {
    const token = process.env.TELEGRAM_BOT_TOKEN;
    let webhookInfo = null;
    let me = null;
    
    if (bot) {
      try {
        webhookInfo = await bot.getWebHookInfo();
        me = await bot.getMe();
      } catch (e) {
        console.error("Error getting bot info for diagnostics:", e);
      }
    }

    res.json({
      status: botStatus,
      lastError: lastBotError,
      tokenSet: !!token,
      tokenPreview: token ? `${token.substring(0, 5)}...${token.substring(token.length - 5)}` : "None",
      appUrl: process.env.APP_URL || "Not Set",
      nodeEnv: process.env.NODE_ENV,
      timestamp: new Date().toISOString(),
      isPolling: bot?.isPolling() || false,
      webhookInfo,
      botInfo: me,
      messageHistory: botMessageHistory,
      logHistory: botLogHistory
    });
  });

  app.post("/api/bot-setup-webhook", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    try {
      if (!bot) return res.status(400).json({ error: "Bot not initialized" });
      
      let appUrl = req.body.url || process.env.APP_URL;
      if (!appUrl) return res.status(400).json({ error: "APP_URL not provided and not in environment" });
      
      appUrl = appUrl.replace(/\/$/, '');
      const webhookUrl = `${appUrl}/api/telegram-webhook`;
      
      console.log(`🔧 [BOT] Manually setting webhook to: ${webhookUrl}`);
      await bot.setWebHook(webhookUrl);
      const info = await bot.getWebHookInfo();
      
      botStatus = "Running (Webhook)";
      res.json({ message: "Webhook set successfully", info });
    } catch (err: any) {
      console.error("❌ [BOT] Manual webhook setup failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  }));

  app.post("/api/admin/bot/reinitialize", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token is required" });
    
    try {
      console.log("🔄 [BOT] Re-initializing bot with new token...");
      if (bot) {
        try {
          if (bot.isPolling()) await bot.stopPolling();
          await bot.deleteWebHook();
        } catch (e) {
          console.warn("⚠️ [BOT] Error during cleanup of old bot instance:", e);
        }
      }
      
      // Update environment variable for the current process
      process.env.TELEGRAM_BOT_TOKEN = token;
      
      // Re-run initBot
      initBot();
      
      res.json({ message: "Bot re-initialization triggered. Please check status in a few seconds." });
    } catch (err: any) {
      console.error("❌ [BOT] Re-initialization failed:", err.message);
      res.status(500).json({ error: err.message });
    }
  }));

  app.post("/api/admin/bot/send-test", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const { chatId, message } = req.body;
    if (!chatId || !message) return res.status(400).json({ error: "chatId and message are required" });
    
    try {
      if (!bot) throw new Error("Bot not initialized");
      await bot.sendMessage(chatId, message);
      res.json({ message: "Test message sent successfully" });
    } catch (err: any) {
      console.error("❌ [BOT] Failed to send test message:", err.message);
      res.status(500).json({ error: err.message });
    }
  }));

  // Proxy route for Telegram files
  app.get("/api/telegram-file/:fileId", async (req, res) => {
    if (!bot) return res.status(500).send("Bot not initialized");
    try {
      const fileId = req.params.fileId;
      const fileLink = await bot.getFileLink(fileId);
      const response = await fetch(fileLink);
      if (!response.ok) throw new Error("Failed to fetch file from Telegram");
      const buffer = await response.arrayBuffer();
      res.set("Content-Type", response.headers.get("Content-Type") || "image/jpeg");
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error("Error fetching telegram file:", err);
      res.status(500).send("Error fetching file");
    }
  });

  // --- AUTH ROUTES ---
  app.post("/api/auth/register", asyncHandler(async (req, res) => {
    let { email, password, displayName, role, username } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }

    email = email.toLowerCase().trim();
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists with this email" });
    }

    if (username) {
      const existingUsername = await User.findOne({ where: { username } });
      if (existingUsername) {
        return res.status(400).json({ error: "Username already taken" });
      }
    } else {
      // Generate a default username if not provided
      username = email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') + '_' + nanoid(4);
    }

    // Special case: The owner's email is automatically an admin
    const finalRole = email === 'kassahunmulatu273@gmail.com' ? 'admin' : role;

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationToken = nanoid();
    const uid = nanoid();
    const user = {
      uid,
      username,
      email,
      password: hashedPassword,
      displayName,
      role: finalRole,
      subscription: { type: 'none', status: 'none', expiresAt: '' },
      viewedJobsCount: 0,
      isVerified: false,
      verificationToken,
    };

    await User.create(user);

    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    console.log(`[SIMULATED EMAIL] Verification link for ${email}: ${appUrl}/verify-email?token=${verificationToken}`);

    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET);
    
    const { password: _, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  }));

  app.post("/api/auth/login", asyncHandler(async (req, res) => {
    console.log(`🔐 [AUTH] Login attempt for: ${req.body?.email}`);
    let { email, password } = req.body;
    
    if (!email || !password) {
      console.warn(`⚠️ [AUTH] Missing email or password in request body`);
      return res.status(400).json({ error: "Email or Username and password are required" });
    }

    const identifier = email.toLowerCase().trim();
    
    // Allow 'admin' as an alias for the primary admin email
    let userInstance: any = null;
    console.log(`🔍 [AUTH] Searching for user with identifier: ${identifier}`);
    
    userInstance = await User.findOne({ 
      where: { 
        [Op.or]: [
          { email: identifier },
          { username: identifier }
        ]
      } 
    });
    
    if (userInstance) {
      console.log(`✅ [AUTH] User found by identifier: ${identifier}`, { uid: userInstance.uid, role: userInstance.role });
    } else if (identifier === 'admin') {
      console.log(`🔍 [AUTH] 'admin' alias used, searching for primary admin email: kassahunmulatu273@gmail.com`);
      userInstance = await User.findOne({ where: { email: 'kassahunmulatu273@gmail.com' } });
      if (userInstance) {
        console.log(`✅ [AUTH] Admin user found via alias`, { uid: userInstance.uid, role: userInstance.role });
      } else {
        console.warn(`⚠️ [AUTH] Admin user not found via alias`);
      }
    } else {
      console.warn(`⚠️ [AUTH] User not found: ${identifier}`);
    }

    if (!userInstance) {
      console.warn(`⚠️ [AUTH] Login failed: User not found`);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    const user = userInstance.get({ plain: true });

    if (!user.password) {
      console.error(`❌ [AUTH] User ${email} has no password set in database!`);
      return res.status(500).json({ error: "Internal server error", message: "User account is misconfigured (missing password)" });
    }

    console.log(`🔑 [AUTH] Comparing passwords for user: ${email}`);
    let isPasswordCorrect = false;
    try {
      isPasswordCorrect = await bcrypt.compare(password, user.password);
    } catch (bcryptErr: any) {
      console.error(`❌ [AUTH] Bcrypt comparison failed for ${email}:`, bcryptErr);
      return res.status(500).json({ 
        error: "Internal server error", 
        message: "Password verification failed", 
        details: bcryptErr.message 
      });
    }

    if (!isPasswordCorrect) {
      console.warn(`⚠️ [AUTH] Login failed: Incorrect password for ${email}`);
      return res.status(400).json({ error: "Invalid credentials" });
    }

    console.log(`✅ [AUTH] Login successful for: ${email}`);
    const token = jwt.sign({ uid: user.uid, email: user.email, role: user.role }, JWT_SECRET);
    const { password: _, verificationToken: __, resetPasswordToken: ___, ...userWithoutPassword } = user;
    res.json({ user: userWithoutPassword, token });
  }));

  app.post("/api/auth/verify-email", async (req, res) => {
    const { token } = req.body;
    const userInstance = await User.findOne({ where: { verificationToken: token } });
    
    if (!userInstance) {
      return res.status(400).json({ error: "Invalid or expired verification token" });
    }

    await userInstance.update({
      isVerified: true,
      verificationToken: null
    });

    res.json({ success: true, message: "Email verified successfully" });
  });

  app.post("/api/auth/resend-verification", authenticateToken, async (req: any, res) => {
    const userInstance = await User.findByPk(req.user.uid);
    if (!userInstance) return res.status(404).json({ error: "User not found" });
    
    const user = userInstance.get({ plain: true }) as any;
    if (user.isVerified) return res.status(400).json({ error: "Email already verified" });

    const verificationToken = nanoid();
    await userInstance.update({ verificationToken });

    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    console.log(`[SIMULATED EMAIL] Verification link for ${user.email}: ${appUrl}/verify-email?token=${verificationToken}`);
    res.json({ success: true, message: "Verification email sent" });
  });

  app.post("/api/auth/forgot-password", asyncHandler(async (req, res) => {
    const { email } = req.body;
    const userInstance = await User.findOne({ where: { email: email?.toLowerCase().trim() } });
    
    if (!userInstance) {
      return res.status(404).json({ error: "User with this email not found" });
    }

    const resetToken = nanoid();
    await userInstance.update({
      resetPasswordToken: resetToken,
      resetPasswordExpires: Date.now() + 3600000 // 1 hour
    });

    const appUrl = process.env.APP_URL || `http://localhost:3000`;
    console.log(`[SIMULATED EMAIL] Reset link for ${email}: ${appUrl}/reset-password?token=${resetToken}`);
    res.json({ success: true, message: "Password reset link sent to your email" });
  }));

  app.post("/api/auth/reset-password", asyncHandler(async (req, res) => {
    const { token, newPassword } = req.body;
    const userInstance = await User.findOne({ 
      where: { 
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: Date.now() }
      } 
    });

    if (!userInstance) {
      return res.status(400).json({ error: "Invalid or expired reset token" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userInstance.update({
      password: hashedPassword,
      resetPasswordToken: null,
      resetPasswordExpires: null
    });

    res.json({ success: true, message: "Password reset successful" });
  }));

  app.post("/api/auth/change-password", authenticateToken, asyncHandler(async (req: any, res) => {
    const { oldPassword, newPassword } = req.body;
    const userInstance = await User.findByPk(req.user.uid);
    if (!userInstance) return res.status(404).json({ error: "User not found" });
    
    const user = userInstance.get({ plain: true }) as any;
    
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: "Incorrect old password" });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await userInstance.update({ password: hashedPassword });

    res.json({ success: true, message: "Password changed successfully" });
  }));

  app.get("/api/auth/me", authenticateToken, asyncHandler(async (req: any, res) => {
    const userInstance = await User.findByPk(req.user.uid);
    if (!userInstance) return res.status(404).json({ error: "User not found" });
    
    const user = userInstance.get({ plain: true }) as any;
    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  }));

  app.put("/api/auth/profile", authenticateToken, asyncHandler(async (req: any, res) => {
    const { displayName, bio, skills, resumeUrl, companyName, companyLogo, phoneNumber } = req.body;
    const userInstance = await User.findByPk(req.user.uid);
    if (!userInstance) return res.status(404).json({ error: "User not found" });
    
    const updateData: any = {
      updatedAt: new Date()
    };

    if (displayName) updateData.displayName = displayName;
    if (bio !== undefined) updateData.bio = bio;
    if (skills !== undefined) updateData.skills = skills;
    if (resumeUrl !== undefined) updateData.resumeUrl = resumeUrl;
    if (companyName !== undefined) updateData.companyName = companyName;
    if (companyLogo !== undefined) updateData.companyLogo = companyLogo;
    if (phoneNumber !== undefined) updateData.phoneNumber = phoneNumber;

    await userInstance.update(updateData);
    
    const updatedUser = userInstance.get({ plain: true }) as any;
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  }));

  // --- JOB ROUTES ---
  app.get("/api/jobs", asyncHandler(async (req, res) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    let isAdminUser = false;
    
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const userInstance = await User.findByPk(decoded.uid);
        if (userInstance && (userInstance.get({ plain: true }) as any).role === 'admin') {
          isAdminUser = true;
        }
      } catch (e) {}
    }

    const where: any = { status: 'active' };
    if (!isAdminUser) {
      where.isApproved = true;
    }
    
    const activeJobs = await Job.findAll({ where });
    
    // Hide applicationProcess in the list for everyone to be safe
    const sanitizedJobs = activeJobs.map((jobInstance: any) => {
      const { applicationProcess, ...rest } = jobInstance.get({ plain: true });
      return rest;
    });

    res.json(sanitizedJobs);
  }));

  app.get("/api/jobs/:id", asyncHandler(async (req, res) => {
    const jobInstance = await Job.findByPk(req.params.id);
    if (!jobInstance) return res.status(404).json({ error: "Job not found" });
    const job = jobInstance.get({ plain: true }) as any;

    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    let user: any = null;
    if (token) {
      try {
        const decoded: any = jwt.verify(token, JWT_SECRET);
        const userInstance = await User.findByPk(decoded.uid);
        if (userInstance) {
          user = userInstance.get({ plain: true });
        }
      } catch (e) {}
    }

    const isPremium = user && (user.role === 'admin' || 
      (user.subscription?.status === 'approved' && 
        (user.subscription?.type === 'lifetime' || 
         (user.subscription?.expiresAt && new Date(user.subscription.expiresAt) > new Date()))));

    if (isPremium) {
      return res.json(job);
    } else {
      // Check view limit for logged-in non-premium seekers
      if (user && user.role === 'seeker') {
        const settingsInstance = await System.findByPk('settings');
        const settings = settingsInstance ? (settingsInstance.get({ plain: true }).data as any) : { freeJobViewLimit: 5 };
        const limit = settings?.freeJobViewLimit || 5;
        
        if (user.viewedJobsCount >= limit) {
          return res.status(403).json({ error: `Free view limit reached (${limit}). Please upgrade to see more jobs.` });
        }
        // Increment view count
        const userToUpdate = await User.findByPk(user.uid);
        if (userToUpdate) {
          await userToUpdate.increment('viewedJobsCount');
        }
      }
      
      // Hide applicationProcess for non-premium users
      const { applicationProcess, ...rest } = job;
      return res.json(rest);
    }
  }));

  app.post("/api/jobs/:id/save", authenticateToken, asyncHandler(async (req: any, res) => {
    const userInstance = await User.findByPk(req.user.uid);
    if (!userInstance) return res.status(404).json({ error: "User not found" });
    const user = userInstance.get({ plain: true }) as any;

    const jobInstance = await Job.findByPk(req.params.id);
    if (!jobInstance) return res.status(404).json({ error: "Job not found" });

    let savedJobs = user.savedJobs || [];
    const jobId = req.params.id;
    const isSaved = savedJobs.includes(jobId);

    if (isSaved) {
      savedJobs = savedJobs.filter((id: string) => id !== jobId);
    } else {
      savedJobs.push(jobId);
    }

    await userInstance.update({ savedJobs });

    res.json({ savedJobs, isSaved: !isSaved });
  }));

  app.get("/api/my-saved-jobs", authenticateToken, asyncHandler(async (req: any, res) => {
    const userInstance = await User.findByPk(req.user.uid);
    if (!userInstance) return res.status(404).json({ error: "User not found" });
    const user = userInstance.get({ plain: true }) as any;

    if (!user.savedJobs || user.savedJobs.length === 0) {
      return res.json([]);
    }

    const savedJobs = await Job.findAll({
      where: {
        id: { [Op.in]: user.savedJobs.slice(0, 10) }
      }
    });

    const savedJobsData = savedJobs.map(j => j.get({ plain: true }));

    // Sanitize for non-premium
    const isPremium = user.role === 'admin' || 
      (user.subscription?.status === 'approved' && 
        (user.subscription?.type === 'lifetime' || 
         (user.subscription?.expiresAt && new Date(user.subscription.expiresAt) > new Date())));

    const sanitizedJobs = savedJobsData.map((job: any) => {
      if (isPremium) return job;
      const { applicationProcess, ...rest } = job;
      return rest;
    });

    res.json(sanitizedJobs);
  }));

  app.get("/api/admin/system-settings", authenticateToken, asyncHandler(async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    const settingsInstance = await System.findByPk('settings');
    res.json(settingsInstance ? settingsInstance.get({ plain: true }).data : { freeJobViewLimit: 5, platformCommission: 10, maintenanceMode: 'off' });
  }));

  app.post("/api/admin/system-settings", authenticateToken, asyncHandler(async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Admin only" });
    
    await System.upsert({ id: 'settings', data: req.body });
    const updatedSettingsInstance = await System.findByPk('settings');
    res.json(updatedSettingsInstance?.get({ plain: true }).data);
  }));

  // --- NOTIFICATION ROUTES ---
  app.get("/api/notifications", authenticateToken, asyncHandler(async (req: any, res) => {
    const notifications = await Notification.findAll({ where: { userId: req.user.uid } });
    res.json(notifications.map(n => n.get({ plain: true })));
  }));

  app.post("/api/notifications/:id/read", authenticateToken, asyncHandler(async (req: any, res) => {
    const notificationInstance = await Notification.findByPk(req.params.id);
    if (notificationInstance && notificationInstance.get({ plain: true }).userId === req.user.uid) {
      await notificationInstance.update({ read: true });
    }
    res.json({ success: true });
  }));

  // --- MESSAGING ROUTES ---
  app.get("/api/messages", authenticateToken, asyncHandler(async (req: any, res) => {
    const messages = await Message.findAll({
      where: {
        [Op.or]: [
          { senderId: req.user.uid },
          { receiverId: req.user.uid }
        ]
      },
      order: [['createdAt', 'ASC']]
    });
    res.json(messages.map(m => m.get({ plain: true })));
  }));

  app.post("/api/messages", authenticateToken, asyncHandler(async (req: any, res) => {
    const { receiverId, content } = req.body;
    if (!receiverId || !content) return res.status(400).json({ error: "Receiver and content are required" });

    const message = await Message.create({
      id: nanoid(),
      senderId: req.user.uid,
      receiverId,
      content,
      isRead: false
    });

    // Notify receiver
    await Notification.create({
      id: nanoid(),
      userId: receiverId,
      title: "New Message",
      message: `You have a new message from ${req.user.email}`,
      type: 'info'
    });

    res.json(message.get({ plain: true }));
  }));

  // --- ADMIN DATA EXPORT (PERMANENT STORAGE BACKUP) ---
  app.get("/api/admin/export-data", authenticateToken, isAdmin, asyncHandler(async (req: any, res) => {
    try {
      const data = {
        users: await User.findAll(),
        jobs: await Job.findAll(),
        receipts: await Receipt.findAll(),
        applications: await Application.findAll(),
        notifications: await Notification.findAll(),
        botUsers: await BotUser.findAll(),
        system: await System.findAll(),
        messages: await Message.findAll(),
        auditLogs: await AuditLog.findAll(),
        transactions: await Transaction.findAll(),
        exportedAt: new Date().toISOString(),
        exportedBy: req.user.email
      };

      await logAudit(req.user.uid, 'EXPORT_DATABASE', { format: 'json' }, req);

      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename=elite-jobs-backup-${new Date().toISOString().split('T')[0]}.json`);
      res.send(JSON.stringify(data, null, 2));
    } catch (err: any) {
      console.error("❌ [ADMIN] Data export failed:", err);
      res.status(500).json({ error: "Failed to export data", details: err.message });
    }
  }));

  app.get("/api/admin/audit-logs", authenticateToken, isAdmin, asyncHandler(async (req: any, res) => {
    const logs = await AuditLog.findAll({ order: [['createdAt', 'DESC']], limit: 100 });
    res.json(logs.map(l => l.get({ plain: true })));
  }));

  app.get("/api/admin/transactions", authenticateToken, isAdmin, asyncHandler(async (req: any, res) => {
    const transactions = await Transaction.findAll({ order: [['createdAt', 'DESC']] });
    res.json(transactions.map(t => t.get({ plain: true })));
  }));

  // --- APPLICANT ROUTES ---
  app.get("/api/employer/applicants", authenticateToken, asyncHandler(async (req: any, res) => {
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const employerJobs = await Job.findAll({ where: { employerUid: req.user.uid } });
    const jobIds = employerJobs.map(j => j.get({ plain: true }).id);
    
    if (jobIds.length === 0) return res.json([]);

    const applicants = await Application.findAll({
      where: {
        jobId: { [Op.in]: jobIds.slice(0, 10) }
      }
    });
    
    const applicantsData = applicants.map(a => a.get({ plain: true }));

    // Enrich with seeker info
    const enrichedApplicants = await Promise.all(applicantsData.map(async (a: any) => {
      const seekerInstance = await User.findByPk(a.seekerUid);
      const seeker = seekerInstance ? seekerInstance.get({ plain: true }) : null;
      const jobInstance = await Job.findByPk(a.jobId);
      const job = jobInstance ? jobInstance.get({ plain: true }) : null;
      return {
        ...a,
        seekerName: seeker?.displayName,
        seekerEmail: seeker?.email,
        seekerBio: seeker?.bio,
        seekerSkills: seeker?.skills,
        seekerResume: seeker?.resumeUrl,
        jobTitle: a.jobTitle || job?.title || 'Unknown Job'
      };
    }));

    res.json(enrichedApplicants);
  }));

  app.post("/api/applications/:id/status", authenticateToken, asyncHandler(async (req: any, res) => {
    const { status } = req.body;
    const applicationInstance = await Application.findByPk(req.params.id);
    if (!applicationInstance) return res.status(404).json({ error: "Application not found" });
    const application = applicationInstance.get({ plain: true }) as any;

    // Verify ownership
    const jobInstance = await Job.findByPk(application.jobId);
    const job = jobInstance ? jobInstance.get({ plain: true }) as any : null;
    if (job?.employerUid !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Unauthorized" });
    }

    await applicationInstance.update({ status });

    // Create notification for seeker
    const notificationId = nanoid();
    await Notification.create({
      id: notificationId,
      userId: application.seekerUid,
      title: "Application Update",
      message: `Your application for ${job?.title} at ${job?.company} has been marked as ${status}.`,
      type: status === 'accepted' ? 'success' : status === 'rejected' ? 'error' : 'info',
      read: false,
    });

    res.json({ ...application, status });
  }));

  // --- ADMIN ROUTES ---
  app.get("/api/admin/users", authenticateToken, asyncHandler(async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    const users = await User.findAll();
    const usersData = users.map(userInstance => {
      const { password, ...rest } = userInstance.get({ plain: true }) as any;
      return rest;
    });
    res.json(usersData);
  }));

  app.post("/api/admin/users", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    let { email, password, displayName, role } = req.body;
    
    if (!email || !password || !displayName || !role) {
      return res.status(400).json({ error: "All fields are required" });
    }

    email = email.toLowerCase().trim();
    
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const uid = nanoid();
    const user = {
      uid,
      email,
      password: hashedPassword,
      displayName,
      role,
      subscription: { type: 'none', status: 'none', expiresAt: '' },
      viewedJobsCount: 0,
      isVerified: true, // Admin created users are verified by default
    };

    await User.create(user);

    const { password: _, ...userWithoutPassword } = user;
    res.json(userWithoutPassword);
  }));

  app.delete("/api/admin/users/:uid", authenticateToken, isAdmin, asyncHandler(async (req: any, res) => {
    const { uid } = req.params;
    const userInstance = await User.findByPk(uid);
    
    if (!userInstance) {
      return res.status(404).json({ error: "User not found" });
    }

    // Don't allow deleting yourself
    if (uid === req.user.uid) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }

    await userInstance.destroy();
    res.json({ success: true, message: "User deleted successfully" });
  }));
  
  app.patch("/api/admin/users/:uid/status", authenticateToken, isAdmin, asyncHandler(async (req: any, res) => {
    const { uid } = req.params;
    const { isBanned } = req.body;
    const userInstance = await User.findByPk(uid);
    
    if (!userInstance) return res.status(404).json({ error: "User not found" });
    if (uid === req.user.uid) return res.status(400).json({ error: "You cannot ban yourself" });

    await userInstance.update({ isBanned });
    res.json({ success: true, isBanned });
  }));

  app.put("/api/admin/users/:uid", authenticateToken, isAdmin, asyncHandler(async (req: any, res) => {
    const { uid } = req.params;
    const { displayName, role, email, password } = req.body;
    const userInstance = await User.findByPk(uid);
    
    if (!userInstance) return res.status(404).json({ error: "User not found" });

    const updateData: any = {};
    if (displayName) updateData.displayName = displayName;
    if (role) updateData.role = role;
    if (email) updateData.email = email.toLowerCase().trim();
    if (password) updateData.password = await bcrypt.hash(password, 10);

    await userInstance.update(updateData);
    
    const updatedUser = userInstance.get({ plain: true }) as any;
    const { password: _, ...userWithoutPassword } = updatedUser;
    res.json(userWithoutPassword);
  }));

  app.get("/api/admin/analytics", authenticateToken, asyncHandler(async (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: "Unauthorized" });
    
    const totalUsers = await User.count();
    const totalJobs = await Job.count();
    const totalApplications = await Application.count();
    const approvedReceipts = await Receipt.findAll({ where: { status: 'approved' } });

    const totalRevenue = approvedReceipts.reduce((acc, receiptInstance) => {
      const r = receiptInstance.get({ plain: true }) as any;
      const prices: any = { basic: 200, standard: 500, lifetime: 1000 };
      return acc + (prices[r.packageType] || 0);
    }, 0);

    const recentReceipts = await Receipt.findAll({
      limit: 5,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      totalUsers,
      totalJobs,
      totalApplications,
      totalRevenue,
      recentReceipts: recentReceipts.map(r => r.get({ plain: true }))
    });
  }));

  app.post("/api/jobs", authenticateToken, asyncHandler(async (req: any, res) => {
    if (req.user.role !== 'employer' && req.user.role !== 'admin') {
      return res.status(403).json({ error: "Only employers can post jobs" });
    }

    const jobId = nanoid();
    const job = {
      id: jobId,
      employerUid: req.user.uid,
      ...req.body,
      status: 'active',
    };

    await Job.create(job);

    // Notify Admins for approval
    const authenticatedAdmins = await BotUser.findAll({ where: { isAdminAuthenticated: true } });
    const adminMsg = `🔔 *New Job Pending Approval*\n\n💼 *Role:* ${job.title}\n🏢 *Company:* ${job.company}\n📍 *Location:* ${job.location}\n💰 *Salary:* ${job.salary}\n\n_Please verify and take action:_`;
    
    const adminOpts = {
      parse_mode: 'Markdown' as const,
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Approve Job", callback_data: `approve_job_${jobId}` },
            { text: "❌ Reject Job", callback_data: `reject_job_${jobId}` }
          ]
        ]
      }
    };

    for (const admin of authenticatedAdmins) {
      bot?.sendMessage((admin as any).chatId, adminMsg, adminOpts).catch(() => {});
    }

    // Create notifications for all job seekers (only after approval in a real app, but for now we keep it here or move it to approval)
    // Actually, let's move it to approval logic to be consistent with "available once admin approves"

    res.json(job);
  }));

  app.post("/api/admin/jobs/:id/approve", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const jobInstance = await Job.findByPk(req.params.id);
    if (!jobInstance) return res.status(404).json({ error: "Job not found" });

    await jobInstance.update({ isApproved: true });
    const job = jobInstance.get({ plain: true }) as any;

    // Create notifications for all job seekers now that it's approved
    const seekers = await User.findAll({ where: { role: 'seeker' } });
    const notifications = seekers.map(seekerInstance => {
      const seeker = seekerInstance.get({ plain: true }) as any;
      return {
        id: nanoid(),
        userId: seeker.uid,
        title: "New Job Approved",
        message: `A new job "${job.title}" at ${job.company} has been approved. Check it out!`,
        type: 'new_job',
        read: false,
      };
    });
    
    if (notifications.length > 0) {
      await Notification.bulkCreate(notifications);
    }

    // Also send a Telegram notification to the primary chat if configured
    if (process.env.TELEGRAM_CHAT_ID) {
      const telegramMsg = `🔔 *New Job Approved!*\n\n💼 *Role:* ${job.title}\n🏢 *Company:* ${job.company}\n📍 *Location:* ${job.location}\n💰 *Salary:* ${job.salary}\n\n_Apply now on the website or via the bot!_`;
      bot?.sendMessage(process.env.TELEGRAM_CHAT_ID, telegramMsg, { parse_mode: 'Markdown' })
        .catch(err => console.error("Telegram job notification failed:", err));
    }

    await logAudit(req.user.uid, 'APPROVE_JOB', { jobId: job.id }, req);
    res.json({ success: true });
  }));

  app.post("/api/admin/jobs/:id/reject", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const jobInstance = await Job.findByPk(req.params.id);
    if (!jobInstance) return res.status(404).json({ error: "Job not found" });

    await jobInstance.update({ status: 'rejected', isApproved: false });
    await logAudit(req.user.uid, 'REJECT_JOB', { jobId: req.params.id }, req);
    res.json({ success: true });
  }));

  app.put("/api/jobs/:id", authenticateToken, asyncHandler(async (req: any, res) => {
    const jobInstance = await Job.findByPk(req.params.id);
    if (!jobInstance) {
      return res.status(404).json({ error: "Job not found" });
    }

    const job = jobInstance.get({ plain: true }) as any;
    if (job.employerUid !== req.user.uid && req.user.role !== 'admin') {
      return res.status(403).json({ error: "You don't have permission to update this job" });
    }

    const updatedJobData = {
      ...req.body,
      id: job.id, // Ensure ID doesn't change
      employerUid: job.employerUid, // Ensure employer doesn't change
      updatedAt: new Date(),
    };

    await jobInstance.update(updatedJobData);
    res.json(updatedJobData);
  }));

  app.get("/api/my-jobs", authenticateToken, asyncHandler(async (req: any, res) => {
    const myJobs = await Job.findAll({ where: { employerUid: req.user.uid } });
    res.json(myJobs.map(j => j.get({ plain: true })));
  }));

  // --- APPLICATION ROUTES ---
  app.post("/api/applications", authenticateToken, asyncHandler(async (req: any, res) => {
    const userInstance = await User.findByPk(req.user.uid);
    if (!userInstance) return res.status(404).json({ error: "User not found" });
    const user = userInstance.get({ plain: true }) as any;
    
    if (!user || user.subscription?.status !== 'approved') {
      return res.status(403).json({ error: "Approved subscription required to apply" });
    }

    const jobInstance = await Job.findByPk(req.body.jobId);
    if (!jobInstance) {
      return res.status(404).json({ error: "Job not found" });
    }
    const job = jobInstance.get({ plain: true }) as any;

    // Check if deadline passed
    if (job.deadline && new Date(job.deadline) < new Date(new Date().setHours(0, 0, 0, 0))) {
      return res.status(400).json({ error: "Application deadline has passed. This job is no longer accepting applications." });
    }

    const applicationId = nanoid();
    const application = {
      id: applicationId,
      seekerUid: req.user.uid,
      ...req.body,
      jobTitle: job.title,
      company: job.company,
      status: 'pending',
    };

    await Application.create(application);
    res.json(application);
  }));

  app.get("/api/my-applications", authenticateToken, asyncHandler(async (req: any, res) => {
    const myApps = await Application.findAll({ where: { seekerUid: req.user.uid } });
    const myAppsData = myApps.map(a => a.get({ plain: true }));
    
    // Enrich with job info if missing (for older apps)
    const enriched = await Promise.all(myAppsData.map(async (a: any) => {
      if (a.jobTitle) return a;
      const jobInstance = await Job.findByPk(a.jobId);
      const job = jobInstance ? jobInstance.get({ plain: true }) as any : null;
      return {
        ...a,
        jobTitle: job?.title || 'Unknown Job',
        company: job?.company || 'Unknown Company'
      };
    }));

    res.json(enriched);
  }));

  // --- RECEIPT & SUBSCRIPTION ROUTES ---
  app.post("/api/receipts", authenticateToken, asyncHandler(async (req: any, res) => {
    const { packageType, receiptUrl } = req.body;
    const userInstance = await User.findByPk(req.user.uid);
    if (!userInstance) return res.status(404).json({ error: "User not found" });
    const user = userInstance.get({ plain: true }) as any;

    const receiptId = nanoid();
    const receipt = {
      id: receiptId,
      seekerUid: user.uid,
      seekerEmail: user.email,
      packageType,
      receiptUrl,
      status: 'pending',
    };

    await Receipt.create(receipt);
    
    // Update user subscription status to pending
    await userInstance.update({
      subscription: {
        ...user.subscription,
        status: 'pending',
        type: packageType
      }
    });
    
    // Notify Admin
    const adminEmail = process.env.ADMIN_EMAIL || "kmulatu21@gmail.com";
    let adminPhone = process.env.ADMIN_PHONE || "0915508167";
    
    // Format phone number for Twilio (E.164)
    if (adminPhone.startsWith('0')) {
      adminPhone = '+251' + adminPhone.substring(1);
    } else if (!adminPhone.startsWith('+')) {
      adminPhone = '+' + adminPhone;
    }
    
    const userName = user.displayName || 'A user';
    const notificationMsg = `New payment receipt uploaded by ${userName} with email ${user.email} for package: ${packageType}. Please review it in the admin dashboard.`;

    // Save Notification to DB
    const notificationId = nanoid();
    const newNotification = {
      id: notificationId,
      type: 'payment',
      message: notificationMsg,
      userId: user.uid,
      read: false
    };
    await Notification.create(newNotification);
    
    // Email Notification
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: process.env.EMAIL_SERVICE || 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS
        }
      });

      transporter.sendMail({
        from: `"Job Portal" <${process.env.EMAIL_USER}>`,
        to: adminEmail,
        subject: "New Payment Receipt Uploaded",
        text: notificationMsg
      }).catch(err => console.error("Email notification failed:", err));
    }

    // Telegram Notification
    if (bot) {
      const authenticatedAdmins = await BotUser.findAll({ where: { isAdminAuthenticated: true } });
      const notificationText = `🔔 *New Payment Receipt*\n\n👤 *User:* ${userName}\n📧 *Email:* ${user.email}\n📦 *Package:* ${packageType}\n\n_Please review it in the admin dashboard._`;
      
      // Notify all authenticated admins on Telegram
      authenticatedAdmins.forEach((adminInstance: any) => {
        const admin = adminInstance.get({ plain: true });
        bot?.sendMessage(admin.chatId, notificationText, { parse_mode: 'Markdown' })
          .catch(err => console.error(`Telegram notification failed for admin ${admin.chatId}:`, err));
      });

      // Also notify the primary chat ID if it's not already in the authenticated list
      if (process.env.TELEGRAM_CHAT_ID && !authenticatedAdmins.some((a: any) => a.chatId === Number(process.env.TELEGRAM_CHAT_ID))) {
        bot.sendMessage(process.env.TELEGRAM_CHAT_ID, notificationText, { parse_mode: 'Markdown' })
          .catch(err => console.error("Telegram notification failed for primary chat:", err));
      }
    }

    // SMS Notification
    if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
      const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
      client.messages.create({
        body: notificationMsg,
        from: process.env.TWILIO_PHONE_NUMBER,
        to: adminPhone
      }).catch(err => {
        if (err.code === 21608) {
          console.error("Twilio SMS failed: The destination number is unverified. If you are using a Twilio Trial account, you must verify the recipient number (+251915508167) at https://www.twilio.com/user/account/phone-numbers/verified");
        } else {
          console.error("SMS notification failed:", err);
        }
      });
    }

    res.json(receipt);
  }));

  app.get("/api/my-receipts", authenticateToken, asyncHandler(async (req: any, res) => {
    const receipts = await Receipt.findAll({ where: { seekerUid: req.user.uid } });
    res.json(receipts.map(r => r.get({ plain: true })));
  }));

  // --- ADMIN ROUTES ---
  app.get("/api/admin/receipts", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const receipts = await Receipt.findAll();
    res.json(receipts.map(r => r.get({ plain: true })));
  }));

  app.get("/api/admin/notifications", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const notifications = await Notification.findAll({ order: [['createdAt', 'DESC']] });
    res.json(notifications.map(n => n.get({ plain: true })));
  }));

  app.delete("/api/admin/notifications/:id", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const notification = await Notification.findByPk(req.params.id);
    if (notification) {
      await notification.destroy();
    }
    res.json({ success: true });
  }));

  app.post("/api/admin/notifications/clear-all", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    await Notification.destroy({ where: {}, truncate: true });
    res.json({ success: true });
  }));

  app.post("/api/admin/receipts/:id/approve", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const receiptInstance = await Receipt.findByPk(req.params.id);
    if (!receiptInstance) return res.status(404).json({ error: "Receipt not found" });

    const receipt = receiptInstance.get({ plain: true }) as any;
    await receiptInstance.update({ status: 'approved' });

    // Create Transaction record
    const pkg = PACKAGES.find(p => p.id === receipt.packageType || p.name === receipt.packageType);
    const amount = pkg ? parseFloat(pkg.price.replace(/[^0-9.]/g, '')) : 0;
    
    await Transaction.create({
      id: nanoid(),
      userId: receipt.seekerUid,
      amount,
      currency: 'ETB',
      type: 'subscription',
      status: 'completed',
      referenceId: receipt.id,
      metadata: { packageType: receipt.packageType, userName: receipt.userName }
    });

    await logAudit(req.user.uid, 'APPROVE_RECEIPT', { receiptId: receipt.id, userId: receipt.seekerUid, amount }, req);

    const userInstance = await User.findByPk(receipt.seekerUid);
    
    // Calculate expiration
    const now = new Date();
    if (receipt.packageType === 'basic' || receipt.packageType === 'Basic Access') now.setMonth(now.getMonth() + 1);
    else if (receipt.packageType === 'standard' || receipt.packageType === 'Standard Access') now.setMonth(now.getMonth() + 3);
    else if (receipt.packageType === 'lifetime' || receipt.packageType === 'Lifetime Access') now.setFullYear(now.getFullYear() + 100);
    
    const subscriptionData = {
      status: 'approved',
      type: receipt.packageType,
      expiresAt: now.toISOString()
    };

    if (userInstance) {
      await userInstance.update({ subscription: subscriptionData });
    } else {
      // Create user if they don't exist
      const newUser = {
        uid: receipt.seekerUid,
        email: receipt.userEmail || `${receipt.seekerUid}@telegram.user`,
        displayName: receipt.userName || 'EliteJobs User',
        role: 'seeker',
        subscription: subscriptionData,
        isVerified: true
      };
      await User.create(newUser);
    }

    // Also update botUser if it exists to ensure immediate sync
    if (receipt.telegramChatId) {
      const botUserInstance = await BotUser.findByPk(receipt.telegramChatId);
      if (botUserInstance) {
        await botUserInstance.update({ subscriptionStatus: 'approved' });
      }
    }

    // Notify via Telegram if applicable
    if (receipt.telegramChatId && bot) {
      bot.sendMessage(receipt.telegramChatId, `🎉 *Payment Approved!*\n\nYour payment for the *${receipt.packageType}* package has been verified. You now have full access to the platform.\n\nThank you for choosing EliteJobs Ethiopia!`, { parse_mode: 'Markdown' });
    }

    res.json({ success: true });
  }));

  app.post("/api/admin/receipts/:id/reject", authenticateToken, isAdmin, asyncHandler(async (req, res) => {
    const receiptInstance = await Receipt.findByPk(req.params.id);
    if (!receiptInstance) return res.status(404).json({ error: "Receipt not found" });

    const receipt = receiptInstance.get({ plain: true }) as any;
    await receiptInstance.update({ status: 'rejected' });

    await logAudit(req.user.uid, 'REJECT_RECEIPT', { receiptId: receipt.id, userId: receipt.seekerUid, reason: req.body.reason || 'Not specified' }, req);

    const userInstance = await User.findByPk(receipt.seekerUid);
    if (userInstance) {
      const user = userInstance.get({ plain: true }) as any;
      await userInstance.update({
        subscription: {
          ...user.subscription,
          status: 'rejected'
        }
      });
    }

    // Notify via Telegram if applicable
    if (receipt.telegramChatId && bot) {
      bot.sendMessage(receipt.telegramChatId, `❌ *Payment Rejected*\n\nYour payment submission for the *${receipt.packageType}* package was rejected. Please ensure the details are correct and try again, or contact support.`, { parse_mode: 'Markdown' });
    }

    res.json({ success: true });
  }));

  // API 404 handler - Catch unmatched /api routes before they fall through to SPA
  app.use("/api/*", (req, res) => {
    console.warn(`🚫 [API] 404 - Not Found: ${req.method} ${req.originalUrl}`);
    res.status(404).json({ 
      error: "API route not found", 
      method: req.method, 
      path: req.originalUrl 
    });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    console.log("🔥 [SERVER] Starting Vite in development mode...");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: process.cwd(),
    });
    app.use(vite.middlewares);
    console.log("✅ [SERVER] Vite middleware attached.");
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Global Error Handler
  app.use((err: any, req: any, res: any, next: any) => {
    console.error("💥 [SERVER] Unhandled Error:", err);
    
    let errorMessage = err.message || "An unexpected error occurred";
    let statusCode = err.statusCode || 500;

    res.status(statusCode).json({ 
      error: errorMessage, 
      message: errorMessage,
      details: err.details || undefined,
      code: err.code || undefined,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
      path: req.originalUrl,
      method: req.method
    });
  });

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 [SERVER] Running on http://0.0.0.0:${PORT}`);
    console.log(`🌍 [SERVER] Environment: ${process.env.NODE_ENV}`);
    console.log(`[PERSISTENCE] Using MySQL/Sequelize for data storage.`);
    
    // Initialize Bot
    if (process.env.TELEGRAM_BOT_TOKEN) {
      console.log("🤖 [SERVER] TELEGRAM_BOT_TOKEN found, initializing bot...");
      initBot();
    } else {
      console.warn("⚠️ [SERVER] TELEGRAM_BOT_TOKEN NOT FOUND in environment variables.");
      botStatus = "Missing Token";
    }
  });
}

console.log("🏁 [SERVER] Calling startServer()...");
startServer().catch(err => {
  console.error("❌ [SERVER] Fatal error during startup:", err);
});
