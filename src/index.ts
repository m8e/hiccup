export const SVG_NS = "http://www.w3.org/2000/svg";

const TAG_REGEXP = /^([^\s\.#]+)(?:#([^\s\.#]+))?(?:\.([^\s#]+))?$/;

// tslint:disable-next-line
const SVG_REGEXP = /^(svg|circle|clipPath|defs|ellipse|g|line|linearGradient|mask|path|pattern|polygon|polyline|radialGradient|rect|stop|symbol|text)$/;

// tslint:disable-next-line
const VOID_TAGS = [
    "area", "base", "br", "col", "command", "embed", "hr", "img", "input", "keygen", "link", "meta", "param", "source", "track", "wbr",
    "circle", "ellipse", "line", "path", "polygon", "polyline", "rect", "stop"
].reduce((acc, x) => (acc[x] = 1, acc), {});

const ENTITIES = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&apos;",
};

const ENTITY_RE = new RegExp(`[${Object.keys(ENTITIES)}]`, "g");

/**
 * Recursively normalizes and then serializes given tree as HTML/SVG/XML string.
 *
 * @param tree elements / component tree
 * @param escape auto-escape entities
 */
const serializeTree = (tree: any[], escape = false) => serialize(normalizeTree(tree), escape);

/**
 * Recursively serializes given tree as HTML/SVG/XML string.
 * Assumes given tree is already normalized.
 *
 * @param tree
 */
const serialize = (tree: any, esc: boolean) => {
    if (tree == null) {
        return "";
    }
    if (Array.isArray(tree)) {
        const n = tree.length,
            el = tree[0],
            attribs = tree[1];
        let str = `<${el}`;
        for (let a in attribs) {
            if (attribs.hasOwnProperty(a)) {
                const v = attribs[a];
                if (v !== undefined) {
                    if (v === true) {
                        str += ` ${a}`;
                    } else if (v !== false) {
                        str += ` ${a}="${esc ? escape(v.toString()) : v}"`;
                    }
                }
            }
        }
        if (n > 2) {
            str += ">";
            for (let i = 2; i < n; i++) {
                str += serialize(tree[i], esc);
            }
            return str += `</${el}>`;
        } else if (!VOID_TAGS[el]) {
            return str += `></${el}>`;
        }
        return str += "/>";
    }
    if (iter(tree)) {
        const res = [];
        for (let t of <Iterable<any>>tree) {
            res.push(serialize(t, esc));
        }
        return res.join("");
    }
    if (fn(tree)) {
        return serialize(tree(), esc);
    }
    return esc ? escape(tree.toString()) : tree;
};

/**
 * Recursively normalizes given tree and expands any embedded
 * component functions with their results. Each node of the
 * input tree can have one of the following forms:
 *
 * ```
 * ["tag", ...]
 * ["tag#id.class1.class2", ...]
 * ["tag", {other: "attrib"}, ...]
 * ["tag", {...}, "body", function, ...]
 * [function, arg1, arg2, ...]
 * [iterable]
 * ```
 *
 * Tags can be defined in "Zencoding" convention, e.g.
 *
 * ```
 * ["div#foo.bar.baz"] => <div id="foo" class="bar baz"></div>
 * ```
 *
 * The presence of the attributes object is optional.
 * Any `null` or `undefined` values (other than in head position)
 * will be removed, unless a function is in head position.
 * In this case all other elements of that array are passed as
 * arguments when that function is called. The return value the
 * function MUST be a valid new tree (or `undefined`).
 * Functions located in other positions are called without args
 * and can return any (serializable) value (i.e. new trees, strings,
 * numbers, iterables or any type with a suitable `.toString()`
 * implementation).
 *
 * @param tree
 */
const normalizeTree = (tree: any[]) => {
    if (tree == null) {
        return;
    }
    if (Array.isArray(tree)) {
        const tag = tree[0];
        let norm;
        if (fn(tag)) {
            return normalizeTree(tag.apply(null, tree.slice(1)));
        }
        if (str(tag)) {
            norm = normalizeElement(tree);
            if (norm.length > 2) {
                const body = norm[2],
                    n = body.length;
                norm.length = 2;
                for (let i = 0, j = 2; i < n; i++) {
                    let el = body[i];
                    if (el != null) {
                        if (!Array.isArray(el) && iter(el)) {
                            for (let c of el) {
                                if ((c = normalizeTree(c)) !== undefined) {
                                    norm[j++] = c;
                                }
                            }
                        } else if ((el = normalizeTree(el)) !== undefined) {
                            norm[j++] = el;
                        }
                    }
                }
            }
            return norm;
        }
        if (iter(tree)) {
            const res = [];
            for (let i of tree) {
                i = normalizeTree(i);
                if (i !== undefined) {
                    res.push(i);
                }
            }
            return res[Symbol.iterator]();
        }
        throw new Error(`invalid tag: ${tree}`);
    }
    if (fn(tree)) {
        return normalizeTree(tree());
    }
    return (<any>tree).toString();
};

const normalizeElement = (tag: any[]) => {
    let el = tag[0], match, id, clazz;
    const attribs: any = {};
    if (!str(el) || !(match = TAG_REGEXP.exec(el))) {
        throw new Error(`${el} is not a valid tag name`);
    }
    el = match[1];
    id = match[2];
    clazz = match[3];
    if (id) {
        attribs.id = id;
    }
    if (clazz) {
        attribs.class = clazz.replace(/\./g, " ");
    }
    if (tag.length > 1) {
        let i = 1;
        if (obj(tag[1])) {
            Object.assign(attribs, tag[1]);
            i++;
        }
        if (obj(attribs.style)) {
            attribs.style = formatCSS(attribs.style);
        }
        tag = tag.slice(i).filter((x) => x != null);
        if (tag.length > 0) {
            return [el, attribs, tag];
        }
    }
    return [el, attribs];
};

const formatCSS = (rules: any) => {
    const css = [];
    for (let r in rules) {
        if (rules.hasOwnProperty(r)) {
            css.push(r + ":" + rules[r]);
        }
    }
    return css.join(";") + (css.length ? ";" : "");
};

const obj = (x) => Object.prototype.toString.call(x) === "[object Object]";
const fn = (x) => typeof x === "function";
const str = (x) => typeof x === "string";
const iter = (x) => !str(x) && x[Symbol.iterator] !== undefined;

const escape = (x: string) => x.replace(ENTITY_RE, (y) => ENTITIES[y]);

export {
    serializeTree,
    normalizeTree,
    escape,
};
