/**
 * Created by Kalamandea on 03.09.2017.
 */


class Deinflector {
    constructor() {
        this.reasons = [];
        this.rules = [];
        let buffer = new rcxFile().readArray('chrome://rikaichan/content/deinflect.dat');
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
}