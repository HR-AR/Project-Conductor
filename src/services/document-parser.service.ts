import matter from 'gray-matter';
import { ParsedDocument, Widget, Reference } from '../models/narrative.model';
import widgetRegistry, { RenderContext } from './widget-registry.service';
import logger from '../utils/logger';

// Dynamic import for ESM module
let marked: any;

export class DocumentParserService {
  private markedInitialized = false;

  private async initMarked() {
    if (!this.markedInitialized) {
      const markedModule = await import('marked');
      marked = markedModule.marked;
      this.markedInitialized = true;
    }
  }
  /**
   * Parse Markdown document with YAML frontmatter
   */
  async parseDocument(markdown: string): Promise<ParsedDocument> {
    await this.initMarked();

    // Extract YAML frontmatter
    const { data: metadata, content: rawContent } = matter(markdown);

    // Convert Markdown to HTML
    const htmlContent = marked(rawContent) as string;

    // Extract widgets
    const widgets = this.extractWidgets(rawContent);

    // Extract cross-references
    const references = this.extractReferences(rawContent);

    return {
      metadata,
      rawContent,
      htmlContent,
      widgets,
      references
    };
  }

  /**
   * Parse and render document with widgets replaced by HTML
   */
  async parseAndRenderDocument(markdown: string, context?: RenderContext): Promise<ParsedDocument> {
    // Extract YAML frontmatter
    const { data: metadata, content: rawContent } = matter(markdown);

    // Extract widgets before converting to HTML
    const widgets = this.extractWidgets(rawContent);

    // Extract cross-references
    const references = this.extractReferences(rawContent);

    // Render widgets to HTML
    const renderContext: RenderContext = {
      narrativeId: context?.narrativeId,
      projectId: context?.projectId,
      userId: context?.userId,
      timestamp: context?.timestamp || new Date()
    };

    let contentWithRenderedWidgets = rawContent;

    try {
      // Replace all widget tags with rendered HTML
      contentWithRenderedWidgets = await widgetRegistry.renderAll(
        rawContent,
        widgets,
        renderContext
      );

      logger.info(
        { widgetCount: widgets.length, narrativeId: context?.narrativeId },
        'Rendered widgets in document'
      );
    } catch (error) {
      logger.error({ error, widgetCount: widgets.length }, 'Error rendering widgets');
      // Continue with unrendered widgets on error
    }

    // Convert Markdown to HTML (now with rendered widgets)
    const htmlContent = marked(contentWithRenderedWidgets) as string;

    return {
      metadata,
      rawContent,
      htmlContent,
      widgets,
      references
    };
  }

  /**
   * Extract widget tags like {{widget type="status" project-id="42"}}
   */
  private extractWidgets(content: string): Widget[] {
    const widgets: Widget[] = [];
    const regex = /\{\{widget\s+([^}]+)\}\}/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      const paramsString = match[1];
      const params: Record<string, string> = {};

      // Parse key="value" pairs
      const paramRegex = /(\w+)="([^"]+)"/g;
      let paramMatch;
      while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
        params[paramMatch[1]] = paramMatch[2];
      }

      widgets.push({
        type: params.type || 'unknown',
        params,
        position: match.index,
        raw: match[0]
      });
    }

    return widgets;
  }

  /**
   * Extract cross-references like [[milestone-42]]
   */
  private extractReferences(content: string): Reference[] {
    const references: Reference[] = [];
    const regex = /\[\[(\w+)-(\d+)\]\]/g;
    let match;

    while ((match = regex.exec(content)) !== null) {
      references.push({
        type: match[1] as any,
        id: match[2],
        position: match.index
      });
    }

    return references;
  }
}

export default new DocumentParserService();
