import * as electron from 'electron';
import * as path from 'path';

(global as any).shared = {
    argv: process.argv.slice(electron.app.isPackaged ? 1 : 2),
    cwd: process.env.PORTABLE_EXECUTABLE_DIR || process.cwd(),
};

let window: electron.BrowserWindow | undefined;
function initialize() {
    if (!window) {
        window = new electron.BrowserWindow({
            icon: path.resolve(__dirname, '../ux/icon.png'),
            title: 'RDF Visualizer',
        });
        window.setMenu(null);
        window.loadFile(path.resolve(__dirname, '../ux/index.htm'));
        window.on('closed', () => (window = undefined));
    }
}

electron.app.on('ready', initialize);
electron.app.on('activate', initialize);
electron.app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        electron.app.quit();
    }
});
