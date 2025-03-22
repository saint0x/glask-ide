export interface Tool {
  name: string;
  description: string;
  execute: (params: Record<string, any>) => Promise<any>;
}

export interface ToolManager {
  registerTool: (tool: Tool) => void;
  unregisterTool: (name: string) => void;
  getTool: (name: string) => Tool | undefined;
  executeToolByName: (name: string, params: Record<string, any>) => Promise<any>;
}

export class DefaultToolManager implements ToolManager {
  private tools: Map<string, Tool>;

  constructor() {
    this.tools = new Map();
  }

  registerTool(tool: Tool): void {
    this.tools.set(tool.name, tool);
  }

  unregisterTool(name: string): void {
    this.tools.delete(name);
  }

  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  async executeToolByName(name: string, params: Record<string, any>): Promise<any> {
    const tool = this.getTool(name);
    if (!tool) {
      throw new Error(`Tool '${name}' not found`);
    }
    return await tool.execute(params);
  }

  async executeCommand(command: string): Promise<string> {
    // For now, just echo back the command
    return `Received command: ${command}`;
  }
} 