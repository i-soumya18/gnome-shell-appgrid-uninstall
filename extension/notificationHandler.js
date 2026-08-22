import * as Config from 'resource:///org/gnome/shell/misc/config.js';
import * as Main from 'resource:///org/gnome/shell/ui/main.js';
import * as MessageTray from 'resource:///org/gnome/shell/ui/messageTray.js';

export class NotificationHandler {
  constructor(extension) {
    this._extension = extension;
    this._source = null;
    this._currentNotification = null;
    this._gnomeVersion = parseInt(Config.PACKAGE_VERSION.split('.')[0], 10);
  }

  _getSource() {
    if (this._source)
      return this._source;

    const title = this._t('App Uninstaller');
    const iconName = 'application-x-addon-symbolic';

    if (this._gnomeVersion >= 45) {
      this._source = new MessageTray.Source({
        title,
        iconName,
      });
    } else {
      this._source = new MessageTray.Source(title, iconName);
    }

    this._source.connect('destroy', () => {
      this._source = null;
    });

    Main.messageTray.add(this._source);
    return this._source;
  }

  showProgress(message) {
    this._dismiss();
    const source = this._getSource();

    this._currentNotification = this._createNotification(
      source,
      message,
      this._t('Please wait…'),
      {
        isTransient: false,
        urgency: MessageTray.Urgency.NORMAL,
      }
    );
    source.addNotification(this._currentNotification);
  }

  showSuccess(message) {
    this._dismiss();
    const source = this._getSource();

    const notification = this._createNotification(
      source,
      this._t('Uninstall Complete'),
      message,
      {
        isTransient: true,
        urgency: MessageTray.Urgency.NORMAL,
      }
    );
    source.addNotification(notification);
  }

  showError(title, detail = '') {
    this._dismiss();
    const source = this._getSource();

    const notification = this._createNotification(
      source,
      title,
      detail,
      {
        isTransient: false,
        urgency: MessageTray.Urgency.HIGH,
      }
    );
    source.addNotification(notification);
  }

  _createNotification(source, title, body, {isTransient, urgency}) {
    if (this._gnomeVersion >= 45) {
      return new MessageTray.Notification({
        source,
        title,
        body,
        isTransient,
        urgency,
      });
    }

    const notification = new MessageTray.Notification(source, title, body);
    notification.setTransient(isTransient);
    notification.setUrgency(urgency);
    return notification;
  }

  _dismiss() {
    if (!this._currentNotification)
      return;

    this._currentNotification.destroy();
    this._currentNotification = null;
  }

  destroy() {
    this._dismiss();
    if (!this._source)
      return;

    this._source.destroy();
    this._source = null;
  }

  _t(text) {
    if (typeof this._extension?.gettext === 'function')
      return this._extension.gettext(text);
    return text;
  }
}
