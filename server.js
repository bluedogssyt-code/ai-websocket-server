import { WebSocketServer } from "ws";
import Groq from "groq-sdk";

const PORT = process.env.PORT || 8080;
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const wss = new WebSocketServer({ port: PORT });

wss.on("connection", (ws) => {
  ws.on("message", async (raw) => {
    try {
      const data = JSON.parse(raw.toString());
      const question = data.question || "";

      ws.send(JSON.stringify({ type: "start" }));

      const stream = await groq.chat.completions.create({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are a helpful AI assistant." },
          { role: "user", content: question }
        ],
        stream: true
      });

      let full = "";

      for await (const chunk of stream) {
        const token = chunk.choices?.[0]?.delta?.content || "";
        if (token) {
          full += token;
          ws.send(JSON.stringify({ type: "token", token }));
        }
      }

      ws.send(JSON.stringify({ type: "done", response: full }));
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", error: err.message }));
    }
  });
});

console.log("AI WebSocket running on port", PORT);
