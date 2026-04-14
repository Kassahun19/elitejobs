import { app, serverReady } from '../server';

export default async (req: any, res: any) => {
  try {
    console.log(`📡 [VERCEL] Handling ${req.method} ${req.url}`);
    await serverReady;
    return app(req, res);
  } catch (err: any) {
    console.error("💥 [VERCEL] Function Error:", err);
    res.status(500).json({
      error: "Internal Server Error during initialization",
      message: err.message,
      stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
    });
  }
};
