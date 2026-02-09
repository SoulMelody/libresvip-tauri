import { createClient } from "@connectrpc/connect";
import { createConnectTransport } from "@connectrpc/connect-web";
import { Conversion } from "./libresvip_tauri_pb.js";

const transport = createConnectTransport({
  useBinaryFormat: true,
  baseUrl: "http://127.0.0.1:1229",
});

export const client = createClient(Conversion, transport);