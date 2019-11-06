import * as chokidar from "chokidar";
/**
 * This SDK provides methods to handle file deleting , folder creation and deletion prefixed with pluginId
 *
 */
export default class FileSDK {
    private pluginId;
    private prefixPath;
    constructor(pluginId: string);
    /**
     * @param foldersPath
     * This method creates the folders it adds the plugin id as prefix so that conflicts with folder path
     * with other plugins are resolved
     * @returns Promise
     */
    mkdir(foldersPath: string): Promise<void>;
    /**
     * @param sourcePath
     * @param destPath
     * This method copy data from sourcePath to destPath
     * @returns Promise
     */
    copy(sourcePath: string, destPath: string): Promise<void>;
    move(source: string, destination: string): Promise<void>;
    /**
     *
     * @param filePath
     * This method deletes the file it adds the plugin id as prefix so that conflicts with file path
     * with other plugins are resolved it tries to find file from current directory to delete it
     * @returns Promise
     */
    remove(file: string): Promise<void>;
    archiver(): any;
    zip(Path: string, destPath: string, fileName: string): Promise<{}>;
    /**
     * @param filePath
     * @param  destPath
     *  @param extractToFolder // If this flag is true contents will be extracted to folder
     * which is create using source file name,
     * if it is false it is extracted to dest folder with out creating folder with file name
     *
     * This method will unzip the file to dest folder
     * @returns Promise
     */
    unzip(filePath: string, destPath: string, extractToFolder: boolean): Promise<{}>;
    readJSON(filePath: string): Promise<any>;
    getAbsPath(Path: string): string;
    watch(paths: string[]): chokidar.FSWatcher;
}
