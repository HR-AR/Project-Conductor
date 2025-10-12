/**
 * Widget Registry Service - Manages widget rendering and registration
 * Replaces {{widget}} placeholders with live interactive HTML components
 */

import { Widget } from '../models/narrative.model';
import logger from '../utils/logger';

export interface RenderContext {
  narrativeId?: number;
  projectId?: number;
  userId?: number;
  timestamp?: Date;
}

export interface WidgetRenderer {
  /**
   * Render widget to HTML string
   */
  render(params: Record<string, string>, context: RenderContext): Promise<string>;

  /**
   * Validate widget parameters
   */
  validate(params: Record<string, string>): boolean;
}

export interface RenderedWidget {
  widgetId: string;
  type: string;
  html: string;
  originalRaw: string;
}

export class WidgetRegistryService {
  private widgets: Map<string, WidgetRenderer>;
  private widgetIdCounter: number;

  constructor() {
    this.widgets = new Map();
    this.widgetIdCounter = 0;
  }

  /**
   * Register a widget renderer
   */
  register(type: string, renderer: WidgetRenderer): void {
    if (this.widgets.has(type)) {
      logger.warn({ type }, 'Widget type already registered, overwriting');
    }

    this.widgets.set(type, renderer);
    logger.info({ type }, 'Widget renderer registered');
  }

  /**
   * Render a single widget tag to HTML
   */
  async render(widget: Widget, context: RenderContext): Promise<RenderedWidget> {
    const renderer = this.widgets.get(widget.type);

    if (!renderer) {
      logger.warn({ type: widget.type }, 'Widget renderer not found');
      return this.renderErrorWidget(widget, `Unknown widget type: ${widget.type}`);
    }

    // Validate parameters
    if (!renderer.validate(widget.params)) {
      logger.warn({ type: widget.type, params: widget.params }, 'Widget validation failed');
      return this.renderErrorWidget(widget, 'Invalid widget parameters');
    }

    try {
      const html = await renderer.render(widget.params, context);
      const widgetId = this.generateWidgetId(widget.type);

      // Wrap in container with data attributes for real-time updates
      const wrappedHtml = `
        <div class="widget widget-${widget.type}"
             data-widget-id="${widgetId}"
             data-widget-type="${widget.type}"
             data-widget-params='${JSON.stringify(widget.params)}'>
          ${html}
        </div>
      `;

      return {
        widgetId,
        type: widget.type,
        html: wrappedHtml,
        originalRaw: widget.raw
      };
    } catch (error) {
      logger.error({ error, type: widget.type }, 'Widget rendering failed');
      return this.renderErrorWidget(widget, 'Widget rendering failed');
    }
  }

  /**
   * Render all widgets in content
   */
  async renderAll(content: string, widgets: Widget[], context: RenderContext): Promise<string> {
    let renderedContent = content;
    const renderedWidgets: RenderedWidget[] = [];

    // Render all widgets
    for (const widget of widgets) {
      const rendered = await this.render(widget, context);
      renderedWidgets.push(rendered);
    }

    // Replace widget tags with rendered HTML (in reverse order to preserve positions)
    for (let i = renderedWidgets.length - 1; i >= 0; i--) {
      const widget = widgets[i];
      const rendered = renderedWidgets[i];

      // Replace the original {{widget ...}} tag with rendered HTML
      renderedContent =
        renderedContent.substring(0, widget.position) +
        rendered.html +
        renderedContent.substring(widget.position + widget.raw.length);
    }

    return renderedContent;
  }

  /**
   * Get list of registered widget types
   */
  getRegisteredTypes(): string[] {
    return Array.from(this.widgets.keys());
  }

  /**
   * Check if widget type is registered
   */
  hasWidget(type: string): boolean {
    return this.widgets.has(type);
  }

  /**
   * Generate unique widget ID
   */
  private generateWidgetId(type: string): string {
    this.widgetIdCounter++;
    return `widget-${type}-${this.widgetIdCounter}-${Date.now()}`;
  }

  /**
   * Render error widget fallback
   */
  private renderErrorWidget(widget: Widget, errorMessage: string): RenderedWidget {
    const widgetId = this.generateWidgetId('error');
    const html = `
      <div class="widget widget-error"
           data-widget-id="${widgetId}"
           data-widget-type="error">
        <div class="widget-error-content">
          <span class="widget-error-icon">⚠️</span>
          <span class="widget-error-message">${errorMessage}</span>
        </div>
      </div>
    `;

    return {
      widgetId,
      type: 'error',
      html,
      originalRaw: widget.raw
    };
  }
}

export default new WidgetRegistryService();
