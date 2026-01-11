import { BrowserWindow } from 'electron';
import log from 'electron-log';

const logger = log.scope('WindowService');

export const windowService = {
    /**
     * Broadcasts an event to all active renderer windows.
     * Handles checks for destroyed windows.
     */
    broadcast: (channel: string, ...args: unknown[]) => {
        const windows = BrowserWindow.getAllWindows();
        let count = 0;
        windows.forEach(w => {
            if (!w.isDestroyed() && w.webContents) {
                w.webContents.send(channel, ...args);
                count++;
            }
        });
        // logger.debug(`Broadcasted '${channel}' to ${count} windows`);
    }
};
