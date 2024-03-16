if (!localStorage.list) { // set a default if necessary
    localStorage.list = `[{"name": "Hello", "content": "DATA DATA DATA"}, [{"name": "World", "content": "DATA DATA DATA"}, {"name": "Nah", "content": "DATA DATA DATA"}]]`;
}

// we use a Proxy to manipulate localStorage and the DOM while outwardly only doing simple manipulations on an array
// this is not necessarily the most efficient way to do it, but saves a LOT of syntactical hell

var _target = undefined;
var list = undefined;
var renderedOutCounter = 0;
var hovered = undefined;
var hoverParent = undefined;
function delThing() {
    hoverParent.remove(hovered);
    completenessUpdate();
}

const listProxyHandler = {
    get(target, property, me) {
        if (property == "identify") {
            return true;
        }
        if (property == "remove") {
            return (item) => {
                item.el.parentNode.removeChild(item.el);
                for (var i = 0; i < target.length; i++) {
                    if (target[i] == item) {
                        target.splice(i, 1);
                        break;
                    }
                }
                commit();
                if (hovered == item) {
                    hovered = undefined;
                    hoverParent = undefined;
                    document.getElementById("utilbar").style.display = "none";
                }
            };
        }
        if (property == "push") {
            return (thing) => {
                if (Array.isArray(thing)) {
                    thing = new Proxy(thing, listProxyHandler);
                }
                thing.el = renderElement(thing, me);
                target.push(thing);
                (target.el.tagName == "UL" ? target.el : target.el.querySelector("ul")).appendChild(thing.el);
                commit();
            };
        }
        if (parseInt(property) != undefined) {
            if (!Array.isArray(target[property])) {
                return target[property];
            }
            if (!target[property].identify) {
                target[property] = new Proxy(target[property], listProxyHandler);
            }
            return target[property];
        }
        return target[property]; // I *could* use a Reflect for this. Couldn't I. Hat hat hat.
    },
    set(target, property, value) {
        if (typeof property == "number") {
            target[property] = value;
            commit();
        }
        if (property == "el") {
            target.el = value;
        }
    }
};

function load() {
    _target = JSON.parse(localStorage.list);
    list = new Proxy(_target, listProxyHandler);
}

function commit() {
    localStorage.list = JSON.stringify(_target);
}

function addThing(point) {
    if (point == undefined) {
        point = hovered;
    }
    point.push({
        name: "Untitled",
        content: "",
        weight: 1,
        complete: false
    });
    completenessUpdate();
}

function addDir(point) {
    if (point == undefined) {
        point = hovered;
    }
    point.push([]);
}

function goToEditor(thing) {
    console.log(thing);
    document.getElementById("content").innerHTML = thing.content;
    document.getElementById("content").oninput = () => {
        thing.content = document.getElementById("content").innerHTML;
        commit();
    };
    document.getElementById("weight").value = thing.weight;
    document.getElementById("weight").oninput = () => {
        var v = document.getElementById("weight").value;
        if (v == "" || v < 1) { // catch the failure cases with invalid inputs
            thing.weight = 1;
        }
        else {
            thing.weight = v - 0;
        }
        document.getElementById("weight").value = thing.weight;
        commit();
        completenessUpdate();
    };
    document.getElementById("checkboxy").checked = thing.complete;
    document.getElementById("checkboxy").onclick = () => {
        thing.complete = document.getElementById("checkboxy").checked;
        commit();
        completenessUpdate();
    };
    document.getElementById("completion").style.display = "";
}


function renderElement(at, parent) { // do the INITIAL render of the tree (calling render over and over again is a slow and terrible idea)
    let item = document.createElement("li");
    at.el = item;
    if (Array.isArray(at)) {
        item.classList.add("nest");
        var input = document.createElement("input");
        input.type = "checkbox";
        input.id = "nestbox" + renderedOutCounter;
        input.classList.add("nest-box");
        var label = document.createElement("label");
        label.setAttribute("for", "nestbox" + renderedOutCounter);
        var nest = document.createElement("ul");
        var perc = document.createElement("span");
        perc.classList.add("percentage");
        item.appendChild(input);
        item.appendChild(label);
        item.appendChild(nest);
        label.appendChild(perc);
        for (var i = 0; i < at.length; i++) {
            nest.appendChild(renderElement(at[i], at));
        }
        item.onmouseover = (evt) => {
            if (!hovered || hovered != at) {
                var utilbar = document.getElementById("utilbar");
                utilbar.style.display = "";
                utilbar.classList.add("directoryMode");
                utilbar.classList.remove("itemMode");
                utilbar.style.left = item.getBoundingClientRect().right + "px";
                utilbar.style.top = item.getBoundingClientRect().top + "px";
                hovered = at;
                hoverParent = parent;
            }
            evt.stopPropagation();
        };
    }
    else {
        item.innerText = at.name;
        item.onclick = () => {
            goToEditor(at);
        };
        item.contentEditable = true;
        item.oninput = () => {
            at.name = item.innerText;
            commit();
        };
        item.onmouseover = (evt) => {
            if (!hovered || hovered != at) {
                var utilbar = document.getElementById("utilbar");
                utilbar.style.display = "";
                utilbar.classList.add("itemMode");
                utilbar.classList.remove("directoryMode");
                utilbar.style.left = item.getBoundingClientRect().right + "px";
                utilbar.style.top = item.getBoundingClientRect().top + "px";
                hovered = at;
                hoverParent = parent;
            }
            evt.stopPropagation();
        };
    }
    renderedOutCounter++;
    return item;
}

function completenessUpdate(thing) { // render complete-ness values for every containing element
    // returns a [complete, total] array for utility
    var ret = [0, 0];
    if (thing == undefined) {
        thing = list;
    }
    for (var i = 0; i < thing.length; i++) {
        if (Array.isArray(thing[i])) {
            var d = completenessUpdate(thing[i]);
            ret[0] += d[0];
            ret[1] += d[1];
        }
        else {
            ret[0] += thing[i].complete ? thing[i].weight : 0;
            ret[1] += thing[i].weight;
        }
    }
    thing.el.style.setProperty("--completeness", (ret[0] / ret[1] * 100) + "%");
    thing.el.querySelector("label > span.percentage").innerText = Math.round(ret[0] / ret[1] * 100) + "%"; // TODO: allow fractional mode
    return ret;
}

load();
var r = document.getElementById("navInside");
r.innerHTML = ""; // "quick and dirty" way to clear the todo list tree
var todoListRoot = document.createElement("ul");
list.el = todoListRoot;
for (var i = 0; i < list.length; i++) {
    todoListRoot.appendChild(renderElement(list[i], list));
}
r.appendChild(todoListRoot);
completenessUpdate();