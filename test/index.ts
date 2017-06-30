import * as assert from "assert";

import * as h from "../src/index";

describe("normalize", () => {
    it("single", () => {
        assert.deepEqual(h.normalizeTree(
            ["div", "foo"]),
            ["div", {}, "foo"]);
        assert.deepEqual(h.normalizeTree(
            ["div#foo", "foo"]),
            ["div", { id: "foo" }, "foo"]);
        assert.deepEqual(h.normalizeTree(
            ["div#foo.bar.baz", "foo"]),
            ["div", { id: "foo", class: "bar baz" }, "foo"]);
        assert.deepEqual(h.normalizeTree(
            ["div#foo.bar.baz", { extra: 23 }, "foo"]),
            ["div", { id: "foo", class: "bar baz", extra: 23 }, "foo"]);
    });
    it("style", () => {
        assert.deepEqual(h.normalizeTree(
            ["div", { style: { a: "red" } }, "foo"]),
            ["div", { style: "a:red;" }, "foo"]);
        assert.deepEqual(h.normalizeTree(
            ["div", { style: { a: "red", b: "blue" } }, "foo"]),
            ["div", { style: "a:red;b:blue;" }, "foo"]);
        assert.deepEqual(h.normalizeTree(
            ["div", { style: "a:red;" }, "foo"]),
            ["div", { style: "a:red;" }, "foo"]);
    });
    it("simple nested", () => {
        assert.deepEqual(h.normalizeTree(
            ["div", ["h1.title", "foo"], ["p", ["span.small", "hello"], ["br"], "bye"]]),
            ["div", {}, ["h1", { class: "title" }, "foo"], ["p", {}, ["span", { class: "small" }, "hello"], ["br", {}], "bye"]]);
    });
    it("components", () => {
        assert.deepEqual(h.normalizeTree(
            [() => ["div#foo", "bar"]]),
            ["div", { id: "foo" }, "bar"]);
        assert.deepEqual(h.normalizeTree(
            [(id, body) => ["div#" + id, body], "foo", "bar"]),
            ["div", { id: "foo" }, "bar"]);
        assert.deepEqual(h.normalizeTree(
            ["div", () => ["div#foo", "bar"]]),
            ["div", {}, ["div", { id: "foo" }, "bar"]]);
        assert.deepEqual(h.normalizeTree(
            ["div", [(id, body) => ["div#" + id, body], "foo", "bar"], "bar2"]),
            ["div", {}, ["div", { id: "foo" }, "bar"], "bar2"]);
        assert.deepEqual(h.normalizeTree(
            ["div", [([id, body]) => ["div#" + id, body], ["foo", "bar"]], "bar2"]),
            ["div", {}, ["div", { id: "foo" }, "bar"], "bar2"]);
        assert.deepEqual(h.normalizeTree(
            ["div", "foo", () => ["div#foo2", "bar2"], "bar"]),
            ["div", {}, "foo", ["div", { id: "foo2" }, "bar2"], "bar"]);
    });
    it("iterators", () => {
        assert.deepEqual([...h.normalizeTree(
            [(items) => items.map((i) => ["li", i]), ["a", "b"]])],
            [["li", {}, "a"], ["li", {}, "b"]]);
    });
});

describe("serialize", () => {
    it("single", () => {
        assert.equal(h.serializeTree(
            ["div", "foo"]),
            `<div>foo</div>`);
        assert.equal(h.serializeTree(
            ["div#foo", "foo"]),
            `<div id="foo">foo</div>`);
        assert.equal(h.serializeTree(
            ["div#foo.bar.baz", "foo"]),
            `<div id="foo" class="bar baz">foo</div>`);
        assert.equal(h.serializeTree(
            ["div#foo.bar.baz", { extra: 23 }, "foo"]),
            `<div id="foo" class="bar baz" extra="23">foo</div>`);
    });
    it("style", () => {
        assert.equal(h.serializeTree(
            ["div", { style: { a: "red" } }, "foo"]),
            `<div style="a:red;">foo</div>`);
        assert.equal(h.serializeTree(
            ["div", { style: { a: "red", b: "blue" } }, "foo"]),
            `<div style="a:red;b:blue;">foo</div>`);
        assert.equal(h.serializeTree(
            ["div", { style: "a:red;" }, "foo"]),
            `<div style="a:red;">foo</div>`);
    });
    it("simple nested", () => {
        assert.equal(h.serializeTree(
            ["div", ["h1.title", "foo"], ["p", ["span.small", "hello"], ["br"], "bye"]]),
            `<div><h1 class="title">foo</h1><p><span class="small">hello</span><br/>bye</p></div>`);
    });
    it("components", () => {
        assert.equal(h.serializeTree(
            [() => ["div#foo", "bar"]]),
            `<div id="foo">bar</div>`);
        assert.equal(h.serializeTree(
            [(id, body) => ["div#" + id, body], "foo", "bar"]),
            `<div id="foo">bar</div>`);
        assert.equal(h.serializeTree(
            ["div", () => ["div#foo", "bar"]]),
            `<div><div id="foo">bar</div></div>`);
        assert.equal(h.serializeTree(
            ["div", [(id, body) => ["div#" + id, body], "foo", "bar"], "bar2"]),
            `<div><div id="foo">bar</div>bar2</div>`);
        assert.equal(h.serializeTree(
            ["div", [([id, body]) => ["div#" + id, body], ["foo", "bar"]], "bar2"]),
            `<div><div id="foo">bar</div>bar2</div>`);
        assert.equal(h.serializeTree(
            ["div", "foo", () => ["div#foo2", "bar2"], "bar"]),
            `<div>foo<div id="foo2">bar2</div>bar</div>`);
    });
    it("components nested", () => {
        const dlItem = ([def, desc]) => [["dt", def], ["dd", desc]];
        const ulItem = (i) => ["li", i];
        const list = (f, items) => items.map(f);
        const dlList = (attribs, items) => ["dl", attribs, [list, dlItem, items]];
        const ulList = (attribs, items) => ["ul", attribs, [list, ulItem, items]];

        const items = [["a", "foo"], ["b", "bar"]];

        const widget1 = [dlList, { id: "foo" }, items];
        const widget2 = [ulList, { id: "foo" }, items.map((i) => i[1])];

        assert.equal(h.serializeTree(widget1),
            `<dl id="foo"><dt>a</dt><dd>foo</dd><dt>b</dt><dd>bar</dd></dl>`);
        assert.equal(h.serializeTree(widget2),
            `<ul id="foo"><li>foo</li><li>bar</li></ul>`);
    });
    it("iterators", () => {
        assert.equal(h.serializeTree(
            ["ul", [(items) => items.map((i) => ["li", i]), ["a", "b"]]]),
            `<ul><li>a</li><li>b</li></ul>`);
    });
});
