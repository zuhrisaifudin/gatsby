const sqlite = require(`better-sqlite3`)
const path = require(`path`)
const Bottleneck = require(`bottleneck`)

// Setup files db
const db = sqlite(path.join(process.cwd(), `data.db`))
db.pragma("journal_mode = MEMORY")
db.pragma("synchronous = OFF")
db.pragma("locking_mode = EXCLUSIVE")
db.pragma("temp_store = MEMORY")
// db.pragma("page_size = 65535");
const tables = db.prepare(`SELECT * FROM sqlite_master`).get()
console.log({ tables })
if (!tables) {
  db.exec(`CREATE TABLE "files" (
"path"	TEXT,
"blob"	BLOB
);`)
  db.exec(`CREATE INDEX "path" ON "files" (
	"path"
);`)
}

console.log(db)
const stmt = db.prepare("INSERT INTO files VALUES (:path, :blob)")
const readstmt = db.prepare(`SELECT * FROM files WHERE path = ?`)

const batchSize = 200
const writeBatcher = new Bottleneck.Batcher({
  maxTime: 1,
  maxSize: batchSize,
})

writeBatcher.on(`batch`, async writes => {
  db.transaction(() =>
    writes.forEach(write =>
      stmt.run({ path: write.filePath, blob: write.blob })
    )
  )()
})

const gatsbyfs = {
  outputFile: function (filePath, blob, options) {
    // Batch writes for speed.
    // There'll be a slight delay this way before things
    // are written so don't call this if you need things persisted
    // immediately.
    if (options.fireAndForget) {
      writeBatcher.add({
        filePath,
        blob,
      })
    } else {
      stmt.run({ path: filePath, blob })
    }
  },
  readFile: function (filePath, cb) {
    return readstmt.get(filePath).blob
  },
}

export default gatsbyfs
