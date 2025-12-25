import { Platform } from 'react-native';
// 直接使用require并忽略类型检查
// @ts-ignore
const TcpSocket = require('react-native-tcp-socket');
import NetInfo from '@react-native-community/netinfo';
import Logger from '../utils/Logger';

const logger = Logger.withTag('TCPHttpServer');
const PORT = 12346;

// 类型定义
type HttpRequest = {
  method: string;
  url: string;
  headers: Record<string, string>;
  body: string;
};

type HttpResponse = {
  statusCode: number;
  headers?: Record<string, string>;
  body?: string;
};

type RequestHandler = (request: HttpRequest) => HttpResponse | Promise<HttpResponse>;

class TCPHttpServer {
  private server: any | null = null;
  private isRunning = false;
  private requestHandler: RequestHandler | null = null;

  constructor() {
    this.server = null;
  }

  private parseHttpRequest(data: string): HttpRequest | null {
    try {
      const lines = data.split('\r\n');
      const requestLine = lines[0].split(' ');
      
      if (requestLine.length < 3) {
        return null;
      }

      const method = requestLine[0];
      const url = requestLine[1];
      const headers: Record<string, string> = {};
      
      let bodyStartIndex = -1;
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i];
        if (line === '') {
          bodyStartIndex = i + 1;
          break;
        }
        const colonIndex = line.indexOf(':');
        if (colonIndex > 0) {
          const key = line.substring(0, colonIndex).trim().toLowerCase();
          const value = line.substring(colonIndex + 1).trim();
          headers[key] = value;
        }
      }

      const body = bodyStartIndex > 0 ? lines.slice(bodyStartIndex).join('\r\n') : '';

      return { method, url, headers, body };
    } catch (error) {
      logger.info('[TCPHttpServer] Error parsing HTTP request:', error);
      return null;
    }
  }

  private formatHttpResponse(response: HttpResponse): string {
    const statusTexts: Record<number, string> = {
      200: 'OK',
      400: 'Bad Request',
      404: 'Not Found',
      500: 'Internal Server Error'
    };

    const statusText = statusTexts[response.statusCode] || 'Unknown';
    const headers = {
      'Content-Length': new TextEncoder().encode(response.body || '').length.toString(),
      'Connection': 'close',
      ...response.headers
    };

    let httpResponse = `HTTP/1.1 ${response.statusCode} ${statusText}\r\n`;
    
    for (const [key, value] of Object.entries(headers)) {
      httpResponse += `${key}: ${value}\r\n`;
    }
    
    httpResponse += '\r\n';
    httpResponse += response.body || '';

    return httpResponse;
  }

  private handleConnection(socket: any) {
    logger.debug('[TCPHttpServer] Client connected');
    
    let requestData = '';
    
    socket.on('data', async (data: any) => {
      requestData += data.toString();
      
      // Check if we have a complete HTTP request
      if (requestData.includes('\r\n\r\n')) {
        try {
          const request = this.parseHttpRequest(requestData);
          if (request && this.requestHandler) {
            const response = await this.requestHandler(request);
            const httpResponse = this.formatHttpResponse(response);
            socket.write(httpResponse);
          } else {
            // Send 400 Bad Request for malformed requests
            const errorResponse = this.formatHttpResponse({
              statusCode: 400,
              headers: { 'Content-Type': 'text/plain' },
              body: 'Bad Request'
            });
            socket.write(errorResponse);
          }
        } catch (error) {
          logger.info('[TCPHttpServer] Error handling request:', error);
          const errorResponse = this.formatHttpResponse({
            statusCode: 500,
            headers: { 'Content-Type': 'text/plain' },
            body: 'Internal Server Error'
          });
          socket.write(errorResponse);
        }
        
        socket.end();
        requestData = '';
      }
    });

    socket.on('error', (error: Error) => {
      logger.info('[TCPHttpServer] Socket error:', error);
    });

    socket.on('close', () => {
      logger.debug('[TCPHttpServer] Client disconnected');
    });
  }

  public setRequestHandler(handler: RequestHandler) {
    this.requestHandler = handler;
  }

  public async start(): Promise<string> {
    // 确保之前的服务器实例已关闭
    if (this.server && !this.isRunning) {
      try {
        this.server.close();
        logger.debug('[TCPHttpServer] Old server instance closed');
      } catch (error) {
        logger.info('[TCPHttpServer] Error closing old server:', error);
      }
      this.server = null;
    }
    
    const netState = await NetInfo.fetch();
    let ipAddress: string | null = null;
    
    // 尝试从多种网络类型获取IP地址
    if (netState.isConnected && netState.details) {
      ipAddress = (netState.details as any)?.ipAddress ?? null;
    }

    if (!ipAddress) {
      // 如果无法获取IP地址，使用默认的localhost地址
      logger.warn('[TCPHttpServer] 无法获取设备IP地址，使用localhost作为替代');
      ipAddress = '127.0.0.1';
    }

    if (this.isRunning) {
      logger.debug('[TCPHttpServer] Server is already running.');
      return `http://${ipAddress}:${PORT}`;
    }

    // Web平台不支持TCP服务器
    if (Platform.OS === 'web') {
      logger.error('[TCPHttpServer] TCP server not supported on web platform');
      throw new Error('Web平台不支持TCP服务器');
    }

    return new Promise((resolve, reject) => {
      try {
        // 检查TcpSocket是否可用
        if (!TcpSocket || typeof TcpSocket.createServer !== 'function') {
          logger.error('[TCPHttpServer] TcpSocket is not available or properly initialized');
          reject(new Error('TCP服务器初始化失败'));
          return;
        }
        
        // 确保在创建新服务器前，server为null
        if (this.server) {
          try {
            this.server.close();
          } catch (error) {
            logger.info('[TCPHttpServer] Error closing previous server:', error);
          }
          this.server = null;
        }
        
        // 创建服务器实例
        try {
          this.server = TcpSocket.createServer((socket: any) => {
            this.handleConnection(socket);
          });
        } catch (createError) {
          logger.error('[TCPHttpServer] Failed to create server instance:', createError);
          reject(new Error('服务器实例创建失败'));
          return;
        }

        // 确保server不为null再调用listen
        if (!this.server) {
          logger.error('[TCPHttpServer] Server instance is null');
          reject(new Error('服务器实例创建失败'));
          return;
        }
        
        // 添加错误处理，确保listen方法存在并且是函数
        if (!this.server.listen || typeof this.server.listen !== 'function') {
          logger.error('[TCPHttpServer] Server listen method is not available or not a function');
          // 清理server实例
          this.server = null;
          reject(new Error('服务器监听方法不可用'));
          return;
        }
        
        this.server.listen({ port: PORT, host: '0.0.0.0' }, () => {
          logger.debug(`[TCPHttpServer] Server listening on ${ipAddress}:${PORT}`);
          this.isRunning = true;
          resolve(`http://${ipAddress}:${PORT}`);
        });

        this.server.on('error', (error: Error) => {
          logger.info('[TCPHttpServer] Server error:', error);
          this.isRunning = false;
          // 针对端口占用的错误提供更友好的消息
          if (error.message && error.message.includes('EADDRINUSE')) {
            reject(new Error('端口已被占用，请稍后再试或重启应用。'));
          } else {
            reject(error);
          }
        });

      } catch (error) {
        logger.info('[TCPHttpServer] Failed to start server:', error);
        reject(error);
      }
    });
  }

  public stop() {
    try {
      if (this.server) {
        this.server.close();
        logger.debug('[TCPHttpServer] Server stopped');
      }
    } catch (error) {
      logger.info('[TCPHttpServer] Error stopping server:', error);
    } finally {
      this.isRunning = false;
      this.server = null;
    }
  }

  public getIsRunning(): boolean {
    return this.isRunning;
  }
}

export default TCPHttpServer;