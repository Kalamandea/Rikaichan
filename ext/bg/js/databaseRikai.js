/**
 * Created by Kalamandea on 04.09.2017.
 */

class DatabaseRikaichan {
    constructor() {
        this.dbList = {};
        this.dbVersion = 2;
        this.findWord = this.findWord.bind(this);
        this.importDictionary = this.importDictionary.bind(this);
    }

    sanitize(name) {
        const db = new Dexie(name);
        return db.open().then(() => {
            db.close();
            if (db.verno !== this.dbVersion) {
                return db.delete();
            }
        }).catch(() => {});
    }

    prepare(name) {
        if (name == null) {
            return Promise.reject('Unknown title');
        }

        return this.sanitize(name).then(() => {
            this.dbList[name] = new Dexie(name);
            this.dbList[name].version(this.dbVersion).stores({
                terms: '++id,kanji,kana,entry'
            });

            return this.dbList[name].open();
        });
    }

    purge(name) {
        if (this.dbList[name] === null) {
            return Promise.reject('database' + name + ' not initialized');
        }

        this.dbList[name].close();
        return this.dbList[name].delete().then(() => {
            this.dbList[name] = null;
            //return this.prepare(name);
        });
    }

    findWord(term, dic) {
        if (this.dbList[dic] == null) {
            return Promise.reject('database not initialized');
        }
        const results = [];
        return this.dbList[dic].terms.where('kanji').equals(term).or('kana').equals(term).each(row => {
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
            summary = Object.assign({},index);
            return self.prepare(index.name).then(()=> {
                return self.dbList[index.name].terms.bulkAdd(rows);
            });
        };

        return zipLoadDb(archive, termsLoaded).then(() => summary);
    }
}