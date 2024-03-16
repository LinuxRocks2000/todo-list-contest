if (!localStorage.list) { // set a default if necessary
    localStorage.list = `[]`;
}

// we use a Proxy to manipulate localStorage and the DOM while outwardly only doing simple manipulations on an array
// this is not necessarily the most efficient way to do it, but saves a LOT of syntactical hell

var _target = undefined;
var list = undefined;
var renderedOutCounter = 0;
var hovered = undefined;
var hoverParent = undefined;
var percModeFrac = false;
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
                    $("utilbar").style.display = "none";
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
    $("content").innerHTML = thing.content;
    $("content").oninput = () => {
        thing.content = $("content").innerHTML;
        commit();
    };
    $("weight").value = thing.weight;
    $("weight").oninput = () => {
        var v = $("weight").value;
        if (v == "" || v < 1) { // catch the failure cases with invalid inputs
            thing.weight = 1;
        }
        else {
            thing.weight = v - 0;
        }
        $("weight").value = thing.weight;
        commit();
        completenessUpdate();
    };
    $("checkboxy").checked = thing.complete;
    $("checkboxy").onclick = () => {
        thing.complete = $("checkboxy").checked;
        commit();
        completenessUpdate();
    };
    $("completion").style.display = "";
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
        label.tabIndex = 0;
        label.setAttribute("for", "nestbox" + renderedOutCounter);
        var nest = document.createElement("ul");
        var perc = document.createElement("span");
        perc.classList.add("percentage");
        perc.onclick = (evt) => {
            percModeFrac = !percModeFrac;
            completenessUpdate();
            evt.stopPropagation();
            return false;
        };
        item.appendChild(input);
        item.appendChild(label);
        item.appendChild(nest);
        label.appendChild(perc);
        for (var i = 0; i < at.length; i++) {
            nest.appendChild(renderElement(at[i], at));
        }
        item.onmouseover = (evt) => {
            if (!hovered || hovered != at) {
                var utilbar = $("utilbar");
                utilbar.style.display = "";
                utilbar.classList.add("directoryMode");
                utilbar.classList.remove("itemMode");
                utilbar.style.left = item.getBoundingClientRect().right + "px";
                utilbar.style.top = item.getBoundingClientRect().top + "px";
                hovered = at;
                hoverParent = parent;
            }
            if (evt) { evt.stopPropagation(); }
        };
    }
    else {
        item.innerText = at.name;
        item.onclick = () => {
            goToEditor(at);
        };
        item.contentEditable = true;
        item.oninput = () => {
            at.name = item.innerText.replace("\n", "").trim();
            if (item.innerText != at.name) {
                item.innerText = at.name;
            }
            commit();
        };
        item.onmouseover = (evt) => {
            if (!hovered || hovered != at) {
                var utilbar = $("utilbar");
                utilbar.style.display = "";
                utilbar.classList.add("itemMode");
                utilbar.classList.remove("directoryMode");
                utilbar.style.left = item.getBoundingClientRect().right + "px";
                utilbar.style.top = item.getBoundingClientRect().top + "px";
                hovered = at;
                hoverParent = parent;
            }
            if (evt) { evt.stopPropagation(); }
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
    var writeOutEl = undefined;
    if (thing != list) {
        writeOutEl = thing.el.querySelector("label > span.percentage");
    }
    else {
        writeOutEl = $("globalCompletion");
    }
    writeOutEl.innerText = ret[1] == 0 ? 0 : (percModeFrac ? (ret[0] + "/" + ret[1]) : (Math.round(ret[0] / ret[1] * 100) + "%"));
    return ret;
}

load();
var r = $("navInside");
r.innerHTML = ""; // "quick and dirty" way to clear the todo list tree
var todoListRoot = document.createElement("ul");
list.el = todoListRoot;
for (var i = 0; i < list.length; i++) {
    todoListRoot.appendChild(renderElement(list[i], list));
}
r.appendChild(todoListRoot);
completenessUpdate();

var doomsday = {
    code: "DoomsdaySuxxorz!!",
    completionPoint: 0
};

window.onkeyup = (evt) => {
    if (evt.keyCode == 9) {
        if (document.activeElement.onmouseover) {
            document.activeElement.onmouseover();
        }
        else if (document.activeElement.tagName == "LABEL") {
            document.activeElement.parentNode.onmouseover();
        }
    }
    if (evt.key == "Enter") {
        if (document.activeElement.tagName == "LABEL") {
            var inp = $(document.activeElement.getAttribute("for"));
            inp.checked = !inp.checked;
        }
        else if (document.activeElement.onclick && document.activeElement.tagName != "BUTTON") { // triggers onclick upon Enter for items that aren't used to that sort of thing
            document.activeElement.onclick();
            if (document.activeElement.tagName == "LI") {
                $("content").focus();
            }
        }
    }
    if (evt.shiftKey && evt.altKey) {
        if (evt.key == "D") {
            if (document.activeElement.tagName == "LABEL" || document.activeElement.tagName == "LI") {
                delThing();
            }
        }
        if (evt.key == "N") {
            if (document.activeElement.tagName == "LABEL") {
                addThing();
            }
        }
        if (evt.key == "M") {
            if (document.activeElement.tagName == "LABEL") {
                addDir();
            }
        }
        if (evt.key == "R") {
            percModeFrac = !percModeFrac;
            completenessUpdate();
        }
    }
    if (evt.key == "Shift") {
        return;
    }
    if (evt.key == doomsday.code[doomsday.completionPoint]) {
        doomsday.completionPoint++;
        if (doomsday.completionPoint >= doomsday.code.length) {
            localStorage.list = "[]";
            Array.from(document.getElementsByTagName("input")).forEach(element => {
                element.value = "";
                element.checked = false;
            });
            location.reload();
        }
    }
    else {
        doomsday.completionPoint = 0;
    }
    if (evt.key == "Home") {
        if (list.length > 0) {
            if (Array.isArray(list[0])) {
                list[0].el.querySelector("label").focus();
            }
            else {
                list[0].el.focus();
            }
            list[0].el.onmouseover();
        }
    }
};

function settings() {
    if ($("settingsMenu").style.display == "") {
        $("settingsMenu").style.display = "none";
    }
    else {
        $("settingsMenu").style.display = "";
        $("paddings").focus();
    }
}


function classism(thing) {
    var choices = [];
    for (var i = 0; i < thing.children.length; i++) {
        choices.push(thing.children[i].value);
    }
    thing.onchange = () => {
        choices.forEach(choice => {
            document.body.classList.remove(thing.id + "-" + choice);
        });
        document.body.classList.add(thing.id + "-" + thing.value);
    }
    thing.onchange();
}


classism($("paddings"));
classism($("colors"));
classism($("fonts"));

function pibald() {
    fetch("https://swaous.asuscomm.com/piday", (data) => {
        data.text().then(string => {
            console.log(string);
            for (var x = 0; x < string.length; x++) {
                console.log(string[x]);
            }
        });
    });
}
//pibald();