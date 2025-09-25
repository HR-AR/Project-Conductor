/**
 * Service Factory - Provides centralized access to WebSocket-enabled services
 */

import { RequirementsService } from './requirements.service';
import { LinksService } from './links.service';
import { CommentsService } from './comments.service';
import WebSocketService from './websocket.service';

export class ServiceFactory {
  private static requirementsServiceInstance?: RequirementsService;
  private static linksServiceInstance?: LinksService;
  private static commentsServiceInstance?: CommentsService;
  private static webSocketServiceInstance?: WebSocketService;

  /**
   * Initialize the factory with the WebSocket service
   */
  static initialize(webSocketService: WebSocketService): void {
    ServiceFactory.webSocketServiceInstance = webSocketService;
    ServiceFactory.requirementsServiceInstance = new RequirementsService(webSocketService);
    ServiceFactory.linksServiceInstance = new LinksService(webSocketService);
    ServiceFactory.commentsServiceInstance = new CommentsService(webSocketService);
  }

  /**
   * Get the Requirements service instance with WebSocket support
   */
  static getRequirementsService(): RequirementsService {
    if (!ServiceFactory.requirementsServiceInstance) {
      throw new Error('ServiceFactory not initialized. Call ServiceFactory.initialize() first.');
    }
    return ServiceFactory.requirementsServiceInstance;
  }

  /**
   * Get the Links service instance with WebSocket support
   */
  static getLinksService(): LinksService {
    if (!ServiceFactory.linksServiceInstance) {
      throw new Error('ServiceFactory not initialized. Call ServiceFactory.initialize() first.');
    }
    return ServiceFactory.linksServiceInstance;
  }

  /**
   * Get the Comments service instance with WebSocket support
   */
  static getCommentsService(): CommentsService {
    if (!ServiceFactory.commentsServiceInstance) {
      throw new Error('ServiceFactory not initialized. Call ServiceFactory.initialize() first.');
    }
    return ServiceFactory.commentsServiceInstance;
  }

  /**
   * Get the WebSocket service instance
   */
  static getWebSocketService(): WebSocketService {
    if (!ServiceFactory.webSocketServiceInstance) {
      throw new Error('ServiceFactory not initialized. Call ServiceFactory.initialize() first.');
    }
    return ServiceFactory.webSocketServiceInstance;
  }

  /**
   * Check if the factory has been initialized
   */
  static isInitialized(): boolean {
    return (
      ServiceFactory.webSocketServiceInstance !== undefined &&
      ServiceFactory.requirementsServiceInstance !== undefined &&
      ServiceFactory.linksServiceInstance !== undefined &&
      ServiceFactory.commentsServiceInstance !== undefined
    );
  }
}

export default ServiceFactory;