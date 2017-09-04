/**
 * Created by Kalamandea on 04.09.2017.
 */

class Database {
    constructor() {
        this.db = null;
        this.dbVersion = 2;
        this.tagMetaCache = {};
    }

    sanitize() {
        const db = new Dexie('dict_en');
        return db.open().then(() => {
            db.close();
            if (db.verno !== this.dbVersion) {
                return db.delete();
            }
        }).catch(() => {});
    }

    prepare() {
        if (this.db !== null) {
            return Promise.reject('database already initialized');
        }

        return this.sanitize().then(() => {
            this.db = new Dexie('dict_en');
            this.db.version(this.dbVersion).stores({
                terms: '++id,kanji,kana,entry'
            });

            return this.db.open();
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
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }
        const results = [];
        return this.db.terms.where('kanji').equals(term).or('kana').equals(term).each(row => {
            results.push({
                kanji: row.kanji,
                kana: row.kana,
                entry: row.entry
            });
        });
    }

    importDictionary(archive, callback) {
        if (this.db === null) {
            return Promise.reject('database not initialized');
        }

        let summary = null;
        const indexLoaded = (title, version, revision, tagMeta, hasTerms, hasKanji) => {
            summary = {title, version, revision, hasTerms, hasKanji};
            return this.db.dictionaries.where('title').equals(title).count().then(count => {
                if (count > 0) {
                    return Promise.reject(`dictionary "${title}" is already imported`);
                }

                return this.db.dictionaries.add({title, version, revision, hasTerms, hasKanji}).then(() => {
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

                    return this.db.tagMeta.bulkAdd(rows);
                });
            });
        };

        const termsLoaded = (title, entries, total, current) => {
            const rows = [];
            for (const line of entries) {
                let arr = line.split('|');
                rows.push({
                    kanji:arr[0],
                    kana:arr[1],
                    entry:arr[2]
                });
            }

            return this.db.terms.bulkAdd(rows).then(() => {
                if (callback) {
                    callback(total, current);
                }
            });
        };
/*
        const termsLoaded = (title, entries, total, current) => {
            const rows = [];
            for (const [expression, reading, tags, rules, score, ...glossary] of entries) {
                rows.push({
                    expression,
                    reading,
                    tags,
                    rules,
                    score,
                    glossary,
                    dictionary: title
                });
            }

            return this.db.terms.bulkAdd(rows).then(() => {
                if (callback) {
                    callback(total, current);
                }
            });
        };
*/
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

            return this.db.kanji.bulkAdd(rows).then(() => {
                if (callback) {
                    callback(total, current);
                }
            });
        };

        return zipLoadDb(archive, indexLoaded, termsLoaded, kanjiLoaded).then(() => summary);
    }
}