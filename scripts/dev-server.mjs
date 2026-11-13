import http from "node:http";
import worker from "../worker/index.js";

const port = Number(process.env.PORT || 4173);
const runtimeEnv = { ...process.env };

if (process.argv.includes("--stdin-env")) {
  process.stdout.write("Ready for environment JSON on stdin (input is hidden).\n");
  const line = await new Promise((resolve) => {
    process.stdin.setEncoding("utf8");
    process.stdin.once("data", resolve);
  });
  Object.assign(runtimeEnv, JSON.parse(String(line)));
}

const server = http.createServer(async (req, res) => {
  const request = new Request(`http://127.0.0.1:${port}${req.url}`, { method: req.method });
  const response = await worker.fetch(request, runtimeEnv, {});
  res.writeHead(response.status, Object.fromEntries(response.headers));
  res.end(Buffer.from(await response.arrayBuffer()));
});

server.listen(port, "127.0.0.1", () => {
  console.log(`Local: http://127.0.0.1:${port}`);
});
