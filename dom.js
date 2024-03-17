var $_topid = Math.round(Math.random() * 10000);
function $(id, scope = document) {if (id == "body") { return document.body; } var t = document.getElementById(id); if (t) { return t; } t = scope.getElementsByClassName(id); if (t.length == 1) { return t[0]; } else if (t.length > 0) {return t; } t = scope.getElementsByTagName(id); if (t.length == 1) { return t[0]; } else if (t.length > 0) {return t; } return scope.querySelector(id); }
function $_setup(l) {
    l.is$ = true;
    l.$a = function () {
        $a(this, ...arguments);
    };
    l._interactions = [];
    l.$i = function (cbk) {
        l.addEventListener("click", cbk);
        l._interactions.push(cbk);
    };
    l.$v = function (arg) {
        if (arg == undefined) { // returns innerText if it's "contenteditable" (not a real input or textarea), and otherwise returns value.
            if (l.value) {
                return l.value;
            }
            else {
                return l.innerText;
            }
        }
        else {
            if (l.value) {
                l.value = arg;
            }
            else {
                l.innerText = arg;
            }
        }
    }

}
function $_(type, parameters = {}, ...args) {
    var l = document.createElement(type);
    $_setup(l);
    Object.keys(parameters).forEach(key => {
        if (key == "class") {
            if (Array.isArray(parameters[key])) {
                parameters[key].forEach(cl => {
                    l.classList.add(cl);
                });
            }
            else {
                l.classList.add(parameters[key]);
            }
        }
        else if (key == "for") {
            l["htmlFor"] = parameters[key];
        }
        else {
            l[key] = parameters[key];
        }
    });
    args.forEach(arg => {
        if (typeof arg == "string") {
            l.appendChild(document.createTextNode(arg));
        }
        else {
            l.appendChild(arg);
        }
    });
    return l;
}
function $e(el, cbk) {
    if (!el.is$) {
        $_setup(el);
    }
    el.contentEditable = true;
    var target = { data: "" };
    const p = {
        get(target, prop, receiver) {
            return Reflect.get(...arguments);
        },
        set(target, prop, value, receiver) {
            var reflected = Reflect.set(...arguments);
            if (prop == "data") {
                if (el.$v() != value) {
                    el.$v(value);
                }
                if (cbk) {
                    cbk(receiver, el);
                }
            }
            return reflected;
        }
    }
    var ret = new Proxy(target, p);
    el.addEventListener("input", () => {
        ret.data = el.$v();
    });
    ret.data = el.$v();
    return ret;
}
function $E(el, cbk) {
    if (!el.is$) {
        $_setup(el);
    }
    el.contentEditable = true;
    el.addEventListener("input", () => {
        cbk(el);
    });
    return el;
}
function $i(el, cbk) {
    if (!el.is$) {
        $_setup(el);
    }
    el.$i(cbk);
    return el;
}
function $k(el, cbk) {
    el._interactions.push(cbk);
    return el;
}
function $a(parent, ...children) { children.forEach(child => parent.appendChild(child)) }
function $id(el) { el.id = "e41C" + $_topid++; return el; }
function $t(el, ind = 1) { el.tabIndex = ind; return el; }
function $show(el) { el.style.display = "initial"; return el; }
function $hide(el) { el.style.display = "none"; return el; }
function $r(el) { if (el.parentNode) { el.parentNode.removeChild(el); } }

function $h(el, enter, leave) {
    el.addEventListener("mouseover", (evt) => {
        if (enter) {
            enter();
        }
        evt.stopPropagation();
        return false;
    });
    el.addEventListener("mouseleave", (evt) => {
        if (leave) {
            leave();
        }
        evt.stopPropagation();
        return false;
    });
    return el;
}

window.addEventListener("keyup", (evt) => {
    if (evt.key == "Enter") { // enter-key interaction
        if (document.activeElement._interactions) {
            document.activeElement._interactions.forEach(interaction => {
                interaction.call(document.activeElement);
            });
        }
    }
});
