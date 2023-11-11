import { EvaluteCode, Printable } from "./evalute-code";
const textAreaInputElement = document.getElementById(
    "text-area-input"
) as HTMLTextAreaElement | null;
if (!textAreaInputElement) {
    throw new Error(`No element with id "text-area-input" was found`);
}
const buttonRunElement = document.getElementById(
    "button-run"
) as HTMLButtonElement | null;
if (!buttonRunElement) {
    throw new Error(`No element with id "button-run" was found`);
}
const textAreaOutputElement = document.getElementById(
    "text-area-output"
) as HTMLTextAreaElement | null;
if (!textAreaOutputElement) {
    throw new Error(`No element with id "text-area-output" was found`);
}textAreaOutputElement
const buttonClearElement = document.getElementById(
    "button-clear"
) as HTMLButtonElement | null;
if (!buttonClearElement) {
    throw new Error(`No element with id "button-clear" was found`);
}
function clearOutput() {
    if (!textAreaOutputElement) {
        return;
    }
    Printable.clear();
    textAreaOutputElement.value = "";
}
function runCode() {
    if (!textAreaInputElement) {
        return;
    }
    if (!textAreaOutputElement) {
        return;
    }
    const evaluteCode = new EvaluteCode(textAreaInputElement.value);
    evaluteCode.run();
    const output = Printable.getLogs()
        .map((row) => row.join(" "))
        .join("\n");
    textAreaOutputElement.value = output;
}
buttonRunElement.addEventListener("click", () => {
    clearOutput();
    runCode();
});
buttonClearElement.addEventListener("click", clearOutput)