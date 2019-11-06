"use strict";
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
    result["default"] = mod;
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
/**
 * @author Harish Kumar Gangula <harishg@ilimi.in>
 */
const fse = __importStar(require("fs-extra"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const decompress_zip_1 = __importDefault(require("decompress-zip"));
const chokidar = __importStar(require("chokidar"));
const archiver = require("archiver");
/**
 * This SDK provides methods to handle file deleting , folder creation and deletion prefixed with pluginId
 *
 */
class FileSDK {
    constructor(pluginId) {
        this.pluginId = pluginId;
        let fileBasePath = process.env.FILES_PATH || path.join(__dirname, "..", "..", "..", "..");
        this.prefixPath = path.join(fileBasePath, this.pluginId);
    }
    /**
     * @param foldersPath
     * This method creates the folders it adds the plugin id as prefix so that conflicts with folder path
     * with other plugins are resolved
     * @returns Promise
     */
    mkdir(foldersPath) {
        return fse.ensureDir(path.join(this.prefixPath, foldersPath));
    }
    /**
     * @param sourcePath
     * @param destPath
     * This method copy data from sourcePath to destPath
     * @returns Promise
     */
    copy(sourcePath, destPath) {
        let isAbsoluteSourcePath = path.isAbsolute(sourcePath);
        if (!isAbsoluteSourcePath) {
            sourcePath = this.getAbsPath(sourcePath);
        }
        let isAbsoluteDestPath = path.isAbsolute(destPath);
        if (!isAbsoluteDestPath) {
            destPath = this.getAbsPath(destPath);
        }
        return fse.copy(sourcePath, destPath);
    }
    move(source, destination) {
        return fse.move(path.join(this.prefixPath, source), path.join(this.prefixPath, destination), { overwrite: true });
    }
    /**
     *
     * @param filePath
     * This method deletes the file it adds the plugin id as prefix so that conflicts with file path
     * with other plugins are resolved it tries to find file from current directory to delete it
     * @returns Promise
     */
    remove(file) {
        return fse.remove(path.join(this.prefixPath, file));
    }
    archiver() {
        return archiver('zip');
    }
    zip(Path, destPath, fileName) {
        return new Promise((resolve, reject) => {
            let output = fs.createWriteStream(path.join(this.prefixPath, destPath, fileName));
            let archive = archiver("zip");
            output.on("finish", () => {
                resolve();
            });
            archive.on("warning", err => {
                if (err.code === "ENOENT") {
                    // log warning
                }
                else {
                    reject(err);
                }
            });
            archive.on("error", err => {
                reject(err);
            });
            archive.pipe(output);
            let file = path.join(this.prefixPath, Path);
            fs.lstat(file, (error, stats) => {
                if (error) {
                    reject(error);
                }
                else {
                    if (stats.isFile()) {
                        let file = path.join(this.prefixPath, Path);
                        archive.append(fs.createReadStream(file), {
                            name: path.basename(Path)
                        });
                    }
                    else {
                        archive.directory(path.join(this.prefixPath, Path), false);
                    }
                    //here we consider that if Path is having extension then append as stream otherwise add the folders to archiver.
                    archive.finalize();
                }
            });
        });
    }
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
    unzip(filePath, destPath, extractToFolder) {
        //This is folder name taken from source filename and contents will be extracted to this folder name
        let destFolderName = path.join(this.prefixPath, destPath);
        let srcFilePath = path.join(this.prefixPath, filePath);
        if (extractToFolder) {
            destFolderName = path.join(destFolderName, path.basename(filePath, path.extname(filePath)));
        }
        return new Promise((resolve, reject) => {
            let unzipper = new decompress_zip_1.default(srcFilePath);
            unzipper.on("error", (err) => {
                reject(err.message);
            });
            unzipper.on("extract", () => {
                resolve(path.join(destFolderName));
            });
            unzipper.extract({
                path: destFolderName
            });
        });
    }
    readJSON(filePath) {
        return fse.readJson(filePath);
    }
    getAbsPath(Path) {
        return path.join(this.prefixPath, Path);
    }
    watch(paths) {
        return chokidar.watch(paths);
    }
}
exports.default = FileSDK;
