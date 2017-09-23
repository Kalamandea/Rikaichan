/**
 * Created by Kalamandea on 04.09.2017.
 */

class DatabaseRikaichan {
    constructor() {
        this.dictionaries = {};
        this.dbVersion = 2;
        this.tagMetaCache = {};
        this.findWord = this.findWord.bind(this);
        this.importDictionary = this.importDictionary.bind(this);
    }

    sanitize(title) {
		if(!title){
			title = 'eng'
		}
        const db = new Dexie(title);
        return db.open().then(() => {
            db.close();
            if (db.verno !== this.dbVersion) {
                return db.delete();
            }
        }).catch(() => {});
    }

    prepare(index) {
        if (index.title == null) {
            return Promise.reject('Unknown title');
        }
        this.dictionaries[index.title] = index;
		/*if(!title){
			title = 'eng'
		}*/
        this.dictionaries[index.title] = index;

        return this.sanitize(index.title).then(() => {
            this.dictionaries[index.title].db = new Dexie(index.title);
            this.dictionaries[index.title].db.version(this.dbVersion).stores({
                terms: '++id,kanji,kana,entry'
            });

            return this.dictionaries[index.title].db.open();
        });
    }

    purge() {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        this.db.close();
        return this.db.delete().then(() => {
            this.db = null;
            this.tagMetaCache = {};
            return this.prepare();
        });
    }

    findWord(term, dic) {
        if (this.dictionaries[dic] == null) {
            return Promise.reject('database not initialized');
        }
        const results = [];
        return this.dictionaries[dic].db.terms.where('kanji').equals(term).or('kana').equals(term).each(row => {
            results.push({
                kanji: row.kanji,
                kana: row.kana,
                entry: row.entry
            })
        }).then(() => {
            return results;
        });
    }

    importDictionary(archive, callback) {
        /*if (this.db === null) {
            return Promise.reject('database not initialized');
        }*/
        let self = this;
        let summary = null;
        const termsLoaded = (index, entries, total, current) => {
            const rows = [];
            let ch = 0;
            for (const line of entries) {
                ch++;
                rows.push({
                    kanji:line[0],
                    kana:line[1],
                    entry:line[2]
                });
                if (callback) {
                    callback(entries.length, ch);
                }
            }
            summary = index;
            return self.prepare(index).then(()=> {
                self.dictionaries[index.title].db.terms.bulkAdd(rows);
            });
        };

        const kanjiLoaded = (title, entries, total, current)  => {
            const rows = [];
            for (const [character, onyomi, kunyomi, tags, ...meanings] of entries) {
                rows.push({
                    character,
                    onyomi,
                    kunyomi,
                    tags,
                    meanings,
                    dictionary: title
                });
            }

            return this.db[title].kanji.bulkAdd(rows).then(() => {
                if (callback) {
                    callback(total, current);
                }
            });
        };

        return zipLoadDb(archive, termsLoaded, kanjiLoaded).then(() => summary);
    }
}