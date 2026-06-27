// MCP Server Transport Wrapper
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import type { JSONRPCMessage } from '@modelcontextprotocol/sdk/types.js';
import type { McpLogger } from './logging.js';

export interface TransportConfig {
  logger?: McpLogger;
}

export class VibemateStdioTransport {
  private transport: StdioServerTransport;
  private logger?: McpLogger;
  public connected = false;
  public closed = false;

  constructor(config: TransportConfig = {}) {
    this.transport = new StdioServerTransport();
    this.logger = config.logger;
  }

  async connect(): Promise<void> {
    // The transport connects when the server connects to it
    this.connected = true;
    this.logger?.info('Stdio transport connected');
  }

  async close(): Promise<void> {
    this.closed = true;
    this.logger?.info('Stdio transport closed');
  }

  getTransport(): StdioServerTransport {
    return this.transport;
  }

  onMessage(handler: (message: JSONRPCMessage) => void): void {
    this.transport.onmessage = handler;
  }

  send(message: JSONRPCMessage): void {
    this.transport.send(message);
  }
}