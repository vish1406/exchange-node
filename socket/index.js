import { Server } from "socket.io";
import { appConfig } from "../config/app.js";
import eventNotificationNamespace from "./namespaces/event-notification/eventNotificationNamespace.js";
import marketNamespace from "./namespaces/market/marketNamespace.js";
import userBetNamespace from "./namespaces/user-bet/userBetNamespace.js";
import userNamespace from "./namespaces/user/userNamespace.js";

let io = {
  user: null,
  market: null,
  userBet: null,
  eventNotification: null,
};

const initSocket = (server) => {
  io = new Server(server, {
    cors: { origin: appConfig.CORS_ALLOWED_ORIGINS },
  });

  io.user = io.of("/io/user");
  userNamespace.connect(io.user);

  io.market = io.of("/io/market");
  marketNamespace.connect(io.market);

  io.userBet = io.of("/io/user-bet");
  userBetNamespace.connect(io.userBet);

  io.eventNotification = io.of("/io/event-notification");
  eventNotificationNamespace.connect(io.eventNotification);
};

export { initSocket, io };
