function $(id, scope = document) { if (id == "body") { return document.body; } var t = scope.getElementById(id); if (t) { return t; } t = scope.getElementsByClassName(id); if (t.length > 0) { return t; } t = scope.getElementsByTagName(id); if (t.length > 0) { return t; } return scope.querySelector(id); }
