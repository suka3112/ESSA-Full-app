import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import logger from "../utils/logger";

class SocketServiceClass {
  private io: Server | null = null;
  private userSockets: Map<string, string> = new Map();

  initialize(io: Server) {
    this.io = io;
    this.setupMiddleware();
    this.setupSocketHandlers();
  }

  /**
   * Middleware to authenticate socket connections
   */
  private setupMiddleware() {
    if (!this.io) return;

    this.io.use((socket, next) => {
      const token = socket?.handshake?.auth?.token;

      if (!token) {
        return next(new Error("Authentication error: No token provided"));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        let userId: string | null = null;

        userId = decoded?.id ? String(decoded?.id) : null;
        if (!userId) {
          return next(
            new Error("Authentication error: No valid user ID in token"),
          );
        }

        socket.data.userId = userId;
        next();
      } catch (error) {
        logger.error("Error:", error);
        next(new Error("Authentication error: Invalid token"));
      }
    });
  }

  /**
   * Set up socket event handlers after authentication
   */
  private setupSocketHandlers() {
    if (!this.io) return;

    this.io.on("connection", (socket: Socket) => {
      const userId = socket?.data?.userId; // Save mapping of userId -> socketId
      if (userId == null) {
        return;
      }
      this.userSockets.set(String(userId), socket?.id);

      // Join a personal room for targeted notifications
      socket?.join(`user_${userId}`);

      // Handle disconnect
      socket?.on("disconnect", () => {
        this.userSockets.delete(String(userId));
      });
    });
  }

  /**
   * Send a notification to a specific user
   */
  sendNotificationToUser(userId: string, notification: any) {
    if (!this.io) return;

    this.io.to(`user_${userId}`).emit("new_notification", {
      ID: notification?.ID,
      Message: notification?.Message,
      Module_Category_Id: notification?.Module_Category_Id,
      Redirect_Id: notification?.Redirect_Id,
      CreatedDt: notification?.CreatedDt,
      Is_Read: notification?.Is_Read,
      Vendor_Id: notification?.Vendor_Id,
    });
  }

  /**
   * Send a notification to multiple users
   */
  sendNotificationToUsers(userIds: string[], notification: any) {
    (userIds ?? []).forEach((userId) => {
      this.sendNotificationToUser(userId, notification);
    });
  }

  /**
   * Broadcast a notification to all connected users
   */
  broadcastNotification(notification: any) {
    if (!this.io) return;
    this.io.emit("new_notification", notification);
  }

  /**
   * Get number of online users
   */
  getOnlineUsersCount(): number {
    return this.userSockets.size;
  }

  /**
   * Check if a user is online
   */
  isUserOnline(userId: string): boolean {
    return this.userSockets.has(userId);
  }
}

export default new SocketServiceClass();
