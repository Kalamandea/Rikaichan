/**
 * Created by Kalamandea on 03.09.2017.
 */


class Deinflector {
    constructor() {
        this.reasons = [];
        this.rules = [];

        let buffer = rcxFile.readArray('chrome://rikaichan/content/deinflect.dat');
        let ruleGroup = [];
        ruleGroup.fromLen = -1;

        // i = 1: skip header
        for (let i = 1; i < buffer.length; ++i) {
            let f = buffer[i].split('\t');

            if (f.length == 1) {
                this.reasons.push(f[0]);
            }
            else if (f.length == 4) {
                let r = { from: f[0], to: f[1], type: f[2], reason: f[3] };
                if (ruleGroup.fromLen != r.from.length) {
                    ruleGroup = [];
                    ruleGroup.fromLen = r.from.length;
                    this.rules.push(ruleGroup);
                }
                ruleGroup.push(r);
            }
        }
        this.ready = true;
    }

    done() {
        this.reasons = null;
        this.rules = null;
        this.ready = false;
    }

    go(word) {
        if (!this.ready) this.init();

        let have = [];
        have[word] = 0;

        let r = [{ word: word, type: 0xFF, reason: '' }];
        let i = 0;
        do {
            word = r[i].word;
            let wordLen = word.length;
            let type = r[i].type;

            for (let j = 0; j < this.rules.length; ++j) {
                let ruleGroup = this.rules[j];
                if (ruleGroup.fromLen <= wordLen) {
                    let end = word.substr(-ruleGroup.fromLen);
                    for (let k = 0; k < ruleGroup.length; ++k) {
                        let rule = ruleGroup[k];
                        if ((type & rule.type) && (end == rule.from)) {
                            let newWord = word.substr(0, word.length - rule.from.length) + rule.to;
                            if (newWord.length <= 1) continue;
                            let o = {};
                            if ((typeof(have[newWord])) != 'undefined') {
                                o = r[have[newWord]];
                                o.type |= (rule.type >> 8);
                                continue;
                            }
                            have[newWord] = r.length;
                            if (r[i].reason.length) o.reason = this.reasons[rule.reason] + ' &lt; ' + r[i].reason;
                            else o.reason = this.reasons[rule.reason];
                            o.type = rule.type >> 8;
                            o.word = newWord;
                            r.push(o);
                        }
                    }
                }
            }
        } while (++i < r.length);

        return r;
    }
}