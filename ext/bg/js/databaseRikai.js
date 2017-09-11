/**
 * Created by Kalamandea on 04.09.2017.
 */

class DatabaseRikaichan {
    constructor() {
        this.dictionaries = {};
        this.dbVersion = 2;
        this.tagMetaCache = {};
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

    prepare(title) {
        /*if (this.db !== null) {
            return Promise.reject('database already initialized');
        }*/
		if(!title){
			title = 'eng'
		}
        this.dictionaries[title] = {}

        return this.sanitize(title).then(() => {
            this.dictionaries[title].db = new Dexie(title);
            this.dictionaries[title].db.version(this.dbVersion).stores({
                terms: '++id,kanji,kana,entry'
            });

            return this.dictionaries[title].db.open();
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

    findTerms(term, dictionaries) {
        /*if (this.db[dictionaries] == null) {
            return Promise.reject('database not initialized');
        }*/
        const results = [];
        return this.db[dictionaries].terms.where('kanji').equals(term).or('kana').equals(term).each(row => {
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
        const indexLoaded = (title, version, revision, tagMeta, hasTerms, hasKanji) => {
            summary = {title, version, revision, hasTerms, hasKanji};
            return this.db[title].dictionaries.where('title').equals(title).count().then(count => {
                if (count > 0) {
                    return Promise.reject(`dictionary "${title}" is already imported`);
                }

                return this.db[title].dictionaries.add({title, version, revision, hasTerms, hasKanji}).then(() => {
                    const rows = [];
                    for (const tag in tagMeta || {}) {
                        const meta = tagMeta[tag];
                        const row = dictTagSanitize({
                            name: tag,
                            category: meta.category,
                            notes: meta.notes,
                            order: meta.order,
                            dictionary: title
                        });

                        rows.push(row);
                    }
                    return self.db[title].tagMeta.bulkAdd(rows);
                });
            });
        };

        const termsLoaded = (index, entries, total, current) => {
            const rows = [];
            for (const line of entries) {
                let arr = line.split('|');
                rows.push({
                    kanji:arr[0],
                    kana:arr[1],
                    entry:arr[2]
                });
            }
			if(self.dictionaries[index.title] == null){
                self.dictionaries[index.title] = index;
				self.prepare(index.title);
			}
            //TODO replace on then
            setTimeout(1, 2000);
            return self.dictionaries[index.title].db.terms.bulkAdd(rows).then(() => {
                if (callback) {
                    callback(total, current);
                }
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

        return zipLoadDb(archive, indexLoaded, termsLoaded, kanjiLoaded).then(() => summary);
    }
}