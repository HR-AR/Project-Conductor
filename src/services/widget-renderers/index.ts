/**
 * Widget Renderers Index - Initialize and register all widget types
 */

import widgetRegistry from '../widget-registry.service';
import widgetDataProvider from '../widget-data-provider.service';
import { ProjectStatusWidget } from './project-status.widget';
import { BlockerAlertWidget } from './blocker-alert.widget';
import { ApprovalStatusWidget } from './approval-status.widget';
import logger from '../../utils/logger';

/**
 * Initialize all widget renderers
 */
export function initializeWidgets(): void {
  // Create widget instances with data provider
  const projectStatusWidget = new ProjectStatusWidget(widgetDataProvider);
  const blockerAlertWidget = new BlockerAlertWidget(widgetDataProvider);
  const approvalStatusWidget = new ApprovalStatusWidget(widgetDataProvider);

  // Register widgets with registry
  widgetRegistry.register('project-status', projectStatusWidget);
  widgetRegistry.register('blocker-alert', blockerAlertWidget);
  widgetRegistry.register('approval-status', approvalStatusWidget);

  logger.info({
    registeredWidgets: widgetRegistry.getRegisteredTypes()
  }, 'Widget renderers initialized');
}

export {
  ProjectStatusWidget,
  BlockerAlertWidget,
  ApprovalStatusWidget
};
