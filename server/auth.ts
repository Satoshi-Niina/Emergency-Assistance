import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import bcrypt from 'bcrypt';

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "emergency-recovery-secret",
    resave: true,
    saveUninitialized: true,
    store: storage.sessionStore,
    cookie: { 
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      sameSite: 'lax'
    },
    name: 'emergency-session'
  };

  // 開発環境の場合はtrust proxyを設定
  if (process.env.NODE_ENV !== 'production') {
    app.set('trust proxy', 1);
  }

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // セッションの状態をログ出力
  app.use((req, res, next) => {
    console.log('🔍 セッション状態:', {
      hasSession: !!req.session,
      sessionID: req.sessionID,
      userId: req.session?.userId,
      isAuthenticated: req.isAuthenticated()
    });
    next();
  });

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        console.log('🔐 認証試行:', { username });
        const user = await storage.getUserByUsername(username);
        
        if (!user) {
          console.log('❌ ユーザーが見つかりません:', username);
          return done(null, false, { message: 'ユーザーが見つかりません' });
        }
        
        const isValidPassword = await bcrypt.compare(password, user.password);
        console.log('🔑 パスワード検証:', { 
          username,
          isValid: isValidPassword 
        });

        if (!isValidPassword) {
          return done(null, false, { message: 'パスワードが正しくありません' });
        }
        
        console.log('✅ 認証成功:', { 
          userId: user.id,
          username: user.username
        });
        return done(null, user);
      } catch (error) {
        console.error('❌ 認証エラー:', error);
        return done(error);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    console.log('🔒 セッション保存:', { 
      userId: user.id,
      username: user.username
    });
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      console.log('🔓 セッション復元:', { userId: id });
      const user = await storage.getUser(id);
      if (!user) {
        console.warn('⚠️ ユーザーが見つかりません:', id);
        return done(null, false);
      }
      console.log('✅ ユーザー復元成功:', {
        userId: user.id,
        username: user.username
      });
      done(null, user);
    } catch (error) {
      console.error('❌ セッション復元エラー:', error);
      done(error);
    }
  });

  app.post("/api/register", async (req, res, next) => {
    try {
      const existingUser = await storage.getUserByUsername(req.body.username);
      if (existingUser) {
        return res.status(400).send("Username already exists");
      }

      const hashedPassword = await bcrypt.hash(req.body.password, 10);
      
      const user = await storage.createUser({
        ...req.body,
        password: hashedPassword,
      });

      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({
          id: user.id,
          username: user.username,
          displayName: user.display_name,
          role: user.role
        });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    const user = req.user as SelectUser;
    res.status(200).json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      department: user.department
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const user = req.user as SelectUser;
    res.json({
      id: user.id,
      username: user.username,
      displayName: user.display_name,
      role: user.role,
      department: user.department
    });
  });
}