function renderTraceLine(line, caretIndex = -1) {
  const row = document.createElement("div");
  row.className = "consoleTraceLine";

  if (caretIndex < 0 || caretIndex >= line.length) {
    row.textContent = line;
    return row;
  }

  const focusIndex = Math.max(0, Math.min(caretIndex, line.length - 1));
  let clauseStart = focusIndex;
  let clauseEnd = focusIndex;

  while (clauseStart > 0 && !";,{}".includes(line[clauseStart - 1])) {
    clauseStart -= 1;
  }
  while (clauseStart < line.length && line[clauseStart] === " ") {
    clauseStart += 1;
  }
  while (clauseEnd < line.length && !";,{}".includes(line[clauseEnd])) {
    clauseEnd += 1;
  }
  while (clauseEnd > clauseStart && line[clauseEnd - 1] === " ") {
    clauseEnd -= 1;
  }

  const markStart = Math.max(0, clauseStart);
  const markEnd = Math.min(line.length, Math.max(clauseEnd, clauseStart + 1));
  row.appendChild(document.createTextNode(line.slice(0, markStart)));

  const mark = document.createElement("span");
  mark.className = "consoleTraceMark";
  mark.textContent = line.slice(markStart, markEnd) || " ";
  row.appendChild(mark);

  row.appendChild(document.createTextNode(line.slice(markEnd)));
  return row;
}

module.exports = {
  renderTraceLine
};
module.exports.default = module.exports;
