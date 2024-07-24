export const standardHTMLAttributes: {[key: string]: {essential: string[], other: string[]}} = {
    "a": {
        "essential": ["href"],
        "other": ["target", "download", "ping", "rel", "hreflang", "type"]
    },
    "abbr": {
        "essential": [],
        "other": []
    },
    "address": {
        "essential": [],
        "other": []
    },
    "area": {
        "essential": ["alt", "coords", "href"],
        "other": ["shape", "target", "download", "ping", "rel"]
    },
    "article": {
        "essential": [],
        "other": []
    },
    "aside": {
        "essential": [],
        "other": []
    },
    "audio": {
        "essential": ["src"],
        "other": ["crossorigin", "preload", "autoplay", "loop", "muted", "controls"]
    },
    "b": {
        "essential": [],
        "other": []
    },
    "base": {
        "essential": ["href"],
        "other": ["target"]
    },
    "bdi": {
        "essential": [],
        "other": []
    },
    "bdo": {
        "essential": ["dir"],
        "other": []
    },
    "blockquote": {
        "essential": ["cite"],
        "other": []
    },
    "body": {
        "essential": [],
        "other": ["onload", "onunload"]
    },
    "br": {
        "essential": [],
        "other": []
    },
    "button": {
        "essential": ["type"],
        "other": ["autofocus", "disabled", "form", "formaction", "formenctype", "formmethod", "formnovalidate", "formtarget", "name", "value"]
    },
    "canvas": {
        "essential": [],
        "other": ["width", "height"]
    },
    "caption": {
        "essential": [],
        "other": []
    },
    "cite": {
        "essential": [],
        "other": []
    },
    "code": {
        "essential": [],
        "other": []
    },
    "col": {
        "essential": [],
        "other": ["span"]
    },
    "colgroup": {
        "essential": [],
        "other": ["span"]
    },
    "data": {
        "essential": ["value"],
        "other": []
    },
    "datalist": {
        "essential": [],
        "other": []
    },
    "dd": {
        "essential": [],
        "other": []
    },
    "del": {
        "essential": ["datetime"],
        "other": ["cite"]
    },
    "details": {
        "essential": [],
        "other": ["open"]
    },
    "dfn": {
        "essential": [],
        "other": []
    },
    "dialog": {
        "essential": [],
        "other": ["open"]
    },
    "div": {
        "essential": [],
        "other": []
    },
    "dl": {
        "essential": [],
        "other": []
    },
    "dt": {
        "essential": [],
        "other": []
    },
    "em": {
        "essential": [],
        "other": []
    },
    "embed": {
        "essential": ["src", "type"],
        "other": ["width", "height"]
    },
    "fieldset": {
        "essential": [],
        "other": ["disabled", "form", "name"]
    },
    "figcaption": {
        "essential": [],
        "other": []
    },
    "figure": {
        "essential": [],
        "other": []
    },
    "footer": {
        "essential": [],
        "other": []
    },
    "form": {
        "essential": ["action", "method"],
        "other": ["accept-charset", "autocomplete", "enctype", "name", "novalidate", "target"]
    },
    "h1": {
        "essential": [],
        "other": []
    },
    "h2": {
        "essential": [],
        "other": []
    },
    "h3": {
        "essential": [],
        "other": []
    },
    "h4": {
        "essential": [],
        "other": []
    },
    "h5": {
        "essential": [],
        "other": []
    },
    "h6": {
        "essential": [],
        "other": []
    },
    "head": {
        "essential": [],
        "other": []
    },
    "header": {
        "essential": [],
        "other": []
    },
    "hgroup": {
        "essential": [],
        "other": []
    },
    "hr": {
        "essential": [],
        "other": []
    },
    "html": {
        "essential": [],
        "other": ["manifest"]
    },
    "i": {
        "essential": [],
        "other": []
    },
    "iframe": {
        "essential": ["src"],
        "other": ["srcdoc", "name", "sandbox", "allow", "allowfullscreen", "width", "height", "referrerpolicy"]
    },
    "img": {
        "essential": ["src", "alt"],
        "other": ["srcset", "crossorigin", "usemap", "ismap", "width", "height", "referrerpolicy", "decoding", "sizes", "loading"]
    },
    "input": {
        "essential": ["type", "name"],
        "other": ["accept", "alt", "autocomplete", "autofocus", "checked", "dirname", "disabled", "form", "formaction", "formenctype", "formmethod", "formnovalidate", "formtarget", "height", "list", "max", "maxlength", "min", "minlength", "multiple", "pattern", "placeholder", "readonly", "required", "size", "src", "step", "value", "width"]
    },
    "ins": {
        "essential": ["datetime"],
        "other": ["cite"]
    },
    "kbd": {
        "essential": [],
        "other": []
    },
    "label": {
        "essential": ["for"],
        "other": []
    },
    "legend": {
        "essential": [],
        "other": []
    },
    "li": {
        "essential": [],
        "other": ["value"]
    },
    "link": {
        "essential": ["href", "rel"],
        "other": ["crossorigin", "media", "hreflang", "type", "sizes"]
    },
    "main": {
        "essential": [],
        "other": []
    },
    "map": {
        "essential": ["name"],
        "other": []
    },
    "mark": {
        "essential": [],
        "other": []
    },
    "meta": {
        "essential": ["name", "content"],
        "other": ["http-equiv", "charset"]
    },
    "meter": {
        "essential": ["value", "min", "max"],
        "other": ["low", "high", "optimum"]
    },
    "nav": {
        "essential": [],
        "other": []
    },
    "noscript": {
        "essential": [],
        "other": []
    },
    "object": {
        "essential": ["data", "type"],
        "other": ["name", "usemap", "form", "width", "height"]
    },
    "ol": {
        "essential": [],
        "other": ["reversed", "start", "type"]
    },
    "optgroup": {
        "essential": ["label"],
        "other": ["disabled"]
    },
    "option": {
        "essential": ["value"],
        "other": ["disabled", "label", "selected"]
    },
    "output": {
        "essential": ["name"],
        "other": ["for", "form"]
    },
    "p": {
        "essential": [],
        "other": []
    },
    "param": {
        "essential": ["name", "value"],
        "other": []
    },
    "picture": {
        "essential": [],
        "other": []
    },
    "pre": {
        "essential": [],
        "other": []
    },
    "progress": {
        "essential": ["value"],
        "other": ["max"]
    },
    "q": {
        "essential": ["cite"],
        "other": []
    },
    "rp": {
        "essential": [],
        "other": []
    },
    "rt": {
        "essential": [],
        "other": []
    },
    "ruby": {
        "essential": [],
        "other": []
    },
    "s": {
        "essential": [],
        "other": []
    },
    "samp": {
        "essential": [],
        "other": []
    },
    "script": {
        "essential": ["src", "type"],
        "other": ["nomodule", "async", "defer", "crossorigin", "integrity", "referrerpolicy"]
    },
    "section": {
        "essential": [],
        "other": []
    },
    "select": {
        "essential": ["name"],
        "other": ["autocomplete", "autofocus", "disabled", "form", "multiple", "required", "size"]
    },
    "small": {
        "essential": [],
        "other": []
    },
    "source": {
        "essential": ["src", "type"],
        "other": ["srcset", "sizes", "media"]
    },
    "span": {
        "essential": [],
        "other": []
    },
    "strong": {
        "essential": [],
        "other": []
    },
    "style": {
        "essential": ["type"],
        "other": ["media", "nonce"]
    },
    "sub": {
        "essential": [],
        "other": []
    },
    "summary": {
        "essential": [],
        "other": []
    },
    "sup": {
        "essential": [],
        "other": []
    },
    "table": {
        "essential": [],
        "other": []
    },
    "tbody": {
        "essential": [],
        "other": []
    },
    "td": {
        "essential": [],
        "other": ["colspan", "rowspan", "headers"]
    },
    "template": {
        "essential": [],
        "other": []
    },
    "textarea": {
        "essential": ["name"],
        "other": ["autocomplete", "autofocus", "cols", "dirname", "disabled", "form", "maxlength", "minlength", "placeholder", "readonly", "required", "rows", "wrap"]
    },
    "tfoot": {
        "essential": [],
        "other": []
    },
    "th": {
        "essential": [],
        "other": ["colspan", "rowspan", "headers", "scope", "abbr"]
    },
    "thead": {
        "essential": [],
        "other": []
    },
    "time": {
        "essential": ["datetime"],
        "other": []
    },
    "title": {
        "essential": [],
        "other": []
    },
    "tr": {
        "essential": [],
        "other": []
    },
    "track": {
        "essential": ["src", "kind"],
        "other": ["default", "label", "srclang"]
    },
    "u": {
        "essential": [],
        "other": []
    },
    "ul": {
        "essential": [],
        "other": []
    },
    "var": {
        "essential": [],
        "other": []
    },
    "video": {
        "essential": ["src"],
        "other": ["crossorigin", "poster", "preload", "autoplay", "playsinline", "loop", "muted", "controls", "width", "height"]
    },
    "wbr": {
        "essential": [],
        "other": []
    }
};