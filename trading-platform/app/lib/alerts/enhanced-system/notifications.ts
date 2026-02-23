import { EventEmitter } from 'events';
import type { AlertTrigger } from '../AlertSystem';
import type { AlertAction } from './types';

export function executeActions(
  emitter: EventEmitter,
  actions: AlertAction[],
  trigger: AlertTrigger
): void {
  for (const action of actions) {
    switch (action.type) {
      case 'notification':
        emitter.emit('ui_notification', trigger);
        break;
      case 'webhook':
        emitter.emit('webhook_notification', action.config, trigger);
        break;
      case 'email':
        emitter.emit('email_notification', action.config, trigger);
        break;
      case 'sms':
        emitter.emit('sms_notification', action.config, trigger);
        break;
      case 'auto_trade':
        emitter.emit('auto_trade_signal', action.config, trigger);
        break;
      default:
        emitter.emit('custom_action', action, trigger);
    }
  }
}
