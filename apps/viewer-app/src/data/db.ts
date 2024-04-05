import Database from 'better-sqlite3';
import { ImageWithDefinitions } from '../app/types';

let db: Database;
export const initDb = (appDataPath: string) => {
  db = new Database(`${appDataPath}/image-viewer/imageViewer.db`, {
    verbose: console.log,
  });

  let createTable = `
CREATE TABLE IF NOT EXISTS scans (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    directory TEXT NOT NULL
)`;
  db.exec(createTable);

  createTable = `
CREATE TABLE IF NOT EXISTS files (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    scan_id INTEGER NOT NULL,
    path TEXT NOT NULL,
    width INTEGER,
    height INTEGER,
    preview_path TEXT,
    is_favorite INTEGER DEFAULT 0,
    nudenet TEXT,
    FOREIGN KEY (scan_id) REFERENCES scans(id)
)`;
  db.exec(createTable);
  return true;
};

export const insertScans = (directories: string[]) => {
  if (directories.length === 0) {
    return null;
  }
  const insert = db.prepare('INSERT INTO scans (directory) VALUES (?)');
  const insertMany = db.transaction((dirs) => {
    for (const dir of dirs) insert.run(dir);
  });

  insertMany(directories);
  const lastInsertedId = db.prepare('SELECT last_insert_rowid()').get()[
    'last_insert_rowid()'
  ];
  return lastInsertedId;
};

export const getScanByDirectory = (directory: string) => {
  const stmt = db.prepare('SELECT * FROM scans WHERE directory = ?');
  return stmt.get(directory);
};

export const getScans = () => {
  const stmt = db.prepare('SELECT * FROM scans');
  return stmt.all();
};

export const deleteScan = (id: number) => {
  deleteFiles(id);
  const stmt = db.prepare('DELETE FROM scans WHERE id = ?');
  stmt.run(id);
  return true;
};

export const insertFiles = (scanId: number, files: ImageWithDefinitions[]) => {
  if (files.length === 0) {
    return null;
  }
  // Query the database for existing files
  const existingFiles = getFiles(scanId);

  // Create a Set of existing paths for faster lookup
  const existingPathSet = new Set(existingFiles.map((item) => item.src));

  // Filter out files that already exist in the database
  const newFiles = files.filter((file) => !existingPathSet.has(file.src));

  const insert = db.prepare(
    'INSERT INTO files (scan_id, path, width, height, preview_path, nudenet) VALUES (@scanId, @path, @width, @height, @previewPath, @nudenet)'
  );
  const insertMany = db.transaction((files) => {
    for (const file of files) {
      const fileData = {
        scanId,
        path: file.src,
        width: file.size.width,
        height: file.size.height,
        previewPath: file.resizedDataUrl,
        nudenet: JSON.stringify(file.nudenet),
      };
      insert.run(fileData);
    }
  });

  insertMany(newFiles);
  const lastInsertedId = db.prepare('SELECT last_insert_rowid()').get()[
    'last_insert_rowid()'
  ];
  return lastInsertedId;
};

export const getFiles = (scanId: number) => {
  if (scanId === null) {
    return [];
  }
  const stmt = db.prepare('SELECT * FROM files WHERE scan_id = ?');
  const result = stmt.all(scanId);
  return result.map((raw) => {
    const file: ImageWithDefinitions = {
      id: raw.id,
      src: raw.path,
      size: { width: raw.width, height: raw.height },
      resizedDataUrl: raw.preview_path,
      nudenet: JSON.parse(raw.nudenet),
      favorite: raw.is_favorite === 1 ? true : false,
    };

    return file;
  });
};

export const getFile = (id: number) => {
  const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
  return stmt.get(id);
};

export const updateFileFavorite = (id: number, favorite: boolean) => {
  const stmt = db.prepare('UPDATE files SET is_favorite = ? WHERE id = ?');
  stmt.run(favorite ? 1 : 0, id);
  return true;
};

export const updateFileNudenet = (id: number, nudenet: string) => {
  const stmt = db.prepare('UPDATE files SET nudenet = ? WHERE id = ?');
  stmt.run(nudenet, id);
  return true;
};

export const updateFiles = (files: ImageWithDefinitions[]) => {
  const update = db.prepare(
    'UPDATE files SET width = ?, height = ?, preview_path = ?, nudenet = ? WHERE path = ?'
  );
  const updateMany = db.transaction((files) => {
    for (const file of files) {
      const fileData = {
        path: file.src,
        width: file.size.width,
        height: file.size.height,
        preview_path: file.resizedDataUrl,
        nudenet: JSON.stringify(file.nudenet),
      };
      update.run(
        fileData.width,
        fileData.height,
        fileData.preview_path,
        fileData.nudenet,
        fileData.path
      );
    }
  });

  updateMany(files);
  return true;
};

export const deleteFile = (id: number) => {
  const stmt = db.prepare('DELETE FROM files WHERE id = ?');
  stmt.run(id);
  return true;
};

export const deleteFiles = (scanId: number) => {
  const stmt = db.prepare('DELETE FROM files WHERE scan_id = ?');
  stmt.run(scanId);
  return true;
};
