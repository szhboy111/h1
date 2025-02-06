/*!
 * Jinja Templating for JavaScript v0.1.8
 * https://github.com/sstur/jinja-js
 *
 * This is a slimmed-down Jinja2 implementation [http://jinja.pocoo.org/]
 *
 * In the interest of simplicity, it deviates from Jinja2 as follows:
 * - Line statements, cycle, super, macro tags and block nesting are not implemented
 * - auto escapes html by default (the filter is "html" not "e")
 * - Only "html" and "safe" filters are built in
 * - Filters are not valid in expressions; `foo|length > 1` is not valid
 * - Expression Tests (`if num is odd`) not implemented (`is` translates to `==` and `isnot` to `!=`)
 *
 * Notes:
 * - if property is not found, but method '_get' exists, it will be called with the property name (and cached)
 * - `{% for n in obj %}` iterates the object's keys; get the value with `{% for n in obj %}{{ obj[n] }}{% endfor %}`
 * - subscript notation `a[0]` takes literals or simple variables but not `a[item.key]`
 * - `.2` is not a valid number literal; use `0.2`
 *
 */
/*global require, exports, module, define */
/*!
* Jinja Templating for JavaScript v0.1.8
* https://github.com/sstur/jinja-js
 *
* 这是一个精简的 Jinja2 实现 [http://jinja.pocoo.org/]
 *
* 为简单起见，它与 Jinja2 的偏差如下：
* - 未实现 Line 语句、cycle、super、macro 标签和块嵌套
* - 默认情况下自动转义 HTML（过滤器是 “HTML” 而不是 “E”）
* - 仅内置 “html” 和 “safe” 过滤器
* - 过滤器在表达式中无效;'foo|length > 1' 无效
* - 表达式测试 （'if num is odd'） 未实现 （'is' 转换为 '==' ，'isnot' 转换为 '！='）
 *
*笔记：
* - 如果未找到 property，但方法 '_get' 存在，则将使用属性名称调用它（并缓存）
* - '{% for n in obj %}' 迭代对象的键;使用 '{% for n in obj %}{{ obj[n] }}{% endfor %}' 获取值
* - 下标表示法 'a[0]' 接受文字或简单变量，但不接受 'a[item.key]'
* - '.2' 不是有效的数字文本;使用 '0.2'
 *
 */
/*全局 require， exports， module， define */
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
        typeof define === 'function' && define.amd ? define(['exports'], factory) :
            (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.jinja = {}));
})(this, (function (jinja) {
    "use strict";
    var STRINGS = /'(\\.|[^'])*'|"(\\.|[^"'"])*"/g;
    var IDENTS_AND_NUMS = /([$_a-z][$\w]*)|([+-]?\d+(\.\d+)?)/g;
    var NUMBER = /^[+-]?\d+(\.\d+)?$/;
    //non-primitive literals (array and object literals)
    var NON_PRIMITIVES = /\[[@#~](,[@#~])*\]|\[\]|\{([@i]:[@#~])(,[@i]:[@#~])*\}|\{\}/g;
    //bare identifiers such as variables and in object literals: {foo: 'value'}
    var IDENTIFIERS = /[$_a-z][$\w]*/ig;
    var VARIABLES = /i(\.i|\[[@#i]\])*/g;
    var ACCESSOR = /(\.i|\[[@#i]\])/g;
    var OPERATORS = /(===?|!==?|>=?|<=?|&&|\|\||[+\-\*\/%])/g;
    //extended (english) operators
    var EOPS = /(^|[^$\w])(and|or|not|is|isnot)([^$\w]|$)/g;
    var LEADING_SPACE = /^\s+/;
    var TRAILING_SPACE = /\s+$/;
（function （global， factory） {
typeof exports === '对象' && typeof module ！== 'undefined' ？工厂（出口） ：
typeof define === '函数' && define.amd ？define（['exports']， 工厂） ：
（global = typeof globalThis ！== 'undefined' ？ globalThis ： global || self， factory（global.jinja = {}））;
}）（this， （function （jinja） {
“使用严格”;
var 字符串 = /'（\\.|[^'])*'|"(\\.|[^"'"])*“/克;
var IDENTS_AND_NUMS = /（[$_a-z][$\w]*）|（[+-]？\d+（\.\d+）？）/g;
var NUMBER = /^[+-]？\d+（\.\d+）？$/;
非原始文本（数组和对象文本）
var NON_PRIMITIVES = /\[[@#~]（，[@#~]）*\]|\[\]|\{（[@i]：[@#~]）（，[@i]：[@#~]）*\}|\{\}/g;
裸标识符，例如变量和对象字面量：{foo： 'value'}
var 标识符 = /[$_a-z][$\w]*/ig;
var 变量 = /i（\.i|\[[@#i]\]）*/g;
var 访问器 = /（\.i|\[[@#i]\]）/g;
var 运算符 = /（===？|！==?|>=?|<=?|&&|\|\||[+\-\*\/%])/g;
扩展（英语）运算符
var EOPS = /（^|[^$\w]）（and|or|not|is|isnot）（[^$\w]|$）/g;
var LEADING_SPACE = /^\s+/;
var TRAILING_SPACE = /\s+$/;
    var START_TOKEN = /\{\{\{|\{\{|\{%|\{#/;
    var TAGS = {
        '{{{': /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?\}\}\}/,
        '{{': /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?\}\}/,
        '{%': /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?%\}/,
        '{#': /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?#\}/
    };
var START_TOKEN = /\{\{\{|\{{|\{%|\{#/;
var 标记 = {
'{{{': /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?\}\}\}/,
'{{': /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?\}\}/,
'{%': /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?%\}/,
'{#': /^('(\\.|[^'])*'|"(\\.|[^"'"])*"|.)+?#\}/
    };
    var delimeters = {
        '{%': 'directive',
        '{{': 'output',
        '{#': 'comment'
    };
var 分隔符 = {
'{%'： '指令'，
'{{'： '输出'，
'{#'： '评论'
    };
    var operators = {
        and: '&&',
        or: '||',
        not: '!',
        is: '==',
        isnot: '!='
    };
var 运算符 = {
和： '&&'，
或者： '||'，
不是： '！'，
是： '=='，
isnot： '！='
    };
    var constants = {
        'true': true,
        'false': false,
        'null': null
    };
var 常量 = {
'true'： 真，
'false'： false，
'zero'：零
    };
    function Parser() {
        this.nest = [];
        this.compiled = [];
        this.childBlocks = 0;
        this.parentBlocks = 0;
        this.isSilent = false;
    }
function Parser（） {
this.nest = [];
this.compiled = [];
this.childBlocks = 0;
this.parentBlocks = 0;
this.isSilent = 假;
    }
    Parser.prototype.push = function (line) {
        if (!this.isSilent) {
            this.compiled.push(line);
        }
    };
Parser.prototype.push = 函数 （行） {
如果 （！this.isSilent） {
this.compiled.push（行）;
        }
    };
    Parser.prototype.parse = function (src) {
        this.tokenize(src);
        return this.compiled;
    };
Parser.prototype.parse = 函数 （src） {
this.tokenize（src） 的
返回 this.compiled;
    };
    Parser.prototype.tokenize = function (src) {
        var lastEnd = 0, parser = this, trimLeading = false;
        matchAll(src, START_TOKEN, function (open, index, src) {
            //here we match the rest of the src against a regex for this tag
            var match = src.slice(index + open.length).match(TAGS[open]);
            match = (match ? match[0] : '');
            //here we sub out strings so we don't get false matches
            var simplified = match.replace(STRINGS, '@');
            //if we don't have a close tag or there is a nested open tag
            if (!match || ~simplified.indexOf(open)) {
                return index + 1;
            }
            var inner = match.slice(0, 0 - open.length);
            //check for white-space collapse syntax
            if (inner.charAt(0) === '-') var wsCollapseLeft = true;
            if (inner.slice(-1) === '-') var wsCollapseRight = true;
            inner = inner.replace(/^-|-$/g, '').trim();
            //if we're in raw mode and we are not looking at an "endraw" tag, move along
            if (parser.rawMode && (open + inner) !== '{%endraw') {
                return index + 1;
            }
            var text = src.slice(lastEnd, index);
            lastEnd = index + open.length + match.length;
            if (trimLeading) text = trimLeft(text);
            if (wsCollapseLeft) text = trimRight(text);
            if (wsCollapseRight) trimLeading = true;
            if (open === '{{{') {
                //liquid-style: make {{{x}}} => {{x|safe}}
                open = '{{';
                inner += '|safe';
            }
            parser.textHandler(text);
            parser.tokenHandler(open, inner);
        });
        var text = src.slice(lastEnd);
        if (trimLeading) text = trimLeft(text);
        this.textHandler(text);
    };
Parser.prototype.tokenize = 函数 （src） {
var lastEnd = 0，解析器 = this，trimLeading = false;
matchAll（src， START_TOKEN， function （open， index， src） {
在这里，我们将 src 的其余部分与此标签的正则表达式进行匹配
var match = src.slice（index + open.length）.match（TAGS[open]）;
match = （match ？ match[0] ： ''）;
在这里，我们 sub out 字符串，这样我们就不会得到 false 匹配
var simplified = match.replace（字符串， '@'）;
如果我们没有 close 标签或有嵌套的 open 标签
if （！match || ~simplified.indexOf（open）） {
返回指数 + 1;
            }
var 内部 = match.slice（0， 0 - open.length）;
检查空格折叠语法
if （inner.charAt（0） === '-'） var wsCollapseLeft = true;
if （inner.slice（-1） === '-'） var wsCollapseRight = true;
inner = inner.replace（/^-|-$/g， ''）.trim（）;
如果我们处于 Raw 模式并且没有查看 “endraw” 标签，请继续
if （parser.rawMode && （open + inner） ！== '{%endraw'） {
返回指数 + 1;
            }
var text = src.slice（lastEnd， index）;
lastEnd = 索引 + open.length + match.length;
if （trimLeading） 文本 = trimLeft（text）;
if （wsCollapseLeft） 文本 = trimRight（text）;
如果 （wsCollapseRight） trimLeading = true;
if （open === '{{{'） {
liquid-style： make {{{x}}} => {{x|safe}}
open = '{{';
内部 += '|safe';
            }
parser.textHandler（文本）;
parser.tokenHandler（打开，内部）;
        });
var text = src.slice（lastEnd）;
if （trimLeading） 文本 = trimLeft（text）;
this.textHandler（文本）;
    };
    Parser.prototype.textHandler = function (text) {
        this.push('write(' + JSON.stringify(text) + ');');
    };
Parser.prototype.textHandler = function （text） {
this.push（'write（' + JSON.stringify（text） + '）;'）;
    };
    Parser.prototype.tokenHandler = function (open, inner) {
        var type = delimeters[open];
        if (type === 'directive') {
            this.compileTag(inner);
        } else if (type === 'output') {
            var extracted = this.extractEnt(inner, STRINGS, '@');
            //replace || operators with ~
            extracted.src = extracted.src.replace(/\|\|/g, '~').split('|');
            //put back || operators
            extracted.src = extracted.src.map(function (part) {
                return part.split('~').join('||');
            });
            var parts = this.injectEnt(extracted, '@');
            if (parts.length > 1) {
                var filters = parts.slice(1).map(this.parseFilter.bind(this));
                this.push('filter(' + this.parseExpr(parts[0]) + ',' + filters.join(',') + ');');
            } else {
                this.push('filter(' + this.parseExpr(parts[0]) + ');');
            }
        }
    };
Parser.prototype.tokenHandler = function （open， inner） {
var type = delimeters[open];
if （type === 'directive'） {
this.compileTag（inner）;
} else if （type === 'output'） {
var extracted = this.extractEnt（inner， 字符串， '@'）;
替换 ||运算符替换为 ~
extracted.src = extracted.src.replace（/\|\|/g， '~'）.split（'|'）;
放回去 ||运营商
extracted.src = extracted.src.map（函数 （部分） {
返回 part.split（'~'）.join（'||'）;
            });
var parts = this.injectEnt（提取， '@'）;
if （parts.length > 1） {
var filters = parts.slice（1）.map（this.parseFilter.bind（this））;
this.push（'filter（' + this.parseExpr（parts[0]） + '，' + filters.join（'，'） + '）;'）;
} else {
this.push（'filter（' + this.parseExpr（parts[0]） + '）;'）;
            }
        }
    };
    Parser.prototype.compileTag = function (str) {
        var directive = str.split(' ')[0];
        var handler = tagHandlers[directive];
        if (!handler) {
            throw new Error('Invalid tag: ' + str);
        }
        handler.call(this, str.slice(directive.length).trim());
    };
Parser.prototype.compileTag = 函数 （str） {
var 指令 = str.split（' '）[0];
var handler = tagHandlers[指令];
如果 （！handler） {
throw new Error（'无效标签： ' + str）;
        }
handler.call（this， str.slice（directive.length）.trim（））;
    };
    Parser.prototype.parseFilter = function (src) {
        src = src.trim();
        var match = src.match(/[:(]/);
        var i = match ? match.index : -1;
        if (i < 0) return JSON.stringify([src]);
        var name = src.slice(0, i);
        var args = src.charAt(i) === ':' ? src.slice(i + 1) : src.slice(i + 1, -1);
        args = this.parseExpr(args, {terms: true});
        return '[' + JSON.stringify(name) + ',' + args + ']';
    };
Parser.prototype.parseFilter = 函数 （src） {
src = src.trim（）;
var match = src.match（/[:(]/）;
var i = 匹配 ？匹配索引 ： -1;
if （i < 0） 返回 JSON.stringify（[src]）;
变量名称 = src.slice（0， i）;
var args = src.charAt（i） === '：' ？src.slice（i + 1） ： src.slice（i + 1， -1）;
args = this.parseExpr（args， {terms： true}）;
返回 '[' + JSON.stringify（name） + '，' + args + ']';
    };
    Parser.prototype.extractEnt = function (src, regex, placeholder) {
        var subs = [], isFunc = typeof placeholder == 'function';
        src = src.replace(regex, function (str) {
            var replacement = isFunc ? placeholder(str) : placeholder;
            if (replacement) {
                subs.push(str);
                return replacement;
            }
            return str;
        });
        return {src: src, subs: subs};
    };
Parser.prototype.extractEnt = 函数 （src， regex， placeholder） {
var subs = []， isFunc = typeof 占位符 == 'function';
src = src.replace（正则表达式， 函数 （str） {
var 替换 = isFunc ？placeholder（str） ： 占位符;
if （替换） {
subs.push（str）;
退货更换;
            }
返回 str;
        });
返回 {src： src， subs： subs};
    };
    Parser.prototype.injectEnt = function (extracted, placeholder) {
        var src = extracted.src, subs = extracted.subs, isArr = Array.isArray(src);
        var arr = (isArr) ? src : [src];
        var re = new RegExp('[' + placeholder + ']', 'g'), i = 0;
        arr.forEach(function (src, index) {
            arr[index] = src.replace(re, function () {
                return subs[i++];
            });
        });
        return isArr ? arr : arr[0];
    };
Parser.prototype.injectEnt = 函数 （提取，占位符） {
var src = extracted.src， subs = extracted.subs， isArr = Array.isArray（src）;
var arr = （isArr） ？来源 ： [src];
var re = new RegExp（'[' + 占位符 + ']'， 'g'）， i = 0;
arr.forEach（function （src， index） {
arr[index] = src.replace（re， function （） {
返回 subs[i++];
            });
        });
返回 isArr ？ARR ： ARR[0];
    };
    //replace complex literals without mistaking subscript notation with array literals
    Parser.prototype.replaceComplex = function (s) {
        var parsed = this.extractEnt(s, /i(\.i|\[[@#i]\])+/g, 'v');
        parsed.src = parsed.src.replace(NON_PRIMITIVES, '~');
        return this.injectEnt(parsed, 'v');
    };
替换 Complex Literals 而不将下标表示法与数组 Literals 混淆
Parser.prototype.replaceComplex = 函数 （s） {
var parsed = this.extractEnt（s， /i（\.i|\[[@#i]\]）+/g， 'v'）;
parsed.src = parsed.src.replace（NON_PRIMITIVES， '~'）;
返回 this.injectEnt（parsed， 'v'）;
    };
    //parse expression containing literals (including objects/arrays) and variables (including dot and subscript notation)
    //valid expressions: `a + 1 > b.c or c == null`, `a and b[1] != c`, `(a < b) or (c < d and e)`, 'a || [1]`
    Parser.prototype.parseExpr = function (src, opts) {
        opts = opts || {};
        //extract string literals -> @
        var parsed1 = this.extractEnt(src, STRINGS, '@');
        //note: this will catch {not: 1} and a.is; could we replace temporarily and then check adjacent chars?
        parsed1.src = parsed1.src.replace(EOPS, function (s, before, op, after) {
            return (op in operators) ? before + operators[op] + after : s;
        });
        //sub out non-string literals (numbers/true/false/null) -> #
        // the distinction is necessary because @ can be object identifiers, # cannot
        var parsed2 = this.extractEnt(parsed1.src, IDENTS_AND_NUMS, function (s) {
            return (s in constants || NUMBER.test(s)) ? '#' : null;
        });
        //sub out object/variable identifiers -> i
        var parsed3 = this.extractEnt(parsed2.src, IDENTIFIERS, 'i');
        //remove white-space
        parsed3.src = parsed3.src.replace(/\s+/g, '');
解析包含文本（包括对象/数组）和变量（包括点和下标表示法）的表达式
有效表达式：'a + 1 > b.c 或 c == null'， 'a and b[1] ！= c'， '（a < b） or （c < d and e）'， 'a ||[1]'
Parser.prototype.parseExpr = function （src， opts） {
opts = opts ||{};
提取字符串文本 ->@
var parsed1 = this.extractEnt（src， 字符串， '@'）;
注意：这将捕获 {not： 1} 和 a.is;我们可以暂时替换然后检查相邻的字符吗？
parsed1.src = parsed1.src.replace（EOPS， function （s， before， op， after） {
return （运算符中的 op） ？之前 + 运算符[op] + 之后 ： s;
        });
sub out 非字符串字面量 （numbers/true/false/null） ->#
区分是必要的，因为 @ 可以是对象标识符，# 不能
var parsed2 = this.extractEnt（parsed1.src， IDENTS_AND_NUMS， function （s） {
return （s 在常量中 ||NUMBER.test（s）） ？'#' ： 空;
        });
Sub Out 对象/变量标识符 -> i
var parsed3 = this.extractEnt（parsed2.src， 标识符， 'i'）;
删除空格
parsed3.src = parsed3.src.replace（/\s+/g， ''）;
        //the rest of this is simply to boil the expression down and check validity
        var simplified = parsed3.src;
        //sub out complex literals (objects/arrays) -> ~
        // the distinction is necessary because @ and # can be subscripts but ~ cannot
        while (simplified !== (simplified = this.replaceComplex(simplified))) ;
        //now @ represents strings, # represents other primitives and ~ represents non-primitives
        //replace complex variables (those with dot/subscript accessors) -> v
        while (simplified !== (simplified = simplified.replace(/i(\.i|\[[@#i]\])+/, 'v'))) ;
        //empty subscript or complex variables in subscript, are not permitted
        simplified = simplified.replace(/[iv]\[v?\]/g, 'x');
        //sub in "i" for @ and # and ~ and v (now "i" represents all literals, variables and identifiers)
        simplified = simplified.replace(/[@#~v]/g, 'i');
        //sub out operators
        simplified = simplified.replace(OPERATORS, '%');
        //allow 'not' unary operator
        simplified = simplified.replace(/!+[i]/g, 'i');
        var terms = opts.terms ? simplified.split(',') : [simplified];
        terms.forEach(function (term) {
            //simplify logical grouping
            while (term !== (term = term.replace(/\(i(%i)*\)/g, 'i'))) ;
            if (!term.match(/^i(%i)*/)) {
                throw new Error('Invalid expression: ' + src + " " + term);
            }
        });
        parsed3.src = parsed3.src.replace(VARIABLES, this.parseVar.bind(this));
        parsed2.src = this.injectEnt(parsed3, 'i');
        parsed1.src = this.injectEnt(parsed2, '#');
        return this.injectEnt(parsed1, '@');
    };
剩下的就是简单地将表达式归结并检查有效性
var simplified = parsed3.src;
sub out 复杂文字 （对象/数组） -> ~
区分是必要的，因为 @ 和 # 可以是下标，但 ~ 不能
while （simplified ！== （simplified = this.replaceComplex（simplified））） ;
现在 @ 表示字符串，# 表示其他基元，~ 表示非基元
替换复杂变量（带有点/下标访问器的变量）-> v
while （simplified ！== （simplified = simplified.replace（/i（\.i|\[[@#i]\]）+/， 'v'））） ;
不允许空下标或 Subscript 中的复杂变量
simplified = simplified.replace（/[iv]\[v？\]/g， 'x'）;
sub 在 “i” 中表示 @ 和 # 以及 ~ 和 v（现在 “i” 表示所有文字、变量和标识符）
simplified = simplified.replace（/[@#~v]/g， 'i'）;
Sub Out 运算符
simplified = simplified.replace（运算符， '%'）;
允许 'not' 一元运算符
simplified = simplified.replace（/！+[i]/g， 'i'）;
var terms = opts.terms ？simplified.split（'，'） ： [简化];
terms.forEach（函数 （术语） {
简化逻辑分组
while （term ！== （term = term.replace（/\（i（%i）*\）/g， 'i'））） ;
如果 （！term.match（/^i（%i）*/）） {
throw new Error（'无效表达式： ' + src + “ ” + term）;
            }
        });
parsed3.src = parsed3.src.replace（VARIABLES， this.parseVar.bind（this））;
parsed2.src = this.injectEnt（parsed3， 'i'）;
parsed1.src = this.injectEnt（parsed2， '#'）;
返回 this.injectEnt（parsed1， '@'）;
    };
    Parser.prototype.parseVar = function (src) {
        var args = Array.prototype.slice.call(arguments);
        var str = args.pop(), index = args.pop();
        //quote bare object identifiers (might be a reserved word like {while: 1})
        if (src === 'i' && str.charAt(index + 1) === ':') {
            return '"i"';
        }
        var parts = ['"i"'];
        src.replace(ACCESSOR, function (part) {
            if (part === '.i') {
                parts.push('"i"');
            } else if (part === '[i]') {
                parts.push('get("i")');
            } else {
                parts.push(part.slice(1, -1));
            }
        });
        return 'get(' + parts.join(',') + ')';
    };
Parser.prototype.parseVar = 函数 （src） {
var args = Array.prototype.slice.call（arguments）;
var str = args.pop（）， 索引 = args.pop（）;
引用裸对象标识符（可能是像 {while： 1} 这样的保留字）
if （src === 'i' && str.charAt（index + 1） === '：'） {
返回 '“i”';
        }
var 部分 = ['“i”'];
src.replace（ACCESSOR， function （part） {
if （part === '.i'） {
parts.push（'“i”'）;
} else if （part === '[i]'） {
parts.push（'get（“i”）'）;
} else {
parts.push（part.slice（1， -1））;
            }
        });
返回 'get（' + parts.join（'，'） + '）';
    };
    //escapes a name to be used as a javascript identifier
    Parser.prototype.escName = function (str) {
        return str.replace(/\W/g, function (s) {
            return '$' + s.charCodeAt(0).toString(16);
        });
    };
转义要用作 JavaScript 标识符的名称
Parser.prototype.escName = 函数 （str） {
return str.replace（/\W/g， function （s） {
返回 '$' + s.charCodeAt（0）.toString（16）;
        });
    };
    Parser.prototype.parseQuoted = function (str) {
        if (str.charAt(0) === "'") {
            str = str.slice(1, -1).replace(/\\.|"/, function (s) {
                if (s === "\\'") return "'";
                return s.charAt(0) === '\\' ? s : ('\\' + s);
            });
            str = '"' + str + '"';
        }
        //todo: try/catch or deal with invalid characters (linebreaks, control characters)
        return JSON.parse(str);
    };
Parser.prototype.parseQuoted = 函数 （str） {
if （str.charAt（0） === “'”） {
str = str.slice（1， -1）.replace（/\\.|”/， 函数 （s） {
if （s === “\\'”） 返回 “'”;
返回 s.charAt（0） === '\\' ？s ： （'\\' + s）;
            });
str = '“' + str + '”';
        }
todo： try/catch 或处理无效字符（换行符、控制字符）
返回 JSON.parse（str）;
    };

    //the context 'this' inside tagHandlers is the parser instance
    var tagHandlers = {
        'if': function (expr) {
            this.push('if (' + this.parseExpr(expr) + ') {');
            this.nest.unshift('if');
        },
        'else': function () {
            if (this.nest[0] === 'for') {
                this.push('}, function() {');
            } else {
                this.push('} else {');
            }
        },
        'elseif': function (expr) {
            this.push('} else if (' + this.parseExpr(expr) + ') {');
        },
        'endif': function () {
            this.nest.shift();
            this.push('}');
        },
        'for': function (str) {
            var i = str.indexOf(' in ');
            var name = str.slice(0, i).trim();
            var expr = str.slice(i + 4).trim();
            this.push('each(' + this.parseExpr(expr) + ',' + JSON.stringify(name) + ',function() {');
            this.nest.unshift('for');
        },
        'endfor': function () {
            this.nest.shift();
            this.push('});');
        },
        'raw': function () {
            this.rawMode = true;
        },
        'endraw': function () {
            this.rawMode = false;
        },
        'set': function (stmt) {
            var i = stmt.indexOf('=');
            var name = stmt.slice(0, i).trim();
            var expr = stmt.slice(i + 1).trim();
            this.push('set(' + JSON.stringify(name) + ',' + this.parseExpr(expr) + ');');
        },
        'block': function (name) {
            if (this.isParent) {
                ++this.parentBlocks;
                var blockName = 'block_' + (this.escName(name) || this.parentBlocks);
                this.push('block(typeof ' + blockName + ' == "function" ? ' + blockName + ' : function() {');
            } else if (this.hasParent) {
                this.isSilent = false;
                ++this.childBlocks;
                blockName = 'block_' + (this.escName(name) || this.childBlocks);
                this.push('function ' + blockName + '() {');
            }
            this.nest.unshift('block');
        },
        'endblock': function () {
            this.nest.shift();
            if (this.isParent) {
                this.push('});');
            } else if (this.hasParent) {
                this.push('}');
                this.isSilent = true;
            }
        },
        'extends': function (name) {
            name = this.parseQuoted(name);
            var parentSrc = this.readTemplateFile(name);
            this.isParent = true;
            this.tokenize(parentSrc);
            this.isParent = false;
            this.hasParent = true;
            //silence output until we enter a child block
            this.isSilent = true;
        },
        'include': function (name) {
            name = this.parseQuoted(name);
            var incSrc = this.readTemplateFile(name);
            this.isInclude = true;
            this.tokenize(incSrc);
            this.isInclude = false;
        }
    };
tagHandlers 中的上下文 'this' 是解析器实例
var tagHandlers = {
'if'： 函数 （expr） {
this.push（'if （' + this.parseExpr（expr） + '） {'）;
this.nest.unshift（'如果'）;
        },
'else'： function （） {
if （this.nest[0] === 'for'） {
this.push（'}， function（） {'）;
} else {
this.push（'} 否则 {'）;
            }
        },
'elseif'： 函数 （expr） {
this.push（'} else if （' + this.parseExpr（expr） + '） {'）;
        },
'endif'： function （） {
this.nest.shift（） 的
this.push（'}'）;
        },
'for'： 函数 （str） {
var i = str.indexOf（' 在 '）;
var 名称 = str.slice（0， i）.trim（）;
var expr = str.slice（i + 4）.trim（）;
this.push（'each（' + this.parseExpr（expr） + '，' + JSON.stringify（name） + '，function（） {'）;
this.nest.unshift（'为了'）;
        },
'endfor'： 函数 （） {
this.nest.shift（） 的
this.push（'}）;'）;
        },
'raw'： function （） {
this.rawMode = 真;
        },
'endraw'： function （） {
this.rawMode = false;
        },
'set'： 函数 （stmt） {
var i = stmt.indexOf（'='）;
var 名称 = stmt.slice（0， i）.trim（）;
var expr = stmt.slice（i + 1）.trim（）;
this.push（'set（' + JSON.stringify（name） + '，' + this.parseExpr（expr） + '）;'）;
        },
'block'： function （name） {
如果 （this.isParent） {
++this.parentBlocks;
var blockName = 'block_' + （this.escName（name） || this.parentBlocks）;
this.push（'block（typeof ' + blockName + ' == “function” ？' + blockName + ' ： function（） {'）;
} else if （this.hasParent） {
this.isSilent = 假;
++this.childBlocks;
块名称 = 'block_' + （this.escName（name） || this.childBlocks）;
this.push（'函数 ' + blockName + '（） {'）;
            }
this.nest.unshift（'块'）;
        },
'endblock'： function （） {
this.nest.shift（） 的
如果 （this.isParent） {
this.push（'}）;'）;
} else if （this.hasParent） {
this.push（'}'）;
this.isSilent = 真;
            }
        },
'extends'： function （name） {
name = this.parseQuoted（name）;
var parentSrc = this.readTemplateFile（name）;
this.isParent = 真;
this.tokenize（parentSrc）;
this.isParent = false;
this.hasParent = 真;
silence 输出，直到我们进入子块
this.isSilent = 真;
        },
'include'： function （name） {
name = this.parseQuoted（name）;
var incSrc = this.readTemplateFile（name）;
this.isInclude = 真;
this.tokenize（incSrc）;
this.isInclude = false;
        }
    };
    //liquid style
    tagHandlers.assign = tagHandlers.set;
    //python/django style
    tagHandlers.elif = tagHandlers.elseif;
液体风格
tagHandlers.assign = tagHandlers.set;
python/Django 样式
tagHandlers.elif = tagHandlers.elseif;
    var getRuntime = function runtime(data, opts) {
        var defaults = {autoEscape: 'toJson'};
        var _toString = Object.prototype.toString;
        var _hasOwnProperty = Object.prototype.hasOwnProperty;
        var getKeys = Object.keys || function (obj) {
            var keys = [];
            for (var n in obj) if (_hasOwnProperty.call(obj, n)) keys.push(n);
            return keys;
        };
        var isArray = Array.isArray || function (obj) {
            return _toString.call(obj) === '[object Array]';
        };
        var create = Object.create || function (obj) {
            function F() {
            }
var getRuntime = 函数 runtime（data， opts） {
var defaults = {autoEscape： 'toJson'};
var _toString = Object.prototype.toString;
var _hasOwnProperty = Object.prototype.hasOwnProperty;
var getKeys = Object.keys ||函数 （OBJ） {
var 键 = [];
for （var n in obj） if （_hasOwnProperty.call（obj， n）） keys.push（n）;
返回键;
        };
var isArray = Array.isArray ||函数 （OBJ） {
return _toString.call（obj） === '[对象数组]';
        };
var create = Object.create ||函数 （OBJ） {
函数 F（） {
            }
            F.prototype = obj;
            return new F();
        };
        var toString = function (val) {
            if (val == null) return '';
            return (typeof val.toString == 'function') ? val.toString() : _toString.call(val);
        };
        var extend = function (dest, src) {
            var keys = getKeys(src);
            for (var i = 0, len = keys.length; i < len; i++) {
                var key = keys[i];
                dest[key] = src[key];
            }
            return dest;
        };
        //get a value, lexically, starting in current context; a.b -> get("a","b")
        var get = function () {
            var val, n = arguments[0], c = stack.length;
            while (c--) {
                val = stack[c][n];
                if (typeof val != 'undefined') break;
            }
            for (var i = 1, len = arguments.length; i < len; i++) {
                if (val == null) continue;
                n = arguments[i];
                val = (_hasOwnProperty.call(val, n)) ? val[n] : (typeof val._get == 'function' ? (val[n] = val._get(n)) : null);
            }
            return (val == null) ? '' : val;
        };
        var set = function (n, val) {
            stack[stack.length - 1][n] = val;
        };
        var push = function (ctx) {
            stack.push(ctx || {});
        };
        var pop = function () {
            stack.pop();
        };
        var write = function (str) {
            output.push(str);
        };
        var filter = function (val) {
            for (var i = 1, len = arguments.length; i < len; i++) {
                var arr = arguments[i], name = arr[0], filter = filters[name];
                if (filter) {
                    arr[0] = val;
                    //now arr looks like [val, arg1, arg2]
                    val = filter.apply(data, arr);
                } else {
                    throw new Error('Invalid filter: ' + name);
                }
            }
            if (opts.autoEscape && name !== opts.autoEscape && name !== 'safe') {
                //auto escape if not explicitly safe or already escaped
                val = filters[opts.autoEscape].call(data, val);
            }
            output.push(val);
        };
        var each = function (obj, loopvar, fn1, fn2) {
            if (obj == null) return;
            var arr = isArray(obj) ? obj : getKeys(obj), len = arr.length;
            var ctx = {loop: {length: len, first: arr[0], last: arr[len - 1]}};
            push(ctx);
            for (var i = 0; i < len; i++) {
                extend(ctx.loop, {index: i + 1, index0: i});
                fn1(ctx[loopvar] = arr[i]);
            }
            if (len === 0 && fn2) fn2();
            pop();
        };
        var block = function (fn) {
            push();
            fn();
            pop();
        };
        var render = function () {
            return output.join('');
        };
        data = data || {};
        opts = extend(defaults, opts || {});
        var filters = extend({
            html: function (val) {
                return toString(val)
                    .split('&').join('&amp;')
                    .split('<').join('&lt;')
                    .split('>').join('&gt;')
                    .split('"').join('&quot;');
            },
            safe: function (val) {
                return val;
            },
            toJson: function (val) {
                if (typeof val === 'object') {
                    return JSON.stringify(val);
                }
                return toString(val);
            }
        }, opts.filters || {});
        var stack = [create(data || {})], output = [];
        return {
            get: get,
            set: set,
            push: push,
            pop: pop,
            write: write,
            filter: filter,
            each: each,
            block: block,
            render: render
        };
    };
F.原型 = obj;
返回新的 F（）;
        };
var toString = 函数 （val） {
如果 （val == null） 返回 '';
返回 （typeof val.toString == 'function'） ？val.toString（） ： _toString.call（val）;
        };
var extend = function （dest， src） {
var keys = getKeys（src）;
for （var i = 0， len = keys.length; i < len; i++） {
var 键 = keys[i];
dest[键] = src[键];
            }
返回目标;
        };
从当前上下文开始，按词法获取一个值;A.B -> get（“A”，“B”）
var get = function（） {
var val， n = arguments[0]， c = stack.length;
while （c--） {
选择 = 堆栈[c][n];
if （typeof val！= 'undefined'） 中断;
            }
for （var i = 1， len = arguments.length; i < len; i++） {
如果 （val == null） continue ;
n = 参数[i];
val = （_hasOwnProperty.call（val， n）） ？val[n] ： （typeof val._get == 'function' ？（val[n] = val._get（n）） ： 零）;
            }
返回 （val == null） ？'' ： 选择;
        };
var set = function （n， val） {
stack[stack.length - 1][n] = choice;
        };
var push = 函数 （ctx） {
stack.push（ctx ||{});
        };
var pop = function（） {
堆栈.pop（）;
        };
var write = 函数 （str） {
输出.push（str）;
        };
var filter = function （val） {
for （var i = 1， len = arguments.length; i < len; i++） {
var arr = arguments[i]， name = arr[0]， filter = filters[name];
if （filter） {
arr[0] = 选择;
现在 arr 看起来像 [val， arg1， arg2]
val = filter.apply（数据， arr）;
} else {
throw new Error（'无效过滤器： ' + name）;
                }
            }
if （opts.autoEscape && name ！== opts.autoEscape && name ！== 'safe'） {
如果未明确安全或已转义，则自动转义
val = filters[opts.autoEscape].call（data， val）;
            }
output.push（choice）;
        };
var each = function （obj， loopvar， fn1， fn2） {
if（obj == null） 返回;
var arr = isArray（obj） ？对象 ： getKeys（obj）， len = arr.length;
var ctx = {loop： {length： len， first： arr[0]， last： arr[len - 1]}};
推 （ctx）;
对于 （var i = 0; i < len; i++） {
扩展（ctx.loop， {index： i + 1， index0： i}）;
fn1（ctx[loopvar] = arr[i]）;
            }
如果 （len === 0 && fn2） fn2（）;
pop（）的;
        };
var 块 = 函数 （fn） {
push（）;
fn（） 的
pop（）的;
        };
var render = function（） {
返回 output.join（''）;
        };
data = 数据 ||{};
opts = extend（默认值， opts ||{});
var filters = extend（{
HTML： 函数 （val） {
return toString（choice）
.split（'&'）.join（'&'）
.split（'<'）.join（'<'）
.split（'>'）.join（'>'）
.split（'“'）.join（'”'）;
            },
安全： function （val） {
选举结果;
            },
toJson： function （val） {
if （typeof val === '对象'） {
返回 JSON.stringify（choice）;
                }
返回 toString（choice）;
            }
}， opts.filters ||{});
var stack = [create（data ||{}）]， output = [];
返回 {
get： get，
Set：Set、
push：推、
Pop：Pop、
write：write、
filter： 过滤器，
each：每个、
块： 块，
Render：渲染
        };
    };
    var runtime; var 运行时;
    jinja.compile = function (markup, opts) {
        opts = opts || {};
        var parser = new Parser();
        parser.readTemplateFile = this.readTemplateFile;
        var code = [];
        code.push('function render($) {');
        code.push('var get = $.get, set = $.set, push = $.push, pop = $.pop, write = $.write, filter = $.filter, each = $.each, block = $.block;');
        code.push.apply(code, parser.parse(markup));
        code.push('return $.render();');
        code.push('}');
        code = code.join('\n');
        if (opts.runtime === false) {
            var fn = new Function('data', 'options', 'return (' + code + ')(runtime(data, options))');
        } else {
            runtime = runtime || (runtime = getRuntime.toString());
            fn = new Function('data', 'options', 'return (' + code + ')((' + runtime + ')(data, options))');
        }
        return {render: fn};
    };
jinja.compile = 函数 （markup， opts） {
opts = opts ||{};
var parser = new 解析器 （）;
parser.readTemplateFile = this.readTemplateFile;
var 代码 = [];
code.push（'函数 render（$） {'）;
code.push（'var get = $.get， set = $.set， push = $.push， pop = $.pop， write = $.write， filter = $.filter， each = $.each， block = $.block;'）;
code.push.apply（code， parser.parse（markup））;
code.push（'返回 $.render（）;'）;
代码.push（'}'）;
代码 = code.join（'\n'）;
if （opts.runtime === false） {
var fn = new Function（'数据'， '选项'， '返回 （' + 代码 + '）（runtime（data， options））'）;
} else {
运行时间 = 运行时间 ||（runtime = getRuntime.toString（））;
fn = new Function（'数据'， '选项'， '返回 （' + 代码 + '）（）（' + 运行时 + '）（数据， 选项））'）;
        }
返回 {render： fn};
    };
    jinja.render = function (markup, data, opts) {
        var tmpl = jinja.compile(markup);
        return tmpl.render(data, opts);
    };
jinja.render = 函数 （markup， data， opts） {
var tmpl = jinja.compile（markup）;
返回 tmpl.render（data， opts）;
    };
    jinja.templateFiles = [];
jinja.template文件 = [];
    jinja.readTemplateFile = function (name) {
        var templateFiles = this.templateFiles || [];
        var templateFile = templateFiles[name];
        if (templateFile == null) {
            throw new Error('Template file not found: ' + name);
        }
        return templateFile;
    };
jinja.readTemplateFile = function （name） {
var templateFiles = this.templateFiles ||[];
var templateFile = templateFiles[名称];
if （templateFile == null） {
throw new Error（'找不到模板文件： ' + name）;
        }
返回 templateFile;
    };

    /*!
     * Helpers
     */
/*!
*助手
     */
    function trimLeft(str) {
        return str.replace(LEADING_SPACE, '');
    }
function trimLeft（str） {
返回 str.replace（LEADING_SPACE， ''）;
    }
    function trimRight(str) {
        return str.replace(TRAILING_SPACE, '');
    }
function trimRight（str） {
返回 str.replace（TRAILING_SPACE， ''）;
    }
    function matchAll(str, reg, fn) {
        //copy as global
        reg = new RegExp(reg.source, 'g' + (reg.ignoreCase ? 'i' : '') + (reg.multiline ? 'm' : ''));
        var match;
        while ((match = reg.exec(str))) {
            var result = fn(match[0], match.index, str);
            if (typeof result == 'number') {
                reg.lastIndex = result;
            }
        }
    }
}));
function matchAll（str， reg， fn） {
复制为全局
reg = new RegExp（reg.source， 'g' + （reg.ignoreCase ？'i' ： ''） + （reg.multiline ？'m' ： ''））;
我们的比赛;
while （（match = reg.exec（str））） {
var result = fn（match[0]， match.index， str）;
if （typeof result == 'number'） {
reg.lastIndex = 结果;
            }
        }
    }
}));