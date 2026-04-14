import { Sequelize, DataTypes } from 'sequelize';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Database configuration
const DB_HOST = process.env.DB_HOST || 'localhost';
const DB_USER = process.env.DB_USER || 'root';
const DB_PASS = process.env.DB_PASS || '';
const DB_NAME = process.env.DB_NAME || 'elite_jobs_ethiopia';
let DB_DIALECT = (process.env.DB_DIALECT as any) || 'sqlite';

// In this environment, localhost MySQL is not available.
// If the user set DB_HOST to localhost and DB_DIALECT to mysql, we fallback to sqlite.
if (DB_DIALECT === 'mysql' && (DB_HOST === 'localhost' || DB_HOST === '127.0.0.1')) {
  console.warn(`⚠️ [DB] MySQL on localhost (${DB_HOST}) is not supported in this environment.`);
  console.warn(`⚠️ [DB] Falling back to SQLite. To use MySQL, please provide a remote DB_HOST.`);
  DB_DIALECT = 'sqlite';
}

let sequelize: Sequelize;

if (DB_DIALECT === 'mysql') {
  console.log(`🔥 [DB] Connecting to MySQL at ${DB_HOST}...`);
  sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
    host: DB_HOST,
    dialect: 'mysql',
    logging: false,
  });
} else {
  console.log(`🔥 [DB] Using SQLite for data storage...`);
  sequelize = new Sequelize({
    dialect: 'sqlite',
    storage: path.join(__dirname, 'database.sqlite'),
    logging: false,
  });
}

// Models
export const User = sequelize.define('User', {
  uid: { type: DataTypes.STRING, primaryKey: true },
  username: { type: DataTypes.STRING, unique: true },
  email: { type: DataTypes.STRING, unique: true, allowNull: false },
  password: { type: DataTypes.STRING, allowNull: false },
  name: { type: DataTypes.STRING },
  displayName: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING, defaultValue: 'seeker' },
  subscription: { type: DataTypes.JSON }, // { type, status, expiresAt }
  viewedJobsCount: { type: DataTypes.INTEGER, defaultValue: 0 },
  isVerified: { type: DataTypes.BOOLEAN, defaultValue: false },
  verificationToken: { type: DataTypes.STRING },
  resetPasswordToken: { type: DataTypes.STRING },
  resetPasswordExpires: { type: DataTypes.BIGINT },
  bio: { type: DataTypes.TEXT },
  skills: { type: DataTypes.JSON }, // Array of strings
  resumeUrl: { type: DataTypes.STRING },
  companyName: { type: DataTypes.STRING },
  companyLogo: { type: DataTypes.STRING },
  photoUrl: { type: DataTypes.STRING },
  phoneNumber: { type: DataTypes.STRING },
  savedJobs: { type: DataTypes.JSON, defaultValue: [] }, // Array of job IDs
  socialLinks: { type: DataTypes.JSON }, // { website, linkedin, twitter, github }
  isBanned: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

export const Job = sequelize.define('Job', {
  id: { type: DataTypes.STRING, primaryKey: true },
  employerUid: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING, allowNull: false },
  company: { type: DataTypes.STRING, allowNull: false },
  location: { type: DataTypes.STRING },
  category: { type: DataTypes.STRING },
  type: { type: DataTypes.STRING },
  salary: { type: DataTypes.STRING },
  deadline: { type: DataTypes.STRING },
  description: { type: DataTypes.TEXT },
  experienceLevel: { type: DataTypes.STRING },
  requiredSkills: { type: DataTypes.JSON }, // Array of strings
  status: { type: DataTypes.STRING, defaultValue: 'active' },
  isApproved: { type: DataTypes.BOOLEAN, defaultValue: false },
  applicationProcess: { type: DataTypes.JSON }, // { type, value, instructions }
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

export const Receipt = sequelize.define('Receipt', {
  id: { type: DataTypes.STRING, primaryKey: true },
  seekerUid: { type: DataTypes.STRING },
  userName: { type: DataTypes.STRING },
  userEmail: { type: DataTypes.STRING },
  packageType: { type: DataTypes.STRING },
  transactionId: { type: DataTypes.STRING },
  receiptUrl: { type: DataTypes.STRING },
  status: { type: DataTypes.STRING, defaultValue: 'pending' },
  telegramChatId: { type: DataTypes.BIGINT },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

export const Application = sequelize.define('Application', {
  id: { type: DataTypes.STRING, primaryKey: true },
  jobId: { type: DataTypes.STRING, allowNull: false },
  seekerUid: { type: DataTypes.STRING, allowNull: false },
  status: { type: DataTypes.STRING, defaultValue: 'pending' }, // pending, accepted, rejected
  jobTitle: { type: DataTypes.STRING },
  company: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

export const Message = sequelize.define('Message', {
  id: { type: DataTypes.STRING, primaryKey: true },
  senderId: { type: DataTypes.STRING, allowNull: false },
  receiverId: { type: DataTypes.STRING, allowNull: false },
  content: { type: DataTypes.TEXT, allowNull: false },
  isRead: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

export const AuditLog = sequelize.define('AuditLog', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: { type: DataTypes.STRING },
  action: { type: DataTypes.STRING, allowNull: false },
  details: { type: DataTypes.JSON },
  ipAddress: { type: DataTypes.STRING },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

export const Transaction = sequelize.define('Transaction', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  currency: { type: DataTypes.STRING, defaultValue: 'ETB' },
  type: { type: DataTypes.STRING, defaultValue: 'subscription' }, // subscription, boost, etc.
  status: { type: DataTypes.STRING, defaultValue: 'completed' },
  referenceId: { type: DataTypes.STRING }, // Receipt ID or external transaction ID
  metadata: { type: DataTypes.JSON },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

export const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.STRING, primaryKey: true },
  userId: { type: DataTypes.STRING, allowNull: false },
  title: { type: DataTypes.STRING },
  message: { type: DataTypes.TEXT },
  type: { type: DataTypes.STRING, defaultValue: 'info' }, // info, success, error
  read: { type: DataTypes.BOOLEAN, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

export const BotUser = sequelize.define('BotUser', {
  chatId: { type: DataTypes.BIGINT, primaryKey: true },
  username: { type: DataTypes.STRING },
  role: { type: DataTypes.STRING, defaultValue: 'user' },
  state: { type: DataTypes.STRING, defaultValue: 'IDLE' },
  selectedPackage: { type: DataTypes.STRING },
  subscriptionStatus: { type: DataTypes.STRING },
  isAdminAuthenticated: { type: DataTypes.BOOLEAN, defaultValue: false },
  pendingReceipt: { type: DataTypes.JSON },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
});

export const System = sequelize.define('System', {
  key: { type: DataTypes.STRING, primaryKey: true },
  value: { type: DataTypes.JSON },
});

export const initDB = async () => {
  try {
    await sequelize.authenticate();
    console.log('✅ [DB] Database connection established successfully.');

    // SQLite doesn't support adding UNIQUE columns via ALTER TABLE
    if (DB_DIALECT === 'sqlite') {
      const queryInterface = sequelize.getQueryInterface();
      const tables = await queryInterface.showAllTables();
      if (tables.includes('Users')) {
        const tableInfo = await queryInterface.describeTable('Users');
        if (!tableInfo.username) {
          console.log('🔄 [DB] Manually adding username column for SQLite...');
          await queryInterface.addColumn('Users', 'username', {
            type: DataTypes.STRING,
            allowNull: true,
          });
          // Add unique index separately
          await queryInterface.addIndex('Users', ['username'], {
            unique: true,
            name: 'users_username_unique'
          });
        }
      }
    }

    await sequelize.sync({ alter: true });
    console.log('✅ [DB] Database models synchronized.');
  } catch (error) {
    console.error('❌ [DB] Unable to connect to the database:', error);
    throw error;
  }
};

export default sequelize;
