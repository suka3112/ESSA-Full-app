// socket.js
import { io } from "socket.io-client";

let token =
  sessionStorage.getItem("secondaryToken") ||
  localStorage.getItem("token") ||
  sessionStorage.getItem("token");

// 👇 remove "Bearer " if present
if (token?.startsWith("Bearer ")) {
  token = token.replace("Bearer ", "");
}

const socket = io(process.env.REACT_APP_AUTH_API_BASE_URL, {
  auth: { token },           // send raw JWT only
  // transports: ["websocket"],
});

export default socket;
