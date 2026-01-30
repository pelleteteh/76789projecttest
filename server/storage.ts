import {
  users,
  events,
  type User,
  type UpsertUser,
  type Event,
  type InsertEvent,
} from "@shared/schema";
import { userWalletAddresses } from "@shared/schema-blockchain";
import { db } from "./db";
import { eq, desc } from "drizzle-orm";
import session from "express-session";
import createMemoryStore from "memorystore";

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  getAllUsersWithWallets(): Promise<any[]>;
  upsertUser(user: UpsertUser): Promise<User>;
  updateUserProfile(id: string, updates: Partial<User>): Promise<User>;

  // Event operations
  getEvents(limit?: number): Promise<Event[]>;
  getEventById(id: number): Promise<Event | undefined>;
  createEvent(event: InsertEvent): Promise<Event>;

  sessionStore: any;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  private db = db;

  constructor() {
    const MemoryStore = createMemoryStore(session);
    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await this.db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await this.db.select().from(users);
  }

  async getAllUsersWithWallets(): Promise<any[]> {
    // Get all users with their wallet addresses
    const allUsers = await this.db.select().from(users);
    
    // Get all wallet addresses
    const wallets = await this.db.select().from(userWalletAddresses);
    
    // Create a map of userId -> wallets array
    const walletMap = wallets.reduce((acc: any, wallet: any) => {
      if (!acc[wallet.userId]) {
        acc[wallet.userId] = [];
      }
      acc[wallet.userId].push({
        id: wallet.id,
        walletAddress: wallet.walletAddress,
        chainId: wallet.chainId,
        walletType: wallet.walletType,
        isPrimary: wallet.isPrimary,
        isVerified: wallet.isVerified,
      });
      return acc;
    }, {});
    
    // Merge users with their wallets
    return allUsers.map((user: User) => ({
      ...user,
      wallets: walletMap[user.id] || [],
      // Add primaryWalletAddress for easy searching
      primaryWalletAddress: (walletMap[user.id] || []).find((w: any) => w.isPrimary)?.walletAddress || null,
    }));
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await this.db
      .insert(users)
      .values(userData as any)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async updateUserProfile(id: string, updates: Partial<User>): Promise<User> {
    const [user] = await this.db
      .update(users)
      .set({
        ...updates,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getEvents(limit = 10): Promise<Event[]> {
    return await this.db
      .select()
      .from(events)
      .orderBy(desc(events.createdAt))
      .limit(limit);
  }

  async getEventById(id: number): Promise<Event | undefined> {
    const [event] = await this.db.select().from(events).where(eq(events.id, id));
    return event;
  }

  async createEvent(event: InsertEvent): Promise<Event> {
    const [newEvent] = await this.db.insert(events).values(event).returning();
    return newEvent;
  }
}

export const storage = new DatabaseStorage();
