/**
 * Created by Kalamandea on 06.09.2017.
 */

class Translator {
    constructor() {
        if (this.ready) return;
        this.loaded = false;
        this.database = new DatabaseRikaichan();
        this.deinflect = new DeinflectorRikaichan();
        this.wordSearch = this.wordSearch.bind(this);
        this._wordSearch = this._wordSearch.bind(this);
        this.kanjiShown = {};
        this.dicList = [];
        this.kanjiData = null;
        this.options = null;
        this.kanjiPos = 0;
        this.selected = 0;
        this.ready = true;

        // katakana -> hiragana conversion tables
        this.ch = [0x3092,0x3041,0x3043,0x3045,0x3047,0x3049,0x3083,0x3085,0x3087,0x3063,0x30FC,0x3042,0x3044,0x3046,
              0x3048,0x304A,0x304B,0x304D,0x304F,0x3051,0x3053,0x3055,0x3057,0x3059,0x305B,0x305D,0x305F,0x3061,
              0x3064,0x3066,0x3068,0x306A,0x306B,0x306C,0x306D,0x306E,0x306F,0x3072,0x3075,0x3078,0x307B,0x307E,
              0x307F,0x3080,0x3081,0x3082,0x3084,0x3086,0x3088,0x3089,0x308A,0x308B,0x308C,0x308D,0x308F,0x3093];

        this.cv = [0x30F4,0xFF74,0xFF75,0x304C,0x304E,0x3050,0x3052,0x3054,0x3056,0x3058,0x305A,0x305C,0x305E,0x3060,
              0x3062,0x3065,0x3067,0x3069,0xFF85,0xFF86,0xFF87,0xFF88,0xFF89,0x3070,0x3073,0x3076,0x3079,0x307C];

        this.cs = [0x3071,0x3074,0x3077,0x307A,0x307D];


        this.numList = [
            /*
             'C', 	'Classical Radical',
             'DR',	'Father Joseph De Roo Index',
             'DO',	'P.G. O\'Neill Index',
             'O', 	'P.G. O\'Neill Japanese Names Index',
             'Q', 	'Four Corner Code',
             'MN',	'Morohashi Daikanwajiten Index',
             'MP',	'Morohashi Daikanwajiten Volume/Page',
             'K',	'Gakken Kanji Dictionary Index',
             'W',	'Korean Reading',
             */
            'H',	'Halpern',
            'L',	'Heisig',
            'E',	'Henshall',
            'DK',	'Kanji Learners Dictionary',
            'N',	'Nelson',
            'V',	'New Nelson',
            'Y',	'PinYin',
            'P',	'Skip Pattern',
            'IN',	'Tuttle Kanji &amp; Kana',
            'I',	'Tuttle Kanji Dictionary',
            'U',	'Unicode'
        ]
    }

    async prepare() {
        for(const dic of this.options.dictOrder){
            if (dic != "kanji")
                await this.database.prepare(dic);
        }
        const promises = [
            fileLoad(browser.extension.getURL('/bg/lang/kanji.dat')),
            jsonLoad(browser.extension.getURL('/bg/lang/radicals.json'))
        ];
        return Promise.all(promises).then(([kanji, radicals]) => {
            this.kanjiData = kanji;
            this.radData = radicals;
        });
    }

    optionsSet(options) {
        this.options = JSON.parse(JSON.stringify(options));
        this.dicList = options.dictOrder.slice(0);
        this.selected = 0;
        this.kanjiShown =  JSON.parse(JSON.stringify(options.kanjiDictionary));
    }

    done() {
        this.ready = false;
        this.kanjiData = null;
        this.kanjiShown = null;
        this.radData = null;
        this.deinflect.done();
    }

    selectNext() {
        this.selected = (this.selected + this.searchSkipped + 1) % this.dicList.length;
        this.searchSkipped = 0;
    }

    select(n) {
        if (n == -1) n = this.kanjiPos;
        if ((n < 0) || (n >= this.dicList.length)) return;
        this.selected = n;
        this.searchSkipped = 0;
    }


    async _wordSearch(word, dic, max) {
        // half & full-width katakana to hiragana conversion
        // note: katakana vu is never converted to hiragana

        let trueLen = [0];
        let p = 0;
        let r = '';
        for (let i = 0; i < word.length; ++i) {
            let u = word.charCodeAt(i);
            let v = u;

            if (u <= 0x3000) break;

            // full-width katakana to hiragana
            if ((u >= 0x30A1) && (u <= 0x30F3)) {
                u -= 0x60;
            }
            // half-width katakana to hiragana
            else if ((u >= 0xFF66) && (u <= 0xFF9D)) {
                u = this.ch[u - 0xFF66];
            }
            // voiced (used in half-width katakana) to hiragana
            else if (u == 0xFF9E) {
                if ((p >= 0xFF73) && (p <= 0xFF8E)) {
                    r = r.substr(0, r.length - 1);
                    u = this.cv[p - 0xFF73];
                }
            }
            // semi-voiced (used in half-width katakana) to hiragana
            else if (u == 0xFF9F) {
                if ((p >= 0xFF8A) && (p <= 0xFF8E)) {
                    r = r.substr(0, r.length - 1);
                    u = this.cs[p - 0xFF8A];
                }
            }
            // ignore J~
            else if (u == 0xFF5E) {
                p = 0;
                continue;
            }

            r += String.fromCharCode(u);
            trueLen[r.length] = i + 1;	// need to keep real length because of the half-width semi/voiced conversion
            p = v;
        }
        word = r;


        const dictionaries = this.options.dictionaries;
        let result = { data: [] };
        let maxTrim;

        if (dictionaries[dic].isName) {
            maxTrim = this.options.dictOptions.maxName;
            result.names = 1;
        }
        else {
            maxTrim = this.options.dictOptions.maxEntries;
        }


        if (max != null) maxTrim = max;

        let have = [];
        let count = 0;
        let maxLen = 0;

        while (word.length > 0) {
            let showInf = (count != 0);
            let variants = dictionaries[dic].isName ? [{word: word, type: 0xFF, reason: null}] : this.deinflect.go(word);
            for (let i = 0; i < variants.length; i++) {
                let v = variants[i];
                let entries = await this.database.findWord(v.word, dic);
                for (let j = 0; j < entries.length; ++j) {
                    let dentry = entries[j];
                    if (have[dentry.entry]) continue;

                    let ok = true;
                    if ((dictionaries[dic].hasType) && (i > 0)) {
                        // i > 0 a de-inflected word

                        let gloss = dentry.entry.split(/[,()]/);
                        let y = v.type;
                        let z;
                        for (z = gloss.length - 1; z >= 0; --z) {
                            let g = gloss[z];
                            if ((y & 1) && (g == 'v1')) break;
                            if ((y & 4) && (g == 'adj-i')) break;
                            if (y & 66) {
                                if ((g == 'v5k-s') || (g == 'v5u-s')) {
                                    if (y & 64) break;
                                }
                                else if (g.substr(0, 2) == 'v5') {
                                    if (y & 2) break;
                                }
                            }
                            if ((y & 8) && (g == 'vk')) break;
                            if ((y & 16) && (g.substr(0, 3) == 'vs-')) break;
                        }
                        ok = (z != -1);
                    }

                    if ((ok) && (dictionaries[dic].hasType) && (this.options.dictOptions.hidEx)) {
                        if (dentry.entry.match(/\/\([^\)]*\bX\b.*?\)/)) ok = false;
                    }
                    if (ok) {
                        if (count >= maxTrim) {
                            result.more = 1;
                            break;
                        }

                        have[dentry.entry] = 1;
                        ++count;
                        if (maxLen == 0) maxLen = trueLen[word.length];

                        let r = null;
                        if (v.reason) {
                            if (showInf) r = '&lt; ' + v.reason + ' &lt; ' + word;
                            else r = '&lt; ' + v.reason;
                        }
                        result.data.push([dentry, r]);
                    }
                }	// for j < entries.length
                if (count >= maxTrim) break;
            }	// for i < variants.length
            if (count >= maxTrim) break;
            word = word.substr(0, word.length - 1);
        }	// while word.length > 0

        if (result.data.length == 0) return null;

        result.matchLen = maxLen;
        return result;
    }

    async wordSearch(word, noKanji) {
        this.searchSkipped = 0;
        let ds = this.selected;
        const dictionaries = this.options.dictionaries;
        do {
            let dic = this.dicList[ds];
            if ((!noKanji) || (!dictionaries[dic].isKanji)) {
                let e;
                if (dictionaries[dic].isKanji)
                    e = await this.kanjiSearch(word.charAt(0));
                else e = await this._wordSearch(word, dic, null);
                if (e) {
                    if (ds != 0)
                        e.title = dictionaries[dic].name;
                    return e;
                }
            }
            this.searchSkipped++;
            ds = (ds + 1) % this.dicList.length;
        } while (ds != this.selected);
        return null;
    }


    async translate(text) {
        let result = { data: [], textLen: text.length };
        while (text.length > 0) {
            let e = null;
            let ds = this.selected;
            do {
                //TODO list
                if (!this.dicList[ds].isKanji) {
                    e = this._wordSearch(text, this.dicList[ds], 1);
                    if (e != null) break;
                }
                ds = (ds + 1) % this.dicList.length;
            } while (ds != this.selected);

            if (e != null) {
                if (result.data.length >= this.options.dictOptions.maxEntries) {
                    result.more = 1;
                    break;
                }
                result.data.push(e.data[0]);
                text = text.substr(e.matchLen);
            }
            else {
                text = text.substr(1);
            }
        }
        this.searchSkipped = (this.selected == this.kanjiPos) ? 1 : 0;
        if (result.data.length == 0) return null;
        result.textLen -= text.length;
        return result;
    }

    textSearch(text) {
        this.searchSkipped = 0;
        text = text.toLowerCase();
        const dictionaries = this.options.dictionaries;
        let ds = this.selected;
        do {
            let dic = this.dicList[ds];
            if (!dictionaries[dic].isKanji) {
                let result = { data: [], reason: [], kanji: 0, more: 0, names: dictionaries[dic].isName };

                let r = dic.findText(text);

                // try priorizing
                let list = [];
                let sW = /[\sW]/;
                let slashText = '/' + text + '/';
                for (let i = 0; i < r.length; ++i) {
                    let t = r[i].replace(/\(.+?\)/g, '').toLowerCase();

                    // closer to the beginning = better
                    let d = t.indexOf(text);
                    if (d >= 0) {
                        // the exact text within an entry = best
                        if (t.replace(/\s+/g, '').indexOf(slashText) != -1) {
                            d -= 100;
                        }
                        // a word within an entry = better
                        else if (((d == 0) || (sW.test(t.substr(d - 1, 1)))) &&
                            (((d + text.length) >= t.length) || (sW.test(t.substr(d + text.length, 1))))) {
                            d -= 50;
                        }
                    }
                    else d = 9999;
                    list.push({ rank: d, text: r[i] });
                }

                let max = dictionaries[dic].isName ? this.options.dictOptions.maxName : this.options.dictOptions.maxEntries;
                list.sort(function(a, b) { return a.rank - b.rank });
                for (let i = 0; i < list.length; ++i) {
                    if (result.data.length >= max) {
                        result.more = 1;
                        break;
                    }
                    result.data.push([list[i].text, null]);
                }

                if (result.data.length) {
                    if (ds != 0) result.title = dictionaries[dic].name;
                    return result;
                }
            }
            this.searchSkipped++;
            ds = (ds + 1) % this.dicList.length;
        } while (ds != this.selected);
        return null;
    }

    kanjiSearch(kanji) {
        const hex = '0123456789ABCDEF';
        let kde;
        let result;
        let a, b;
        let i;

        i = kanji.charCodeAt(0);
        if (i < 0x3000) return null;

        kde = this.find(this.kanjiData, kanji);
        if (!kde) return null;

        a = kde.split('|');
        if (a.length != 6) return null;

        result = { };
        result.kanji = a[0];

        result.misc = {};
        result.misc['U'] = hex[(i >>> 12) & 15] + hex[(i >>> 8) & 15] + hex[(i >>> 4) & 15] + hex[i & 15];

        b = a[1].split(' ');
        for (i = 0; i < b.length; ++i) {
            if (b[i].match(/^([A-Z]+)(.*)/)) {
                if (!result.misc[RegExp.$1]) result.misc[RegExp.$1] = RegExp.$2;
                else result.misc[RegExp.$1] += ' ' + RegExp.$2;
            }
        }

        result.onkun = a[2].replace(/\s+/g, '\u3001 ');
        result.nanori = a[3].replace(/\s+/g, '\u3001 ');
        result.bushumei = a[4].replace(/\s+/g, '\u3001 ');
        result.eigo = a[5];

        return result;
    }

    lookupSearch(text){
        let r = { };
        let html;
        if ((text.search(/^:/) != -1) || (text.search(/^([^\u3000-\uFFFF]+)$/) != -1)) {
            // ":word"  = force a text search of "word"
            r.entries = this.textSearch(text.replace(/^:/, ''));
        }
        else {
            r.entries = this.wordSearch(text, true);
        }
        if (!r.entries) return null;
        r.html = this.makeHtml(r.entries);

        let kanji = '';
        let have = {};
        let t = text + html;
        r.kanjis = [];
        for (let i = 0; i < t.length; ++i) {
            let c = t.charCodeAt(i);
            if ((c >= 0x3000) && (c <= 0xFFFF)) {
                c = t.charAt(i);
                if (!have[c]) {
                    let e = this.kanjiSearch(c);
                    if (e) {
                        have[c] = true;
                        e.html = this.makeHtml(e);
                        r.kanjis.push(e);
                    }
                }
            }
        }

        return r;
    }

    makeHtml(entry) {
        let e;
        let b;
        let c, s, t;
        let i, j, n;

        if (entry == null) return '';

        b = [];

        if (entry.kanji) {
            let yomi;
            let box;
            let bn;
            let k;
            let nums;

            yomi = entry.onkun.replace(/\.([^\u3001]+)/g, '<span class="k-yomi-hi">$1</span>');
            if (entry.nanori.length) {
                yomi += '<br/><span class="k-yomi-ti">\u540D\u4E57\u308A</span> ' + entry.nanori;
            }
            if (entry.bushumei.length) {
                yomi += '<br/><span class="k-yomi-ti">\u90E8\u9996\u540D</span> ' + entry.bushumei;
            }

            bn = entry.misc['B'] - 1;
            k = entry.misc['G'];
            switch (k) {
                case 8:
                    k = 'general<br/>use';
                    break;
                case 9:
                    k = 'name<br/>use';
                    break;
                default:
                    k = isNaN(k) ? '-' : ('grade<br/>' + k);
                    break;
            }
            box = '<table class="k-abox-tb"><tr>' +
                '<td class="k-abox-r">radical<br/>' + this.radData[bn][0] + ' ' + (bn + 1) + '</td>' +
                '<td class="k-abox-g">' + k + '</td>' +
                '</tr><tr>' +
                '<td class="k-abox-f">freq<br/>' + (entry.misc['F'] ? entry.misc['F'] : '-') + '</td>' +
                '<td class="k-abox-s">strokes<br/>' + entry.misc['S'] + '</td>' +
                '</tr></table>';
            if (this.kanjiShown['COMP']) {
                k = this.radData[bn];
                box += '<table class="k-bbox-tb">' +
                    '<tr><td class="k-bbox-1a">' + k[0] + '</td>' +
                    '<td class="k-bbox-1b">' + k[2] + '</td>' +
                    '<td class="k-bbox-1b">' + k[3] + '</td></tr>';
                j = 1;
                for (i = 0; i < this.radData.length; ++i) {
                    k = this.radData[i];
                    if ((bn != i) && (k.indexOf(entry.kanji) != -1)) {
                        c = ' class="k-bbox-' + (j ^= 1);
                        box += '<tr><td' + c + 'a">' + k[0] + '</td>' +
                            '<td' + c + 'b">' + k[2] + '</td>' +
                            '<td' + c + 'b">' + k[3] + '</td></tr>';
                    }
                }
                box += '</table>';
            }

            nums = '';
            j = 0;

            for (i = 0; i < this.numList.length; i += 2) {
                c = this.numList[i];
                if (this.kanjiShown[c]) {
                    s = entry.misc[c];
                    c = ' class="k-mix-td' + (j ^= 1) + '"';
                    nums += '<tr><td' + c + '>' + this.numList[i + 1] + '</td><td' + c + '>' + (s ? s : '-') + '</td></tr>';
                }
            }
            if (nums.length) nums = '<table class="k-mix-tb">' + nums + '</table>';

            b.push('<table class="k-main-tb"><tr><td valign="top">');
            b.push(box);
            b.push('<span class="k-kanji">' + entry.kanji + '</span><br/>');
            if (!this.options.dictOptions.hideDef) b.push('<div class="k-eigo">' + entry.eigo + '</div>');
            b.push('<div class="k-yomi">' + yomi + '</div>');
            b.push('</td></tr><tr><td>' + nums + '</td></tr></table>');
            return b.join('');
        }

        s = t = '';

        if (entry.names) {
            c = [];

            b.push('<div class="w-title">Names Dictionary</div><table class="w-na-tb"><tr><td>');
            for (i = 0; i < entry.data.length; ++i) {
                e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/([\S\s]+)\//);
                if (!e) continue;

                if (s != e.entry) {
                    c.push(t);
                    t = '';
                }

                if (e.kana) c.push('<span class="w-kanji">' + e.kanji + '</span> &#32; <span class="w-kana">' + e.kana + '</span><br/> ');
                else c.push('<span class="w-kana">' + e.kanji + '</span><br/> ');

                s = e.entry;
                if (this.options.dictOptions.hideDef){
                    t = '';
                }else {
                    t = '<span class="w-def">' + s.replace(/\//g, '; ').replace(/\n/g, '<br/>') + '</span><br/>';
                }
            }
            c.push(t);
            if (c.length > 4) {
                n = (c.length >> 1) + 1;
                b.push(c.slice(0, n + 1).join(''));

                t = c[n];
                c = c.slice(n, c.length);
                for (i = 0; i < c.length; ++i) {
                    if (c[i].indexOf('w-def') != -1) {
                        if (t != c[i]) b.push(c[i]);
                        if (i == 0) c.shift();
                        break;
                    }
                }

                b.push('</td><td>');
                b.push(c.join(''));
            }
            else {
                b.push(c.join(''));
            }
            if (entry.more) b.push('...<br/>');
            b.push('</td></tr></table>');
        }
        else {
            if (entry.title) {
                b.push('<div class="w-title">' + entry.title + '</div>');
            }

            let pK = '';
            let k;

            for (i = 0; i < entry.data.length; ++i) {
                //e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/([\S\s]+)\//);
                e = entry.data[i][0];
                if (!entry) continue;

                /*
                 e[1] = kanji/kana
                 e.kanji = kanji/kana
                 e[2] = kana
                 e.kana = kana
                 e[3] = definition
                 e.entry = definition
                 */
                if (s != e.entry) {
                    b.push(t);
                    pK = k = '';
                }
                else {
                    k = t.length ? '<br/>' : '';
                }

                if (e.kana) {
                    if (pK == e.kanji) k = '\u3001 <span class="w-kana">' + e.kana + '</span>';
                    else k += '<span class="w-kanji">' + e.kanji + '</span> &#32; <span class="w-kana">' + e.kana + '</span>';
                    pK = e.kanji;
                }
                else {
                    k += '<span class="w-kana">' + e.kanji + '</span>';
                    pK = '';
                }
                b.push(k);

                if (entry.data[i][1]) b.push(' <span class="w-conj">(' + entry.data[i][1] + ')</span>');

                s = e.entry;
                if (this.options.dictOptions.hideDef) {
                    t = '<br/>';
                }
                else {
                    t = s.replace(/\//g, '; ');
                    if (!this.options.dictOptions.wpos){
                        t = t.replace(/^\([^)]+\)\s*/, '')
                    }
                    if (!this.options.dictOptions.wpop){
                        t = t.replace('; (P)', '')
                    }
                    t = t.replace(/\n/g, '<br/>');
                    t = '<br/><span class="w-def">' + t + '</span><br/>';
                }
            }
            b.push(t);
            if (entry.more) b.push('...<br/>');
        }

        return b.join('');
    }

    makeText(entry, max) {
        let e;
        let b;
        let i, j;
        let t;

        if (entry == null) return '';

        b = [];

        if (entry.kanji) {
            b.push(entry.kanji + '\n');
            b.push((entry.eigo.length ? entry.eigo : '-') + '\n');

            b.push(entry.onkun.replace(/\.([^\u3001]+)/g, '\uFF08$1\uFF09') + '\n');
            if (entry.nanori.length) {
                b.push('\u540D\u4E57\u308A\t' + entry.nanori + '\n');
            }
            if (entry.bushumei.length) {
                b.push('\u90E8\u9996\u540D\t' + entry.bushumei + '\n');
            }

            for (i = 0; i < this.numList.length; i += 2) {
                e = this.numList[i];
                if (this.kanjiShown[e]) {
                    j = entry.misc[e];
                    b.push(this.numList[i + 1].replace('&amp;', '&') + '\t' + (j ? j : '-') + '\n');
                }
            }
        }
        else {
            if (max > entry.data.length) max = entry.data.length;
            for (i = 0; i < max; ++i) {
                e = entry.data[i][0].match(/^(.+?)\s+(?:\[(.*?)\])?\s*\/(.+)\//);
                if (!e) continue;

                if (e[2]) {
                    b.push(e[1] + '\t' + e[2]);
                }
                else {
                    b.push(e[1]);
                }

                t = e[3].replace(/\//g, '; ');
                if (!this.options.dictOptions.wpos){
                    t = t.replace(/^\([^)]+\)\s*/, '')
                }
                if (!this.options.dictOptions.wpop) {
                    t = t.replace('; (P)', '');
                }
                b.push('\t' + t + '\n');
            }
        }
        return b.join('');
    }


    find(data, text) {
        const tlen = text.length;
        let beg = 0;
        let end = data.length - 1;
        let i;
        let mi;
        let mis;

        while (beg < end) {
            mi = (beg + end) >> 1;
            i = data.lastIndexOf('\n', mi) + 1;

            mis = data.substr(i, tlen);
            if (text < mis) end = i - 1;
            else if (text > mis) beg = data.indexOf('\n', mi + 1) + 1;
            else return data.substring(i, data.indexOf('\n', mi + 1));
        }
        return null;
    }
}